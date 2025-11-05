#!/bin/bash

# 🚀 GameV1 Auto-Scaling Implementation
# Kubernetes HPA và advanced scaling policies cho enterprise scale

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

SCALING_TYPE=${1:-"kubernetes-hpa"}  # kubernetes-hpa, karpenter, custom-metrics
CONFIG_DIR=${2:-"auto-scaling-config"}

echo -e "${BLUE}${BOLD}📈 GameV1 Auto-Scaling Implementation${NC}"
echo "==================================="
echo -e "Scaling type: ${YELLOW}$SCALING_TYPE${NC}"
echo -e "Config directory: ${YELLOW}$CONFIG_DIR${NC}"
echo ""

# Create configuration directory
mkdir -p "$CONFIG_DIR"

# Function to create Kubernetes HPA configurations
create_kubernetes_hpa() {
    echo -e "${BLUE}☸️  Creating Kubernetes HPA configurations...${NC}"

    # Create advanced HPA for gateway service
    cat > "$CONFIG_DIR/hpa-gateway-advanced.yml" << EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gamev1-gateway-hpa
  namespace: gamev1
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gamev1-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: packets-per-second
      target:
        type: AverageValue
        averageValue: "1000"
  - type: Object
    object:
      metric:
        name: requests-per-second
      describedObject:
        apiVersion: v1
        kind: Service
        name: gamev1-gateway
      target:
        type: Value
        value: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
      - type: Pods
        value: 1
        periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 120
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 3
        periodSeconds: 60
      selectPolicy: Max
EOF

    # Create HPA for worker service
    cat > "$CONFIG_DIR/hpa-worker-advanced.yml" << EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gamev1-worker-hpa
  namespace: gamev1
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gamev1-worker
  minReplicas: 2
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 85
  - type: Object
    object:
      metric:
        name: active_game_sessions
      describedObject:
        apiVersion: v1
        kind: Service
        name: gamev1-worker
      target:
        type: Value
        value: "200"
  - type: Object
    object:
      metric:
        name: processing_latency
      describedObject:
        apiVersion: v1
        kind: Service
        name: gamev1-worker
      target:
        type: AverageValue
        averageValue: "100ms"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 20
        periodSeconds: 120
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 5
        periodSeconds: 60
EOF

    # Create VPA (Vertical Pod Autoscaler)
    cat > "$CONFIG_DIR/vpa-gamev1.yml" << EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: gamev1-vpa
  namespace: gamev1
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: gamev1-gateway
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: "gateway"
      minAllowed:
        cpu: "100m"
        memory: "256Mi"
      maxAllowed:
        cpu: "2000m"
        memory: "4Gi"
      controlledResources: ["cpu", "memory"]

---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: gamev1-worker-vpa
  namespace: gamev1
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: gamev1-worker
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: "worker"
      minAllowed:
        cpu: "200m"
        memory: "512Mi"
      maxAllowed:
        cpu: "4000m"
        memory: "8Gi"
      controlledResources: ["cpu", "memory"]
EOF

    echo -e "${GREEN}✅ Kubernetes HPA configurations created${NC}"
}

