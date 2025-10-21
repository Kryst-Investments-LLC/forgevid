#!/bin/bash

# ForgeVid Production Deployment Script
# Usage: ./scripts/deploy.sh [environment] [version]

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}
PROJECT_NAME="forgevid"
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"your-registry.com"}
DOCKER_IMAGE="${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION}"

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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f ".env.local" ]; then
        error "Environment file .env.local not found"
        exit 1
    fi
    
    # Check if required environment variables are set
    source .env.local
    required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "JWT_SECRET")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    success "Prerequisites check passed"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    # Unit tests
    log "Running unit tests..."
    npm run test || {
        error "Unit tests failed"
        exit 1
    }
    
    # Integration tests
    log "Running integration tests..."
    npm run test -- --testPathPattern=integration || {
        error "Integration tests failed"
        exit 1
    }
    
    # Type checking
    log "Running type check..."
    npm run type-check || {
        error "Type check failed"
        exit 1
    }
    
    # Linting
    log "Running linter..."
    npm run lint || {
        error "Linting failed"
        exit 1
    }
    
    success "All tests passed"
}

# Build application
build_application() {
    log "Building application..."
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci || {
        error "Failed to install dependencies"
        exit 1
    }
    
    # Generate Prisma client
    log "Generating Prisma client..."
    npm run db:generate || {
        error "Failed to generate Prisma client"
        exit 1
    }
    
    # Build application
    log "Building Next.js application..."
    npm run build || {
        error "Failed to build application"
        exit 1
    }
    
    success "Application built successfully"
}

# Build Docker image
build_docker_image() {
    log "Building Docker image..."
    
    # Build image
    docker build -t "${DOCKER_IMAGE}" . || {
        error "Failed to build Docker image"
        exit 1
    }
    
    # Tag as latest if not already
    if [ "$VERSION" != "latest" ]; then
        docker tag "${DOCKER_IMAGE}" "${DOCKER_REGISTRY}/${PROJECT_NAME}:latest"
    fi
    
    success "Docker image built: ${DOCKER_IMAGE}"
}

# Push Docker image
push_docker_image() {
    log "Pushing Docker image to registry..."
    
    docker push "${DOCKER_IMAGE}" || {
        error "Failed to push Docker image"
        exit 1
    }
    
    if [ "$VERSION" != "latest" ]; then
        docker push "${DOCKER_REGISTRY}/${PROJECT_NAME}:latest"
    fi
    
    success "Docker image pushed to registry"
}

# Deploy to environment
deploy_to_environment() {
    log "Deploying to ${ENVIRONMENT} environment..."
    
    # Create backup of current deployment
    log "Creating backup..."
    docker-compose -f docker-compose.prod.yml down --volumes --remove-orphans || true
    
    # Pull latest image
    log "Pulling latest image..."
    docker-compose -f docker-compose.prod.yml pull || {
        error "Failed to pull Docker images"
        exit 1
    }
    
    # Start services
    log "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d || {
        error "Failed to start services"
        exit 1
    }
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check health
    check_health || {
        error "Health check failed"
        exit 1
    }
    
    success "Deployment completed successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    docker-compose -f docker-compose.prod.yml exec forgevid npm run db:deploy || {
        error "Database migrations failed"
        exit 1
    }
    
    success "Database migrations completed"
}

# Health check
check_health() {
    log "Performing health check..."
    
    # Check if application is responding
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:3000/api/health > /dev/null; then
            success "Application health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Cleanup old images
cleanup_old_images() {
    log "Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f || true
    
    # Remove old versions (keep last 5)
    docker images "${DOCKER_REGISTRY}/${PROJECT_NAME}" --format "table {{.Tag}}\t{{.ID}}" | \
    tail -n +2 | \
    sort -V | \
    head -n -5 | \
    awk '{print $2}' | \
    xargs -r docker rmi || true
    
    success "Cleanup completed"
}

# Rollback deployment
rollback() {
    log "Rolling back deployment..."
    
    # Stop current services
    docker-compose -f docker-compose.prod.yml down || true
    
    # Start previous version (if backup exists)
    if [ -f "docker-compose.backup.yml" ]; then
        docker-compose -f docker-compose.backup.yml up -d || {
            error "Rollback failed"
            exit 1
        }
        success "Rollback completed"
    else
        error "No backup found for rollback"
        exit 1
    fi
}

# Main deployment function
main() {
    log "Starting ForgeVid deployment to ${ENVIRONMENT} environment"
    
    # Check if rollback is requested
    if [ "$1" = "rollback" ]; then
        rollback
        exit 0
    fi
    
    # Run deployment steps
    check_prerequisites
    run_tests
    build_application
    build_docker_image
    
    # Only push to registry if not local deployment
    if [ "$ENVIRONMENT" != "local" ]; then
        push_docker_image
    fi
    
    # Deploy to environment
    deploy_to_environment
    run_migrations
    
    # Cleanup
    cleanup_old_images
    
    success "🎉 Deployment completed successfully!"
    log "Application is available at: http://localhost:3000"
    log "Health check: http://localhost:3000/api/health"
    log "Monitoring: http://localhost:3001 (Grafana)"
}

# Handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"




