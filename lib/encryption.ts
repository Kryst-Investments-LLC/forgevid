import crypto from 'crypto';

const algorithm = 'aes-256-gcm';

function loadEncryptionKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }

  // Support Base64-encoded keys (preferred) or raw hex keys
  let keyBuffer: Buffer;
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    // Hex-encoded 32-byte key
    keyBuffer = Buffer.from(rawKey, 'hex');
  } else if (rawKey.length === 44 && /^[A-Za-z0-9+/=]+$/.test(rawKey)) {
    // Base64-encoded key
    keyBuffer = Buffer.from(rawKey, 'base64');
  } else if (rawKey.length === 32) {
    // Raw UTF-8 key (legacy support)
    keyBuffer = Buffer.from(rawKey, 'utf8');
  } else {
    throw new Error(
      'ENCRYPTION_KEY must be either: ' +
      '32 raw UTF-8 characters, 64 hex characters, or a Base64-encoded 32-byte key. ' +
      'Generate with: openssl rand -base64 32'
    );
  }

  if (keyBuffer.length !== 32) {
    throw new Error(`ENCRYPTION_KEY decoded to ${keyBuffer.length} bytes, expected 32.`);
  }

  return keyBuffer;
}

// Resolved on first use, not at import: `next build` imports every route to
// collect page data, where runtime-only secrets are absent.
let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (!cachedKey) cachedKey = loadEncryptionKey();
  return cachedKey;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

export function decrypt(encryptedData: EncryptedData): string {
  const { encrypted, iv, tag } = encryptedData;
  
  const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function encryptSensitiveData(data: any): string {
  const jsonString = JSON.stringify(data);
  const encrypted = encrypt(jsonString);
  return JSON.stringify(encrypted);
}

export function decryptSensitiveData(encryptedString: string): any {
  const encryptedData = JSON.parse(encryptedString);
  const decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted);
}

// Hash passwords securely
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const hashToVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  // Use timing-safe comparison to prevent timing attacks
  const hashBuffer = Buffer.from(hash, 'hex');
  const verifyBuffer = Buffer.from(hashToVerify, 'hex');
  if (hashBuffer.length !== verifyBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, verifyBuffer);
}

// Generate secure random tokens
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateAPIKey(): string {
  const prefix = 'fv_';
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${randomPart}`;
}

// Encrypt file data
export function encryptFile(buffer: Buffer): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  
  let encrypted = cipher.update(buffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

export function decryptFile(encryptedData: EncryptedData): Buffer {
  const { encrypted, iv, tag } = encryptedData;
  
  const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted;
}