# Function to create Karpenter auto-scaling
create_karpenter_scaling() {
    echo -e "${BLUE}🏗️  Creating Karpenter auto-scaling...${NC}"

    # Create Karpenter provisioner
    cat > "$CONFIG_DIR/karpenter-provisioner.yml" << EOF
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: gamev1-provisioner
  namespace: karpenter
spec:
  # Requirements for nodes
  requirements:
    - key: karpenter.sh/capacity-type
      operator: In
      values: ["on-demand", "spot"]
    - key: kubernetes.io/arch
      operator: In
      values: ["amd64"]
    - key: kubernetes.io/os
      operator: In
      values: ["linux"]

  # Node limits
  limits:
    resources:
      cpu: "1000"
      memory: "1000Gi"

  # Consolidation
  consolidation:
    enabled: true

  # TTL for nodes
  ttlSecondsAfterEmpty: 30
  ttlSecondsUntilExpired: 2592000  # 30 days

---
apiVersion: karpenter.k8s.aws/v1alpha1
kind: AWSNodeTemplate
metadata:
  name: gamev1-node-template
  namespace: karpenter
spec:
  subnetSelector:
    karpenter.sh/discovery: "gamev1-cluster"
  securityGroupSelector:
    karpenter.sh/discovery: "gamev1-cluster"
  instanceProfile: "KarpenterNodeInstanceProfile-gamev1-cluster"
  tags:
    Environment: "production"
    Team: "platform"
    ManagedBy: "karpenter"

  # AMI settings
  amiFamily: "Bottlerocket"
  amiSelector:
    karpenter.sh/discovery: "gamev1-cluster"

  # Instance types by workload
  instanceTypes:
    # Critical services - reliable instances
    - "t3.medium"
    - "t3.large"
    - "c5.large"
    - "c5.xlarge"

    # Worker nodes - cost optimized
    - "t3a.medium"
    - "t3a.large"
    - "c5a.large"
    - "c5a.xlarge"

  # Block device mappings
  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 50Gi
        volumeType: gp3
        iops: 3000
        deleteOnTermination: true
EOF

    # Create Karpenter node pool for different workloads
    cat > "$CONFIG_DIR/karpenter-nodepool.yml" << EOF
apiVersion: karpenter.sh/v1alpha5
kind: NodePool
metadata:
  name: gamev1-nodepool
  namespace: gamev1
spec:
  template:
    spec:
      nodeClassRef:
        name: gamev1-node-template
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: kubernetes.io/os
          operator: In
          values: ["linux"]
        - key: karpenter.k8s.aws/instance-family
          operator: In
          values: ["t3", "c5", "t3a", "c5a"]

  limits:
    cpu: "1000"
    memory: "2000Gi"

  disruption:
    consolidationPolicy: WhenUnderutilized
    expireAfter: 720h  # 30 days

---
# Separate node pool for critical services
apiVersion: karpenter.sh/v1alpha5
kind: NodePool
metadata:
  name: gamev1-critical-nodepool
  namespace: gamev1
spec:
  template:
    spec:
      nodeClassRef:
        name: gamev1-node-template
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: kubernetes.io/os
          operator: In
          values: ["linux"]
        - key: karpenter.k8s.aws/instance-family
          operator: In
          values: ["t3", "c5"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand"]  # No spot instances for critical services

  limits:
    cpu: "100"
    memory: "200Gi"

  disruption:
    consolidationPolicy: WhenEmpty
    expireAfter: 2160h  # 90 days for stability
EOF

    echo -e "${GREEN}✅ Karpenter auto-scaling configuration created${NC}"
}

# Function to create custom metrics for scaling
create_custom_metrics() {
    echo -e "${BLUE}📊 Creating custom metrics for scaling...${NC}"

    # Create custom metrics server configuration
    cat > "$CONFIG_DIR/custom-metrics-server.yml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-metrics-server
  namespace: gamev1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: custom-metrics-server
  template:
    metadata:
      labels:
        app: custom-metrics-server
    spec:
      serviceAccountName: custom-metrics-server-sa
      containers:
      - name: custom-metrics-server
        image: k8s.gcr.io/metrics-server/metrics-server:v0.6.3
        args:
        - --cert-dir=/tmp
        - --secure-port=4443
        - --kubelet-insecure-tls
        - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
        - --kubelet-use-node-status-port
        - --metric-resolution=15s
        ports:
        - containerPort: 4443
          name: https
        volumeMounts:
        - name: tmp-dir
          mountPath: /tmp
        resources:
          requests:
            memory: "200Mi"
            cpu: "100m"
          limits:
            memory: "400Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /livez
            port: 4443
            scheme: HTTPS
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /readyz
            port: 4443
            scheme: HTTPS
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: tmp-dir
        emptyDir: {}

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: custom-metrics-server-sa
  namespace: gamev1

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: custom-metrics-server
rules:
- apiGroups: [""]
  resources: ["nodes", "nodes/stats", "namespaces", "pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["pods", "nodes"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: custom-metrics-server
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: custom-metrics-server
subjects:
- kind: ServiceAccount
  name: custom-metrics-server-sa
  namespace: gamev1

---
apiVersion: v1
kind: Service
metadata:
  name: custom-metrics-server
  namespace: gamev1
spec:
  type: ClusterIP
  ports:
  - name: https
    port: 443
    targetPort: 4443
  selector:
    app: custom-metrics-server
EOF

    # Create custom metrics adapter
    cat > "$CONFIG_DIR/custom-metrics-adapter.yml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus-adapter
  namespace: gamev1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: prometheus-adapter
  template:
    metadata:
      labels:
        app: prometheus-adapter
    spec:
      serviceAccountName: prometheus-adapter-sa
      containers:
      - name: prometheus-adapter
        image: directxman12/k8s-prometheus-adapter:v0.11.0
        args:
        - --secure-port=6443
        - --tls-cert-file=/var/run/serving-cert/tls.crt
        - --tls-private-key-file=/var/run/serving-cert/tls.key
        - --logtostderr=true
        - --prometheus-url=http://prometheus:9090
        - --metrics-relist-interval=1m
        - --v=4
        - --config=/etc/adapter/config.yaml
        ports:
        - containerPort: 6443
          name: https
        volumeMounts:
        - name: config
          mountPath: /etc/adapter
        - name: serving-cert
          mountPath: /var/run/serving-cert
        resources:
          requests:
            memory: "200Mi"
            cpu: "100m"
          limits:
            memory: "400Mi"
            cpu: "200m"
      volumes:
      - name: config
        configMap:
          name: prometheus-adapter-config
      - name: serving-cert
        secret:
          secretName: prometheus-adapter-serving-cert

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-adapter-config
  namespace: gamev1
data:
  config.yaml: |
    rules:
    - seriesQuery: 'gamev1_players_active'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          service: {resource: "service"}
      name:
        matches: "^(.*)_active"
        as: "\${1}_per_second"
      metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[5m])) by (<<.GroupBy>>)'
    - seriesQuery: 'gateway_requests_total'
      resources:
        overrides:
          instance: {resource: "node"}
          job: {resource: "namespace"}
      name:
        matches: "^(.*)_total"
        as: "\${1}_per_second"
      metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[5m])) by (<<.GroupBy>>)'
    - seriesQuery: 'gamev1_db_connections_active'
      resources:
        overrides:
          instance: {resource: "node"}
      name:
        matches: "^(.*)_connections_active"
        as: "\${1}_utilization"
      metricsQuery: 'avg(<<.Series>>{<<.LabelMatchers>>}) by (<<.GroupBy>>) / 100'

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus-adapter-sa
  namespace: gamev1

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus-adapter
rules:
- apiGroups: [""]
  resources: ["nodes", "namespaces", "pods", "services"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["*"]
  verbs: ["*"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus-adapter
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus-adapter
subjects:
- kind: ServiceAccount
  name: prometheus-adapter-sa
  namespace: gamev1

---
apiVersion: v1
kind: Service
metadata:
  name: prometheus-adapter
  namespace: gamev1
spec:
  type: ClusterIP
  ports:
  - name: https
    port: 443
    targetPort: 6443
  selector:
    app: prometheus-adapter
EOF

    echo -e "${GREEN}✅ Custom metrics configuration created${NC}"
}

# Function to create scaling policies and monitoring
create_scaling_policies() {
    echo -e "${BLUE}📋 Creating scaling policies and monitoring...${NC}"

    # Create scaling policy configuration
    cat > "$CONFIG_DIR/scaling-policies.yml" << EOF
# GameV1 Auto-Scaling Policies
# Enterprise-grade scaling configuration

scaling_policies:
  gateway:
    # Normal hours (9 AM - 9 PM)
    normal_hours:
      min_replicas: 5
      max_replicas: 30
      target_cpu_utilization: 70
      target_memory_utilization: 80
      scale_up_threshold: 75
      scale_down_threshold: 30

    # Peak hours (gaming prime time)
    peak_hours:
      min_replicas: 10
      max_replicas: 50
      target_cpu_utilization: 60
      target_memory_utilization: 75
      scale_up_threshold: 80
      scale_down_threshold: 20

    # Off-peak hours (maintenance)
    off_peak:
      min_replicas: 2
      max_replicas: 10
      target_cpu_utilization: 50
      target_memory_utilization: 60
      scale_up_threshold: 60
      scale_down_threshold: 10

  worker:
    # Game session scaling
    game_sessions:
      min_replicas: 3
      max_replicas: 100
      target_cpu_utilization: 75
      target_memory_utilization: 85
      target_game_sessions: 200

    # Background processing
    background_processing:
      min_replicas: 1
      max_replicas: 20
      target_cpu_utilization: 60
      target_memory_utilization: 70

# Scaling triggers
scaling_triggers:
  - name: "high_player_activity"
    condition: "gamev1_players_active > 5000"
    action: "scale_up_gateway_to_20"
    cooldown: "5m"

  - name: "low_player_activity"
    condition: "gamev1_players_active < 100"
    action: "scale_down_gateway_to_3"
    cooldown: "10m"

  - name: "database_high_load"
    condition: "gamev1_db_connections_active / gamev1_db_connections_max > 0.8"
    action: "scale_up_worker_to_10"
    cooldown: "3m"

# Cost optimization
cost_optimization:
  spot_instances:
    enabled: true
    max_spot_percentage: 50
    fallback_to_ondemand: true

  scheduled_scaling:
    - name: "nightly_scale_down"
      schedule: "0 2 * * *"  # 2 AM daily
      target_replicas:
        gateway: 2
        worker: 1

    - name: "morning_scale_up"
      schedule: "0 8 * * *"  # 8 AM daily
      target_replicas:
        gateway: 5
        worker: 3

  resource_optimization:
    right_sizing:
      enabled: true
      evaluation_interval: "24h"
      resize_threshold: 20  # Resize if 20% under/over utilized

    bin_packing:
      enabled: true
      consolidation_interval: "1h"
EOF

    # Create scaling monitoring dashboard
    cat > "$CONFIG_DIR/scaling-dashboard.json" << EOF
{
  "dashboard": {
    "id": null,
    "title": "GameV1 Auto-Scaling Dashboard",
    "tags": ["gamev1", "scaling", "kubernetes"],
    "panels": [
      {
        "id": 1,
        "title": "Gateway Replicas",
        "type": "graph",
        "targets": [
          {
            "expr": "kube_deployment_spec_replicas{deployment=\"gamev1-gateway\"}",
            "legendFormat": "Desired Replicas"
          },
          {
            "expr": "kube_deployment_status_replicas{deployment=\"gamev1-gateway\"}",
            "legendFormat": "Actual Replicas"
          }
        ]
      },
      {
        "id": 2,
        "title": "Worker Replicas",
        "type": "graph",
        "targets": [
          {
            "expr": "kube_deployment_spec_replicas{deployment=\"gamev1-worker\"}",
            "legendFormat": "Desired Replicas"
          },
          {
            "expr": "kube_deployment_status_replicas{deployment=\"gamev1-worker\"}",
            "legendFormat": "Actual Replicas"
          }
        ]
      },
      {
        "id": 3,
        "title": "Scaling Events",
        "type": "graph",
        "targets": [
          {
            "expr": "increase(kube_hpa_status_condition{condition=\"ScalingActive\"}[5m])",
            "legendFormat": "Scaling Events"
          }
        ]
      },
      {
        "id": 4,
        "title": "Resource Utilization",
        "type": "graph",
        "targets": [
          {
            "expr": "avg(kube_pod_container_resource_requests{resource=\"cpu\", container=\"gateway\"})",
            "legendFormat": "Gateway CPU Request"
          },
          {
            "expr": "avg(kube_pod_container_resource_limits{resource=\"cpu\", container=\"gateway\"})",
            "legendFormat": "Gateway CPU Limit"
          }
        ]
      }
    ]
  }
}
EOF

    echo -e "${GREEN}✅ Scaling policies and monitoring created${NC}"
}

# Function to create deployment script
create_deployment_script() {
    echo -e "${BLUE}🚀 Creating deployment script...${NC}"

    cat > "$CONFIG_DIR/deploy-auto-scaling.sh" << 'EOF'
#!/bin/bash
# Deploy auto-scaling configuration

set -e

echo "📈 Deploying auto-scaling configuration..."

# 1. Deploy custom metrics server
echo "📊 Deploying custom metrics server..."
kubectl apply -f custom-metrics-server.yml

# 2. Deploy Prometheus adapter for custom metrics
echo "🔧 Deploying Prometheus adapter..."
kubectl apply -f custom-metrics-adapter.yml

# 3. Wait for metrics servers to be ready
echo "⏳ Waiting for metrics servers..."
kubectl wait --for=condition=available --timeout=300s deployment/custom-metrics-server -n gamev1
kubectl wait --for=condition=available --timeout=300s deployment/prometheus-adapter -n gamev1

# 4. Deploy HPA configurations
echo "⚖️  Deploying HPA configurations..."
kubectl apply -f hpa-gateway-advanced.yml
kubectl apply -f hpa-worker-advanced.yml

# 5. Deploy VPA for vertical scaling
echo "📏 Deploying VPA..."
kubectl apply -f vpa-gamev1.yml

# 6. Deploy Karpenter (if using)
# kubectl apply -f karpenter-provisioner.yml
# kubectl apply -f karpenter-nodepool.yml

# 7. Deploy scaling policies
echo "📋 Deploying scaling policies..."
kubectl apply -f scaling-policies.yml

# 8. Verify scaling configuration
echo "🔍 Verifying scaling configuration..."

# Check HPA status
kubectl get hpa -n gamev1

# Check VPA status
kubectl get vpa -n gamev1

# Check metrics server
if kubectl top nodes > /dev/null 2>&1; then
    echo "✅ Metrics server: Working"
else
    echo "❌ Metrics server: Not working"
fi

# Check custom metrics
if kubectl get --raw="/apis/custom.metrics.k8s.io/v1beta1" > /dev/null 2>&1; then
    echo "✅ Custom metrics API: Available"
else
    echo "❌ Custom metrics API: Not available"
fi

echo "✅ Auto-scaling deployment completed!"

echo ""
echo "📈 Auto-scaling features:"
echo "  • HPA: Horizontal Pod Autoscaler (3-50 replicas for gateway)"
echo "  • VPA: Vertical Pod Autoscaler for resource optimization"
echo "  • Custom metrics: Game-specific scaling based on player count"
echo "  • Scaling policies: Time-based and event-driven scaling"
echo ""
echo "🔧 Management:"
echo "  • kubectl get hpa -n gamev1 (View HPA status)"
echo "  • kubectl get vpa -n gamev1 (View VPA status)"
echo "  • kubectl top pods -n gamev1 (View resource usage)"
echo "  • kubectl describe hpa gamev1-gateway-hpa -n gamev1 (Detailed HPA info)"
EOF

    chmod +x "$CONFIG_DIR/deploy-auto-scaling.sh"

    echo -e "${GREEN}✅ Auto-scaling deployment script created${NC}"
}

# Main setup based on scaling type
case $SCALING_TYPE in
    "kubernetes-hpa")
        create_kubernetes_hpa
        create_custom_metrics
        create_scaling_policies
        create_deployment_script
        ;;
    "karpenter")
        create_karpenter_scaling
        create_custom_metrics
        create_scaling_policies
        create_deployment_script
        ;;
    "custom-metrics")
        create_custom_metrics
        create_scaling_policies
        create_deployment_script
        ;;
    *)
        echo -e "${RED}❌ Unknown scaling type: $SCALING_TYPE${NC}"
        echo "Use: kubernetes-hpa, karpenter, or custom-metrics"
        exit 1
        ;;
