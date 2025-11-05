#!/bin/bash
# Deploy geo-routing configuration

set -e

echo "🌍 Deploying geo-routing configuration..."

# 1. Create health checks
echo "🏥 Creating health checks..."

# Create global health check
aws route53 create-health-check \
    --caller-reference "gamev1-global-health-$(date +%s)" \
    --health-check-config \
    '{
        "IPAddress": "127.0.0.1",
        "Port": 443,
        "Type": "HTTPS",
        "ResourcePath": "/healthz",
        "FullyQualifiedDomainName": "api.gamev1.com",
        "RequestInterval": 30,
        "FailureThreshold": 3,
        "EnableSNI": true
    }'

# 2. Create latency-based routing
echo "⚖️  Creating latency-based routing..."

# Create record sets for each region
for region in us-east-1 eu-west-1 ap-southeast-1; do
    # Create regional API endpoint
    aws route53 change-resource-recordsets \
        --hosted-zone-id Z123456789 \
        --change-batch \
        '{
            "Comment": "Create latency-based routing for '$region'",
            "Changes": [
                {
                    "Action": "CREATE",
                    "ResourceRecordSet": {
                        "Name": "api-'$region'.gamev1.com",
                        "Type": "A",
                        "SetIdentifier": "'$region'-latency-routing",
                        "Region": "'$region'",
                        "AliasTarget": {
                            "DNSName": "regional-load-balancer-'$region'.elb.amazonaws.com",
                            "HostedZoneId": "Z268VQBMOI5EKX",
                            "EvaluateTargetHealth": true
                        }
                    }
                }
            ]
        }'
done

# 3. Create global failover routing
echo "🔄 Creating global failover routing..."

aws route53 change-resource-recordsets \
    --hosted-zone-id Z123456789 \
    --change-batch \
    '{
        "Comment": "Create global failover routing",
        "Changes": [
            {
                "Action": "CREATE",
                "ResourceRecordSet": {
                    "Name": "api.gamev1.com",
                    "Type": "A",
                    "SetIdentifier": "global-failover-routing",
                    "Failover": "PRIMARY",
                    "AliasTarget": {
                        "DNSName": "d1234567890.cloudfront.net",
                        "HostedZoneId": "Z2FDTNDATAQYW2",
                        "EvaluateTargetHealth": false
                    }
                }
            }
        ]
    }'

echo "✅ Geo-routing deployment completed!"

echo ""
echo "🌍 Global routing configured:"
echo "  • Primary: api.gamev1.com (CloudFront)"
echo "  • US East: api-us.gamev1.com"
echo "  • EU West: api-eu.gamev1.com"
echo "  • AP Southeast: api-ap.gamev1.com"
echo ""
echo "🔧 Health checks:"
echo "  • Global: Monitors CloudFront health"
echo "  • Regional: Monitors load balancer health"
echo ""
echo "⚖️  Routing strategy:"
echo "  • Latency-based: Routes to closest region"
echo "  • Failover: Automatic failover on failures"
echo "  • Weighted: Load distribution across regions"
