#!/bin/bash
export STACK_NAME="serverless-app-for-aiops"
export ALARM_EMAIL="your-email@example.com"
export INJECT_WRONG_IDS=true
export WRONG_ID_PROBABILITY=75
cdk deploy --all --require-approval never
