import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { watermarkPdf } from '../src/utils/pdfHelper.js';

async function run() {
  const zipPath = path.resolve('../combined_test_upload.zip');
  if (!fs.existsSync(zipPath)) {
    console.error('combined_test_upload.zip not found.');
    return;
  }

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const pdfEntry = entries.find(e => e.name.toLowerCase().endsWith('.pdf'));

  if (!pdfEntry) {
    console.error('No PDF found.');
    return;
  }

  console.log(`Found PDF: ${pdfEntry.name} (${pdfEntry.header.size} bytes)`);
  const originalBuffer = pdfEntry.getData();

  try {
    const watermarked = await watermarkPdf(originalBuffer, '123', '123', 'QP200');
    const outPath = path.resolve('scratch/watermarked_fixed.pdf');
    fs.writeFileSync(outPath, watermarked);
    console.log(`✔ Watermarked PDF saved! Original: ${originalBuffer.length} bytes → Watermarked: ${watermarked.length} bytes`);
    console.log(`   Saved at: ${outPath}`);
    if (watermarked.length > originalBuffer.length) {
      console.log('✔ Output is LARGER than input — original content preserved, watermarks layered on top!');
    } else {
      console.warn('⚠ Output is smaller than or same size as input — content may be stripped!');
    }
  } catch (err) {
    console.error('❌ Error during watermarking:', err);
  }
}

run();
