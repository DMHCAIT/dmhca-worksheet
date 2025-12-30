#!/bin/bash

# Stop Production Services Script

echo "🛑 Stopping production services..."

# Read PIDs from file
if [ -f .deployment_pids ]; then
    PIDS=$(cat .deployment_pids)
    for pid in $PIDS; do
        if ps -p $pid > /dev/null; then
            echo "Stopping process $pid..."
            kill $pid
        else
            echo "Process $pid not found (already stopped)"
        fi
    done
    rm .deployment_pids
    echo "All services stopped."
else
    echo "No deployment PIDs file found. Attempting to stop by port..."
    
    # Kill processes on specific ports
    lsof -ti :5000 | xargs kill -9 2>/dev/null || echo "No process found on port 5000"
    lsof -ti :3000 | xargs kill -9 2>/dev/null || echo "No process found on port 3000"
    
    echo "Attempted to stop services by port."
fi