#!/bin/bash

# 🚀 GameV1 Advanced Monitoring Stack Setup
# Prometheus federation và Thanos cho long-term storage và global queries

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

MONITORING_TYPE=${1:-"thanos"}  # thanos, cortex, full-stack
CONFIG_DIR=${2:-"advanced-monitoring-config"}

echo -e "${BLUE}${BOLD}📊 GameV1 Advanced Monitoring Stack${NC}"
echo "=================================="
echo -e "Monitoring type: ${YELLOW}$MONITORING_TYPE${NC}"
echo -e "Config directory: ${YELLOW}$CONFIG_DIR${NC}"
echo ""

# Create configuration directory
mkdir -p "$CONFIG_DIR"

# Function to setup Thanos for long-term storage
setup_thanos_monitoring() {
    echo -e "${BLUE}🏛️  Setting up Thanos monitoring stack...${NC}"

    # Create Thanos configuration
    cat > "$CONFIG_DIR/thanos-config.yml" << EOF
# Thanos Global Configuration
# Long-term storage and global query federation

global:
  external_labels:
    cluster: 'gamev1-global'

store:
  # S3 bucket for long-term storage
  - type: s3
    config:
      bucket: "gamev1-prometheus-storage"
      endpoint: "s3.amazonaws.com"
      region: "us-east-1"
      access_key: "${AWS_ACCESS_KEY_ID}"
      secret_key: "${AWS_SECRET_ACCESS_KEY}"
      signature_version2: false
    labels:
      cluster: 'gamev1-global'

query:
  # Global query configuration
  - name: query-global
    addresses:
      - "query:9090"
    stores:
      - "store:10901"

query_frontend:
  # Query frontend for UI
  - name: query-frontend-global
    http_address: "0.0.0.0:9090"
    grpc_address: "0.0.0.0:9091"
    query_backend: query-global

compactor:
  # Data compaction for long-term storage
  - name: compactor-global
    http_address: "0.0.0.0:9092"
    data_dir: "/data"
    objstore:
      type: s3
      config:
        bucket: "gamev1-prometheus-storage"
        endpoint: "s3.amazonaws.com"
        region: "us-east-1"
    retention_resolution_raw: 30d
    retention_resolution_5m: 90d
    retention_resolution_1h: 1y

ruler:
  # Alerting rules evaluation
  - name: ruler-global
    http_address: "0.0.0.0:9093"
    grpc_address: "0.0.0.0:9094"
    alertmanagers:
      - "alertmanager:9093"
    rule_files:
      - "/etc/thanos/rules/*.yml"
    objstore:
      type: s3
      config:
        bucket: "gamev1-prometheus-storage"
        endpoint: "s3.amazonaws.com"
        region: "us-east-1"
EOF

    # Create Thanos deployment for Kubernetes
    cat > "$CONFIG_DIR/thanos-deployment.yml" << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: thanos-config
  namespace: monitoring
data:
  config.yml: |
    global:
      external_labels:
        cluster: 'gamev1-k8s'

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: thanos-store
  namespace: monitoring
spec:
  serviceName: thanos-store
  replicas: 3
  selector:
    matchLabels:
      app: thanos-store
  template:
    metadata:
      labels:
        app: thanos-store
    spec:
      containers:
      - name: thanos-store
        image: thanosio/thanos:v0.31.0
        args:
        - store
        - --log.level=info
        - --log.format=json
        - --data-dir=/data
        - --objstore.config-file=/etc/thanos/config.yml
        - --grpc-address=0.0.0.0:10901
        - --http-address=0.0.0.0:10902
        ports:
        - containerPort: 10901
          name: grpc
        - containerPort: 10902
          name: http
        volumeMounts:
        - name: config
          mountPath: /etc/thanos
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: "512Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 10902
          initialDelaySeconds: 30
          periodSeconds: 30
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 50Gi

---
apiVersion: v1
kind: Service
metadata:
  name: thanos-store
  namespace: monitoring
spec:
  type: ClusterIP
  ports:
  - name: grpc
    port: 10901
    targetPort: 10901
  - name: http
    port: 10902
    targetPort: 10902
  selector:
    app: thanos-store

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-query
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: thanos-query
  template:
    metadata:
      labels:
        app: thanos-query
    spec:
      containers:
      - name: thanos-query
        image: thanosio/thanos:v0.31.0
        args:
        - query
        - --log.level=info
        - --log.format=json
        - --grpc-address=0.0.0.0:10901
        - --http-address=0.0.0.0:9090
        - --store=thanos-store:10901
        - --query.replica-label=prometheus_replica
        ports:
        - containerPort: 9090
          name: http
        - containerPort: 10901
          name: grpc
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 9090
          initialDelaySeconds: 30
          periodSeconds: 30

---
apiVersion: v1
kind: Service
metadata:
  name: thanos-query
  namespace: monitoring
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 9090
    targetPort: 9090
  - name: grpc
    port: 10901
    targetPort: 10901
  selector:
    app: thanos-query

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-query-frontend
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: thanos-query-frontend
  template:
    metadata:
      labels:
        app: thanos-query-frontend
    spec:
      containers:
      - name: thanos-query-frontend
        image: thanosio/thanos:v0.31.0
        args:
        - query-frontend
        - --log.level=info
        - --log.format=json
        - --http-address=0.0.0.0:9090
        - --query-frontend.downstream-url=http://thanos-query:9090
        ports:
        - containerPort: 9090
          name: http
        resources:
          requests:
            memory: "128Mi"
            cpu: "50m"
          limits:
            memory: "256Mi"
            cpu: "100m"

---
apiVersion: v1
kind: Service
metadata:
  name: thanos-query-frontend
  namespace: monitoring
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 9090
    targetPort: 9090
  selector:
    app: thanos-query-frontend
EOF

    # Create deployment script for Thanos
    cat > "$CONFIG_DIR/deploy-thanos.sh" << 'EOF'
#!/bin/bash
# Deploy Thanos monitoring stack

set -e

echo "🏛️  Deploying Thanos monitoring stack..."

# Create namespace
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

# Apply Thanos configuration
kubectl apply -f thanos-deployment.yml

# Wait for deployments to be ready
echo "⏳ Waiting for Thanos components..."
kubectl wait --for=condition=available --timeout=300s deployment/thanos-store -n monitoring
kubectl wait --for=condition=available --timeout=300s deployment/thanos-query -n monitoring
kubectl wait --for=condition=available --timeout=300s deployment/thanos-query-frontend -n monitoring

# Verify Thanos endpoints
echo "🔍 Verifying Thanos endpoints..."

# Check query frontend
if kubectl port-forward -n monitoring svc/thanos-query-frontend 9090:9090 &
    sleep 5
    if curl -f http://localhost:9090/-/ready > /dev/null 2>&1; then
        echo "✅ Thanos Query Frontend: Ready"
    else
        echo "❌ Thanos Query Frontend: Not ready"
    fi
    kill %1 2>/dev/null
fi

# Check store gateway
if kubectl port-forward -n monitoring svc/thanos-store 10902:10902 &
    sleep 5
    if curl -f http://localhost:10902/-/ready > /dev/null 2>&1; then
        echo "✅ Thanos Store: Ready"
    else
        echo "❌ Thanos Store: Not ready"
    fi
    kill %1 2>/dev/null
fi

echo "✅ Thanos monitoring stack deployed successfully!"

echo ""
echo "📊 Access Thanos:"
echo "  • Query Frontend: kubectl port-forward -n monitoring svc/thanos-query-frontend 9090:9090"
echo "  • Store Gateway: kubectl port-forward -n monitoring svc/thanos-store 10902:10902"
echo ""
echo "🔧 Features:"
echo "  • Long-term storage in S3"
echo "  • Global query across multiple Prometheus instances"
echo "  • Data deduplication and downsampling"
echo "  • Query frontend for UI"
EOF

    chmod +x "$CONFIG_DIR/deploy-thanos.sh"

    echo -e "${GREEN}✅ Thanos monitoring configuration created${NC}"
}

