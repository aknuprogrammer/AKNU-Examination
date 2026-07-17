import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import registerZipEncrypted from 'archiver-zip-encrypted';

// Register the encryption plugin with archiver
archiver.registerFormat('zip-encrypted', registerZipEncrypted);

async function run() {
  const outputPath = path.resolve('scratch/test_standard.zip');
  console.log(`Creating standard PKWARE ZipCrypto ZIP at ${outputPath}...`);

  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip-encrypted', {
    zlib: { level: 9 },
    encryptionMethod: 'zip20', // PKWARE Standard ZipCrypto for native Windows extraction compatibility
    password: 'password123'
  });

  output.on('close', () => {
    console.log('✔ Zip created successfully!');
  });
  archive.on('error', (err) => {
    console.error('❌ Archive error:', err);
  });

  archive.pipe(output);
  archive.append(Buffer.from('Hello world!'), { name: 'hello.txt' });
  archive.finalize();
}

run();
