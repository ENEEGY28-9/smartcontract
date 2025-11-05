#!/bin/bash

echo "🚀 Circuit Breaker Demo Script"
echo "================================="

echo
echo "1. Starting gateway service with circuit breaker monitoring..."
echo

# Check if services are running
if curl -s --max-time 5 http://localhost:8080/health > /dev/null; then
    echo "Gateway is already running"
else
    echo "Gateway not running, starting..."
    cargo run --bin gateway &
    GATEWAY_PID=$!
    sleep 5
fi

echo
echo "2. Testing Circuit Breaker behavior..."
echo

# Test normal operation
echo "Testing normal circuit breaker operation..."
if curl -s --max-time 10 http://localhost:8080/health > /dev/null; then
    echo "Normal operation: OK"
else
    echo "Error during normal operation test"
fi

echo
echo "3. Testing failure scenarios..."
echo

# Simulate some failures by calling a non-existent endpoint
echo "Simulating failures to trigger circuit breaker..."
for i in {1..10}; do
    echo -n "Attempt $i..."
    if curl -s --max-time 3 http://localhost:8080/nonexistent > /dev/null; then
        echo "Success"
    else
        echo "Failed (expected)"
    fi
    sleep 0.1
done

echo
echo "4. Checking circuit breaker metrics..."
echo

# Check metrics endpoint
if curl -s --max-time 5 http://localhost:8080/metrics > /tmp/metrics.txt; then
    echo "Circuit Breaker Metrics:"
    grep "circuit_breaker" /tmp/metrics.txt || echo "No circuit breaker metrics found"
else
    echo "Could not retrieve metrics"
fi

echo
echo "5. Circuit breaker demo completed!"
echo "Check the gateway logs and metrics to see circuit breaker behavior."
echo

# Clean up
rm -f /tmp/metrics.txt

echo "Demo script finished. Gateway is still running in background."
echo "To stop the gateway, use: kill $GATEWAY_PID"
