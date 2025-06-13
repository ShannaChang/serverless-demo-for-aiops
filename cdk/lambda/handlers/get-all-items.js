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

/**
 * Sleep for the specified number of milliseconds
 * @param {number} ms - The number of milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

exports.getAllItemsHandler = async (event, context) => {
    let response;
    try {
        if (event.httpMethod !== 'GET') {
            throw new Error(`getAllItems only accept GET method, you tried: ${event.httpMethod}`);
        }

        // Check if we should inject latency
        const injectLatency = process.env.INJECT_LATENCY === 'true';
        const latencyAmount = process.env.LATENCY_AMOUNT ? parseInt(process.env.LATENCY_AMOUNT, 10) : 800;
        
        if (injectLatency) {
            console.log(`Injecting ${latencyAmount}ms latency to break threshold`);
            await sleep(latencyAmount);
        }

        const items = await getAllItems();
        response = {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(items)
        };
    } catch (err) {
        console.error('Error in getAllItemsHandler:', err);
        
        // Explicitly log throttling errors
        if (err.code === 'ProvisionedThroughputExceededException') {
            console.error('DynamoDB Throttling Error detected in getAllItemsHandler');
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

const getAllItems = async () => {
    let response;
    try {
        const params = {
            TableName: process.env.SAMPLE_TABLE
        };
        response = await docClient.scan(params).promise();
    } catch (err) {
        console.error('Error in getAllItems:', err);
        
        // Explicitly log throttling errors
        if (err.code === 'ProvisionedThroughputExceededException') {
            console.error('DynamoDB Throttling Error detected in getAllItems');
        }
        
        throw err; // Make sure to propagate the error
    }
    return response;
};
