const FONT_URL = `${import.meta.env.BASE_URL}assets/DejaVuSans.ttf`;

function readFont(font) {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const tables = new Map();
  const tableCount = view.getUint16(4);
  for (let index = 0; index < tableCount; index += 1) {
    const offset = 12 + index * 16;
    tables.set(String.fromCharCode(...font.slice(offset, offset + 4)), view.getUint32(offset + 8));
  }

  const cmapOffset = tables.get("cmap");
  if (cmapOffset === undefined) throw new Error("table cmap absente");
  const cmapCount = view.getUint16(cmapOffset + 2);
  let selected;
  for (let index = 0; index < cmapCount; index += 1) {
    const record = cmapOffset + 4 + index * 8;
    const offset = cmapOffset + view.getUint32(record + 4);
    const format = view.getUint16(offset);
    if (format === 12 || (!selected && format === 4)) selected = { format, offset };
  }
  if (!selected) throw new Error("table cmap Unicode absente");

  const glyphFor = (codePoint) => {
    const { format, offset } = selected;
    if (format === 12) {
      const groups = view.getUint32(offset + 12);
      for (let index = 0; index < groups; index += 1) {
        const group = offset + 16 + index * 12;
        const start = view.getUint32(group);
        const end = view.getUint32(group + 4);
        if (codePoint >= start && codePoint <= end) return view.getUint32(group + 8) + codePoint - start;
      }
      return 0;
    }
    const segments = view.getUint16(offset + 6) / 2;
    const endCodes = offset + 14;
    const startCodes = endCodes + segments * 2 + 2;
    const deltas = startCodes + segments * 2;
    const ranges = deltas + segments * 2;
    for (let index = 0; index < segments; index += 1) {
      const start = view.getUint16(startCodes + index * 2);
      const end = view.getUint16(endCodes + index * 2);
      if (codePoint < start || codePoint > end) continue;
      const range = view.getUint16(ranges + index * 2);
      if (!range) return (codePoint + view.getInt16(deltas + index * 2)) & 0xffff;
      const glyphOffset = ranges + index * 2 + range + (codePoint - start) * 2;
      const glyph = view.getUint16(glyphOffset);
      return glyph ? (glyph + view.getInt16(deltas + index * 2)) & 0xffff : 0;
    }
    return 0;
  };

  const head = tables.get("head");
  const hhea = tables.get("hhea");
  const hmtx = tables.get("hmtx");
  if (head === undefined || hhea === undefined || hmtx === undefined) throw new Error("métriques de police absentes");
  const unitsPerEm = view.getUint16(head + 18);
  const longMetrics = view.getUint16(hhea + 34);
  const widthFor = (glyph) => {
    const metric = Math.min(glyph, longMetrics - 1);
    return Math.round(view.getUint16(hmtx + metric * 4) * 1000 / unitsPerEm);
  };
  return { glyphFor, widthFor };
}

const hex = (value, width = 4) => value.toString(16).padStart(width, "0").toUpperCase();

function unicodeHex(codePoint) {
  if (codePoint <= 0xffff) return hex(codePoint);
  const value = codePoint - 0x10000;
  return `${hex(0xd800 + (value >> 10))}${hex(0xdc00 + (value & 0x3ff))}`;
}

