#!/bin/bash
# Deploy Nginx load balancer

set -e

echo "🚀 Deploying Nginx load balancer..."

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# Create directories
sudo mkdir -p /var/log/nginx
sudo mkdir -p /var/lib/nginx

# Copy configuration
sudo cp nginx.conf /etc/nginx/nginx.conf
sudo cp nginx.service /etc/systemd/system/gamev1-loadbalancer.service

# Set permissions
sudo chown -R nginx:nginx /var/log/nginx /var/lib/nginx

# Test configuration
sudo nginx -t

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable gamev1-loadbalancer
sudo systemctl restart gamev1-loadbalancer

# Verify service
if sudo systemctl is-active --quiet gamev1-loadbalancer; then
    echo "✅ Nginx load balancer deployed successfully"
    echo ""
    echo "🌐 Access load balancer at: http://$(hostname -I | awk '{print $1}')"
    echo "📊 Metrics available at: http://$(hostname -I | awk '{print $1}')/metrics"
else
    echo "❌ Failed to start Nginx load balancer"
    exit 1
fi
