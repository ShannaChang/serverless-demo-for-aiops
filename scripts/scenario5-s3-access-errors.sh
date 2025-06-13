#!/bin/bash
export STACK_NAME="serverless-app-for-aiops"
export ALARM_EMAIL="your-email@example.com"
export SIMULATE_S3_ACCESS_ERRORS=true
cdk deploy --all --require-approval never
