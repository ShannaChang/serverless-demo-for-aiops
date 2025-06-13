// Add X-Ray tracing
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

// Configure AWS SDK to not retry on throttling
AWS.config.update({
  maxRetries: 0,
  httpOptions: {
    timeout: 1000 // 1 second timeout
  }
});

// Create DynamoDB client with specific configuration to ensure throttling errors are propagated
const docClient = new AWS.DynamoDB.DocumentClient({
  maxRetries: 0,
  retryDelayOptions: {
    base: 0
  }
});

// Create S3 client
const s3 = new AWS.S3({
  maxRetries: 0,
  retryDelayOptions: {
    base: 0
  }
});

/**
 * Generate a random ID that is guaranteed to be different from the original
 * @param {string} originalId - The original ID to avoid
 * @returns {string} A new random ID
 */
const generateRandomWrongId = (originalId) => {
  // Generate a random string that's different from the original ID
  const randomId = 'wrong-' + Math.random().toString(36).substring(2, 10);
  return randomId === originalId ? generateRandomWrongId(originalId) : randomId;
};

/**
 * Determine if we should inject a wrong ID based on probability
 * @param {number} probability - Probability from 0-100
 * @returns {boolean} Whether to inject a wrong ID
 */
const shouldInjectWrongId = (probability) => {
  return Math.random() * 100 < probability;
};

exports.getByIdHandler = async (event, context) => {
  let response, id;
  try {
    if (event.httpMethod !== 'GET') {
      throw new Error(`getById only accept GET method, you tried: ${event.httpMethod}`);
    }

    // Get the original ID from the path parameters
    id = event.pathParameters.id;
    
    // Check if we should inject a wrong ID
    const injectWrongIds = process.env.INJECT_WRONG_IDS === 'true';
    const wrongIdProbability = process.env.WRONG_ID_PROBABILITY ? 
      parseInt(process.env.WRONG_ID_PROBABILITY, 10) : 50;
    
    if (injectWrongIds && shouldInjectWrongId(wrongIdProbability)) {
      const originalId = id;
      id = generateRandomWrongId(originalId);
      console.log(`Injecting wrong ID: Original=${originalId}, Wrong=${id}`);
    }

    // Add artificial latency if enabled
    if (process.env.INJECT_LATENCY === 'true') {
      const latencyAmount = parseInt(process.env.LATENCY_AMOUNT || '800', 10);
      console.log(`Injecting ${latencyAmount}ms latency`);
      await new Promise(resolve => setTimeout(resolve, latencyAmount));
    }

    const item = await getItemById(id);

    // If the item doesn't exist, throw an error
    if (!item.Item) {
      throw new Error(`Item with ID ${id} not found`);
    }

    // Try to get the content from S3 if s3Key exists
    let content = null;
    if (item.Item.s3Key) {
      try {
        const s3Params = {
          Bucket: process.env.CONTENT_BUCKET,
          Key: item.Item.s3Key
        };
        
        console.log(`Retrieving content from S3: ${process.env.CONTENT_BUCKET}/${item.Item.s3Key}`);
        const s3Response = await s3.getObject(s3Params).promise();
        
        if (s3Response.Body) {
          content = JSON.parse(s3Response.Body.toString('utf-8'));
          console.log('Successfully retrieved content from S3');
        }
      } catch (s3Error) {
        console.error('Error retrieving from S3:', s3Error);
        
        // Check if this is an access error
        if (s3Error.code && (s3Error.code === 'AccessDenied' || s3Error.code === 'AccessControlListNotSupported')) {
          console.error('S3 Access Error detected. This may be due to the SIMULATE_S3_ACCESS_ERRORS setting.');
          
          // If we're simulating S3 access errors, we want to propagate this error
          if (process.env.SIMULATE_S3_ACCESS_ERRORS === 'true') {
            throw s3Error;
          }
        }
        
        // For other S3 errors or if not simulating, we'll continue with just the DynamoDB data
        console.log('Continuing with just the DynamoDB data');
      }
    }

    // Combine the DynamoDB item with the S3 content if available
    const result = {
      ...item.Item,
      content: content || { message: 'Content not available' }
    };

    response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (err) {
    console.error('Error in getByIdHandler:', err);
    
    // Explicitly log specific errors
    if (err.code === 'ProvisionedThroughputExceededException') {
      console.error('DynamoDB Throttling Error detected in getByIdHandler');
    } else if (err.code && err.code.startsWith('Access')) {
      console.error('S3 Access Error detected in getByIdHandler:', err.code);
    }
    
    response = {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: err.message || 'Internal server error',
        errorType: err.code || err.name || 'Error',
        stackTrace: err.stack || ''
      })
    };
  }
  return response;
};

const getItemById = async (id) => {
  let response;
  try {
    const params = {
      TableName: process.env.SAMPLE_TABLE,
      Key: { id: id }
    };

    response = await docClient.get(params).promise();
  } catch (err) {
    console.error('Error in getItemById:', err);
    
    // Explicitly log throttling errors
    if (err.code === 'ProvisionedThroughputExceededException') {
      console.error('DynamoDB Throttling Error detected in getItemById');
    }
    
    throw err; // Make sure to propagate the error
  }
  return response;
};
