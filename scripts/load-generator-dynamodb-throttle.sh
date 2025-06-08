#!/bin/bash

# This script generates a high load to trigger DynamoDB throttling errors
# when the DynamoDB table has low provisioned capacity

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

echo "Starting load test to trigger DynamoDB throttling..."
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
      # For write operations, generate unique IDs to ensure we're writing new items
      if [ "$method" == "POST" ]; then
        local unique_id=$(date +%s%N | cut -b1-13)-$i
        local unique_data=$(echo $data | sed "s/\"id\":\"[^\"]*\"/\"id\":\"$unique_id\"/")
        curl -s -X POST "${endpoint}" -d "${unique_data}" > /dev/null &
      else
        curl -s -X "$method" "${endpoint}" -d "${data}" > /dev/null &
      fi
    fi
  done
  
  # Wait for all background processes to complete
  wait
}

# Main loop - focus on write operations to trigger write capacity throttling
while true; do
  echo "Sending burst of write requests..."
  
  # Send a burst of 10 concurrent write requests
  # This should trigger throttling if the write capacity is set to 1
  send_parallel_requests "${APIGW_URL}items/" "POST" '{"id":"test","name":"Test item"}' 10
  
  # Brief pause before next burst
  sleep 1
  
  # Also send some read requests to trigger read capacity throttling
  echo "Sending burst of read requests..."
  send_parallel_requests "${APIGW_URL}items/" "GET" "" 10
  send_parallel_requests "${APIGW_URL}items/1/" "GET" "" 5
  
  echo "Burst completed. Waiting before next burst..."
  sleep 2
done
