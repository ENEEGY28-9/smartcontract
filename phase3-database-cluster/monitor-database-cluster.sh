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
