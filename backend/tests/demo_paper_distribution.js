import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { PDFDocument, rgb } from 'pdf-lib';

const API_BASE = 'http://localhost:5000/api';

// Helper to compile a zip archive in memory from buffers
function compileZipInMemory(files) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const buffers = [];

    archive.on('data', data => buffers.push(data));
    archive.on('end', () => resolve(Buffer.concat(buffers)));
    archive.on('error', err => reject(err));

    for (const file of files) {
      archive.append(file.buffer, { name: file.name });
    }
    archive.finalize();
  });
}

// Helper to generate a dummy PDF page buffer
async function makeDummyPdf(title) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 700]);
  page.drawText(`MOCK QUESTION PAPER: ${title}`, {
    x: 50,
    y: 600,
    size: 16,
    color: rgb(0.1, 0.5, 0.1)
  });
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

async function runDemo() {
  console.log('--- E2E SINGLE-SHOT PAPER DISTRIBUTION VERIFICATION ---');

  try {
    // 1. Log in as admin to get the access token
    console.log('1. Logging in as Admin...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'AknuAdmin@123' })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log('✔ Logged in. Token retrieved.');

    // 2. Generate a mock combined ZIP file in memory containing QP9999_123.pdf
    console.log('\n2. Compiling mock combined papers ZIP in memory...');
    const pdfBuffer = await makeDummyPdf('B.Tech II Semester - CS-101 Programming in C');
    const zipBuffer = await compileZipInMemory([
      { name: 'QP9999_123.pdf', buffer: pdfBuffer }
    ]);
    console.log(`✔ Combined ZIP compiled successfully (${zipBuffer.length} bytes).`);

    // 3. Perform the single-shot upload to /api/colleges/upload-papers
    console.log('\n3. Sending HTTP POST to /api/colleges/upload-papers...');
    
    const formData = new FormData();
    const blob = new Blob([zipBuffer], { type: 'application/zip' });
    formData.append('zipFile', blob, 'combined_papers.zip');

    const uploadRes = await fetch(`${API_BASE}/colleges/upload-papers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const uploadData = await uploadRes.json();
    console.log(`\n✔ API Response Status: ${uploadRes.status}`);
    console.log('Response Details:', JSON.stringify(uploadData, null, 2));

    if (uploadRes.status === 200 && uploadData.success) {
      console.log('\n🎉 E2E TEST COMPLETED SUCCESSFULLY!');
      console.log(`Processed files: ${uploadData.data.successCount}`);
      console.log(`Passwords generated/returned:`);
      uploadData.data.passwords.forEach(p => {
        console.log(`  • College ${p.collegeCode}: ${p.password}`);
      });
      console.log(`ZIP file created at: secure_storage/colleges/123.zip`);
    } else {
      console.log('\n❌ Test failed. See response details above.');
    }

  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  }
}

runDemo();
