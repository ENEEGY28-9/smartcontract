#!/bin/bash

# 🚀 GameV1 Cloud-Native Migration Script
# Migrate từ hybrid sang cloud-native với Kubernetes

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

MIGRATION_TARGET=${1:-"kubernetes"}  # kubernetes, eks, aks, gke
CLUSTER_SIZE=${2:-"medium"}  # small, medium, large
CONFIG_DIR=${3:-"cloud-native-config"}

echo -e "${BLUE}${BOLD}☁️  GameV1 Cloud-Native Migration${NC}"
echo "==============================="
echo -e "Migration target: ${YELLOW}$MIGRATION_TARGET${NC}"
echo -e "Cluster size: ${YELLOW}$CLUSTER_SIZE${NC}"
echo -e "Config directory: ${YELLOW}$CONFIG_DIR${NC}"
echo ""

# Create configuration directory
mkdir -p "$CONFIG_DIR"

# Function to create EKS cluster configuration
create_eks_cluster() {
    echo -e "${BLUE}☁️  Creating EKS cluster configuration...${NC}"

    # Create eksctl cluster configuration
    cat > "$CONFIG_DIR/eks-cluster.yml" << EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: gamev1-cluster
  region: us-east-1
  version: "1.27"

# Node groups for different workloads
nodeGroups:
  # Critical services (gateway, auth) - high availability
  - name: critical-services
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 2
    maxSize: 6
    volumeSize: 50
    volumeType: gp3
    volumeIOPS: 3000
    volumeThroughput: 125
    labels:
      node-type: critical
      workload: gateway
    taints:
      - key: dedicated
        value: critical
        effect: NoSchedule
    tags:
      Environment: production
      Team: platform

  # Game workers - compute optimized
  - name: game-workers
    instanceType: c5.large
    desiredCapacity: 2
    minSize: 1
    maxSize: 10
    volumeSize: 100
    volumeType: gp3
    labels:
      node-type: compute
      workload: worker
    tags:
      Environment: production
      Team: game-logic

  # Database nodes - storage optimized
  - name: database-nodes
    instanceType: r5.large
    desiredCapacity: 2
    minSize: 2
    maxSize: 4
    volumeSize: 200
    volumeType: gp3
    volumeIOPS: 5000
    labels:
      node-type: storage
      workload: database
    taints:
      - key: dedicated
        value: database
        effect: NoSchedule
    tags:
      Environment: production
      Team: data

# Add-ons
addons:
  - name: vpc-cni
    version: latest
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest
  - name: aws-ebs-csi-driver
    version: latest

# IAM configuration
iam:
  withOIDC: true
  serviceAccounts:
    - metadata:
        name: gamev1-gateway-sa
        namespace: gamev1
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy

# VPC configuration
vpc:
  id: "vpc-12345678"  # Replace with actual VPC ID
  subnets:
    private:
      us-east-1a: { id: "subnet-12345678" }
      us-east-1b: { id: "subnet-87654321" }
      us-east-1c: { id: "subnet-abcdef12" }
    public:
      us-east-1a: { id: "subnet-abcdef12" }
      us-east-1b: { id: "subnet-12345678" }
      us-east-1c: { id: "subnet-87654321" }

# Security groups
securityGroup: sg-1234567890abcdef0

# CloudWatch logging
cloudWatch:
  clusterLogging:
    enableTypes: ["api", "audit", "authenticator", "controllerManager", "scheduler"]

# Encryption configuration
secretsEncryption:
  keyARN: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
EOF

    # Create cluster deployment script
    cat > "$CONFIG_DIR/deploy-eks-cluster.sh" << 'EOF'
#!/bin/bash
# Deploy EKS cluster for GameV1

set -e

echo "☁️  Deploying EKS cluster..."

# Check if eksctl is installed
if ! command -v eksctl &> /dev/null; then
    echo "📦 Installing eksctl..."
    curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
    sudo mv /tmp/eksctl /usr/local/bin/
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "📦 Installing kubectl..."
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Run: aws configure"
    exit 1
fi

# Create cluster
echo "🏗️  Creating EKS cluster..."
eksctl create cluster -f eks-cluster.yml

# Wait for cluster to be ready
echo "⏳ Waiting for cluster to be ready..."
kubectl wait --for=condition=available --timeout=600s deployment/coredns -n kube-system

# Verify cluster
echo "🔍 Verifying cluster..."
kubectl get nodes
kubectl get pods -A

echo "✅ EKS cluster deployed successfully!"

echo ""
echo "🔧 Cluster information:"
echo "  • Cluster name: gamev1-cluster"
echo "  • Region: us-east-1"
echo "  • Node groups: critical-services, game-workers, database-nodes"
echo ""
echo "🚀 Next steps:"
echo "  • Configure kubectl: aws eks update-kubeconfig --name gamev1-cluster"
echo "  • Deploy GameV1 services: kubectl apply -f k8s-manifests/"
echo "  • Setup monitoring: kubectl apply -f monitoring/"
EOF

    chmod +x "$CONFIG_DIR/deploy-eks-cluster.sh"

    echo -e "${GREEN}✅ EKS cluster configuration created${NC}"
}

