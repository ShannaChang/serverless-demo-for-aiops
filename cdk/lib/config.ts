/**
 * Configuration for the CDK Sample App
 */
export interface AppConfig {
  /**
   * Stack name for the application
   */
  stackName: string;

  /**
   * Whether to inject latency to break the threshold
   */
  injectLatency: boolean;
  
  /**
   * The amount of latency to inject in milliseconds
   */
  latencyAmount: number;

  /**
   * Whether to inject random wrong IDs in get-by-id function
   */
  injectWrongIds: boolean;
  
  /**
   * The probability (0-100) of injecting a wrong ID
   */
  wrongIdProbability: number;

  /**
   * Whether to simulate Lambda throttling by setting a low concurrency limit
   */
  simulateThrottling: boolean;
  
  /**
   * Whether to simulate DynamoDB throttling by setting low provisioned capacity
   */
  simulateDynamoDBThrottling: boolean;

  /**
   * Whether to simulate S3 access errors by applying a restrictive bucket policy
   */
  simulateS3AccessErrors: boolean;

  /**
   * Email address for SNS notifications
   */
  alarmEmail: string;
}

/**
 * Get the configuration based on environment variables
 */
export function getConfig(): AppConfig {
  // Get stack name from environment variable or use default
  const stackName = process.env.STACK_NAME || 'serverless-app-for-aiops';
  
  // Check if INJECT_LATENCY is set to 'true'
  const injectLatency = process.env.INJECT_LATENCY === 'true';
  
  // Parse LATENCY_AMOUNT or default to 800ms
  const latencyAmount = process.env.LATENCY_AMOUNT 
    ? parseInt(process.env.LATENCY_AMOUNT, 10) 
    : 800;
  
  // Check if INJECT_WRONG_IDS is set to 'true'
  const injectWrongIds = process.env.INJECT_WRONG_IDS === 'true';
  
  // Parse WRONG_ID_PROBABILITY or default to 50%
  const wrongIdProbability = process.env.WRONG_ID_PROBABILITY 
    ? parseInt(process.env.WRONG_ID_PROBABILITY, 10) 
    : 50;
  
  // Check if SIMULATE_THROTTLING is set to 'true'
  const simulateThrottling = process.env.SIMULATE_THROTTLING === 'true';
  
  // Check if SIMULATE_DYNAMODB_THROTTLING is set to 'true'
  const simulateDynamoDBThrottling = process.env.SIMULATE_DYNAMODB_THROTTLING === 'true';
  
  // Check if SIMULATE_S3_ACCESS_ERRORS is set to 'true'
  const simulateS3AccessErrors = process.env.SIMULATE_S3_ACCESS_ERRORS === 'true';
  
  // Get alarm email from environment variable or use default
  const alarmEmail = process.env.ALARM_EMAIL || 'demo@example.com';
  
  return {
    stackName,
    injectLatency,
    latencyAmount,
    injectWrongIds,
    wrongIdProbability,
    simulateThrottling,
    simulateDynamoDBThrottling,
    simulateS3AccessErrors,
    alarmEmail
  };
}
