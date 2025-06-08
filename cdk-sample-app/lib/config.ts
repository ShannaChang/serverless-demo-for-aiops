/**
 * Configuration for the CDK Sample App
 */
export interface AppConfig {
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
}

/**
 * Get the configuration based on environment variables
 */
export function getConfig(): AppConfig {
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
  
  return {
    injectLatency,
    latencyAmount,
    injectWrongIds,
    wrongIdProbability,
    simulateThrottling,
    simulateDynamoDBThrottling
  };
}
