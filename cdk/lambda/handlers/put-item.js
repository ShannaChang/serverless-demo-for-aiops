// Add X-Ray tracing
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const { v4: uuidv4 } = require('uuid');

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

exports.putItemHandler = async (event, context) => {
    let response;
    try {
        if (event.httpMethod !== 'POST') {
            throw new Error(`PutItem only accept POST method, you tried: ${event.httpMethod}`);
        }

        // Add artificial latency if enabled
        if (process.env.INJECT_LATENCY === 'true') {
            const latencyAmount = parseInt(process.env.LATENCY_AMOUNT || '800', 10);
            console.log(`Injecting ${latencyAmount}ms latency`);
            await new Promise(resolve => setTimeout(resolve, latencyAmount));
        }

        const result = await putItem(event);

        response = {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(result)
        };
    } catch (err) {
        console.error('Error in putItemHandler:', err);
        
        // Explicitly log specific errors
        if (err.code === 'ProvisionedThroughputExceededException') {
            console.error('DynamoDB Throttling Error detected in putItemHandler');
        } else if (err.code && err.code.startsWith('Access')) {
            console.error('S3 Access Error detected in putItemHandler:', err.code);
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

const putItem = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const id = body.id || uuidv4();
        const name = body.name;
        const content = body.content || `Default content for ${name}`;
        
        // First, try to upload content to S3
        const s3Key = `items/${id}.json`;
        const s3Params = {
            Bucket: process.env.CONTENT_BUCKET,
            Key: s3Key,
            Body: JSON.stringify({
                id: id,
                name: name,
                content: content,
                timestamp: new Date().toISOString()
            }),
            ContentType: 'application/json'
        };
        
        console.log(`Uploading content to S3 bucket: ${process.env.CONTENT_BUCKET}, key: ${s3Key}`);
        
        try {
            await s3.putObject(s3Params).promise();
            console.log('Successfully uploaded content to S3');
        } catch (s3Error) {
            console.error('Error uploading to S3:', s3Error);
            
            // Check if this is an access error
            if (s3Error.code && (s3Error.code === 'AccessDenied' || s3Error.code === 'AccessControlListNotSupported')) {
                console.error('S3 Access Error detected. This may be due to the SIMULATE_S3_ACCESS_ERRORS setting.');
                
                // If we're simulating S3 access errors, we want to propagate this error
                if (process.env.SIMULATE_S3_ACCESS_ERRORS === 'true') {
                    throw s3Error;
                }
            } else {
                // For other S3 errors, we'll log but continue to try to save to DynamoDB
                console.error('Non-access S3 error occurred, continuing with DynamoDB operation');
            }
        }
        
        // Then, save item metadata to DynamoDB
        const dynamoParams = {
            TableName: process.env.SAMPLE_TABLE,
            Item: { 
                id: id, 
                name: name,
                s3Key: s3Key,
                createdAt: new Date().toISOString(),
            }
        };
        
        console.log('Saving item to DynamoDB');
        await docClient.put(dynamoParams).promise();
        console.log('Successfully saved item to DynamoDB');
        
        return {
            id: id,
            name: name,
            s3Key: s3Key,
            success: true
        };
    } catch (err) {
        console.error('Error in putItem:', err);
        
        // Explicitly log specific errors
        if (err.code === 'ProvisionedThroughputExceededException') {
            console.error('DynamoDB Throttling Error detected in putItem');
        }
        
        throw err; // Make sure to propagate the error
    }
};
