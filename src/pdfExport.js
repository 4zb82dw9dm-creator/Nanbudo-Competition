const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/3.0.3/jspdf.umd.min.js";
const FONT_REGULAR_URL = `${import.meta.env.BASE_URL}assets/DejaVuSans.ttf`;
const FONT_BOLD_URL = `${import.meta.env.BASE_URL}assets/DejaVuSans-Bold.ttf`;

let jsPdfPromise;

function loadJsPdf() {
  if (globalThis.jspdf?.jsPDF) return Promise.resolve(globalThis.jspdf.jsPDF);
  if (jsPdfPromise) return jsPdfPromise;

  jsPdfPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = JSPDF_URL;
    script.async = true;
    script.onload = () => globalThis.jspdf?.jsPDF
      ? resolve(globalThis.jspdf.jsPDF)
      : reject(new Error("jsPDF ne s'est pas initialisé"));
    script.onerror = () => reject(new Error("jsPDF est inaccessible"));
    document.head.appendChild(script);
  });
  return jsPdfPromise;
}

async function fontAsBinaryString(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} (HTTP ${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let value = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    value += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return value;
}

function triggerDownload(pdf, filename) {
  const url = URL.createObjectURL(pdf.output("blob"));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function openPdfInWindow(pdf, previewWindow) {
  const url = URL.createObjectURL(pdf.output("blob"));
  previewWindow.location.replace(url);
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
}

async function createPdf(orientation = "portrait") {
  const [jsPDF, regularFont, boldFont] = await Promise.all([
    loadJsPdf(),
    fontAsBinaryString(FONT_REGULAR_URL),
    fontAsBinaryString(FONT_BOLD_URL),
  ]);
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4", compress: true });
  pdf.addFileToVFS("DejaVuSans.ttf", regularFont);
  pdf.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
  pdf.addFileToVFS("DejaVuSans-Bold.ttf", boldFont);
  pdf.addFont("DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
  return pdf;
}

function drawResults(pdf, document) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 42;
  const bottomMargin = 42;
  let y;

  const header = () => {
    y = 55;
    pdf.setTextColor(25, 25, 25);
    pdf.setFont("DejaVuSans", "bold");
    pdf.setFontSize(19);
    pdf.text(document.title, margin, y);
    y += 25;
    pdf.setFont("DejaVuSans", "normal");
    pdf.setFontSize(12.5);
    pdf.text(document.subtitle, margin, y);
    y += 17;
    pdf.setDrawColor(210, 210, 210);
    pdf.setLineWidth(0.6);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 27;
  };

  header();
  if (!document.categories.length) {
    pdf.setFontSize(11.5);
    pdf.text(document.emptyMessage, margin, y);
    return;
  }

  document.categories.forEach((category) => {
    const titleLines = pdf.splitTextToSize(category.title, pageWidth - margin * 2);
    const blockHeight = titleLines.length * 17 + category.rankings.length * 19 + 28;
    if (y + blockHeight > pageHeight - bottomMargin) {
      pdf.addPage();
      header();
    }

    pdf.setFont("DejaVuSans", "bold");
    pdf.setFontSize(13.5);
    pdf.text(titleLines, margin, y);
    y += titleLines.length * 17 + 11;
    category.rankings.forEach(({ label, name }) => {
      pdf.setFontSize(11.5);
      pdf.setFont("DejaVuSans", "bold");
      pdf.text(label, margin + 8, y);
      const nameX = margin + 8 + pdf.getTextWidth(label) + 6;
      pdf.setFont("DejaVuSans", "normal");
      pdf.text(name, nameX, y);
      y += 19;
    });
    y += 24;
  });
}

function drawLegacyLines(pdf, lines) {
  const margin = 36;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = margin;
  pdf.setFont("DejaVuSans", "normal");
  pdf.setFontSize(9);
  lines.forEach((line) => {
    const wrapped = pdf.splitTextToSize(String(line), pageWidth - margin * 2);
    if (y + wrapped.length * 12 > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(wrapped, margin, y);
    y += Math.max(1, wrapped.length) * 12;
  });
}

export async function downloadPdfWithDejaVu({
  document: pdfDocument,
  lines,
  filename,
  landscape = false,
  openInNewWindow = false,
}) {
  let previewWindow = null;

  if (openInNewWindow) {
    // Open synchronously while we are still inside the user's click event.
    // This is required by Safari/iPadOS to avoid popup blocking after awaits.
    previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.document.open();
      previewWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="UTF-8"><title>Préparation du PDF</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:24px"><p>Préparation du PDF…</p></body></html>`);
      previewWindow.document.close();
    }
  }

  try {
    const pdf = await createPdf(landscape ? "landscape" : "portrait");
    if (pdfDocument) drawResults(pdf, pdfDocument);
    else drawLegacyLines(pdf, lines || []);

    if (previewWindow && !previewWindow.closed) {
      openPdfInWindow(pdf, previewWindow);
    } else {
      triggerDownload(pdf, filename);
      if (openInNewWindow) {
        window.alert("Le nouvel onglet a été bloqué. Autorisez les fenêtres surgissantes pour ouvrir le PDF sans quitter la page.");
      }
    }
  } catch (error) {
    console.error("Échec de la génération du PDF", error);
    if (previewWindow && !previewWindow.closed) previewWindow.close();
    window.alert("Impossible de générer le PDF. Vérifiez la connexion et la présence des fontes DejaVuSans normale et bold dans public/assets.");
  }
}
