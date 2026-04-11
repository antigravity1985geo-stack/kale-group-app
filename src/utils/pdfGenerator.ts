/**
 * PDF Generator Utility for Kale Group ERP
 * Premium receipt design with full Georgian font support
 */
import { jsPDF } from 'jspdf';

// Convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Draw a filled rectangle
const fillRect = (doc: jsPDF, x: number, y: number, w: number, h: number, r: number, g: number, b: number) => {
  doc.setFillColor(r, g, b);
  doc.rect(x, y, w, h, 'F');
};

// Draw a stroked rectangle
const strokeRect = (doc: jsPDF, x: number, y: number, w: number, h: number, r: number, g: number, b: number, lw = 0.3) => {
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(lw);
  doc.rect(x, y, w, h, 'S');
};

export const generateOrderReceipt = async (order: any, items: any[]) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210; // page width
  const MARGIN = 15;

  try {
    // ── 1. Load & Register Georgian Font ──────────────────────────────────
    const response = await fetch(
      'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansGeorgian/NotoSansGeorgian-Regular.ttf'
    );
    if (!response.ok) throw new Error('Font download failed');
    const fontBase64 = arrayBufferToBase64(await response.arrayBuffer());
    doc.addFileToVFS('NotoSansGeorgian.ttf', fontBase64);
    doc.addFont('NotoSansGeorgian.ttf', 'NotoSansGeorgian', 'normal');

    // ── Colour Palette ────────────────────────────────────────────────────
    const DARK  = { r: 18,  g: 18,  b: 20  }; // brand-900
    const GOLD  = { r: 184, g: 147, b: 63  }; // gold accent
    const LIGHT = { r: 245, g: 243, b: 240 }; // off-white bg
    const GREY  = { r: 110, g: 108, b: 105 }; // muted text
    const LINE  = { r: 220, g: 215, b: 205 }; // subtle line

    const setFont = (size: number, r = DARK.r, g = DARK.g, b = DARK.b) => {
      doc.setFont('NotoSansGeorgian', 'normal');
      doc.setFontSize(size);
      doc.setTextColor(r, g, b);
    };

    // ── 2. Dark Header Bar ────────────────────────────────────────────────
    fillRect(doc, 0, 0, W, 42, DARK.r, DARK.g, DARK.b);

    // Company Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('KALE GROUP', MARGIN, 18);

    // Gold accent line under name
    doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, 21, MARGIN + 52, 21);

    // Tagline
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 175, 165);
    doc.text('Premium Furniture & Interior Design', MARGIN, 28);
    doc.text('www.kalegroup.ge', MARGIN, 34);

    // "ᲥᲕᲘᲗᲐᲠᲘ" label (right side of header)
    setFont(9, 180, 175, 165);
    doc.text('ქვითარი / RECEIPT', W - MARGIN, 18, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(GOLD.r, GOLD.g, GOLD.b);
    doc.text(`#${order.id.slice(0, 8).toUpperCase()}`, W - MARGIN, 28, { align: 'right' });

    // ── 3. Info Strip (light bg) ──────────────────────────────────────────
    fillRect(doc, 0, 42, W, 36, LIGHT.r, LIGHT.g, LIGHT.b);

    const date = new Date(order.created_at).toLocaleDateString('ka-GE', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const statusMap: Record<string, string> = {
      pending: 'მოლოდინში', confirmed: 'დადასტურებული',
      processing: 'დამუშავება', shipped: 'გაგზავნილია',
      delivered: 'ჩაბარებული', cancelled: 'გაუქმებული',
    };
    const statusLabel = statusMap[order.status] || order.status;
    const statusColor = order.status === 'delivered' ? { r: 22, g: 163, b: 74 }
                      : order.status === 'cancelled' ? { r: 220, g: 38, b: 38 }
                      : { r: 217, g: 119, b: 6 };

    // Row 1 — Date / Status
    setFont(8, GREY.r, GREY.g, GREY.b);
    doc.text('თარიღი:', MARGIN, 52);
    doc.text('სტატუსი:', 80, 52);

    setFont(9);
    doc.text(date, MARGIN, 58);

    setFont(9, statusColor.r, statusColor.g, statusColor.b);
    doc.text(statusLabel, 80, 58);

    // Payment method
    const payMap: Record<string, string> = {
      cash: 'ნაღდი ფული', card: 'ბარათი', bank_transfer: 'გადარიცხვა',
      installment: 'განვადება', bog: 'BOG Pay', tbc: 'TBC Pay', credo: 'Credo განვადება'
    };
    setFont(8, GREY.r, GREY.g, GREY.b);
    doc.text('გადახდა:', 140, 52);
    setFont(9);
    doc.text(payMap[order.payment_method] || order.payment_method || '—', 140, 58);

    // ── 4. Two-Column Info Cards ──────────────────────────────────────────
    let y = 88;

    // ─ Left: Order Details ─
    setFont(8, GOLD.r, GOLD.g, GOLD.b);
    doc.text('▪  შეკვეთის დეტალები', MARGIN, y);
    doc.setDrawColor(LINE.r, LINE.g, LINE.b);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y + 2, 95, y + 2);

    y += 8;
    const orderRows = [
      ['ქვ. ნომერი:', `#${order.id.slice(0, 8).toUpperCase()}`],
      ['სტატუსი:', statusLabel],
      ['თარიღი:', date],
    ];
    orderRows.forEach(([label, val]) => {
      setFont(8, GREY.r, GREY.g, GREY.b);
      doc.text(label, MARGIN, y);
      setFont(8.5);
      doc.text(val, MARGIN + 28, y);
      y += 6;
    });

    // ─ Right: Customer Info ─
    y = 88;
    setFont(8, GOLD.r, GOLD.g, GOLD.b);
    doc.text('▪  კლიენტის ინფორმაცია', 110, y);
    doc.line(110, y + 2, W - MARGIN, y + 2);

    y += 8;
    const customerRows: [string, string][] = [
      ['სახელი:', `${order.customer_first_name} ${order.customer_last_name}`],
      ['ტელ:', order.customer_phone || '—'],
      ['ელ-ფოსტა:', order.customer_email || '—'],
      ['ქალაქი:', order.customer_city || '—'],
      ['მისამართი:', order.customer_address || '—'],
    ];
    customerRows.forEach(([label, val]) => {
      setFont(8, GREY.r, GREY.g, GREY.b);
      doc.text(label, 110, y);
      setFont(8.5);
      doc.text(String(val).substring(0, 40), 135, y);
      y += 6;
    });

    // ── 5. Products Table ─────────────────────────────────────────────────
    y = Math.max(y + 6, 140);

    // Table header
    fillRect(doc, MARGIN, y, W - MARGIN * 2, 9, DARK.r, DARK.g, DARK.b);
    setFont(8.5, GOLD.r, GOLD.g, GOLD.b);

    const COL = { name: MARGIN + 2, qty: 118, unit: 142, total: 172 };
    doc.text('პროდუქტი', COL.name, y + 6);
    doc.text('რ-ბა', COL.qty, y + 6, { align: 'center' });
    doc.text('ფასი', COL.unit, y + 6, { align: 'right' });
    doc.text('ჯამი', COL.total, y + 6, { align: 'right' });
    doc.text('', W - MARGIN, y + 6, { align: 'right' }); // right edge align

    y += 9;

    // Table rows
    items.forEach((item, idx) => {
      const rowH = 10;
      const isEven = idx % 2 === 0;
      if (isEven) fillRect(doc, MARGIN, y, W - MARGIN * 2, rowH, 250, 248, 244);
      else fillRect(doc, MARGIN, y, W - MARGIN * 2, rowH, 255, 255, 255);

      const unitPrice = Number(item.price_at_purchase || 0);
      const lineTotal = unitPrice * item.quantity;

      setFont(9);
      doc.text(String(item.product_name || '').substring(0, 42), COL.name, y + 6.5);
      doc.text(String(item.quantity), COL.qty, y + 6.5, { align: 'center' });
      setFont(9, GREY.r, GREY.g, GREY.b);
      doc.text(`₾${unitPrice.toLocaleString('ka-GE')}`, COL.unit, y + 6.5, { align: 'right' });
      setFont(9);
      doc.text(`₾${lineTotal.toLocaleString('ka-GE')}`, COL.total, y + 6.5, { align: 'right' });

      // Row bottom border
      doc.setDrawColor(LINE.r, LINE.g, LINE.b);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y + rowH, W - MARGIN, y + rowH);

      y += rowH;
    });

    // ── 6. Total Box ──────────────────────────────────────────────────────
    y += 6;

    // Subtle dashed line
    doc.setDrawColor(LINE.r, LINE.g, LINE.b);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, W - MARGIN, y);
    y += 5;

    // Subtotal
    setFont(9, GREY.r, GREY.g, GREY.b);
    doc.text('ქვეჯამი:', W - MARGIN - 44, y);
    setFont(9);
    doc.text(`₾${Number(order.total_price).toLocaleString('ka-GE')}`, W - MARGIN, y, { align: 'right' });
    y += 6;

    // Delivery
    setFont(9, GREY.r, GREY.g, GREY.b);
    doc.text('მიტანა:', W - MARGIN - 44, y);
    setFont(9, 34, 197, 94);
    doc.text('უფასო', W - MARGIN, y, { align: 'right' });
    y += 8;

    // Grand Total box
    fillRect(doc, W - MARGIN - 90, y - 3, 90, 14, DARK.r, DARK.g, DARK.b);
    setFont(9, GOLD.r, GOLD.g, GOLD.b);
    doc.text('სულ გადასახდელი:', W - MARGIN - 88 + 2, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(`₾${Number(order.total_price).toLocaleString('ka-GE')}`, W - MARGIN - 2, y + 6.5, { align: 'right' });

    y += 24;

    // ── 7. Notes ──────────────────────────────────────────────────────────
    if (order.customer_note || order.notes) {
      setFont(8, GREY.r, GREY.g, GREY.b);
      doc.text('შენიშვნა:', MARGIN, y);
      setFont(8.5);
      doc.text(String(order.customer_note || order.notes).substring(0, 80), MARGIN, y + 6);
      y += 16;
    }

    // ── 8. Footer ─────────────────────────────────────────────────────────
    const footerY = 280;
    fillRect(doc, 0, footerY, W, 17, DARK.r, DARK.g, DARK.b);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 145, 138);
    doc.text('გმადლობთ, KALE GROUP-ის მომსახურებით სარგებლობისთვის!', W / 2, footerY + 6, { align: 'center' });
    doc.text('www.kalegroup.ge  |  info@kalegroup.ge  |  +995 322 XX XX XX', W / 2, footerY + 12, { align: 'center' });

    // ── 9. Save ───────────────────────────────────────────────────────────
    doc.save(`KaleGroup_Receipt_${order.id.slice(0, 8).toUpperCase()}.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('PDF შექმნისას დაფიქსირდა შეცდომა. გთხოვთ სცადოთ ხელახლა.');
  }
};
