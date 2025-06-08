#!/bin/bash

# This script generates a high load to trigger Lambda throttling errors
# when the Lambda function has a low concurrency limit set

# Replace with your actual API Gateway URL
APIGW_URL="$1"

if [ -z "$APIGW_URL" ]; then
  echo "Usage: $0 <api-gateway-url>"
  echo "Example: $0 https://xvvlrqk2i6.execute-api.ap-southeast-1.amazonaws.com/Prod/"
  exit 1
fi

# Initialize data
echo "Initializing test data..."
curl -X POST "${APIGW_URL}items/" -d '{"id":"1","name":"Sample test item"}'
curl -X POST "${APIGW_URL}items/" -d '{"id":"2","name":"Second test item"}'
curl -X POST "${APIGW_URL}items/" -d '{"id":"3","name":"Third test item"}'

echo "Starting load test to trigger Lambda throttling..."
echo "Press Ctrl+C to stop"

# Function to send requests in parallel
send_parallel_requests() {
  local endpoint=$1
  local method=$2
  local data=$3
  local count=$4
  
  for i in $(seq 1 $count); do
    if [ "$method" == "GET" ]; then
      curl -s -X GET "${endpoint}" > /dev/null &
    else
      curl -s -X POST "${endpoint}" -d "${data}" > /dev/null &
    fi
  done
  
  # Wait for all background processes to complete
  wait
}

# Main loop
while true; do
  echo "Sending burst of requests..."
  
  # Send a burst of 20 concurrent requests to the getAllItems endpoint
  # This should trigger throttling if the concurrency limit is set to 2
  send_parallel_requests "${APIGW_URL}items/" "GET" "" 20
  
  # Brief pause before next burst
  sleep 2
  
  # Also send some requests to other endpoints
  send_parallel_requests "${APIGW_URL}items/1/" "GET" "" 5
  send_parallel_requests "${APIGW_URL}items/" "POST" '{"id":"4","name":"Test item"}' 5
  
  echo "Burst completed. Waiting before next burst..."
  sleep 3
done
