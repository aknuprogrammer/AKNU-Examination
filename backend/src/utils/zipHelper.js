import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import registerZipEncrypted from 'archiver-zip-encrypted';

// Register the AES-256 encryption plugin with archiver
archiver.registerFormat('zip-encrypted', registerZipEncrypted);

/**
 * Creates an AES-256 encrypted ZIP archive from files in memory
 * @param {Array<{name: string, buffer: Buffer}>} files Array of objects containing filename and buffer
 * @param {string} outputPath Filepath to write the encrypted ZIP to
 * @param {string} password ZIP extraction password
 * @returns {Promise<void>} Resolves when ZIP stream writes successfully
 */
export function createEncryptedZip(files, outputPath, password) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip-encrypted', {
      zlib: { level: 9 },
      encryptionMethod: 'zip20',
      password: password
    });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    for (const file of files) {
      archive.append(file.buffer, { name: file.name });
    }

    archive.finalize();
  });
}
