// Tiny dependency-free PDF writer used to create the fictional demo reports.
// Supports one A4 page of left-aligned text, with bold headings.

export interface PdfLine {
  text: string;
  bold?: boolean;
  size?: number;
}

const esc = (s: string) => s.replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1");

function wrap(line: PdfLine, width = 92): PdfLine[] {
  const max = Math.floor(width * (11 / (line.size ?? 11)));
  if (line.text.length <= max) return [line];
  const out: PdfLine[] = [];
  let cur = "";
  for (const word of line.text.split(" ")) {
    if ((cur + " " + word).trim().length > max) {
      out.push({ ...line, text: cur });
      cur = word;
    } else cur = (cur + " " + word).trim();
  }
  if (cur) out.push({ ...line, text: cur });
  return out;
}

export function textPdf(lines: PdfLine[]): Buffer {
  const all = lines.flatMap((l) => wrap(l));
  const ops: string[] = ["BT", "56 790 Td"];
  for (const l of all) {
    const size = l.size ?? 11;
    ops.push(`/${l.bold ? "F2" : "F1"} ${size} Tf`, `0 -${Math.round(size * 1.45)} Td`, `(${esc(l.text)}) Tj`);
  }
  ops.push("ET");
  const stream = ops.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}