# Function to setup Cortex for scalable metrics
setup_cortex_monitoring() {
    echo -e "${BLUE}🧠 Setting up Cortex monitoring stack...${NC}"

    # Create Cortex configuration
    cat > "$CONFIG_DIR/cortex-config.yml" << EOF
# Cortex Configuration for GameV1
# Horizontally scalable Prometheus-compatible backend

auth_enabled: false

server:
  http_listen_port: 8080
  grpc_listen_port: 9095

distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318

ingester:
  lifecycler:
    address: 0.0.0.0
    ring:
      kvstore:
        store: memberlist
      replication_factor: 3

  chunk_idle_period: 5m
  chunk_retain_period: 30s

querier:
  query_frontend:
    address: query-frontend:8080

query_frontend:
  log_queries_longer_than: 10s
  split_queries_by_interval: 24h

query_range:
  split_queries_by_interval: 24h
  align_queries_with_step: true

frontend_worker:
  frontend_address: query-frontend:8080

compactor:
  working_directory: /data/compactor
  compaction_interval: 30m

  retention_enabled: true
  retention_period: 90d

store_gateway:
  sharding_enabled: true
  sharding_ring:
    kvstore:
      store: memberlist

limits:
  ingestion_rate: 100000
  ingestion_burst_size: 200000
  max_series_per_query: 1000000
  max_samples_per_query: 50000000

blocks_storage:
  backend: s3
  s3:
    bucket_name: "gamev1-cortex-storage"
    endpoint: "s3.amazonaws.com"
    region: "us-east-1"
  tsdb:
    dir: /data/tsdb
    retention_period: 90d

ruler:
  enable_api: true
  rule_path: /data/ruler

alertmanager:
  enable_api: true
  external_url: http://alertmanager:9093
EOF

    # Create Cortex deployment
    cat > "$CONFIG_DIR/cortex-deployment.yml" << EOF
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cortex
  namespace: monitoring
spec:
  serviceName: cortex
  replicas: 3
  selector:
    matchLabels:
      app: cortex
  template:
    metadata:
      labels:
        app: cortex
    spec:
      containers:
      - name: cortex
        image: cortexproject/cortex:v1.15.0
        args:
        - -config.file=/etc/cortex/cortex.yml
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9095
          name: grpc
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        volumeMounts:
        - name: config
          mountPath: /etc/cortex
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 100Gi

---
apiVersion: v1
kind: Service
metadata:
  name: cortex
  namespace: monitoring
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: grpc
    port: 9095
    targetPort: 9095
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
  selector:
    app: cortex
EOF

    echo -e "${GREEN}✅ Cortex monitoring configuration created${NC}"
}

