#!/bin/bash

# DataChat SystemD Service Setup Script
# Alternative to PM2 for production deployment

set -e

echo "🔧 Setting up DataChat as SystemD service..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

APP_DIR="/var/www/datachat"
SERVICE_NAME="datachat"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Check if running with sudo
if [[ $EUID -ne 0 ]]; then
   print_warning "This script needs to be run with sudo privileges."
   exit 1
fi

# Stop PM2 if running
print_status "Stopping PM2 processes..."
su - $SUDO_USER -c "pm2 stop all" 2>/dev/null || true
su - $SUDO_USER -c "pm2 delete all" 2>/dev/null || true

# Create www-data user if doesn't exist
print_status "Setting up www-data user..."
if ! id "www-data" &>/dev/null; then
    useradd -r -s /bin/false www-data
fi

# Set proper ownership
print_status "Setting file permissions..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

# Copy service file
print_status "Installing SystemD service..."
cp $APP_DIR/datachat.service $SERVICE_FILE

# Reload systemd
print_status "Reloading SystemD..."
systemctl daemon-reload

# Enable and start service
print_status "Enabling and starting DataChat service..."
systemctl enable $SERVICE_NAME
systemctl start $SERVICE_NAME

# Check status
print_status "Checking service status..."
systemctl status $SERVICE_NAME --no-pager

print_status "✅ DataChat SystemD service setup completed!"
print_status "Service commands:"
echo "  Start:   sudo systemctl start $SERVICE_NAME"
echo "  Stop:    sudo systemctl stop $SERVICE_NAME"
echo "  Restart: sudo systemctl restart $SERVICE_NAME"
echo "  Status:  sudo systemctl status $SERVICE_NAME"
echo "  Logs:    sudo journalctl -u $SERVICE_NAME -f"

print_warning "Note: This replaces PM2. Use SystemD commands to manage the service."