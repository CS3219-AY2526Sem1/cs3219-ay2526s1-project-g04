#!/bin/bash

# The base directory where all your services reside
SERVICES_DIR="backend/services"

# List of all backend services
SERVICES=(
    "collaboration_service"
    "matching_service"
    "question_service"
    "user_service"
)

# --- Step 1: Kill Node.js Services via Pattern Matching ---
echo "=========================================="
echo "         Stopping Node.js Services        ß"
echo "=========================================="
echo "Searching for 'npm run dev' processes running in $SERVICES_DIR..."

# Use ps aux to list all processes, filter for the service directory pattern
# and 'npm run dev', exclude the grep command itself, and extract the PID (column $2)
PIDS_TO_KILL=$(ps aux | grep -E "npm run dev|node.*$SERVICES_DIR|next-server" | grep -v 'grep' | awk '{print $2}')

if [ -z "$PIDS_TO_KILL" ]; then
    echo "No active Node.js processes found matching the service pattern."
else
    echo "Found PIDs: $PIDS_TO_KILL"
    echo "Attempting to send SIGTERM to kill these processes..."
    
    # Use xargs to safely pass the list of PIDs to the kill command
    # '2>/dev/null' suppresses errors if a process was already gone
    echo "$PIDS_TO_KILL" | xargs kill 2>/dev/null
    
    # Verification
    sleep 1
    # Check if any of the killed PIDS are still running (by converting newline to comma for ps -p)
    if ps -p $(echo "$PIDS_TO_KILL" | tr '\n' ',') > /dev/null; then
        echo "Some processes might still be running. They may require 'kill -9' (force kill)."
    else
        echo "All matched Node.js services have been stopped."
    fi
fi

echo ""
echo "=========================================="
echo "          Shutdown Complete               "
echo "=========================================="