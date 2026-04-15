import * as XLSX from "xlsx";
import { format } from "date-fns";

export function downloadExcel(data: any[], fileName: string = "Export") {
  if (!data || data.length === 0) {
    console.error("No data to export");
    return;
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert the JSON data array to a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // Format the date for the filename
  const dateStr = format(new Date(), "yyyy_MM_dd_HH_mm");
  
  // Create and trigger the download
  XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
}
