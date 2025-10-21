const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backupDir = './backups';
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = `forgevid-backup-${timestamp}.sql`;

console.log('💾 Creating database backup...');

try {
  execSync(`pg_dump ${process.env.DATABASE_URL} > ${path.join(backupDir, backupFile)}`, { stdio: 'inherit' });
  console.log(`✅ Backup created: ${backupFile}`);
  
  // Optional: Upload to S3/Cloudinary for offsite backup
  if (process.env.BACKUP_UPLOAD_URL) {
    console.log('📤 Uploading backup to cloud storage...');
    // Add cloud upload logic here
  }
} catch (error) {
  console.error('❌ Backup failed:', error.message);
  process.exit(1);
}


