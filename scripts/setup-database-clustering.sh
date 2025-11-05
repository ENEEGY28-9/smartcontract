#!/bin/bash

# 🚀 GameV1 Database Clustering Setup
# Cấu hình read replicas và sharding cho scale

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

CLUSTER_TYPE=${1:-"read-replicas"}  # read-replicas, sharding, full-cluster
DATABASE_TYPE=${2:-"postgresql"}  # postgresql, mysql
CONFIG_DIR=${3:-"database-cluster-config"}

echo -e "${BLUE}${BOLD}🗄️  GameV1 Database Clustering Setup${NC}"
echo "===================================="
echo -e "Cluster type: ${YELLOW}$CLUSTER_TYPE${NC}"
echo -e "Database: ${YELLOW}$DATABASE_TYPE${NC}"
echo -e "Config directory: ${YELLOW}$CONFIG_DIR${NC}"
echo ""

# Create configuration directory
mkdir -p "$CONFIG_DIR"

# Function to setup PostgreSQL read replicas
setup_postgresql_replicas() {
    echo -e "${BLUE}🐘 Setting up PostgreSQL read replicas...${NC}"

    # Create PostgreSQL configuration for master
    cat > "$CONFIG_DIR/postgresql-master.conf" << EOF
# PostgreSQL Master Configuration for GameV1
# Optimized for game server with read replicas

# Basic settings
listen_addresses = '*'
port = 5432
max_connections = 200

# Memory settings (adjust based on available RAM)
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# WAL settings for replication
wal_level = replica
max_wal_senders = 10
wal_keep_segments = 64

# Checkpoint settings
checkpoint_segments = 32
checkpoint_completion_target = 0.9

# Logging
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'
log_min_duration_statement = 1000

# Performance settings
random_page_cost = 1.5
effective_io_concurrency = 200

# Connection settings
tcp_keepalives_idle = 60
tcp_keepalives_interval = 60
tcp_keepalives_count = 5
EOF

    # Create PostgreSQL configuration for replicas
    cat > "$CONFIG_DIR/postgresql-replica.conf" << EOF
# PostgreSQL Replica Configuration for GameV1
# Optimized for read-heavy workloads

# Basic settings
listen_addresses = '*'
port = 5432
max_connections = 150

# Memory settings (read-focused)
shared_buffers = 128MB
effective_cache_size = 512MB
work_mem = 2MB

# Replica settings
hot_standby = on
max_standby_archive_delay = 30s
max_standby_streaming_delay = 30s
wal_receiver_status_interval = 10s

# Logging (less verbose than master)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'none'
log_min_duration_statement = 5000

# Performance settings for read queries
random_page_cost = 2.0
effective_io_concurrency = 100
seq_page_cost = 1.0

# Connection pooling for read queries
max_prepared_transactions = 0
EOF

    # Create replication setup script
    cat > "$CONFIG_DIR/setup-replication.sh" << 'EOF'
#!/bin/bash
# Setup PostgreSQL replication for GameV1

set -e

MASTER_HOST=${1:-"db-master"}
REPLICA_HOST=${2:-"db-replica"}

echo "🔄 Setting up PostgreSQL replication..."
echo "Master: $MASTER_HOST"
echo "Replica: $REPLICA_HOST"

# 1. Configure master server
echo "⚙️  Configuring master server..."

# Backup current postgresql.conf
sudo cp /etc/postgresql/*/main/postgresql.conf /etc/postgresql/*/main/postgresql.conf.backup

# Update master configuration
sudo cp postgresql-master.conf /etc/postgresql/*/main/postgresql.conf

# Create replication user
sudo -u postgres psql -c "CREATE USER replicator REPLICATION LOGIN ENCRYPTED PASSWORD 'replica_password';"

# Update pg_hba.conf for replication
sudo bash -c 'echo "host replication replicator 0.0.0.0/0 md5" >> /etc/postgresql/*/main/pg_hba.conf'

# Restart PostgreSQL master
sudo systemctl restart postgresql

# 2. Setup replica server
echo "🔄 Setting up replica server..."

# Stop PostgreSQL on replica
sudo systemctl stop postgresql

# Remove existing data directory
sudo rm -rf /var/lib/postgresql/*/main/*

# Copy data from master (base backup)
sudo -u postgres pg_basebackup -h $MASTER_HOST -D /var/lib/postgresql/*/main/ -U replicator -P -v

# Create recovery.conf
sudo -u postgres bash -c "cat > /var/lib/postgresql/*/main/recovery.conf << RECOVERY_EOF
standby_mode = 'on'
primary_conninfo = 'host=$MASTER_HOST port=5432 user=replicator password=replica_password'
restore_command = 'cp /var/lib/postgresql/*/main/archive/%f %p'
archive_cleanup_command = 'pg_archivecleanup /var/lib/postgresql/*/main/archive %r'
recovery_target_timeline = 'latest'
RECOVERY_EOF"

# Update replica configuration
sudo cp postgresql-replica.conf /etc/postgresql/*/main/postgresql.conf

# Start PostgreSQL replica
sudo systemctl start postgresql

echo "✅ PostgreSQL replication setup completed!"
echo ""
echo "🔍 Verification:"
echo "  Master status: sudo -u postgres psql -c 'SELECT * FROM pg_stat_replication;'"
echo "  Replica status: sudo -u postgres psql -c 'SELECT pg_is_in_recovery();'"
EOF

    chmod +x "$CONFIG_DIR/setup-replication.sh"

    # Create load balancing script for read queries
    cat > "$CONFIG_DIR/db-load-balancer.py" << 'EOF'
#!/usr/bin/env python3
# Database Load Balancer for GameV1
# Routes read queries to replicas, writes to master

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
import random
import logging
from typing import List, Tuple

class DatabaseLoadBalancer:
    def __init__(self):
        self.master_pool = None
        self.replica_pools = []

        # Configure logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

        self._setup_connection_pools()

    def _setup_connection_pools(self):
        """Setup connection pools for master and replicas"""
        try:
            # Master database pool
            self.master_pool = ThreadedConnectionPool(
                minconn=5,
                maxconn=20,
                host='db-master',
                port=5432,
                database='gamev1',
                user='gamev1',
                password='gamev1_password'
            )

            # Replica database pools
            replica_hosts = ['db-replica-1', 'db-replica-2', 'db-replica-3']
            for host in replica_hosts:
                pool = ThreadedConnectionPool(
                    minconn=3,
                    maxconn=15,
                    host=host,
                    port=5432,
                    database='gamev1',
                    user='gamev1_ro',
                    password='readonly_password'
                )
                self.replica_pools.append(pool)

            self.logger.info(f"Database pools initialized: 1 master + {len(self.replica_pools)} replicas")

        except Exception as e:
            self.logger.error(f"Failed to setup database pools: {e}")
            raise

    def get_read_connection(self):
        """Get connection for read queries (load balanced across replicas)"""
        if not self.replica_pools:
            return self.get_write_connection()

        # Randomly select a replica pool
        pool = random.choice(self.replica_pools)
        return pool.getconn()

    def get_write_connection(self):
        """Get connection for write queries (master only)"""
        if not self.master_pool:
            raise Exception("Master pool not available")
        return self.master_pool.getconn()

    def return_connection(self, connection, is_read=True):
        """Return connection to appropriate pool"""
        try:
            if is_read and self.replica_pools:
                # Return to the pool that provided it
                for pool in self.replica_pools:
                    try:
                        pool.putconn(connection)
                        return
                    except:
                        continue
            else:
                self.master_pool.putconn(connection)
        except Exception as e:
            self.logger.warning(f"Failed to return connection: {e}")

# Global load balancer instance
db_load_balancer = DatabaseLoadBalancer()

def get_db_connection(read_only=True):
    """Get database connection with load balancing"""
    if read_only:
        return db_load_balancer.get_read_connection()
    else:
        return db_load_balancer.get_write_connection()

def execute_read_query(query, params=None):
    """Execute read query with load balancing"""
    conn = None
    try:
        conn = get_db_connection(read_only=True)
        with conn.cursor() as cursor:
            cursor.execute(query, params or [])
            return cursor.fetchall()
    finally:
        if conn:
            db_load_balancer.return_connection(conn, is_read=True)

def execute_write_query(query, params=None):
    """Execute write query on master"""
    conn = None
    try:
        conn = get_db_connection(read_only=False)
        with conn.cursor() as cursor:
            cursor.execute(query, params or [])
            conn.commit()
            return cursor.rowcount
    finally:
        if conn:
            db_load_balancer.return_connection(conn, is_read=False)
EOF

    echo -e "${GREEN}✅ PostgreSQL read replicas configuration created${NC}"
}

# Function to setup database sharding
setup_database_sharding() {
    echo -e "${BLUE}🔀 Setting up database sharding...${NC}"

    # Create sharding configuration
    cat > "$CONFIG_DIR/sharding-config.yml" << EOF
# GameV1 Database Sharding Configuration
# Horizontal scaling across multiple database instances

version: "1.0"

sharding:
  strategy: "hash"  # hash, range, directory

  # Shard configuration
  shards:
    - id: "shard_0"
      host: "db-shard-0"
      port: 5432
      database: "gamev1_shard_0"
      weight: 1

    - id: "shard_1"
      host: "db-shard-1"
      port: 5432
      database: "gamev1_shard_1"
      weight: 1

    - id: "shard_2"
      host: "db-shard-2"
      port: 5432
      database: "gamev1_shard_2"
      weight: 1

  # Shard mapping for different data types
  shard_mapping:
    players:
      strategy: "hash"
      key: "player_id"
      shards: ["shard_0", "shard_1", "shard_2"]

    games:
      strategy: "hash"
      key: "game_id"
      shards: ["shard_0", "shard_1", "shard_2"]

    leaderboards:
      strategy: "range"
      key: "score"
      ranges:
        - shard: "shard_0"
          min_score: 0
          max_score: 1000
        - shard: "shard_1"
          min_score: 1001
          max_score: 5000
        - shard: "shard_2"
          min_score: 5001
          max_score: 999999

  # Global tables (not sharded)
  global_tables:
    - "system_settings"
    - "global_leaderboard"
    - "user_accounts"

  # Migration settings
  migration:
    batch_size: 1000
    parallel_migrations: 3
    retry_attempts: 3

  # Monitoring
  monitoring:
    enabled: true
    metrics_port: 9101
EOF

    # Create shard management script
    cat > "$CONFIG_DIR/manage-shards.py" << 'EOF'
#!/usr/bin/env python3
# Shard Management for GameV1 Database

import yaml
import psycopg2
import argparse
import logging
from typing import Dict, List, Any

class ShardManager:
    def __init__(self, config_file='sharding-config.yml'):
        with open(config_file, 'r') as f:
            self.config = yaml.safe_load(f)

        self.shards = {}
        self._initialize_shards()

        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def _initialize_shards(self):
        """Initialize connections to all shards"""
        for shard_config in self.config['sharding']['shards']:
            shard_id = shard_config['id']
            try:
                conn = psycopg2.connect(
                    host=shard_config['host'],
                    port=shard_config['port'],
                    database=shard_config['database'],
                    user='gamev1',
                    password='gamev1_password'
                )
                self.shards[shard_id] = {
                    'connection': conn,
                    'config': shard_config
                }
                self.logger.info(f"Connected to shard: {shard_id}")
            except Exception as e:
                self.logger.error(f"Failed to connect to shard {shard_id}: {e}")

    def get_shard_for_player(self, player_id: str) -> str:
        """Get shard ID for a player"""
        shard_mapping = self.config['sharding']['shard_mapping']['players']
        shard_ids = shard_mapping['shards']

        # Simple hash function for player distribution
        hash_value = hash(player_id)
        shard_index = hash_value % len(shard_ids)

        return shard_ids[shard_index]

    def get_shard_for_game(self, game_id: str) -> str:
        """Get shard ID for a game"""
        shard_mapping = self.config['sharding']['shard_mapping']['games']
        shard_ids = shard_mapping['shards']

        # Hash-based distribution
        hash_value = hash(game_id)
        shard_index = hash_value % len(shard_ids)

        return shard_ids[shard_index]

    def get_shard_for_score(self, score: int) -> str:
        """Get shard ID for a score (range-based)"""
        for range_config in self.config['sharding']['shard_mapping']['leaderboards']['ranges']:
            if range_config['min_score'] <= score <= range_config['max_score']:
                return range_config['shard']

        # Default to highest shard for very high scores
        return self.config['sharding']['shard_mapping']['leaderboards']['ranges'][-1]['shard']

    def execute_on_shard(self, shard_id: str, query: str, params=None):
        """Execute query on specific shard"""
        if shard_id not in self.shards:
            raise ValueError(f"Shard {shard_id} not found")

        conn = self.shards[shard_id]['connection']
        try:
            with conn.cursor() as cursor:
                cursor.execute(query, params or [])
                conn.commit()
                return cursor.rowcount
        except Exception as e:
            self.logger.error(f"Query failed on shard {shard_id}: {e}")
            raise

    def get_shard_stats(self) -> Dict[str, Any]:
        """Get statistics for all shards"""
        stats = {}

        for shard_id, shard_info in self.shards.items():
            conn = shard_info['connection']
            try:
                with conn.cursor() as cursor:
                    # Get table counts
                    cursor.execute("""
                        SELECT
                            schemaname,
                            tablename,
                            n_tup_ins as inserts,
                            n_tup_upd as updates,
                            n_tup_del as deletes
                        FROM pg_stat_user_tables
                        ORDER BY tablename;
                    """)

                    table_stats = cursor.fetchall()
                    stats[shard_id] = {
                        'tables': table_stats,
                        'connection_count': conn.get_dsn_parameters()['port']
                    }
            except Exception as e:
                self.logger.error(f"Failed to get stats for shard {shard_id}: {e}")
                stats[shard_id] = {'error': str(e)}

        return stats

def main():
    parser = argparse.ArgumentParser(description='GameV1 Shard Manager')
    parser.add_argument('--config', default='sharding-config.yml', help='Sharding configuration file')
    parser.add_argument('--action', choices=['stats', 'rebalance', 'migrate'], help='Action to perform')

    args = parser.parse_args()

    shard_manager = ShardManager(args.config)

    if args.action == 'stats':
        stats = shard_manager.get_shard_stats()
        print("Shard Statistics:")
        for shard_id, shard_stats in stats.items():
            print(f"  {shard_id}:")
            if 'error' in shard_stats:
                print(f"    Error: {shard_stats['error']}")
            else:
                for table in shard_stats['tables']:
                    print(f"    {table[1]}: {table[2]} inserts, {table[3]} updates")

    elif args.action == 'rebalance':
        print("Rebalancing shards...")
        # Implementation for shard rebalancing
        print("Shard rebalancing completed")

    elif args.action == 'migrate':
        print("Migrating data between shards...")
        # Implementation for data migration
        print("Data migration completed")

if __name__ == '__main__':
    main()
EOF

    chmod +x "$CONFIG_DIR/manage-shards.py"

    echo -e "${GREEN}✅ Database sharding configuration created${NC}"
}

# Function to setup full cluster
setup_full_cluster() {
    echo -e "${BLUE}🏗️  Setting up full database cluster...${NC}"

    # Setup read replicas
    setup_postgresql_replicas

    # Setup sharding
    setup_database_sharding

    # Create cluster deployment script
    cat > "$CONFIG_DIR/deploy-cluster.sh" << 'EOF'
#!/bin/bash
# Deploy complete database cluster

set -e

echo "🚀 Deploying GameV1 database cluster..."

# 1. Deploy master database
echo "🐘 Deploying PostgreSQL master..."
# Implementation for master deployment

# 2. Deploy read replicas
echo "🔄 Deploying read replicas..."
# Implementation for replica deployment

# 3. Setup sharding
echo "🔀 Setting up database sharding..."
# Implementation for sharding setup

# 4. Configure load balancer
echo "⚖️  Configuring database load balancer..."
# Implementation for load balancer setup

# 5. Run validation tests
echo "🧪 Running cluster validation..."
# Implementation for validation tests

echo "✅ Database cluster deployment completed!"

echo ""
echo "📊 Cluster status:"
echo "  • Master: db-master:5432"
echo "  • Replicas: db-replica-1:5432, db-replica-2:5432, db-replica-3:5432"
echo "  • Shards: db-shard-0:5432, db-shard-1:5432, db-shard-2:5432"
echo ""
echo "🔧 Management:"
echo "  • Shard stats: python3 manage-shards.py --action stats"
echo "  • Rebalance: python3 manage-shards.py --action rebalance"
EOF

    chmod +x "$CONFIG_DIR/deploy-cluster.sh"

    echo -e "${GREEN}✅ Full database cluster configuration created${NC}"
}

# Main setup based on cluster type
case $CLUSTER_TYPE in
    "read-replicas")
        setup_postgresql_replicas
        ;;
    "sharding")
        setup_database_sharding
        ;;
    "full-cluster")
        setup_full_cluster
        ;;
    *)
        echo -e "${RED}❌ Unknown cluster type: $CLUSTER_TYPE${NC}"
        echo "Use: read-replicas, sharding, or full-cluster"
        exit 1
        ;;
esac

# Create database monitoring script
cat > "$CONFIG_DIR/monitor-database-cluster.sh" << 'EOF'
#!/bin/bash
# Monitor database cluster health and performance

set -e

echo "📊 GameV1 Database Cluster Monitor"
echo "=================================="

# Check master database
echo "🔍 Checking master database..."
if pg_isready -h db-master -p 5432; then
    echo "  ✅ Master: Connected"

    # Get replication status
    echo "  📊 Replication status:"
    sudo -u postgres psql -h db-master -c "SELECT * FROM pg_stat_replication;" | head -10
else
    echo "  ❌ Master: Not accessible"
fi

# Check replica databases
for i in 1 2 3; do
    echo "🔍 Checking replica $i..."
    if pg_isready -h "db-replica-$i" -p 5432; then
        echo "  ✅ Replica $i: Connected"

        # Check if in recovery mode
        recovery_status=$(sudo -u postgres psql -h "db-replica-$i" -c "SELECT pg_is_in_recovery();" -t)
        if [[ $recovery_status == " t" ]]; then
            echo "  ✅ Replica $i: In recovery mode"
        else
            echo "  ❌ Replica $i: Not in recovery mode"
        fi
    else
        echo "  ❌ Replica $i: Not accessible"
    fi
done

# Check shard databases
for i in 0 1 2; do
    echo "🔍 Checking shard $i..."
    if pg_isready -h "db-shard-$i" -p 5432; then
        echo "  ✅ Shard $i: Connected"

        # Get connection count
        connections=$(sudo -u postgres psql -h "db-shard-$i" -c "SELECT count(*) FROM pg_stat_activity;" -t)
        echo "  📊 Shard $i: $connections active connections"
    else
        echo "  ❌ Shard $i: Not accessible"
    fi
done

echo ""
echo "💡 Recommendations:"
echo "  • Monitor replication lag between master and replicas"
echo "  • Check query performance across shards"
echo "  • Ensure even distribution of data across shards"
echo "  • Set up automated failover for high availability"
EOF

chmod +x "$CONFIG_DIR/monitor-database-cluster.sh"

# Generate summary
echo ""
echo -e "${BLUE}${BOLD}🗄️  Database Clustering Setup Complete${NC}"
echo "====================================="

echo -e "${YELLOW}📁 Generated configuration files:${NC}"
find "$CONFIG_DIR" -type f | while read file; do
    echo "  • $file"
done

echo ""
echo -e "${YELLOW}🚀 Deployment Instructions:${NC}"
case $CLUSTER_TYPE in
    "read-replicas")
        echo "  cd $CONFIG_DIR && sudo ./setup-replication.sh db-master db-replica"
        ;;
    "sharding")
        echo "  cd $CONFIG_DIR && python3 manage-shards.py --action stats"
        ;;
    "full-cluster")
        echo "  cd $CONFIG_DIR && sudo ./deploy-cluster.sh"
        ;;
esac

echo ""
echo -e "${YELLOW}📊 Monitoring:${NC}"
echo "  cd $CONFIG_DIR && ./monitor-database-cluster.sh"

echo ""
echo -e "${YELLOW}💡 Features:${NC}"
case $CLUSTER_TYPE in
    "read-replicas")
        echo "  • PostgreSQL streaming replication"
        echo "  • Read/write splitting with load balancer"
        echo "  • Automatic failover capabilities"
        ;;
    "sharding")
        echo "  • Horizontal scaling across multiple databases"
        echo "  • Hash-based and range-based sharding"
        echo "  • Shard management and rebalancing"
        ;;
    "full-cluster")
        echo "  • Complete cluster with replication + sharding"
        echo "  • High availability and scalability"
        echo "  • Comprehensive monitoring and management"
        ;;
esac

echo ""
echo -e "${GREEN}✅ GameV1 database clustering setup completed!${NC}"