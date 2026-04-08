# KALE GROUP: Furniture Manufacturing & Dimensional BOM Plan

## 1. Objective
Upgrade the existing `ManufacturingModule` to support advanced, dimensional Bill of Materials (BOM) specifically designed for furniture and carpentry production. The current system tracks materials in generic single units. The new system must support calculating raw material consumption based on physical dimensions (Length, Width) and different Units of Measure (UOM) such as Square Meters ($m^2$), Linear Meters (m), and individual pieces (pcs).

## 2. Database Schema Updates (Supabase / PostgreSQL)

### 2.1 Updating `products` table
To accurately deduct stock, every product (especially raw materials) must have a standardized Unit of Measure.
*   **New Column Required:** `unit_of_measure` (VARCHAR)
*   **Allowed Values:** 
    *   `SQM` (Square Meters, used for Laminate, MDF, Plywood boards)
    *   `LM` (Linear Meters / Centimeters, used for edge banding / shponi / profiles)
    *   `PCS` (Pieces, used for hardware, hinges, screws)

### 2.2 Updating `recipe_ingredients` table
We need to capture the exact dimensions the user inputs (for their own reference and UI rendering) and the final calculated quantity to deduct from stock.

*   **New Columns:**
    *   `part_name` (VARCHAR) - Description of the piece, e.g., "მარცხენა გვერდი" (Left side panel).
    *   `calc_method` (VARCHAR) - The calculation strategy applied. Enum: `AREA`, `LENGTH`, `PIECES`.
    *   `length_mm` (NUMERIC) - Length of the cut in millimeters.
    *   `width_mm` (NUMERIC) - Width of the cut in millimeters (only relevant for `AREA`).
    *   `pieces` (INTEGER) - How many identical parts are needed.
    *   `waste_percentage` (NUMERIC) - Optional. Overhead for saw kerf and material waste (e.g., 5-10%).

*(Note: The existing `quantity_required` column will remain and serve as the final absolute calculated value to be deducted from `stock_levels`.)*

## 3. Mathematical Formulas for UI Calculation
When a user adds an ingredient to a recipe, the frontend (`ManufacturingModule.tsx`) must dynamically calculate the `quantity_required` before saving:

### A. Flat Boards (Laminate, MDF) -> `calc_method: AREA`
If standard sizes are typed in millimeters ($L_{mm}$ and $W_{mm}$):
*   **Formula:** `(length_mm / 1000) * (width_mm / 1000) * pieces`
*   **Example:** 1200mm x 400mm x 2 pieces = `0.96 m^2`.
*   **Waste Logic:** `total_sqm * (1 + (waste_percentage / 100))` 

### B. Edge Banding / Profiles -> `calc_method: LENGTH`
*   **Formula:** `(length_mm / 1000) * pieces`
*   **Example:** 3600mm x 1 piece = `3.6 LM`.

### C. Hardware -> `calc_method: PIECES`
*   **Formula:** `pieces`
*   **Example:** 4 pieces = `4.0`.

## 4. Frontend UI/UX Requirements (`ManufacturingModule.tsx`)

1.  **Dynamic Input Fields:**
    *   When the user selects a raw material, the app checks its `unit_of_measure`.
    *   If `SQM`: Render `length_mm` AND `width_mm` input fields.
    *   If `LM`: Render only `length_mm` input field.
    *   If `PCS`: Render only `pieces` (quantity) input field.

2.  **Live Calculation Display:**
    *   Next to the input fields, show the real-time calculated deduction. 
    *   *UI Example:* "ჯამური მოხმარება: **0.96 მ²**"

3.  **Part Naming:**
    *   Provide a text field next to each row for `part_name` so the carpenter knows what exactly this 1200x400 piece is meant for.

## 5. Backend Logic (`process_manufacturing` RPC)
The good news is that if the frontend accurately calculates `quantity_required` (e.g., 0.96) and saves it to the `recipe_ingredients` table, the existing `process_manufacturing` stored procedure will work **without major modifications**. 
It will simply loop through the ingredients, read `0.96`, multiply it by the final quantity of products ordered (e.g., producing 10 cabinets), and deduct `9.6 m^2` from `stock_levels`, taking the active average sq. meter cost ($avg\_cost$) from inventory. 

**Future Consideration:** 
Ensure the `inventory_transactions` UI renders values with decimal points appropriately (so accountants see "9.60 მ²" rather than rounding it mistakenly to 10).