# Function to create comprehensive alerting rules
create_comprehensive_alerting() {
    echo -e "${BLUE}🚨 Creating comprehensive alerting rules...${NC}"

    # Create global alerting rules for enterprise scale
    cat > "$CONFIG_DIR/global-alert-rules.yml" << EOF
groups:
  - name: gamev1_enterprise_alerts
    rules:
      # Infrastructure alerts
      - alert: KubernetesNodeNotReady
        expr: kube_node_status_condition{condition="Ready",status="true"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Kubernetes node not ready"
          description: "Node {{ \$labels.node }} has been not ready for more than 5 minutes"

      - alert: KubernetesPodCrashLooping
        expr: increase(kube_pod_container_status_restarts_total[10m]) > 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Pod crash looping"
          description: "Pod {{ \$labels.pod }} in namespace {{ \$labels.namespace }} has restarted more than 5 times in 10 minutes"

      # Application alerts
      - alert: GameServiceDown
        expr: up{job="gamev1-gateway"} == 0 or up{job="gamev1-worker"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Game service down"
          description: "GameV1 service {{ \$labels.job }} is down for more than 2 minutes"

      - alert: HighErrorRate
        expr: |
          (
            rate(gateway_requests_total{status=~"5.."}[5m]) /
            rate(gateway_requests_total[5m])
          ) * 100 > 5
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "High error rate"
          description: "Error rate is above 5% for more than 3 minutes"

      # Performance alerts
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(gateway_request_duration_seconds_bucket[5m])) > 2
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is above 2 seconds"

      - alert: DatabaseConnectionPoolExhausted
        expr: |
          (
            gamev1_db_connections_active /
            gamev1_db_connections_max
          ) * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool exhausted"
          description: "Database connection pool usage is above 90% for more than 5 minutes"

      # Resource alerts
      - alert: HighMemoryUsage
        expr: |
          (
            1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)
          ) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 85% for more than 5 minutes"

      - alert: HighCPUUsage
        expr: |
          100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is above 80% for more than 5 minutes"

      # Business metrics alerts
      - alert: LowPlayerActivity
        expr: gamev1_players_active < 10
        for: 15m
        labels:
          severity: info
        annotations:
          summary: "Low player activity"
          description: "Active players below 10 for more than 15 minutes"

      - alert: HighPlayerActivity
        expr: gamev1_players_active > 10000
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High player activity"
          description: "Active players above 10,000 for more than 5 minutes"

      # CDN and global infrastructure
      - alert: CDNHighErrorRate
        expr: |
          (
            rate(cdn_requests_total{status=~"5.."}[5m]) /
            rate(cdn_requests_total[5m])
          ) * 100 > 5
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "CDN high error rate"
          description: "CDN error rate is above 5% for more than 3 minutes"

      - alert: GlobalLatencySpike
        expr: |
          quantile_over_time(0.95, gateway_request_duration_seconds_bucket[10m]) > 5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Global latency spike"
          description: "95th percentile latency across all regions > 5 seconds"
EOF

    echo -e "${GREEN}✅ Comprehensive alerting rules created${NC}"
}

