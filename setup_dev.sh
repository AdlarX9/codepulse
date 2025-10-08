#!/bin/bash
set -e

echo "🚀 Setting up CodePulse Development Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running from project root
if [ ! -f "package.json" ] || [ ! -d "apps" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check dependencies
print_status "Checking dependencies..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is required but not installed. Please install Docker first."
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is required but not installed. Please install Docker Compose first."
    exit 1
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm not found. Installing pnpm..."
    npm install -g pnpm
fi

print_success "All dependencies are available"

# Create environment file for development
print_status "Setting up environment configuration..."

if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    
    # Generate secure secrets for development
    JWT_SECRET=$(openssl rand -base64 32)
    SALT=$(openssl rand -base64 16)
    
    # Update .env file with development values
    sed -i.bak "s/ENV=production/ENV=development/" .env
    sed -i.bak "s/DOMAIN=your-domain.com/DOMAIN=localhost/" .env
    sed -i.bak "s/your_secure_database_password/dev_password/" .env
    sed -i.bak "s/your_secure_redis_password/dev_redis_pass/" .env
    sed -i.bak "s/your_jwt_secret_key_here/${JWT_SECRET}/" .env
    sed -i.bak "s/your_random_salt_for_ip_hashing/${SALT}/" .env
    
    # Remove backup file
    rm .env.bak
    
    print_success "Environment file created with development settings"
else
    print_warning ".env file already exists, skipping creation"
fi

# Setup web app environment
print_status "Setting up web application environment..."
if [ ! -f "apps/web/.env.local" ]; then
    cat > apps/web/.env.local << EOF
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8080
EOF
    print_success "Web app environment created"
else
    print_warning "Web app .env.local already exists, skipping"
fi

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
pnpm install
print_success "Node.js dependencies installed"

# Initialize Go modules
print_status "Initializing Go modules..."
cd apps/api
if [ ! -f "go.sum" ] || [ ! -s "go.sum" ]; then
    go mod tidy
    print_success "Go modules initialized"
else
    print_warning "Go modules already initialized"
fi
cd ../..

# Create required directories
print_status "Creating required directories..."
mkdir -p certs
mkdir -p nginx/html
mkdir -p apps/api/tmp

# Create development SSL certificates (self-signed)
if [ ! -f "certs/fullchain.pem" ]; then
    print_status "Creating self-signed SSL certificates for development..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout certs/privkey.pem \
        -out certs/fullchain.pem \
        -subj "/C=US/ST=Dev/L=Dev/O=CodePulse/OU=Dev/CN=localhost"
    print_success "Self-signed certificates created"
else
    print_warning "SSL certificates already exist"
fi

# Build and start development environment
print_status "Building and starting development environment..."

# Stop any existing containers
docker-compose -f compose.dev.yaml down 2>/dev/null || true

# Build images
print_status "Building Docker images..."
docker-compose -f compose.dev.yaml build

# Start services
print_status "Starting services..."
docker-compose -f compose.dev.yaml up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Check if services are healthy
print_status "Checking service health..."

# Check PostgreSQL
if docker-compose -f compose.dev.yaml exec -T postgres pg_isready -U codepulse -d codepulse_dev > /dev/null 2>&1; then
    print_success "PostgreSQL is ready"
else
    print_warning "PostgreSQL might still be starting up"
fi

# Check Redis
if docker-compose -f compose.dev.yaml exec -T redis redis-cli ping > /dev/null 2>&1; then
    print_success "Redis is ready"
else
    print_warning "Redis might still be starting up"
fi

# Run database migrations
print_status "Running database migrations..."
# The Go app will handle auto-migrations in development mode

echo ""
echo "🎉 Development environment setup complete!"
echo "=============================================="
echo ""
echo "Services running:"
echo "  📊 API Server:    http://localhost:8080"
echo "  🌐 Web App:       http://localhost:3000"
echo "  🐘 PostgreSQL:    localhost:5432"
echo "  🔴 Redis:         localhost:6379"
echo ""
echo "Useful commands:"
echo "  📋 View logs:     docker-compose -f compose.dev.yaml logs -f"
echo "  🛑 Stop all:      docker-compose -f compose.dev.yaml down"
echo "  🔄 Restart:       docker-compose -f compose.dev.yaml restart"
echo "  🔧 Shell (API):   docker-compose -f compose.dev.yaml exec api sh"
echo "  🔧 Shell (Web):   docker-compose -f compose.dev.yaml exec web sh"
echo ""
echo "📚 Check the docs/ folder for more information"
echo ""
print_success "Happy coding! 🚀"
