# CDK Sample App for AIOps

This is a CDK implementation of the serverless demo application for AIOps. It recreates the same functionality as the original SAM-based application but uses AWS CDK for infrastructure as code.

## Architecture

The application consists of:
- API Gateway with three endpoints and X-Ray tracing enabled
- Three Lambda functions for CRUD operations with X-Ray tracing
- DynamoDB table for data storage
- CloudWatch Log Groups with retention policies
- CloudWatch Alarms for API Gateway success rate and latency monitoring
- SNS Topic for alarm notifications

## API Endpoints

- `GET /items` - Get all items from the DynamoDB table
- `GET /items/{id}` - Get a specific item by ID
- `POST /items` - Create a new item

## Observability Features

### X-Ray Tracing
- Enabled for both API Gateway and Lambda functions
- Provides end-to-end tracing of requests through the application

### CloudWatch Alarms

The application includes two types of CloudWatch alarms:

1. **Success Rate Alarms**:
   - Trigger when the success rate falls below 80% (error rate exceeds 20%)
   - Evaluation occurs over 3 consecutive 1-minute periods
   - At least 2 datapoints must breach the threshold to trigger the alarm

2. **Latency Alarms**:
   - Trigger when the average latency exceeds 500ms
   - Evaluation occurs over 3 consecutive 1-minute periods
   - At least 2 datapoints must breach the threshold to trigger the alarm
   - One alarm per API endpoint (GET /items, GET /items/{id}, POST /items)

All alarms send notifications to an SNS topic.

## Testing Features

The application includes features to simulate issues that would trigger CloudWatch alarms:

### 1. Latency Injection

Adds artificial delay to the GET /items endpoint:

- Set `INJECT_LATENCY=true` to enable latency injection
- Set `LATENCY_AMOUNT=800` (or any value in ms) to specify the amount of latency to inject

### 2. Error Injection

Randomly injects wrong IDs in the GET /items/{id} endpoint to cause 500 errors:

- Set `INJECT_WRONG_IDS=true` to enable error injection
- Set `WRONG_ID_PROBABILITY=50` (0-100) to specify the probability of injecting a wrong ID

### 3. Lambda Throttling Simulation

Simulates Lambda throttling by setting a low concurrency limit on the GET /items function:

- Set `SIMULATE_THROTTLING=true` to enable throttling simulation
- This sets the reserved concurrency of the getAllItems function to 2, causing throttling under load

### 4. DynamoDB Throttling Simulation

Simulates DynamoDB throttling by setting very low provisioned capacity:

- Set `SIMULATE_DYNAMODB_THROTTLING=true` to enable DynamoDB throttling simulation
- This sets the read capacity to 1 and write capacity to 1, causing throttling under load

### Deployment with Testing Features

```bash
# Deploy with latency injection enabled
INJECT_LATENCY=true LATENCY_AMOUNT=800 npx cdk deploy

# Deploy with error injection enabled
INJECT_WRONG_IDS=true WRONG_ID_PROBABILITY=75 npx cdk deploy

# Deploy with throttling simulation enabled
SIMULATE_THROTTLING=true npx cdk deploy

# Deploy with DynamoDB throttling simulation enabled
SIMULATE_DYNAMODB_THROTTLING=true npx cdk deploy

# Deploy with multiple testing features enabled
INJECT_LATENCY=true INJECT_WRONG_IDS=true SIMULATE_THROTTLING=true SIMULATE_DYNAMODB_THROTTLING=true npx cdk deploy

# Deploy without any testing features
npx cdk deploy
```

## Load Testing Scripts

The repository includes scripts to generate load and trigger the testing features:

1. **Basic Load Generator**:
   ```bash
   ./scripts/load-generator.sh <api-gateway-url>
   ```

2. **Lambda Throttling Test Load Generator**:
   ```bash
   ./scripts/load-generator-throttle.sh <api-gateway-url>
   ```
   This script sends bursts of concurrent requests to trigger throttling when the `SIMULATE_THROTTLING` option is enabled.

3. **DynamoDB Throttling Test Load Generator**:
   ```bash
   ./scripts/load-generator-dynamodb-throttle.sh <api-gateway-url>
   ```
   This script sends bursts of write and read operations to trigger DynamoDB throttling when the `SIMULATE_DYNAMODB_THROTTLING` option is enabled.

## Deployment Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Build the TypeScript code:
   ```
   npm run build
   ```

3. Deploy the stack:
   ```
   npx cdk deploy
   ```

4. After deployment, the API Gateway URL will be displayed in the outputs.

## Testing the API

You can test the API using curl or any API client:

```bash
# Get all items
curl https://<api-id>.execute-api.<region>.amazonaws.com/Prod/items

# Get item by ID
curl https://<api-id>.execute-api.<region>.amazonaws.com/Prod/items/123

# Create a new item
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/Prod/items \
  -H "Content-Type: application/json" \
  -d '{"id": "123", "name": "Test Item"}'
```

## Cleanup

To remove all resources created by this stack:

```
npx cdk destroy
```