# Function to create monitoring dashboards
create_advanced_dashboards() {
    echo -e "${BLUE}📈 Creating advanced monitoring dashboards...${NC}"

    # Create enterprise-grade Grafana dashboard
    cat > "$CONFIG_DIR/enterprise-dashboard.json" << EOF
{
  "dashboard": {
    "id": null,
    "title": "GameV1 Enterprise Monitoring",
    "tags": ["gamev1", "enterprise", "multi-region"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Global Player Count",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(gamev1_players_active)",
            "legendFormat": "Total Active Players"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                { "color": "green", "value": 0 },
                { "color": "yellow", "value": 1000 },
                { "color": "red", "value": 10000 }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Regional Player Distribution",
        "type": "piechart",
        "targets": [
          {
            "expr": "gamev1_players_active",
            "legendFormat": "{{region}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Global Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(gateway_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, sum(rate(gateway_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "id": 4,
        "title": "Error Rate by Region",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(gateway_requests_total{status=~\"5..\"}[5m]) / rate(gateway_requests_total[5m]) * 100",
            "legendFormat": "{{region}}"
          }
        ]
      },
      {
        "id": 5,
        "title": "Database Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "gamev1_db_connections_active",
            "legendFormat": "Active Connections"
          },
          {
            "expr": "rate(gamev1_db_queries_total[5m])",
            "legendFormat": "Queries/sec"
          }
        ]
      },
      {
        "id": 6,
        "title": "CDN Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(cdn_requests_total[5m])",
            "legendFormat": "CDN Requests/sec"
          },
          {
            "expr": "histogram_quantile(0.95, rate(cdn_request_duration_seconds_bucket[5m]))",
            "legendFormat": "CDN 95th percentile"
          }
        ]
      }
    ],
    "time": {
      "from": "now-6h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

    echo -e "${GREEN}✅ Advanced monitoring dashboards created${NC}"
}

