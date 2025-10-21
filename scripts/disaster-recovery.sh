#!/bin/bash

# ForgeVid Disaster Recovery Script
# This script automates the disaster recovery process

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
LOG_FILE="/var/log/disaster-recovery.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RECOVERY_MODE="${1:-full}" # full, database, application, data

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
    fi
    
    # Check required tools
    local required_tools=("docker" "docker-compose" "psql" "redis-cli" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool '$tool' is not installed"
        fi
    done
    
    # Check backup directory
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
    
    log "Prerequisites check completed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    local backup_name="forgevid_backup_${TIMESTAMP}"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    mkdir -p "$backup_path"
    
    # Database backup
    log "Backing up database..."
    pg_dump "$DATABASE_URL" > "${backup_path}/database.sql"
    
    # Redis backup
    log "Backing up Redis..."
    redis-cli --rdb "${backup_path}/redis.rdb"
    
    # Application backup
    log "Backing up application..."
    tar -czf "${backup_path}/application.tar.gz" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=.git \
        /app
    
    # Configuration backup
    log "Backing up configuration..."
    cp -r /app/config "${backup_path}/"
    cp /app/.env.production "${backup_path}/"
    
    # Media assets backup (if using local storage)
    if [[ -d "/app/public/uploads" ]]; then
        log "Backing up media assets..."
        tar -czf "${backup_path}/media_assets.tar.gz" /app/public/uploads
    fi
    
    # Create backup manifest
    cat > "${backup_path}/manifest.json" << EOF
{
    "timestamp": "$TIMESTAMP",
    "backup_type": "disaster_recovery",
    "version": "1.0",
    "components": {
        "database": "database.sql",
        "redis": "redis.rdb",
        "application": "application.tar.gz",
        "config": "config/",
        "environment": ".env.production",
        "media_assets": "media_assets.tar.gz"
    },
    "size": "$(du -sh "$backup_path" | cut -f1)"
}
EOF
    
    log "Backup created: $backup_path"
    echo "$backup_path"
}

# Restore database
restore_database() {
    local backup_path="$1"
    
    log "Restoring database..."
    
    # Stop application
    docker-compose -f docker-compose.ha.yml stop app1 app2 app3
    
    # Wait for connections to close
    sleep 10
    
    # Restore database
    psql "$DATABASE_URL" < "${backup_path}/database.sql"
    
    # Verify database restoration
    local table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    if [[ $table_count -gt 0 ]]; then
        log "Database restored successfully ($table_count tables)"
    else
        error "Database restoration failed"
    fi
}

# Restore Redis
restore_redis() {
    local backup_path="$1"
    
    log "Restoring Redis..."
    
    # Stop Redis
    docker-compose -f docker-compose.ha.yml stop redis redis-replica
    
    # Copy backup file
    cp "${backup_path}/redis.rdb" /var/lib/redis/data/
    
    # Start Redis
    docker-compose -f docker-compose.ha.yml start redis redis-replica
    
    # Wait for Redis to start
    sleep 5
    
    # Verify Redis restoration
    local key_count=$(redis-cli dbsize)
    if [[ $key_count -gt 0 ]]; then
        log "Redis restored successfully ($key_count keys)"
    else
        warning "Redis restoration completed but no keys found"
    fi
}

# Restore application
restore_application() {
    local backup_path="$1"
    
    log "Restoring application..."
    
    # Stop all services
    docker-compose -f docker-compose.ha.yml down
    
    # Restore application files
    tar -xzf "${backup_path}/application.tar.gz" -C /
    
    # Restore configuration
    cp -r "${backup_path}/config" /app/
    cp "${backup_path}/.env.production" /app/
    
    # Restore media assets
    if [[ -f "${backup_path}/media_assets.tar.gz" ]]; then
        tar -xzf "${backup_path}/media_assets.tar.gz" -C /
    fi
    
    # Rebuild application
    cd /app
    npm ci --legacy-peer-deps
    npm run build
    
    log "Application restored successfully"
}

# Start services
start_services() {
    log "Starting services..."
    
    # Start infrastructure services first
    docker-compose -f docker-compose.ha.yml up -d postgres redis nginx
    
    # Wait for infrastructure to be ready
    sleep 30
    
    # Start application services
    docker-compose -f docker-compose.ha.yml up -d app1 app2 app3
    
    # Wait for application to be ready
    sleep 60
    
    # Verify services are running
    local app_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health)
    if [[ $app_health == "200" ]]; then
        log "Services started successfully"
    else
        error "Services failed to start (HTTP $app_health)"
    fi
}

# Verify recovery
verify_recovery() {
    log "Verifying recovery..."
    
    # Health check
    local health_status=$(curl -s http://localhost/api/health | jq -r '.status')
    if [[ $health_status == "healthy" ]]; then
        log "Health check passed"
    else
        error "Health check failed: $health_status"
    fi
    
    # Database connectivity
    local db_status=$(psql "$DATABASE_URL" -t -c "SELECT 1;" 2>/dev/null)
    if [[ $db_status == "1" ]]; then
        log "Database connectivity verified"
    else
        error "Database connectivity failed"
    fi
    
    # Redis connectivity
    local redis_status=$(redis-cli ping)
    if [[ $redis_status == "PONG" ]]; then
        log "Redis connectivity verified"
    else
        error "Redis connectivity failed"
    fi
    
    # Application functionality
    local api_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/videos)
    if [[ $api_status == "200" || $api_status == "401" ]]; then
        log "API functionality verified"
    else
        error "API functionality failed (HTTP $api_status)"
    fi
    
    log "Recovery verification completed successfully"
}

# Send notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    log "Sending notifications..."
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"ForgeVid Disaster Recovery: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # Email notification
    if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo "ForgeVid Disaster Recovery: $message" | mail -s "Disaster Recovery Status" "$NOTIFICATION_EMAIL"
    fi
    
    log "Notifications sent"
}

# Main recovery function
main() {
    log "Starting disaster recovery process (mode: $RECOVERY_MODE)"
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup before recovery
    local backup_path
    backup_path=$(create_backup)
    
    case $RECOVERY_MODE in
        "full")
            log "Performing full system recovery..."
            restore_database "$backup_path"
            restore_redis "$backup_path"
            restore_application "$backup_path"
            start_services
            ;;
        "database")
            log "Performing database recovery..."
            restore_database "$backup_path"
            start_services
            ;;
        "application")
            log "Performing application recovery..."
            restore_application "$backup_path"
            start_services
            ;;
        "data")
            log "Performing data recovery..."
            restore_database "$backup_path"
            restore_redis "$backup_path"
            start_services
            ;;
        *)
            error "Invalid recovery mode: $RECOVERY_MODE"
            ;;
    esac
    
    # Verify recovery
    verify_recovery
    
    # Send success notification
    send_notifications "success" "Recovery completed successfully"
    
    log "Disaster recovery process completed successfully"
}

# Error handling
trap 'error "Recovery failed at line $LINENO"' ERR

# Run main function
main "$@"


