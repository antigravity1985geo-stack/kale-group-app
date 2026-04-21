import { format } from "date-fns";

export async function downloadExcel(data: any[], fileName: string = "Export") {
  if (!data || data.length === 0) {
    console.error("No data to export");
    return;
  }

  // Dynamically import xlsx (~425 kB) only when user actually triggers export
  const XLSX = await import("xlsx");

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const dateStr = format(new Date(), "yyyy_MM_dd_HH_mm");
  XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
}