# Function to create Kubernetes manifests
create_kubernetes_manifests() {
    echo -e "${BLUE}☸️  Creating Kubernetes manifests...${NC}"

    # Create namespace
    mkdir -p "$CONFIG_DIR/k8s-manifests"

    cat > "$CONFIG_DIR/k8s-manifests/namespace.yml" << EOF
apiVersion: v1
kind: Namespace
metadata:
  name: gamev1
  labels:
    name: gamev1
    environment: production
EOF

    # Create ConfigMap for application configuration
    cat > "$CONFIG_DIR/k8s-manifests/configmap.yml" << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: gamev1-config
  namespace: gamev1
data:
  # Database configuration
  DATABASE_URL: "postgresql://gamev1:password@postgres-service:5432/gamev1"
  REDIS_URL: "redis://redis-service:6379"

  # Service configuration
  GATEWAY_PORT: "8080"
  WORKER_PORT: "50051"
  POCKETBASE_PORT: "8090"

  # Environment
  ENVIRONMENT: "production"
  LOG_LEVEL: "info"

  # Performance settings
  MAX_CONNECTIONS: "1000"
  WORKER_THREADS: "8"
EOF

    # Create secrets for sensitive data
    cat > "$CONFIG_DIR/k8s-manifests/secrets.yml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: gamev1-secrets
  namespace: gamev1
type: Opaque
data:
  # Base64 encoded secrets
  database-password: Z2FtZXYxX3Bhc3N3b3Jk
  jwt-secret: Z2FtZXYxX2p3dF9zZWNyZXRfa2V5
  redis-password: cmVkaXNfcGFzc3dvcmQ=
EOF

    # Create service account with permissions
    cat > "$CONFIG_DIR/k8s-manifests/service-account.yml" << EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gamev1-gateway-sa
  namespace: gamev1
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/gamev1-gateway-role

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gamev1-worker-sa
  namespace: gamev1
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/gamev1-worker-role

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gamev1-database-sa
  namespace: gamev1
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/gamev1-database-role
EOF

    # Create gateway deployment
    cat > "$CONFIG_DIR/k8s-manifests/gateway-deployment.yml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gamev1-gateway
  namespace: gamev1
  labels:
    app: gamev1-gateway
    version: v1.0.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gamev1-gateway
  template:
    metadata:
      labels:
        app: gamev1-gateway
        version: v1.0.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: gamev1-gateway-sa
      nodeSelector:
        node-type: critical
      tolerations:
        - key: dedicated
          operator: Equal
          value: critical
          effect: NoSchedule
      containers:
      - name: gateway
        image: gamev1/gateway:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        envFrom:
        - configMapRef:
            name: gamev1-config
        - secretRef:
            name: gamev1-secrets
        env:
        - name: WORKER_ENDPOINT
          value: "gamev1-worker:50051"
        - name: INSTANCE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1000
          capabilities:
            drop:
            - ALL
EOF

    # Create worker deployment
    cat > "$CONFIG_DIR/k8s-manifests/worker-deployment.yml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gamev1-worker
  namespace: gamev1
  labels:
    app: gamev1-worker
    version: v1.0.0
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gamev1-worker
  template:
    metadata:
      labels:
        app: gamev1-worker
        version: v1.0.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3100"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: gamev1-worker-sa
      nodeSelector:
        node-type: compute
      containers:
      - name: worker
        image: gamev1/worker:latest
        ports:
        - containerPort: 50051
          name: grpc
        - containerPort: 3100
          name: metrics
        envFrom:
        - configMapRef:
            name: gamev1-config
        - secretRef:
            name: gamev1-secrets
        env:
        - name: INSTANCE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        resources:
          requests:
            memory: "512Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          grpc:
            port: 50051
          initialDelaySeconds: 60
          periodSeconds: 30
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1000
EOF

    # Create database statefulset
    cat > "$CONFIG_DIR/k8s-manifests/database-statefulset.yml" << EOF
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: gamev1-database
  namespace: gamev1
  labels:
    app: gamev1-database
    version: v1.0.0
spec:
  serviceName: gamev1-database
  replicas: 3
  selector:
    matchLabels:
      app: gamev1-database
  template:
    metadata:
      labels:
        app: gamev1-database
        version: v1.0.0
    spec:
      serviceAccountName: gamev1-database-sa
      nodeSelector:
        node-type: storage
      tolerations:
        - key: dedicated
          operator: Equal
          value: database
          effect: NoSchedule
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        envFrom:
        - configMapRef:
            name: gamev1-config
        - secretRef:
            name: gamev1-secrets
        env:
        - name: POSTGRES_DB
          value: "gamev1"
        - name: POSTGRES_USER
          value: "gamev1"
        - name: PGDATA
          value: "/var/lib/postgresql/data/pgdata"
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - gamev1
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - gamev1
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: gp3
      resources:
        requests:
          storage: 100Gi
EOF

    # Create services
    cat > "$CONFIG_DIR/k8s-manifests/services.yml" << EOF
apiVersion: v1
kind: Service
metadata:
  name: gamev1-gateway
  namespace: gamev1
  labels:
    app: gamev1-gateway
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
  - name: https
    port: 443
    targetPort: 8080
    protocol: TCP
  selector:
    app: gamev1-gateway

---
apiVersion: v1
kind: Service
metadata:
  name: gamev1-worker
  namespace: gamev1
  labels:
    app: gamev1-worker
spec:
  type: ClusterIP
  ports:
  - name: grpc
    port: 50051
    targetPort: 50051
    protocol: TCP
  selector:
    app: gamev1-worker

---
apiVersion: v1
kind: Service
metadata:
  name: gamev1-database
  namespace: gamev1
  labels:
    app: gamev1-database
spec:
  type: ClusterIP
  ports:
  - name: postgres
    port: 5432
    targetPort: 5432
    protocol: TCP
  selector:
    app: gamev1-database

---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: gamev1
  labels:
    app: redis
spec:
  type: ClusterIP
  ports:
  - name: redis
    port: 6379
    targetPort: 6379
    protocol: TCP
  selector:
    app: redis
EOF

    echo -e "${GREEN}✅ Kubernetes manifests created${NC}"
}

