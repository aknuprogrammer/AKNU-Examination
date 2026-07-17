import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Load key from environment (hex format, 64 characters = 32 bytes)
function getEncryptionKey() {
  const hexKey = process.env.DAY_PASSWORD_ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error('DAY_PASSWORD_ENCRYPTION_KEY environment variable is not defined.');
  }
  if (hexKey.length !== 64) {
    throw new Error('DAY_PASSWORD_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).');
  }
  return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypt a password using AES-256-GCM
 * @param {string} text Plaintext password
 * @returns {object} { encryptedPassword, iv, tag } in hex
 */
export function encryptPassword(text) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // GCM standard IV length is 12 bytes
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag().toString('hex');
  
  return {
    encryptedPassword: encrypted,
    iv: iv.toString('hex'),
    tag: tag
  };
}

/**
 * Decrypt a password using AES-256-GCM
 * @param {string} encryptedText Hex-encoded ciphertext
 * @param {string} iv Hex-encoded IV
 * @param {string} tag Hex-encoded Auth Tag
 * @returns {string} Plaintext password
 */
export function decryptPassword(encryptedText, iv, tag) {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Helper to generate a random secure token
 * @returns {string} Hex-encoded secure random token
 */
export function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}
