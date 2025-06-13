#!/bin/bash
export STACK_NAME="serverless-app-for-aiops"
export ALARM_EMAIL="your-email@example.com"
export INJECT_LATENCY=true
export LATENCY_AMOUNT=800
cdk deploy --all --require-approval never
