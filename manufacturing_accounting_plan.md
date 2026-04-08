# Kale Group - Full Manufacturing, Inventory & Accounting Returns Plan

## 1. Project Objective
Implement a robust Manufacturing (Bill of Materials), Inventory Management, and Return Merchandise Authorization (RMA) module within the Kale Group Admin Panel, fully integrated with the Double-Entry Accounting System.

The modules will support:
- Defining **Production Recipes** (BOM) specifying raw materials needed per finished product.
- Real-time **Inventory Tracking** (both raw materials and finished goods).
- Tracking **Product Returns**, logging the exact reason.
- Automating **Accounting Entries** when actions (production, sales, returns) occur.

## 2. Supabase SQL Schema structure
Run these migrations to create the required tables and logic.

### 2.1 Inventory Categories and Raw Materials
```sql
-- Create Material/Inventory Types
CREATE TYPE item_type AS ENUM ('raw_material', 'finished_good');

-- Table: Inventory Items (Unified table for both materials and products)
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    type item_type DEFAULT 'raw_material',
    unit_of_measure VARCHAR(50) NOT NULL, -- e.g., kg, unit, liter
    cost_price DECIMAL(10, 2) DEFAULT 0.00,
    stock_quantity DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Recipes (Bill of Materials)
```sql
-- Table: Production Recipes (Maps a finished good to a recipe)
CREATE TABLE production_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finished_good_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Recipe Ingredients (What raw materials are needed)
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID REFERENCES production_recipes(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity_required DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.3 Returns Management (RMA)
```sql
-- Table: Returns
CREATE TABLE product_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE, -- Assuming 'orders' exists
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    return_reason TEXT NOT NULL,
    condition VARCHAR(50) NOT NULL, -- e.g., 'defective', 'resellable'
    status VARCHAR(50) DEFAULT 'pending', -- pending, processed, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);
```

## 3. Backend Logic & RPCs (Supabase)

Claude should implement Supabase Edge Functions or RPCs to handle transactions safely:

### 3.1 `process_manufacturing(recipe_id, quantity_to_produce)`
When Admin clicks "Produce":
1. Calculate required materials (`ingredient.quantity_required * quantity_to_produce`).
2. Verify enough raw material stock exists.
3. Deduct raw materials from `inventory_items`.
4. Increase `stock_quantity` of `finished_good_id`.
5. *Accounting:* Debit 'Finished Goods Inventory', Credit 'Raw Materials Inventory' (plus applied labor/overhead if applicable).

### 3.2 `process_return(return_id)`
When Admin approves a return:
1. Update `product_returns` status to 'processed'.
2. If `condition == 'resellable'`, increase the product inventory stock.
3. *Accounting Integration (Double Entry):* 
   - Debit: Sales Returns & Allowances
   - Credit: Accounts Receivable / Cash
   - Debit: Inventory (if resellable)
   - Credit: Cost of Goods Sold (COGS)

## 4. Frontend Implementation (Admin Panel UI)

Claude should build the following React/Vite components:

### 4.1 `/admin/recipes` - Manufacturing Dashboard
- A page to list, create, and manage production recipes.
- Form to add multiple `recipe_ingredients` to a new `production_recipe`.
- "Produce" Modal: Select recipe -> input quantity -> confirms and runs `process_manufacturing` RPC.

### 4.2 `/admin/inventory` - Inventory Dashboard
- A data grid displaying `inventory_items`.
- Tabs filtering by `raw_material` vs `finished_good`.
- Modals to adjust stock manually (Stock counts / Discrepancy resolutions).

### 4.3 `/admin/returns` - Returns & Refunds
- Component tied to the existing Orders page or a standalone Returns Dashboard.
- Modal on an Order detail to register a new Return:
  - Form Fields: Returned item, quantity, `return_reason` (Dropdown: "Defective", "Customer Change Mind", "Shipping Damage"), and `condition`.
- Auto-triggers Journal Entries.

## 5. Instructions for Claude Code
1. Start by reviewing the database schema in Supabase using the backend migration tools, and apply section **2. Supabase SQL Schema**.
2. Proceed to write PostgreSQL functions (`RPCs`) for secure transactions on manufacturing execution and returns as described in **Section 3**.
3. Create the REST/Supabase client helper functions in `src/services/` (or equivalent).
4. Implement the Admin UIs in Typescript/React using Tailwind CSS (ensure it aligns with the existing Kale Group Admin Panel aesthetic).
5. Thoroughly connect the returns system into the `accounting_journals` to ensure the double-entry books always balance.
