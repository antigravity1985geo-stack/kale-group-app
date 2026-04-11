/**
 * PDF Generator Utility for Kale Group ERP
 * Handles order receipts and invoices with Georgian font support
 */
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Helper function to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const generateOrderReceipt = async (order: any, items: any[]) => {
  const doc = new jsPDF();
  
  try {
    // 1. Load Georgian Font from reliable Raw GitHub CDN
    const response = await fetch('https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansGeorgian/NotoSansGeorgian-Regular.ttf');
    if (!response.ok) throw new Error('Font download failed');
    const fontBuffer = await response.arrayBuffer();
    const fontBase64 = arrayBufferToBase64(fontBuffer);
    
    // 2. Register Font
    doc.addFileToVFS('NotoSansGeorgian.ttf', fontBase64);
    doc.addFont('NotoSansGeorgian.ttf', 'NotoSansGeorgian', 'normal');
    doc.setFont('NotoSansGeorgian');

    // 🎨 Branding (Gold/Dark Slate)
    const goldColor = [184, 134, 11]; // Dark Goldenrod
    const brand900 = [24, 24, 27]; // Brand 900
    
    // Header
    doc.setFontSize(26);
    doc.setTextColor(brand900[0], brand900[1], brand900[2]);
    doc.text('KALE GROUP', 105, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Premium Furniture & Interior Design', 105, 33, { align: 'center' });
    
    // Aesthetic Divider
    doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.setLineWidth(0.5);
    doc.line(40, 40, 170, 40);
    
    // Order Info (Georgian)
    doc.setFontSize(12);
    doc.setTextColor(brand900[0], brand900[1], brand900[2]);
    doc.text(`ქვითრის #: ${order.id.slice(0, 8).toUpperCase()}`, 20, 55);
    doc.text(`თარიღი: ${new Date(order.created_at).toLocaleDateString()}`, 20, 63);
    
    let statusLabel = '';
    switch (order.status) {
      case 'pending': statusLabel = 'აღებულია'; break;
      case 'processing': statusLabel = 'მუშავდება'; break;
      case 'shipped': statusLabel = 'გაგზავნილია'; break;
      case 'delivered': statusLabel = 'ჩაბარებული'; break;
      case 'cancelled': statusLabel = 'გაუქმებული'; break;
      default: statusLabel = order.status;
    }
    doc.text(`სტატუსი: ${statusLabel}`, 20, 71);

    // Customer Info (Georgian)
    doc.setFontSize(11);
    doc.text('კლიენტის ინფორმაცია:', 115, 55);
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`${order.customer_first_name} ${order.customer_last_name}`, 115, 63);
    doc.text(`ტელეფონი: ${order.customer_phone}`, 115, 71);
    doc.text(`მისამართი: ${order.customer_city}, ${order.customer_address}`, 115, 79);

    // Items Table (Georgian)
    const tableData = items.map(item => [
      item.product_name,
      item.quantity.toString(),
      `${Number(item.price_at_purchase).toLocaleString()} ₾`,
      `${(item.quantity * item.price_at_purchase).toLocaleString()} ₾`
    ]);

    (doc as any).autoTable({
      startY: 95,
      head: [['პროდუქტი', 'რაოდენობა', 'ფასი', 'ჯამი']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: brand900, 
        textColor: goldColor, 
        font: 'NotoSansGeorgian',
        fontSize: 11,
        halign: 'center'
      },
      styles: { 
        font: 'NotoSansGeorgian', 
        fontSize: 10, 
        cellPadding: 5,
        textColor: [40, 40, 40]
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(brand900[0], brand900[1], brand900[2]);
    doc.text(`ჯამური ფასი: ${Number(order.total_price).toLocaleString()} ₾`, 190, finalY, { align: 'right' });

    // Footer Detail
    doc.setDrawColor(240, 240, 240);
    doc.line(20, 275, 190, 275);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('გმადლობთ, რომ იყენებთ KALE GROUP-ის მომსახურებას. თქვენი პრიმიუმ არჩევანი ავეჯის სამყაროში.', 105, 285, { align: 'center' });
    doc.text('www.kalegroup.ge | +995 5xx xxx xxx', 105, 290, { align: 'center' });

    doc.save(`KaleGroup_Order_${order.id.slice(0, 8)}.pdf`);
  } catch (error) {
    console.error('Error generating PDF with Georgian font:', error);
    alert('ქვითრის შექმნისას დაფიქსირდა შეცდომა შრიფტთან დაკავშირებით.');
  }
};
