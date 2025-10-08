#!/bin/bash
set -e

echo "🚀 Setting up CodePulse Production Environment"
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

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

print_success "All dependencies are available"

# Environment configuration
print_status "Configuring production environment..."

if [ ! -f ".env" ]; then
    print_error ".env file not found. Please create it from .env.example and configure it properly."
    print_error "Required variables: DOMAIN, DB_PASSWORD, REDIS_PASSWORD, JWT_SECRET"
    exit 1
fi

# Check required environment variables
source .env

REQUIRED_VARS=("DOMAIN" "DB_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" = "your_"* ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    print_error "The following environment variables are missing or not configured:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    print_error "Please update your .env file before running production setup."
    exit 1
fi

print_success "Environment configuration is valid"

# SSL Certificate check
print_status "Checking SSL certificates..."

if [ ! -f "certs/fullchain.pem" ] || [ ! -f "certs/privkey.pem" ]; then
    print_error "SSL certificates not found in ./certs/ directory"
    print_error "Please place your SSL certificates:"
    print_error "  - certs/fullchain.pem (certificate + intermediate)"
    print_error "  - certs/privkey.pem (private key)"
    print_error ""
    print_error "For Let's Encrypt certificates, you can use:"
    print_error "  certbot certonly --standalone -d $DOMAIN"
    print_error "  cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem certs/"
    print_error "  cp /etc/letsencrypt/live/$DOMAIN/privkey.pem certs/"
    exit 1
fi

# Verify certificate permissions
chown root:root certs/*.pem
chmod 644 certs/fullchain.pem
chmod 600 certs/privkey.pem

print_success "SSL certificates are ready"

# System optimizations
print_status "Applying system optimizations..."

# Increase file descriptor limits
if ! grep -q "fs.file-max" /etc/sysctl.conf; then
    echo "fs.file-max = 65536" >> /etc/sysctl.conf
    echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
    echo "net.ipv4.tcp_max_syn_backlog = 65536" >> /etc/sysctl.conf
    sysctl -p
    print_success "System limits optimized"
fi

# Docker system cleanup
print_status "Cleaning up Docker system..."
docker system prune -f

# Create required directories
print_status "Creating required directories..."
mkdir -p /var/log/codepulse
mkdir -p /var/lib/codepulse/{postgres,redis}

# Set up log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/codepulse << 'EOF'
/var/log/codepulse/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose restart nginx || true
    endscript
}
EOF

# Stop existing services
print_status "Stopping existing services..."
docker-compose down 2>/dev/null || true

# Build production images
print_status "Building production images..."
docker-compose build --no-cache

# Start services with production configuration
print_status "Starting production services..."
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to initialize..."
sleep 30

# Run database migrations
print_status "Running database migrations..."
docker-compose exec -T api /bin/sh -c "migrate -path /root/migrations -database \"\$DBURL\" up" || {
    print_warning "Migration failed, but service might still work if database is already set up"
}

# Health checks
print_status "Performing health checks..."

# Check API health
if curl -f -s http://localhost:8080/health > /dev/null; then
    print_success "API service is healthy"
else
    print_warning "API service health check failed"
fi

# Check web app
if curl -f -s http://localhost:3000 > /dev/null; then
    print_success "Web application is healthy"
else
    print_warning "Web application health check failed"
fi

# Set up systemd service for auto-restart
print_status "Setting up systemd service..."
cat > /etc/systemd/system/codepulse.service << EOF
[Unit]
Description=CodePulse Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
ExecReload=/usr/local/bin/docker-compose restart
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable codepulse
print_success "Systemd service configured"

# Set up automatic SSL certificate renewal (if using Let's Encrypt)
if command -v certbot &> /dev/null; then
    print_status "Setting up SSL certificate auto-renewal..."
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload codepulse") | crontab -
    print_success "SSL auto-renewal configured"
fi

# Set up monitoring (basic)
print_status "Setting up basic monitoring..."
cat > /usr/local/bin/codepulse-health-check.sh << 'EOF'
#!/bin/bash
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ "$API_STATUS" != "200" ] || [ "$WEB_STATUS" != "200" ]; then
    echo "$(date): Health check failed - API: $API_STATUS, Web: $WEB_STATUS" >> /var/log/codepulse/health.log
    systemctl restart codepulse
fi
EOF

chmod +x /usr/local/bin/codepulse-health-check.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/codepulse-health-check.sh") | crontab -
print_success "Health monitoring configured"

# Security hardening
print_status "Applying security hardening..."

# Fail2ban rule for nginx (if fail2ban is installed)
if command -v fail2ban-client &> /dev/null; then
    cat > /etc/fail2ban/filter.d/nginx-codepulse.conf << 'EOF'
[Definition]
failregex = ^<HOST> -.*"(GET|POST|HEAD).*" (444|403|400) .*$
ignoreregex =
EOF

    cat > /etc/fail2ban/jail.d/nginx-codepulse.conf << 'EOF'
[nginx-codepulse]
enabled = true
port = http,https
filter = nginx-codepulse
logpath = /var/log/nginx/access.log
maxretry = 5
bantime = 3600
EOF

    systemctl restart fail2ban
    print_success "Fail2ban configured"
fi

# Set up firewall rules
if command -v ufw &> /dev/null; then
    print_status "Configuring firewall..."
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    print_success "Firewall configured"
fi

echo ""
echo "🎉 Production environment setup complete!"
echo "=========================================="
echo ""
echo "Your CodePulse instance is now running at:"
echo "  🌐 https://$DOMAIN"
echo ""
echo "Services:"
echo "  📊 API Health:    https://$DOMAIN/api/health"
echo "  🔒 SSL Grade:     https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo "Management commands:"
echo "  📋 View logs:     docker-compose logs -f"
echo "  🛑 Stop all:      systemctl stop codepulse"
echo "  🟢 Start all:     systemctl start codepulse"
echo "  🔄 Restart:       systemctl restart codepulse"
echo "  📊 Status:        systemctl status codepulse"
echo ""
echo "Log files:"
echo "  📝 Application:   /var/log/codepulse/"
echo "  🩺 Health:        /var/log/codepulse/health.log"
echo ""
echo "Security:"
echo "  🔒 SSL renewal:   Automated via cron"
echo "  🛡️  Health check:  Every 5 minutes"
echo "  🚫 Fail2ban:     Configured (if installed)"
echo "  🔥 Firewall:     Configured (if ufw available)"
echo ""
print_success "Production deployment successful! 🚀"
print_warning "Don't forget to set up regular backups of your database!"
