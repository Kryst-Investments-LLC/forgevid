import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

export interface LogRotationConfig {
  maxFiles: number;
  maxSize: string;
  datePattern: string;
  compress: boolean;
  retention: string;
  logDir: string;
}

export class LogRotator {
  private config: LogRotationConfig;
  private logFiles: Map<string, { size: number; lastRotation: Date }> = new Map();

  constructor(config: LogRotationConfig) {
    this.config = config;
    this.ensureLogDirectory();
    this.startRotationTimer();
  }

  private ensureLogDirectory(): void {
    if (!existsSync(this.config.logDir)) {
      mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  private parseSize(sizeStr: string): number {
    const units: { [key: string]: number } = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
    };

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
    if (!match) {
      throw new Error(`Invalid size format: ${sizeStr}`);
    }

    const size = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return size * units[unit];
  }

  private parseRetention(retentionStr: string): number {
    const match = retentionStr.match(/^(\d+)(d|h|m)$/i);
    if (!match) {
      throw new Error(`Invalid retention format: ${retentionStr}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000; // days to milliseconds
      case 'h': return value * 60 * 60 * 1000; // hours to milliseconds
      case 'm': return value * 60 * 1000; // minutes to milliseconds
      default: throw new Error(`Invalid retention unit: ${unit}`);
    }
  }

  private getLogFileName(baseName: string, timestamp: Date): string {
    const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    return `${baseName}.${dateStr}.log`;
  }

  private async compressLogFile(filePath: string): Promise<void> {
    if (!this.config.compress) return;

    try {
      const { readFile } = await import('fs/promises');
      const data = await readFile(filePath);
      const compressed = await gzipAsync(data);
      
      const { writeFile } = await import('fs/promises');
      await writeFile(`${filePath}.gz`, compressed);
      
      // Remove original file after compression
      unlinkSync(filePath);
    } catch (error) {
      console.error('Error compressing log file:', error);
    }
  }

  private async rotateLogFile(filePath: string): Promise<void> {
    try {
      const stats = statSync(filePath);
      const maxSize = this.parseSize(this.config.maxSize);
      
      if (stats.size >= maxSize) {
        const timestamp = new Date();
        const rotatedPath = `${filePath}.${timestamp.getTime()}`;
        
        // Rename current file
        const { rename } = await import('fs/promises');
        await rename(filePath, rotatedPath);
        
        // Compress if enabled
        await this.compressLogFile(rotatedPath);
        
        console.log(`Log rotated: ${filePath} -> ${rotatedPath}`);
      }
    } catch (error) {
      console.error('Error rotating log file:', error);
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = readdirSync(this.config.logDir);
      const retentionMs = this.parseRetention(this.config.retention);
      const cutoffTime = Date.now() - retentionMs;
      
      for (const file of files) {
        const filePath = join(this.config.logDir, file);
        const stats = statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          unlinkSync(filePath);
          console.log(`Deleted old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }

  private async limitLogFiles(): Promise<void> {
    try {
      const files = readdirSync(this.config.logDir)
        .filter(file => extname(file) === '.log' || file.endsWith('.gz'))
        .map(file => ({
          name: file,
          path: join(this.config.logDir, file),
          mtime: statSync(join(this.config.logDir, file)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      if (files.length > this.config.maxFiles) {
        const filesToDelete = files.slice(this.config.maxFiles);
        
        for (const file of filesToDelete) {
          unlinkSync(file.path);
          console.log(`Deleted excess log file: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Error limiting log files:', error);
    }
  }

  private startRotationTimer(): void {
    // Check every hour
    setInterval(async () => {
      await this.performRotation();
    }, 60 * 60 * 1000);

    // Initial rotation check
    setTimeout(() => {
      this.performRotation();
    }, 1000);
  }

  private async performRotation(): Promise<void> {
    try {
      const files = readdirSync(this.config.logDir)
        .filter(file => extname(file) === '.log')
        .map(file => join(this.config.logDir, file));

      // Rotate files that exceed size limit
      for (const file of files) {
        await this.rotateLogFile(file);
      }

      // Clean up old files
      await this.cleanupOldLogs();
      
      // Limit number of files
      await this.limitLogFiles();
    } catch (error) {
      console.error('Error during log rotation:', error);
    }
  }

  public async rotateFile(filePath: string): Promise<void> {
    await this.rotateLogFile(filePath);
  }

  public async cleanup(): Promise<void> {
    await this.cleanupOldLogs();
    await this.limitLogFiles();
  }
}

// Create log rotator instance
const logRotator = new LogRotator({
  maxFiles: 30,
  maxSize: '100MB',
  datePattern: 'YYYY-MM-DD',
  compress: true,
  retention: '30d',
  logDir: join(process.cwd(), 'logs'),
});

export default logRotator;
