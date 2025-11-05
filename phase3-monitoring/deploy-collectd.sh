#!/bin/bash
# Deploy collectd monitoring

set -e

echo "📊 Deploying collectd monitoring..."

# Install collectd if not present
if ! command -v collectd &> /dev/null; then
    echo "📦 Installing collectd..."
    sudo apt-get update
    sudo apt-get install -y collectd collectd-utils
fi

# Create directories
sudo mkdir -p /var/lib/collectd/csv
sudo mkdir -p /var/log/collectd

# Copy configuration
sudo cp collectd.conf /etc/collectd/collectd.conf
sudo cp collectd.service /etc/systemd/system/gamev1-collectd.service

# Set permissions
sudo chown -R collectd:collectd /var/lib/collectd /var/log/collectd

# Test configuration
sudo collectd -t -C /etc/collectd/collectd.conf

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable gamev1-collectd
sudo systemctl restart gamev1-collectd

# Verify service
if sudo systemctl is-active --quiet gamev1-collectd; then
    echo "✅ Collectd monitoring deployed successfully"
    echo ""
    echo "📊 Metrics available at: http://$(hostname -I | awk '{print $1}'):9100/metrics"
else
    echo "❌ Failed to start collectd"
    exit 1
fi