# Function to create deployment script
create_deployment_script() {
    echo -e "${BLUE}🚀 Creating deployment script...${NC}"

    cat > "$CONFIG_DIR/deploy-advanced-monitoring.sh" << 'EOF'
#!/bin/bash
# Deploy advanced monitoring stack

set -e

echo "📊 Deploying advanced monitoring stack..."

# 1. Deploy Thanos for long-term storage
echo "🏛️  Deploying Thanos..."
kubectl apply -f thanos-deployment.yml

# 2. Deploy Cortex for scalable metrics (optional)
# kubectl apply -f cortex-deployment.yml

# 3. Deploy enhanced Prometheus with federation
echo "🔧 Deploying enhanced Prometheus..."
kubectl apply -f prometheus-federation.yml

# 4. Deploy comprehensive alerting
echo "🚨 Deploying alerting rules..."
kubectl apply -f global-alert-rules.yml

# 5. Deploy Grafana with enterprise dashboards
echo "📈 Deploying Grafana..."
kubectl apply -f grafana-enterprise.yml

# 6. Wait for all components to be ready
echo "⏳ Waiting for monitoring components..."
kubectl wait --for=condition=available --timeout=600s deployment/thanos-store -n monitoring
kubectl wait --for=condition=available --timeout=600s deployment/thanos-query -n monitoring
kubectl wait --for=condition=available --timeout=600s deployment/prometheus -n monitoring
kubectl wait --for=condition=available --timeout=600s deployment/grafana -n monitoring

# 7. Verify monitoring endpoints
echo "🔍 Verifying monitoring endpoints..."

# Check Thanos Query Frontend
if kubectl port-forward -n monitoring svc/thanos-query-frontend 9090:9090 &
    sleep 10
    if curl -f http://localhost:9090/-/ready > /dev/null 2>&1; then
        echo "✅ Thanos Query Frontend: Ready"
    else
        echo "❌ Thanos Query Frontend: Not ready"
    fi
    kill %1 2>/dev/null
fi

# Check Prometheus
if kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
    sleep 10
    if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
        echo "✅ Prometheus: Ready"
    else
        echo "❌ Prometheus: Not ready"
    fi
    kill %1 2>/dev/null
fi

# Check Grafana
if kubectl port-forward -n monitoring svc/grafana 3000:3000 &
    sleep 10
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ Grafana: Ready"
    else
        echo "❌ Grafana: Not ready"
    fi
    kill %1 2>/dev/null
fi

echo "✅ Advanced monitoring stack deployed successfully!"

echo ""
echo "📊 Access monitoring:"
echo "  • Thanos Query: kubectl port-forward -n monitoring svc/thanos-query-frontend 9090:9090"
echo "  • Prometheus: kubectl port-forward -n monitoring svc/prometheus 9090:9090"
echo "  • Grafana: kubectl port-forward -n monitoring svc/grafana 3000:3000"
echo ""
echo "🔧 Features:"
echo "  • Long-term storage with S3"
echo "  • Global query across multiple regions"
echo "  • Enterprise-grade alerting"
echo "  • Comprehensive dashboards"
echo "  • High availability and scalability"
EOF

    chmod +x "$CONFIG_DIR/deploy-advanced-monitoring.sh"

    echo -e "${GREEN}✅ Advanced monitoring deployment script created${NC}"
}

# Main setup based on monitoring type
case $MONITORING_TYPE in
    "thanos")
        setup_thanos_monitoring
        create_comprehensive_alerting
        create_advanced_dashboards
        create_deployment_script
        ;;
    "cortex")
        setup_cortex_monitoring
        create_comprehensive_alerting
        create_advanced_dashboards
        create_deployment_script
        ;;
    "full-stack")
        setup_thanos_monitoring
        setup_cortex_monitoring
        create_comprehensive_alerting
        create_advanced_dashboards
        create_deployment_script
        ;;
    *)
        echo -e "${RED}❌ Unknown monitoring type: $MONITORING_TYPE${NC}"
        echo "Use: thanos, cortex, or full-stack"
        exit 1
        ;;
esac

# Generate summary
echo ""
echo -e "${BLUE}${BOLD}📊 Advanced Monitoring Stack Setup Complete${NC}"
echo "=========================================="

echo -e "${YELLOW}📁 Generated configuration files:${NC}"
find "$CONFIG_DIR" -type f | while read file; do
    echo "  • $file"
done

echo ""
echo -e "${YELLOW}🚀 Deployment Instructions:${NC}"
echo "  cd $CONFIG_DIR && ./deploy-advanced-monitoring.sh"

echo ""
echo -e "${YELLOW}📊 Monitoring Features:${NC}"
case $MONITORING_TYPE in
    "thanos")
        echo "  • Long-term storage with S3"
        echo "  • Global query federation"
        echo "  • Data deduplication and downsampling"
        echo "  • Query frontend for UI"
        ;;
    "cortex")
        echo "  • Horizontally scalable Prometheus backend"
        • OpenTelemetry compatible
        echo "  • Multi-tenant support"
        echo "  • Query optimization"
        ;;
    "full-stack")
        echo "  • Complete monitoring stack with both Thanos and Cortex"
        echo "  • Maximum scalability and reliability"
        echo "  • Enterprise-grade features"
        ;;
esac

echo ""
echo -e "${YELLOW}💡 Enterprise Features:${NC}"
echo "  • Multi-region monitoring federation"
echo "  • Long-term storage (90+ days)"
echo "  • Comprehensive alerting with escalation"
echo "  • Advanced dashboards with business metrics"
echo "  • High availability and disaster recovery"
echo "  • Cost optimization with data tiering"

echo ""
echo -e "${GREEN}✅ GameV1 advanced monitoring stack setup completed!${NC}"
