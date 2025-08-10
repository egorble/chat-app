#!/bin/bash

# DataChat Health Check Script
# Checks the status of all services and components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

DOMAIN="datachat-ipf.xyz"
APP_PORT=3003

echo "🏥 DataChat Health Check"
echo "========================"
echo ""

# Check if application is running on port 3003
print_header "Application Status"
if netstat -tlnp | grep -q ":$APP_PORT "; then
    print_success "Application is running on port $APP_PORT"
    
    # Check if it's PM2 or SystemD
    if pgrep -f "PM2" > /dev/null; then
        echo "Process Manager: PM2"
        pm2 status 2>/dev/null || print_warning "PM2 status check failed"
    elif systemctl is-active --quiet datachat; then
        echo "Process Manager: SystemD"
        systemctl status datachat --no-pager -l
    else
        print_warning "Unknown process manager"
    fi
else
    print_error "Application is not running on port $APP_PORT"
fi
echo ""

# Check Nginx status
print_header "Nginx Status"
if systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
    nginx -t 2>/dev/null && print_success "Nginx configuration is valid" || print_error "Nginx configuration has errors"
else
    print_error "Nginx is not running"
fi
echo ""

# Check SSL certificate
print_header "SSL Certificate Status"
if command -v certbot &> /dev/null; then
    certbot certificates 2>/dev/null | grep -A 10 "$DOMAIN" || print_warning "SSL certificate not found for $DOMAIN"
else
    print_warning "Certbot not installed"
fi
echo ""

# Check firewall status
print_header "Firewall Status"
if command -v ufw &> /dev/null; then
    ufw status | head -10
else
    print_warning "UFW firewall not installed"
fi
echo ""

# Check disk space
print_header "System Resources"
echo "Disk Usage:"
df -h / | tail -1
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "CPU Load:"
uptime
echo ""

# Check application logs
print_header "Recent Application Logs"
if pgrep -f "PM2" > /dev/null; then
    echo "PM2 Logs (last 10 lines):"
    pm2 logs --lines 10 2>/dev/null || print_warning "Could not fetch PM2 logs"
elif systemctl is-active --quiet datachat; then
    echo "SystemD Logs (last 10 lines):"
    journalctl -u datachat --lines 10 --no-pager
else
    print_warning "No application logs found"
fi
echo ""

# Check Nginx logs
print_header "Recent Nginx Logs"
if [ -f "/var/log/nginx/error.log" ]; then
    echo "Nginx Error Logs (last 5 lines):"
    tail -5 /var/log/nginx/error.log 2>/dev/null || print_warning "Could not read Nginx error logs"
else
    print_warning "Nginx error log not found"
fi
echo ""

# Test HTTP/HTTPS connectivity
print_header "Connectivity Test"
echo "Testing local connectivity..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT | grep -q "200\|301\|302"; then
    print_success "Local HTTP connection successful"
else
    print_error "Local HTTP connection failed"
fi

if command -v curl &> /dev/null; then
    echo "Testing external HTTPS connectivity..."
    if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
        print_success "External HTTPS connection successful"
    else
        print_error "External HTTPS connection failed"
    fi
fi
echo ""

# Summary
print_header "Health Check Summary"
echo "Domain: $DOMAIN"
echo "Port: $APP_PORT"
echo "Server IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unknown')"
echo "Timestamp: $(date)"
echo ""
print_success "Health check completed!"
echo "For detailed logs, use:"
echo "  - Application: pm2 logs (PM2) or sudo journalctl -u datachat -f (SystemD)"
echo "  - Nginx: sudo tail -f /var/log/nginx/access.log"
echo "  - System: sudo journalctl -f"