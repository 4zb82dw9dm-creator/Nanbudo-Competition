const FONT_URL = "/assets/DejaVuSans.ttf";

function readCmap(font) {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const tables = view.getUint16(4);
  let cmapOffset;
  for (let index = 0; index < tables; index += 1) {
    const offset = 12 + index * 16;
    if (String.fromCharCode(...font.slice(offset, offset + 4)) === "cmap") cmapOffset = view.getUint32(offset + 8);
  }
  if (cmapOffset === undefined) throw new Error("table cmap absente");

  const count = view.getUint16(cmapOffset + 2);
  let selected;
  for (let index = 0; index < count; index += 1) {
    const record = cmapOffset + 4 + index * 8;
    const offset = cmapOffset + view.getUint32(record + 4);
    const format = view.getUint16(offset);
    if (format === 12 || (!selected && format === 4)) selected = { format, offset };
  }
  if (!selected) throw new Error("table cmap Unicode absente");

  return (codePoint) => {
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
}

const hex = (value, width = 4) => value.toString(16).padStart(width, "0").toUpperCase();

function unicodeHex(codePoint) {
  if (codePoint <= 0xffff) return hex(codePoint);
  const value = codePoint - 0x10000;
  return `${hex(0xd800 + (value >> 10))}${hex(0xdc00 + (value & 0x3ff))}`;
}

export async function downloadPdfWithDejaVu({ lines, filename, landscape = false }) {
  let response;
  try {
    response = await fetch(FONT_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    window.alert(`Impossible de générer le PDF : le fichier de police ${FONT_URL} est absent ou inaccessible.`);
    return;
  }

  const font = new Uint8Array(await response.arrayBuffer());
  let glyphFor;
  try {
    glyphFor = readCmap(font);
  } catch (error) {
    window.alert(`Impossible de générer le PDF : le fichier ${FONT_URL} n'est pas une police Unicode valide.`);
    return;
  }

  const mappings = new Map();
  const encodedLines = lines.map((line) => Array.from(String(line)).map((character) => {
    const codePoint = character.codePointAt(0);
    const glyph = glyphFor(codePoint);
    mappings.set(glyph, codePoint);
    return hex(glyph);
  }).join(""));
  const content = ["BT", "/F1 10 Tf", `36 ${landscape ? 560 : 800} Td`, "14 TL", ...encodedLines.flatMap((line) => [`<${line}> Tj`, "T*"]), "ET"].join("\n");
  const cmap = `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /DejaVuUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${mappings.size} beginbfchar\n${[...mappings].map(([glyph, codePoint]) => `<${hex(glyph)}> <${unicodeHex(codePoint)}>`).join("\n")}\nendbfchar\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${landscape ? "842 595" : "595 842"}] /Resources << /Font << /F1 4 0 R >> >> /Contents 9 0 R >>`,
    "<< /Type /Font /Subtype /Type0 /BaseFont /DejaVuSans /Encoding /Identity-H /DescendantFonts [5 0 R] /ToUnicode 8 0 R >>",
    "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /DejaVuSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 6 0 R /CIDToGIDMap /Identity /DW 600 >>",
    "<< /Type /FontDescriptor /FontName /DejaVuSans /Flags 32 /FontBBox [-1021 -463 1794 1232] /ItalicAngle 0 /Ascent 928 /Descent -236 /CapHeight 928 /StemV 80 /FontFile2 7 0 R >>",
    { prefix: `<< /Length ${font.length} /Length1 ${font.length} >>\nstream\n`, bytes: font, suffix: "\nendstream" },
    `<< /Length ${cmap.length} >>\nstream\n${cmap}\nendstream`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
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
  URL.revokeObjectURL(url);
}
