# serverless-demo-for-aiops

A running serverless application

You can set the stack name using the STACK_NAME environment variable. If not set, it defaults to 'serverless-app-for-aiops'.

You can set the alarm notification email using the ALARM_EMAIL environment variable. If not set, it defaults to 'demo@example.com'.

## Deployment Scripts

### Setup Script

Create a file named `setup.sh` with the following content:

```bash
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
```

Make the script executable:

```bash
chmod +x setup.sh
```

### Quick Scenario Scripts

You can also use these individual scenario scripts:

#### Scenario 1: Latency Injection

```bash
#!/bin/bash
export INJECT_LATENCY=true
export LATENCY_AMOUNT=800
cdk deploy --all --require-approval never
```

#### Scenario 2: Wrong ID Injection

```bash
#!/bin/bash
export INJECT_WRONG_IDS=true
export WRONG_ID_PROBABILITY=75
cdk deploy --all --require-approval never
```

#### Scenario 3: Lambda Throttling

```bash
#!/bin/bash
export SIMULATE_THROTTLING=true
cdk deploy --all --require-approval never
# After deployment, run:
# ./scripts/load-generator-dynamodb-throttle.sh <your-api-gateway-url>
```

#### Scenario 4: DynamoDB Throttling

```bash
#!/bin/bash
export SIMULATE_DYNAMODB_THROTTLING=true
cdk deploy --all --require-approval never
# After deployment, run:
# ./scripts/load-generator-dynamodb-throttle.sh <your-api-gateway-url>
```

#### Scenario 5: S3 Access Errors

```bash
#!/bin/bash
export SIMULATE_S3_ACCESS_ERRORS=true
cdk deploy --all --require-approval never
```

## Testing the API

### Create an item (POST /items)

```shell
curl -X POST \
  <your-api-gateway-url>/items \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test Item",
    "content": "This is a test item with content that will be stored in S3"
  }'
```

### Get all items (GET /items)

```shell
curl -X GET <your-api-gateway-url>/items
```

### Get item by ID (GET /items/{id})

```shell
curl -X GET <your-api-gateway-url>/items/{id}
```
