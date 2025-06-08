#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkSampleAppStack } from '../lib/cdk-sample-app-stack';
import { getConfig } from '../lib/config';

const app = new cdk.App();

// Get configuration from environment variables
const config = getConfig();

// Create the stack with configuration
new CdkSampleAppStack(app, 'CdkSampleAppStack', {
  config,
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  description: `Sample serverless application with API Gateway, Lambda, and DynamoDB (latency=${config.injectLatency}, errors=${config.injectWrongIds}, lambda-throttling=${config.simulateThrottling}, dynamodb-throttling=${config.simulateDynamoDBThrottling})`
});
