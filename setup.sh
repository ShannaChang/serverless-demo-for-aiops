#!/bin/bash

# Common configuration - modify these values as needed
export STACK_NAME="serverless-app-for-aiops"
export ALARM_EMAIL="your-email@example.com"

# Choose one of the error scenarios below by uncommenting it

# Scenario 1: Inject latency
# export INJECT_LATENCY=true
# export LATENCY_AMOUNT=800

# Scenario 2: Inject wrong IDs
# export INJECT_WRONG_IDS=true
# export WRONG_ID_PROBABILITY=75

# Scenario 3: Simulate Lambda throttling
# export SIMULATE_THROTTLING=true

# Scenario 4: Simulate DynamoDB throttling
# export SIMULATE_DYNAMODB_THROTTLING=true

# Scenario 5: Simulate S3 access errors
# export SIMULATE_S3_ACCESS_ERRORS=true

# Deploy the stack
cdk deploy --all --require-approval never

# For scenarios 3 and 4, run the load generator after deployment:
# ./scripts/load-generator-dynamodb-throttle.sh <your-api-gateway-url>
