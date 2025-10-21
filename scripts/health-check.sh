#!/bin/bash

# ForgeVid Health Check Script
# Usage: ./scripts/health-check.sh [endpoint]

set -e  # Exit on any error

# Configuration
ENDPOINT=${1:-"http://localhost:3000"}
TIMEOUT=30
MAX_RETRIES=3

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

# Check HTTP endpoint
check_endpoint() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    log "Checking $name at $url..."
    
    local response
    local status_code
    
    response=$(curl -s -w "%{http_code}" -o /tmp/health_response "$url" --max-time $TIMEOUT) || {
        error "$name is not responding"
        return 1
    }
    
    status_code="${response: -3}"
    
    if [ "$status_code" -eq "$expected_status" ]; then
        success "$name is healthy (HTTP $status_code)"
        return 0
    else
        error "$name returned HTTP $status_code (expected $expected_status)"
        return 1
    fi
}

# Check database connection
check_database() {
    log "Checking database connection..."
    
    # Load environment variables
    source .env.local 2>/dev/null || {
        warning "Environment file not found, skipping database check"
        return 0
    }
    
    if [ -z "$DATABASE_URL" ]; then
        warning "DATABASE_URL not set, skipping database check"
        return 0
    fi
    
    # Test database connection
    if command -v psql &> /dev/null; then
        psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1 || {
            error "Database connection failed"
            return 1
        }
        success "Database connection is healthy"
    else
        warning "psql not found, skipping database check"
    fi
}

# Check Redis connection
check_redis() {
    log "Checking Redis connection..."
    
    # Check if Redis container is running
    if docker ps | grep -q "forgevid-redis"; then
        # Test Redis connection
        docker exec forgevid-redis redis-cli ping > /dev/null 2>&1 || {
            error "Redis connection failed"
            return 1
        }
        success "Redis connection is healthy"
    else
        warning "Redis container not found, skipping Redis check"
    fi
}

# Check Docker containers
check_containers() {
    log "Checking Docker containers..."
    
    local containers=("forgevid-app" "forgevid-redis" "forgevid-nginx")
    local unhealthy_containers=()
    
    for container in "${containers[@]}"; do
        if docker ps | grep -q "$container"; then
            local status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-health-check")
            
            if [ "$status" = "healthy" ] || [ "$status" = "no-health-check" ]; then
                success "Container $container is running"
            else
                error "Container $container is unhealthy"
                unhealthy_containers+=("$container")
            fi
        else
            error "Container $container is not running"
            unhealthy_containers+=("$container")
        fi
    done
    
    if [ ${#unhealthy_containers[@]} -eq 0 ]; then
        success "All containers are healthy"
        return 0
    else
        error "Unhealthy containers: ${unhealthy_containers[*]}"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    log "Checking disk space..."
    
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 80 ]; then
        success "Disk space is healthy ($usage% used)"
        return 0
    elif [ "$usage" -lt 90 ]; then
        warning "Disk space is getting low ($usage% used)"
        return 0
    else
        error "Disk space is critically low ($usage% used)"
        return 1
    fi
}

# Check memory usage
check_memory() {
    log "Checking memory usage..."
    
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -lt 80 ]; then
        success "Memory usage is healthy ($usage% used)"
        return 0
    elif [ "$usage" -lt 90 ]; then
        warning "Memory usage is getting high ($usage% used)"
        return 0
    else
        error "Memory usage is critically high ($usage% used)"
        return 1
    fi
}

# Check application logs for errors
check_logs() {
    log "Checking application logs for errors..."
    
    local error_count=0
    
    # Check Docker logs for errors
    if docker logs forgevid-app 2>&1 | grep -i "error" | tail -10 | grep -q .; then
        warning "Found errors in application logs"
        error_count=$((error_count + 1))
    fi
    
    # Check nginx logs for errors
    if docker logs forgevid-nginx 2>&1 | grep -i "error" | tail -10 | grep -q .; then
        warning "Found errors in nginx logs"
        error_count=$((error_count + 1))
    fi
    
    if [ "$error_count" -eq 0 ]; then
        success "No critical errors found in logs"
        return 0
    else
        warning "Found $error_count log categories with errors"
        return 0
    fi
}

# Comprehensive health check
comprehensive_check() {
    log "Running comprehensive health check..."
    
    local failed_checks=0
    
    # Check main endpoints
    check_endpoint "$ENDPOINT/api/health" "Health API" || failed_checks=$((failed_checks + 1))
    check_endpoint "$ENDPOINT/api/monitoring/health" "Monitoring API" || failed_checks=$((failed_checks + 1))
    check_endpoint "$ENDPOINT" "Main Application" || failed_checks=$((failed_checks + 1))
    
    # Check infrastructure
    check_database || failed_checks=$((failed_checks + 1))
    check_redis || failed_checks=$((failed_checks + 1))
    check_containers || failed_checks=$((failed_checks + 1))
    
    # Check system resources
    check_disk_space || failed_checks=$((failed_checks + 1))
    check_memory || failed_checks=$((failed_checks + 1))
    
    # Check logs
    check_logs || failed_checks=$((failed_checks + 1))
    
    return $failed_checks
}

# Quick health check
quick_check() {
    log "Running quick health check..."
    
    check_endpoint "$ENDPOINT/api/health" "Health API" || return 1
    check_containers || return 1
    
    return 0
}

# Main function
main() {
    local check_type=${2:-"comprehensive"}
    
    log "Starting ForgeVid health check ($check_type)"
    log "Endpoint: $ENDPOINT"
    
    case $check_type in
        "quick")
            if quick_check; then
                success "🎉 Quick health check passed!"
                exit 0
            else
                error "❌ Quick health check failed!"
                exit 1
            fi
            ;;
        "comprehensive"|*)
            if comprehensive_check; then
                success "🎉 Comprehensive health check passed!"
                exit 0
            else
                error "❌ Comprehensive health check failed!"
                exit 1
            fi
            ;;
    esac
}

# Handle script interruption
trap 'error "Health check interrupted"; exit 1' INT TERM

# Run main function
main "$@"




