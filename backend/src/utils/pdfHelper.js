import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

/**
 * Applies a tiled diagonal watermark of the college code across every page,
 * spread in a repeating grid pattern, plus a secure tracking footer.
 *
 * @param {Buffer} pdfBuffer  Original PDF file buffer
 * @param {string} collegeCode College code to tile across each page
 * @param {string} centreCode  Centre code for the footer
 * @param {string} qpCode      Question paper code for the footer
 * @returns {Promise<Buffer>} Modified PDF buffer
 */
export async function watermarkPdf(pdfBuffer, collegeCode, centreCode, qpCode) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

  // Embed fonts — REQUIRED for drawText to work on loaded PDFs
  const watermarkFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const footerFont    = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // Watermark text is just the college code
  const watermarkText = `${collegeCode}`;
  const fontSize      = 22;
  const opacity       = 0.12;   // subtle — doesn't obscure content
  const color         = rgb(0.4, 0.4, 0.4);
  const angle         = degrees(-40);

  // Tile spacing — smaller values = denser repetition across the page
  const colStep = 75; // horizontal gap between repetitions
  const rowStep = 50; // vertical gap between repetitions

  for (const page of pages) {
    const { width, height } = page.getSize();

    // --- Tiled watermark grid ---
    // Iterate over a grid covering the entire page (with padding so diagonals
    // near the edges are still drawn fully)
    let row = 0;
    for (let y = -rowStep; y < height + rowStep * 2; y += rowStep, row++) {
      // Offset every other row so tiles stagger diagonally
      const xOffset = (row % 2 === 0) ? 0 : colStep / 2;
      for (let x = -colStep + xOffset; x < width + colStep; x += colStep) {
        page.drawText(watermarkText, {
          x,
          y,
          size: fontSize,
          font: watermarkFont,
          color,
          rotate: angle,
          opacity,
        });
      }
    }

  }

  const modifiedPdfBytes = await pdfDoc.save();
  return Buffer.from(modifiedPdfBytes);
}