export async function downloadPdfWithDejaVu({ document: pdfDocument, filename }) {
  let response;
  try {
    response = await fetch(FONT_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    window.alert(`Impossible de générer le PDF : le fichier de police ${FONT_URL} est absent ou inaccessible.`);
    return;
  }

  const font = new Uint8Array(await response.arrayBuffer());
  let fontData;
  try {
    fontData = readFont(font);
  } catch (error) {
    window.alert(`Impossible de générer le PDF : le fichier ${FONT_URL} n'est pas une police Unicode valide.`);
    return;
  }

  const mappings = new Map();
  const encode = (value) => Array.from(String(value)).map((character) => {
    const codePoint = character.codePointAt(0);
    const glyph = fontData.glyphFor(codePoint);
    mappings.set(glyph, codePoint);
    return hex(glyph);
  }).join("");
  const text = (value, x, y, size, bold = false) => [
    "BT", `/F1 ${size} Tf`, "0 Tc", "100 Tz", bold ? "0.35 w 2 Tr" : "0 Tr",
    `1 0 0 1 ${x} ${y} Tm`, `<${encode(value)}> Tj`, "ET",
  ].join("\n");

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const pages = [];
  let commands;
  let y;
  const startPage = () => {
    commands = ["1 1 1 rg", `0 0 ${pageWidth} ${pageHeight} re f`, "0 0 0 rg"];
    pages.push(commands);
    y = pageHeight - margin;
  };
  const addHeader = () => {
    commands.push(text(pdfDocument.title, margin, y - 18, 19, true));
    commands.push(text(pdfDocument.subtitle, margin, y - 43, 13));
    commands.push("0.72 G", "0.6 w", `${margin} ${y - 57} m ${pageWidth - margin} ${y - 57} l S`, "0 G");
    y -= 83;
  };

  startPage();
  addHeader();
  if (!pdfDocument.categories.length) {
    commands.push(text(pdfDocument.emptyMessage, margin, y, 11.5));
  } else {
    pdfDocument.categories.forEach((category) => {
      const blockHeight = 31 + category.rankings.length * 18 + 24;
      if (y - blockHeight < margin) {
        startPage();
        addHeader();
      }
      commands.push(text(category.title, margin, y, 14, true));
      y -= 29;
      category.rankings.forEach((ranking) => {
        commands.push(text(ranking.label, margin + 8, y, 11.5, true));
        commands.push(text(ranking.name, margin + 42, y, 11.5));
        y -= 18;
      });
      y -= 24;
    });
  }

  const cmap = `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /DejaVuUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${mappings.size} beginbfchar\n${[...mappings].map(([glyph, codePoint]) => `<${hex(glyph)}> <${unicodeHex(codePoint)}>`).join("\n")}\nendbfchar\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
  const widths = [...mappings.keys()].sort((a, b) => a - b).map((glyph) => `${glyph} [${fontData.widthFor(glyph)}]`).join(" ");
  const pageCount = pages.length;
  const contentStart = 3 + pageCount;
  const fontId = contentStart + pageCount;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index} 0 R`).join(" ")}] /Count ${pageCount} >>`,
    ...pages.map((_, index) => `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentStart + index} 0 R >>`),
    ...pages.map((page) => {
      const content = page.join("\n");
      return `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`;
    }),
    `<< /Type /Font /Subtype /Type0 /BaseFont /DejaVuSans /Encoding /Identity-H /DescendantFonts [${fontId + 1} 0 R] /ToUnicode ${fontId + 4} 0 R >>`,
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /DejaVuSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${fontId + 2} 0 R /CIDToGIDMap /Identity /DW 600 /W [${widths}] >>`,
    `<< /Type /FontDescriptor /FontName /DejaVuSans /Flags 32 /FontBBox [-1021 -463 1794 1232] /ItalicAngle 0 /Ascent 928 /Descent -236 /CapHeight 928 /StemV 80 /FontFile2 ${fontId + 3} 0 R >>`,
    { prefix: `<< /Length ${font.length} /Length1 ${font.length} >>\nstream\n`, bytes: font, suffix: "\nendstream" },
    `<< /Length ${new TextEncoder().encode(cmap).length} >>\nstream\n${cmap}\nendstream`,
  ];
  const encoder = new TextEncoder();
  const chunks = [encoder.encode("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n")];
  const offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const parts = typeof object === "string" ? [object] : [object.prefix, object.bytes, object.suffix];
    const objectChunks = [encoder.encode(`${index + 1} 0 obj\n`), ...parts.map((part) => typeof part === "string" ? encoder.encode(part) : part), encoder.encode("\nendobj\n")];
    objectChunks.forEach((chunk) => { chunks.push(chunk); length += chunk.length; });
  });
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF`;
  chunks.push(encoder.encode(xref));
  const url = URL.createObjectURL(new Blob(chunks, { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
