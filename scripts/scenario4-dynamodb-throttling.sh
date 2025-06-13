#!/bin/bash
export STACK_NAME="serverless-app-for-aiops"
export ALARM_EMAIL="your-email@example.com"
export SIMULATE_DYNAMODB_THROTTLING=true
cdk deploy --all --require-approval never
echo "After deployment, run:"
echo "./scripts/load-generator-dynamodb-throttle.sh <your-api-gateway-url>"
