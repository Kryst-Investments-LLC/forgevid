import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!', 'utf8');

if (key.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
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
  
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
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
  return hash === hashToVerify;
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
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
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
  
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted;
}