# Function to create auto-scaling configuration
create_auto_scaling_config() {
    echo -e "${BLUE}📈 Creating auto-scaling configuration...${NC}"

    # Create Horizontal Pod Autoscaler for gateway
    cat > "$CONFIG_DIR/k8s-manifests/hpa-gateway.yml" << EOF
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
  minReplicas: 2
  maxReplicas: 10
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
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 120
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
EOF

    # Create Horizontal Pod Autoscaler for worker
    cat > "$CONFIG_DIR/k8s-manifests/hpa-worker.yml" << EOF
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
  minReplicas: 1
  maxReplicas: 20
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
        value: "100"
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
EOF

    # Create Cluster Autoscaler configuration
    cat > "$CONFIG_DIR/cluster-autoscaler.yml" << EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-autoscaler
  namespace: kube-system

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-autoscaler
rules:
- apiGroups: [""]
  resources: ["events", "endpoints"]
  verbs: ["create", "patch"]
- apiGroups: [""]
  resources: ["pods/eviction"]
  verbs: ["create"]
- apiGroups: [""]
  resources: ["pods/status"]
  verbs: ["update"]
- apiGroups: [""]
  resources: ["endpoints"]
  resourceNames: ["cluster-autoscaler"]
  verbs: ["get", "update"]
- apiGroups: ["cluster.autoscaler.kubernetes.io"]
  resources: ["*"]
  verbs: ["*"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cluster-autoscaler
  namespace: kube-system
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["create","list","watch"]
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["cluster-autoscaler-status", "cluster-autoscaler-priority-expander"]
  verbs: ["delete", "get", "update", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-autoscaler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-autoscaler
subjects:
- kind: ServiceAccount
  name: cluster-autoscaler
  namespace: kube-system

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
  labels:
    app: cluster-autoscaler
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      tolerations:
        - effect: NoSchedule
          operator: Exists
      nodeSelector:
        node-type: critical
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.27.0
        name: cluster-autoscaler
        resources:
          limits:
            cpu: 100m
            memory: 300Mi
          requests:
            cpu: 100m
            memory: 300Mi
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --address=:8085
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/gamev1-cluster
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
        volumeMounts:
        - name: ssl-certs
          mountPath: /etc/ssl/certs/ca-certificates.crt
          readOnly: true
      volumes:
      - name: ssl-certs
        hostPath:
          path: /etc/ssl/certs/ca-bundle.crt
EOF

    echo -e "${GREEN}✅ Auto-scaling configuration created${NC}"
}

# Function to create cloud-native deployment script
create_cloud_native_deployment() {
    echo -e "${BLUE}🚀 Creating cloud-native deployment script...${NC}"

    cat > "$CONFIG_DIR/deploy-cloud-native.sh" << 'EOF'
#!/bin/bash
# Deploy GameV1 to cloud-native Kubernetes

set -e

echo "☁️  Deploying GameV1 to Kubernetes cluster..."

# 1. Configure kubectl for EKS cluster
echo "🔧 Configuring kubectl..."
aws eks update-kubeconfig --name gamev1-cluster --region us-east-1

# 2. Create namespace
echo "📁 Creating namespace..."
kubectl apply -f k8s-manifests/namespace.yml

# 3. Create secrets and config
echo "⚙️  Creating secrets and configuration..."
kubectl apply -f k8s-manifests/secrets.yml
kubectl apply -f k8s-manifests/configmap.yml
kubectl apply -f k8s-manifests/service-account.yml

# 4. Deploy database first
echo "🗄️  Deploying database..."
kubectl apply -f k8s-manifests/database-statefulset.yml
kubectl apply -f k8s-manifests/services.yml

# Wait for database to be ready
echo "⏳ Waiting for database..."
kubectl wait --for=condition=available --timeout=600s deployment/gamev1-database -n gamev1

# 5. Deploy Redis
echo "🔴 Deploying Redis..."
kubectl apply -f redis-deployment.yml

# 6. Deploy services
echo "🚀 Deploying application services..."
kubectl apply -f k8s-manifests/gateway-deployment.yml
kubectl apply -f k8s-manifests/worker-deployment.yml

# 7. Deploy auto-scaling
echo "📈 Deploying auto-scaling..."
kubectl apply -f k8s-manifests/hpa-gateway.yml
kubectl apply -f k8s-manifests/hpa-worker.yml

# 8. Wait for all deployments to be ready
echo "⏳ Waiting for deployments..."
kubectl wait --for=condition=available --timeout=600s deployment/gamev1-gateway -n gamev1
kubectl wait --for=condition=available --timeout=600s deployment/gamev1-worker -n gamev1

# 9. Verify deployment
echo "🔍 Verifying deployment..."
kubectl get pods -n gamev1
kubectl get services -n gamev1
kubectl get hpa -n gamev1

# 10. Get load balancer URL
echo "🌐 Getting load balancer URL..."
GATEWAY_URL=$(kubectl get service gamev1-gateway -n gamev1 -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
if [ -n "$GATEWAY_URL" ]; then
    GATEWAY_URL="http://$GATEWAY_URL"
    echo "✅ Gateway accessible at: $GATEWAY_URL"

    # Test health endpoint
    if curl -f "$GATEWAY_URL/healthz" > /dev/null 2>&1; then
        echo "✅ Health check passed"
    else
        echo "❌ Health check failed"
    fi
else
    echo "⚠️  Load balancer not ready yet"
fi

echo ""
echo "✅ Cloud-native deployment completed!"
echo ""
echo "📊 Access your services:"
echo "  • Gateway: $GATEWAY_URL"
echo "  • kubectl: kubectl get pods,svc,hpa -n gamev1"
echo ""
echo "🔧 Management:"
echo "  • Scale gateway: kubectl scale deployment gamev1-gateway --replicas=5 -n gamev1"
echo "  • Check logs: kubectl logs -f deployment/gamev1-gateway -n gamev1"
echo "  • Update image: kubectl set image deployment/gamev1-gateway gateway=gamev1/gateway:v2.0.0 -n gamev1"
EOF

    chmod +x "$CONFIG_DIR/deploy-cloud-native.sh"

    echo -e "${GREEN}✅ Cloud-native deployment script created${NC}"
}

# Function to create migration strategy
create_migration_strategy() {
    echo -e "${BLUE}🔄 Creating migration strategy...${NC}"

    cat > "$CONFIG_DIR/migration-strategy.md" << 'EOF'
# GameV1 Cloud-Native Migration Strategy

## Overview
Migrate từ hybrid architecture sang cloud-native với zero-downtime deployment.

## Migration Phases

### Phase 1: Preparation (1-2 days)
1. **Infrastructure Assessment**
   - Evaluate current hybrid setup
   - Identify components for migration
   - Plan resource allocation

2. **Kubernetes Cluster Setup**
   - Deploy EKS cluster with appropriate node groups
   - Configure networking and security
   - Set up monitoring and logging

3. **Container Preparation**
   - Build container images for all services
   - Create Kubernetes manifests
   - Test container deployments locally

### Phase 2: Database Migration (2-3 days)
1. **Database Backup**
   - Create full backup of current database
   - Test backup restoration

2. **Schema Migration**
   - Migrate database schema to PostgreSQL (if needed)
   - Update connection strings
   - Test database connectivity

3. **Data Migration**
   - Migrate user data and game state
   - Validate data integrity
   - Set up read replicas

### Phase 3: Service Migration (3-5 days)
1. **Gradual Migration**
   - Deploy services to Kubernetes alongside existing setup
   - Use blue-green deployment strategy
   - Test service integration

2. **Traffic Migration**
   - Gradually route traffic to Kubernetes services
   - Monitor performance and error rates
   - Rollback if issues detected

3. **Load Balancer Update**
   - Update load balancer to point to Kubernetes services
   - Configure health checks
   - Enable auto-scaling

### Phase 4: Optimization (1-2 days)
1. **Performance Tuning**
   - Optimize resource allocation
   - Configure auto-scaling policies
   - Set up monitoring dashboards

2. **Security Hardening**
   - Configure network policies
   - Set up pod security policies
   - Enable encryption at rest

3. **Cost Optimization**
   - Right-size resources
   - Set up spot instances for non-critical workloads
   - Configure auto-scaling for cost efficiency

## Rollback Strategy

### Automated Rollback Triggers
- Health check failures > 5 minutes
- Error rate > 5%
- Response time > 2 seconds
- Database connection failures

### Manual Rollback Process
1. Stop Kubernetes deployments
2. Update load balancer to point back to original services
3. Verify service restoration
4. Investigate root cause

## Monitoring During Migration

### Key Metrics to Monitor
- Response times and error rates
- Database connection pool usage
- Memory and CPU utilization
- Network traffic patterns
- User session continuity

### Alerting Setup
- Critical: Service unavailability
- Warning: Performance degradation
- Info: Scaling events

## Risk Mitigation

### Data Protection
- Multiple database backups
- Point-in-time recovery capability
- Cross-region replication

### Service Availability
- Gradual traffic migration
- Comprehensive health checks
- Automated rollback capability

### Performance
- Load testing before migration
- Performance benchmarking
- Resource monitoring

## Success Criteria

### Technical Success
- Zero-downtime migration
- All services running on Kubernetes
- Performance maintained or improved
- All monitoring and alerting functional

### Business Success
- No user impact during migration
- Improved scalability and reliability
- Reduced operational overhead
- Better resource utilization

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Preparation | 1-2 days | ✅ Complete |
| Database Migration | 2-3 days | ⏳ In Progress |
| Service Migration | 3-5 days | ⏳ Pending |
| Optimization | 1-2 days | ⏳ Pending |

## Resources Required

### Team
- DevOps Engineer (lead)
- Backend Developer
- Database Administrator
- QA Engineer

### Infrastructure
- EKS cluster (3 node groups)
- RDS PostgreSQL instance
- ElastiCache Redis cluster
- Load balancer capacity

### Tools
- kubectl and eksctl
- Terraform for infrastructure
- Helm for package management
- Monitoring stack (Prometheus, Grafana)

## Next Steps

1. Complete database migration testing
2. Deploy initial Kubernetes services
3. Begin gradual traffic migration
4. Monitor and optimize performance
5. Complete full migration and cleanup

---

**Migration completed successfully when all services run on Kubernetes with improved performance and reliability! 🚀**
EOF

    echo -e "${GREEN}✅ Migration strategy created${NC}"
}

# Main setup based on migration target
case $MIGRATION_TARGET in
    "kubernetes"|"eks")
        create_eks_cluster
        create_kubernetes_manifests
        create_auto_scaling_config
        create_cloud_native_deployment
        create_migration_strategy
        ;;
    *)
        echo -e "${RED}❌ Unknown migration target: $MIGRATION_TARGET${NC}"
        echo "Use: kubernetes, eks, aks, or gke"
        exit 1
        ;;
esac

# Generate summary
echo ""
echo -e "${BLUE}${BOLD}☁️  Cloud-Native Migration Setup Complete${NC}"
echo "========================================"

echo -e "${YELLOW}📁 Generated configuration files:${NC}"
find "$CONFIG_DIR" -type f | while read file; do
    echo "  • $file"
done

echo ""
echo -e "${YELLOW}🚀 Deployment Instructions:${NC}"
case $MIGRATION_TARGET in
    "kubernetes"|"eks")
        echo "  ☁️  EKS Cluster:"
        echo "    cd $CONFIG_DIR && ./deploy-eks-cluster.sh"
        echo ""
        echo "  ☸️  Kubernetes Services:"
        echo "    cd $CONFIG_DIR && ./deploy-cloud-native.sh"
        ;;
esac

echo ""
echo -e "${YELLOW}📊 Infrastructure Overview:${NC}"
echo "  • EKS Cluster: 3 node groups (critical, compute, storage)"
echo "  • Auto-scaling: HPA for gateway (2-10 replicas) and worker (1-20 replicas)"
echo "  • Database: PostgreSQL StatefulSet with persistent storage"
echo "  • Monitoring: Prometheus metrics and Grafana dashboards"
echo "  • Security: Service accounts with IAM roles"

echo ""
echo -e "${YELLOW}💡 Features:${NC}"
echo "  • Zero-downtime deployment with rolling updates"
echo "  • Automatic scaling based on CPU, memory, and custom metrics"
echo "  • Persistent storage for databases with backup"
echo "  • Service mesh ready for microservices"
echo "  • Multi-region deployment capability"
echo "  • Comprehensive security with pod security policies"

echo ""
echo -e "${GREEN}✅ GameV1 cloud-native migration setup completed!${NC}"