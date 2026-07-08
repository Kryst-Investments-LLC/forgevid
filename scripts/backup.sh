#!/bin/bash

# ForgeVid Backup Script
# Usage: ./scripts/backup.sh [backup_type]

set -e  # Exit on any error

# Configuration
BACKUP_TYPE=${1:-full}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="forgevid_backup_${BACKUP_TYPE}_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory
create_backup_dir() {
    log "Creating backup directory..."
    mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"
    success "Backup directory created: ${BACKUP_DIR}/${BACKUP_NAME}"
}

# Backup database
backup_database() {
    log "Backing up database..."
    
    # Load environment variables
    source .env.local
    
    # Extract database connection details
    DB_URL=${DATABASE_URL}
    
    if [ -z "$DB_URL" ]; then
        error "DATABASE_URL not found in environment"
        exit 1
    fi
    
    # Create database backup
    pg_dump "$DB_URL" > "${BACKUP_DIR}/${BACKUP_NAME}/database.sql" || {
        error "Database backup failed"
        exit 1
    }
    
    # Compress database backup
    gzip "${BACKUP_DIR}/${BACKUP_NAME}/database.sql"
    
    success "Database backup completed"
}

# Backup Redis data
backup_redis() {
    log "Backing up Redis data..."
    
    # Create Redis backup
    docker exec forgevid-redis redis-cli BGSAVE || {
        warning "Redis backup failed, continuing..."
        return 0
    }
    
    # Wait for backup to complete
    sleep 5
    
    # Copy Redis dump file
    docker cp forgevid-redis:/data/dump.rdb "${BACKUP_DIR}/${BACKUP_NAME}/redis.rdb" || {
        warning "Failed to copy Redis dump file"
    }
    
    success "Redis backup completed"
}

# Backup application files
backup_application() {
    log "Backing up application files..."
    
    # Create tar archive of application
    tar -czf "${BACKUP_DIR}/${BACKUP_NAME}/application.tar.gz" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=uploads \
        --exclude=backups \
        . || {
        error "Application backup failed"
        exit 1
    }
    
    success "Application backup completed"
}

# Backup uploads directory
backup_uploads() {
    log "Backing up uploads directory..."
    
    if [ -d "uploads" ]; then
        tar -czf "${BACKUP_DIR}/${BACKUP_NAME}/uploads.tar.gz" uploads/ || {
            warning "Uploads backup failed"
        }
        success "Uploads backup completed"
    else
        warning "Uploads directory not found"
    fi
}

# Backup logs
backup_logs() {
    log "Backing up logs..."
    
    if [ -d "logs" ]; then
        tar -czf "${BACKUP_DIR}/${BACKUP_NAME}/logs.tar.gz" logs/ || {
            warning "Logs backup failed"
        }
        success "Logs backup completed"
    else
        warning "Logs directory not found"
    fi
}

# Backup configuration files
backup_config() {
    log "Backing up configuration files..."
    
    # Backup environment files
    cp .env.local "${BACKUP_DIR}/${BACKUP_NAME}/" 2>/dev/null || {
        warning "Environment file not found"
    }
    
    # Backup Docker Compose files
    cp docker-compose*.yml "${BACKUP_DIR}/${BACKUP_NAME}/" 2>/dev/null || {
        warning "Docker Compose files not found"
    }
    
    # Backup nginx configuration
    cp nginx.conf "${BACKUP_DIR}/${BACKUP_NAME}/" 2>/dev/null || {
        warning "Nginx configuration not found"
    }
    
    # Backup monitoring configuration
    if [ -d "monitoring" ]; then
        cp -r monitoring "${BACKUP_DIR}/${BACKUP_NAME}/"
    fi
    
    success "Configuration backup completed"
}

# Create backup manifest
create_manifest() {
    log "Creating backup manifest..."
    
    cat > "${BACKUP_DIR}/${BACKUP_NAME}/manifest.json" << EOF
{
  "backup_name": "${BACKUP_NAME}",
  "backup_type": "${BACKUP_TYPE}",
  "timestamp": "${TIMESTAMP}",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "files": [
    $(ls "${BACKUP_DIR}/${BACKUP_NAME}" | sed 's/^/    "/;s/$/"/' | paste -sd ',')
  ]
}
EOF
    
    success "Backup manifest created"
}

# Compress backup
compress_backup() {
    log "Compressing backup..."
    
    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/" || {
        error "Failed to compress backup"
        exit 1
    }
    
    # Remove uncompressed directory
    rm -rf "${BACKUP_NAME}/"
    
    cd - > /dev/null
    
    success "Backup compressed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
}

# Upload to cloud storage (optional)
upload_to_cloud() {
    log "Uploading backup to cloud storage..."
    
    # Check if AWS CLI is available
    if command -v aws &> /dev/null; then
        # Upload to S3
        aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" \
            "s3://your-backup-bucket/forgevid/${BACKUP_NAME}.tar.gz" || {
            warning "Failed to upload to S3"
            return 0
        }
        success "Backup uploaded to S3"
    else
        warning "AWS CLI not found, skipping cloud upload"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Keep only last 10 backups
    ls -t "${BACKUP_DIR}"/*.tar.gz | tail -n +11 | xargs -r rm || true
    
    success "Old backups cleaned up"
}

# Verify backup
verify_backup() {
    log "Verifying backup..."
    
    # Check if backup file exists and is not empty
    if [ -f "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" ] && [ -s "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" ]; then
        success "Backup verification passed"
    else
        error "Backup verification failed"
        exit 1
    fi
}

# Main backup function
main() {
    log "Starting ForgeVid backup (${BACKUP_TYPE})"
    
    case $BACKUP_TYPE in
        "database")
            create_backup_dir
            backup_database
            ;;
        "files")
            create_backup_dir
            backup_application
            backup_uploads
            backup_logs
            backup_config
            ;;
        "redis")
            create_backup_dir
            backup_redis
            ;;
        "full"|*)
            create_backup_dir
            backup_database
            backup_redis
            backup_application
            backup_uploads
            backup_logs
            backup_config
            ;;
    esac
    
    create_manifest
    compress_backup
    verify_backup
    
    # Optional cloud upload
    if [ "$2" = "upload" ]; then
        upload_to_cloud
    fi
    
    cleanup_old_backups
    
    success "🎉 Backup completed successfully!"
    log "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    log "Backup size: $(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)"
}

# Handle script interruption
trap 'error "Backup interrupted"; exit 1' INT TERM

# Run main function
main "$@"