esac

# Generate summary
echo ""
echo -e "${BLUE}${BOLD}📈 Auto-Scaling Implementation Complete${NC}"
echo "====================================="

echo -e "${YELLOW}📁 Generated configuration files:${NC}"
find "$CONFIG_DIR" -type f | while read file; do
    echo "  • $file"
done

echo ""
echo -e "${YELLOW}🚀 Deployment Instructions:${NC}"
echo "  cd $CONFIG_DIR && ./deploy-auto-scaling.sh"

echo ""
echo -e "${YELLOW}📈 Scaling Features:${NC}"
case $SCALING_TYPE in
    "kubernetes-hpa")
        echo "  • HPA with CPU, memory, and custom metrics"
        echo "  • Advanced scaling policies with stabilization windows"
        echo "  • Support for multiple scaling triggers"
        ;;
    "karpenter")
        echo "  • Karpenter for node auto-scaling"
        echo "  • Spot instance support for cost optimization"
        echo "  • Workload-specific node provisioning"
        ;;
    "custom-metrics")
        echo "  • Custom metrics based on game-specific KPIs"
        echo "  • Prometheus adapter for external metrics"
        echo "  • Application-aware scaling decisions"
        ;;
esac

echo ""
echo -e "${YELLOW}💡 Enterprise Features:${NC}"
echo "  • Multi-dimensional scaling (CPU, memory, custom metrics)"
echo "  • Cost optimization with spot instances"
echo "  • Scheduled scaling for predictable patterns"
echo "  • Comprehensive monitoring and alerting"
echo "  • Right-sizing recommendations"
echo "  • Bin packing for resource efficiency"

echo ""
echo -e "${GREEN}✅ GameV1 auto-scaling implementation completed!${NC}"
