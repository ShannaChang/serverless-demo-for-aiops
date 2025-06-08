# serverless-demo-for-aiops

A running serverless application



Scenario 1:

``` shell
INJECT_LATENCY=true LATENCY_AMOUNT=800 cdk deploy --all --require-approval never
```

Scenario 2:

``` shell
INJECT_WRONG_IDS=true WRONG_ID_PROBABILITY=75 cdk deploy --all --require-approval never
```

Scenario 3:

``` shell
SIMULATE_THROTTLING=true cdk deploy --all --require-approval never
./scripts/load-generator-dynamodb-throttle.sh <your-api-gateway-url>
```

Scenario 4:

``` shell
SIMULATE_DYNAMODB_THROTTLING=true cdk deploy --all --require-approval never
./scripts/load-generator-dynamodb-throttle.sh <your-api-gateway-url>
```
