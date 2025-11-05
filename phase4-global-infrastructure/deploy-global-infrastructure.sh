#!/bin/bash
# Deploy global infrastructure

set -e

echo "🌍 Deploying global infrastructure..."

# 1. Create CloudFront distribution
echo "📡 Creating CloudFront distribution..."
aws cloudfront create-distribution --distribution-config file://cloudfront-global-distribution.json

# 2. Create global Route53 routing
echo "🗺️  Creating global DNS routing..."
aws route53 change-resource-recordsets --hosted-zone-id Z123456789 --change-batch file://route53-global-config.json

# 3. Deploy Cloudflare Workers
echo "⚡ Deploying Cloudflare Workers..."
cd edge-functions

# Deploy API routing function
wrangler deploy api-routing.js --name gamev1-api-routing

# Deploy image optimization function
wrangler deploy image-optimization.js --name gamev1-image-optimization

cd ..

# 4. Create Aurora Global Database
echo "🗄️  Creating Aurora Global Database..."
aws rds create-global-cluster --global-cluster-identifier gamev1-global-cluster --source-db-cluster-identifier gamev1-us-east-cluster

# Add secondary regions
aws rds create-db-cluster --db-cluster-identifier gamev1-eu-west-cluster --engine aurora-mysql --global-cluster-identifier gamev1-global-cluster
aws rds create-db-cluster --db-cluster-identifier gamev1-ap-southeast-cluster --engine aurora-mysql --global-cluster-identifier gamev1-global-cluster

# 5. Create ElastiCache Global Datastore
echo "🔴 Creating ElastiCache Global Datastore..."
aws elasticache create-global-replication-group --global-replication-group-id-suffix gamev1-global-cache --primary-replication-group-id gamev1-us-east-cache

# Add secondary regions
aws elasticache create-replication-group --replication-group-id gamev1-eu-west-cache --global-replication-group-id gamev1-global-cache
aws elasticache create-replication-group --replication-group-id gamev1-ap-southeast-cache --global-replication-group-id gamev1-global-cache

# 6. Create WAF for global protection
echo "🛡️  Creating global WAF..."
aws wafv2 create-web-acl --name gamev1-global-waf --scope CLOUDFRONT --default-action Allow={} \
  --rules file://waf-rules.json

# 7. Verify global infrastructure
echo "🔍 Verifying global infrastructure..."

# Check CloudFront distribution
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='GameV1 Global CDN Distribution - Multi-Region'].Id" --output text)
if [ -n "$DISTRIBUTION_ID" ]; then
    echo "✅ CloudFront distribution: $DISTRIBUTION_ID"
else
    echo "❌ CloudFront distribution not found"
fi

# Check Route53 records
if nslookup api.gamev1.com > /dev/null 2>&1; then
    echo "✅ Global DNS: Configured"
else
    echo "❌ Global DNS: Not configured"
fi

echo "✅ Global infrastructure deployment completed!"

echo ""
echo "🌍 Global infrastructure deployed:"
echo "  • CloudFront: Global CDN with multi-region origins"
echo "  • Route53: Latency-based routing"
echo "  • Cloudflare Workers: Edge computing in 3 regions"
echo "  • Aurora Global: Cross-region database replication"
echo "  • ElastiCache Global: Cross-region cache replication"
echo "  • Global WAF: Protection across all regions"
echo ""
echo "📊 Access points:"
echo "  • Global API: https://api.gamev1.com"
echo "  • US Region: https://api-us.gamev1.com"
echo "  • EU Region: https://api-eu.gamev1.com"
echo "  • Asia Region: https://api-ap.gamev1.com"
echo ""
echo "🔧 Management:"
echo "  • CloudFront: aws cloudfront get-distribution --id $DISTRIBUTION_ID"
echo "  • Route53: aws route53 list-resource-record-sets --hosted-zone-id Z123456789"
echo "  • Aurora Global: aws rds describe-global-clusters"
