#!/bin/bash

# --- Configuration ---
SERVICES_DIR="backend/services"
INFRA_DIR="backend/infrastructure"

DB_COMPOSE_FILENAME="docker-compose.db.yml"
D_COMPOSE_FILENAME="docker-compose.yml"

# List of all backend services to start
SERVICES=(
    # "code_runner_service"
    "collaboration_service"
    # "communication_service"
    "matching_service"
    "question_service"
    "user_service"
)
DBS=(
    "collaboration_service"
    "question_service"
    "user_service" 
)
INFRA=(
    "broker"
    "redis"
)

# Function to clean up on script exit
cleanup() {
    echo ""
    echo "--- Exiting startup script ---"
}
trap cleanup EXIT

# 1. START RABBITMQ, REDIS
echo "==========================================="
echo "     Starting RABBITMQ, REDIS (Docker)     "
echo "==========================================="


for SERVICE in "${INFRA[@]}"; do
    SERVICE_PATH="$INFRA_DIR/$SERVICE"
    DB_COMPOSE_FILE="$SERVICE_PATH/$D_COMPOSE_FILENAME"

    if [ -f "$DB_COMPOSE_FILE" ]; then
        echo "-> Starting DB for $SERVICE using '$DB_COMPOSE_FILE'..."
        
        if docker compose -f "$DB_COMPOSE_FILE" up -d; then
            echo " $SERVICE DB container started successfully."
        else
            echo " ERROR: Failed to start DB for $SERVICE. Stopping script."
            exit 1
        fi
    else
        echo "-> No dedicated DB file found for $SERVICE at $DB_COMPOSE_FILE. Skipping DB startup."
    fi
done


# 2. START DATABASE
echo "==========================================="
echo "Starting Database for each service (Docker)"
echo "==========================================="


for SERVICE in "${DBS[@]}"; do
    SERVICE_PATH="$SERVICES_DIR/$SERVICE"
    DB_COMPOSE_FILE="$SERVICE_PATH/$DB_COMPOSE_FILENAME"

    if [ -f "$DB_COMPOSE_FILE" ]; then
        echo "-> Starting DB for $SERVICE using '$DB_COMPOSE_FILE'..."
        
        if docker compose -f "$DB_COMPOSE_FILE" up -d; then
            echo " $SERVICE DB container started successfully."
        else
            echo " ERROR: Failed to start DB for $SERVICE. Stopping script."
            exit 1
        fi
    else
        echo "-> No dedicated DB file found for $SERVICE at $DB_COMPOSE_FILE. Skipping DB startup."
    fi
done

echo ""

# 3. START ALL SERVICES
echo "=========================================="
echo "       Starting Backend Services          "
echo "=========================================="
echo "Starting services using 'npm run dev' in parallel..."

# Loop through the services and start them in the background
for SERVICE in "${SERVICES[@]}"; do
    SERVICE_PATH="$SERVICES_DIR/$SERVICE"

    if [ -d "$SERVICE_PATH" ]; then
        echo "-> Starting $SERVICE "
        
        (
            # Move into the service directory or exit if path is wrong
            cd "$SERVICE_PATH" || { echo "Could not cd to $SERVICE_PATH"; exit 1; }
            # Execute the dev script
            npm run dev_rs
        ) &
        # Save the Process ID (PID) of the background job
        PIDS+=($!)
    else
        echo "WARNING: Service directory not found: $SERVICE_PATH"
    fi
done

echo "=========================================="
echo "       Starting Frontend Services         "
echo "=========================================="
echo "Starting services using 'npm run dev' in parallel..."

# Loop through the services and start them in the background

        
(
    # Move into the service directory or exit if path is wrong
    cd "frontend/" || { echo "Could not cd to frontend/"; exit 1; }
    # Execute the dev script
    npm run dev
) &
# Save the Process ID (PID) of the background job
PIDS+=($!)


# Wait briefly for initial logs to appear
sleep 3

echo ""
echo "=========================================="
echo "            Startup Complete              "
echo "=========================================="
echo "All ${#PIDS[@]} services are running in the background."
echo "Running PIDs: ${PIDS[@]}"
echo ""
echo "To stop all services (excluding Docker), run:"
echo "kill ${PIDS[@]}"
echo ""
echo "To stop the database containers, run:"
echo "docker compose -f $DB_COMPOSE_FILE down"

# Exit the script, leaving the background processes running
exit 0