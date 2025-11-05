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
