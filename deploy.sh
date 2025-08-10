#!/bin/bash

# DataChat Production Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting DataChat deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="datachat-ipf.xyz"
EMAIL="egor4042007@gmail.com"
APP_PORT=3003
APP_NAME="datachat-app"
APP_DIR="/var/www/datachat"
NGINX_CONF="/etc/nginx/sites-available/datachat"
NGINX_ENABLED="/etc/nginx/sites-enabled/datachat"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons."
   print_status "Please run as a regular user with sudo privileges."
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
print_status "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
print_status "Installing PM2..."
sudo npm install -g pm2

# Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx

# Install Certbot for SSL
print_status "Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Clone repository if not exists
if [ ! -d "$APP_DIR/.git" ]; then
    print_status "Cloning repository..."
    git clone https://github.com/yourusername/datachat.git $APP_DIR
else
    print_status "Updating repository..."
    cd $APP_DIR
    git pull origin main
fi

cd $APP_DIR

# Install dependencies
print_status "Installing dependencies..."
npm ci --production

# Build application
print_status "Building application..."
cp next.config.prod.ts next.config.ts
npm run build

# Create logs directory
mkdir -p logs

# Setup PM2
print_status "Setting up PM2..."
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure Nginx
print_status "Configuring Nginx..."
sudo cp nginx.conf $NGINX_CONF
sudo ln -sf $NGINX_CONF $NGINX_ENABLED
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Start Nginx
print_status "Starting Nginx..."
sudo systemctl enable nginx
sudo systemctl restart nginx

# Setup SSL with Certbot
print_status "Setting up SSL certificate..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect

# Setup automatic SSL renewal
print_status "Setting up SSL auto-renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Setup firewall
print_status "Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Create backup script
print_status "Creating backup script..."
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/datachat"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/datachat_$DATE.tar.gz -C /var/www datachat
find $BACKUP_DIR -name "datachat_*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh
chmod +x update.sh
chmod +x health-check.sh
chmod +x setup-systemd.sh

# Add backup to crontab
print_status "Setting up daily backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh") | crontab -

# Create update script
print_status "Creating update script..."
cat > update.sh << 'EOF'
#!/bin/bash
set -e
echo "Updating DataChat..."
cd /var/www/datachat
git pull origin main
npm ci --production
npm run build
pm2 restart datachat-app
echo "Update completed!"
EOF

chmod +x update.sh

# Final status check
print_status "Checking services status..."
echo "PM2 Status:"
pm2 status
echo ""
echo "Nginx Status:"
sudo systemctl status nginx --no-pager -l
echo ""
echo "SSL Certificate Status:"
sudo certbot certificates

print_status "🎉 Deployment completed successfully!"
print_status "Your application is now available at: https://$DOMAIN"
print_status "Application logs: pm2 logs $APP_NAME"
print_status "Nginx logs: sudo tail -f /var/log/nginx/access.log"
print_status "To update the app: ./update.sh"
print_status "To backup the app: ./backup.sh"
print_status "To check health: ./health-check.sh"
print_status "To use SystemD instead of PM2: sudo ./setup-systemd.sh"

print_warning "Important: Make sure your DNS records point to this server's IP address."
print_warning "Domain: $DOMAIN -> $(curl -s ifconfig.me)"

# Run health check
print_status "Running health check..."
sleep 5
./health-check.sh