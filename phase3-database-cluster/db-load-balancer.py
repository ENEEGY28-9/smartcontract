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
