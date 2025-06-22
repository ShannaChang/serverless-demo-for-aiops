import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';
import { ApiGatewayAlarms } from './alarms';
import { AppConfig } from './config';

export interface CdkSampleAppStackProps extends cdk.StackProps {
  config: AppConfig;
}

export class CdkSampleAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CdkSampleAppStackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const sampleTable = new dynamodb.Table(this, 'SampleTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: props.config.simulateDynamoDBThrottling ? 1 : 10,
      writeCapacity: props.config.simulateDynamoDBThrottling ? 1 : 5,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes only
    });

    // S3 Bucket for storing item content
    const contentBucket = new s3.Bucket(this, 'ContentBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes only
      autoDeleteObjects: true, // For demo purposes only
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
    });


    // Common Lambda configuration
    const lambdaEnvironment = {
      APP_NAME: sampleTable.tableName,
      SAMPLE_TABLE: sampleTable.tableName,
      CONTENT_BUCKET: contentBucket.bucketName,
      SERVICE_NAME: 'item_service',
      ENABLE_DEBUG: 'false',
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      // Configuration for latency injection
      INJECT_LATENCY: props.config.injectLatency ? 'true' : 'false',
      LATENCY_AMOUNT: props.config.latencyAmount.toString(),
      // Configuration for wrong ID injection
      INJECT_WRONG_IDS: props.config.injectWrongIds ? 'true' : 'false',
      WRONG_ID_PROBABILITY: props.config.wrongIdProbability.toString(),
      // Configuration for S3 access errors
      POPULATE_ACCESS_ERROR: props.config.simulateS3AccessErrors ? 'true' : 'false',
    };

    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(100),
      tracing: lambda.Tracing.ACTIVE, // X-Ray tracing
      environment: lambdaEnvironment,
    };

    // Lambda Functions
    const getAllItemsFunction = new lambda.Function(this, 'GetAllItemsFunction', {
      ...lambdaConfig,
      handler: 'handlers/get-all-items.getAllItemsHandler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      description: 'A simple example includes a HTTP get method to get all items from a DynamoDB table.',
      // Set a low reserved concurrency to simulate throttling when enabled
      reservedConcurrentExecutions: props.config.simulateThrottling ? 2 : undefined,
    });
    
    const getByIdFunction = new lambda.Function(this, 'GetByIdFunction', {
      ...lambdaConfig,
      handler: 'handlers/get-by-id.getByIdHandler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      description: 'A simple example includes a HTTP get method to get one item by id from a DynamoDB table.',
    });
    
    const putItemFunction = new lambda.Function(this, 'PutItemFunction', {
      ...lambdaConfig,
      handler: 'handlers/put-item.putItemHandler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      description: 'A simple example includes a HTTP post method to add one item to a DynamoDB table and upload content to S3.',
    });

    // Apply restrictive bucket policy if S3 access errors are enabled
    if (props.config.simulateS3AccessErrors) {
      console.log('Applying restrictive S3 bucket policy to simulate access errors');
      // Create a bucket policy that denies access specifically for the getById Lambda execution role
      const restrictiveBucketPolicy = new s3.BucketPolicy(this, 'RestrictiveBucketPolicy', {
        bucket: contentBucket,
      });
      
      // Add a statement that denies access for the getById Lambda execution role specifically
      restrictiveBucketPolicy.document.addStatements(
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          principals: [new iam.ArnPrincipal(getByIdFunction.role!.roleArn)],
          actions: [
            's3:GetObject',
          ],
          resources: [`${contentBucket.bucketArn}/*`]
        })
      );
    }
    else {
      console.log('Applying restrictive S3 bucket policy to simulate access errors');
      // Create a bucket policy that denies access specifically for the getById Lambda execution role
      const restrictiveBucketPolicy = new s3.BucketPolicy(this, 'RestrictiveBucketPolicy', {
        bucket: contentBucket,
      });
      
      // Add a statement that denies access for the getById Lambda execution role specifically
      restrictiveBucketPolicy.document.addStatements(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.ArnPrincipal(getByIdFunction.role!.roleArn)],
          actions: [
            's3:GetObject',
          ],
          resources: [`${contentBucket.bucketArn}/*`]
        })
      );
    }

    // Add permissions for CloudWatch Application Signals
    const applicationSignalsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams',
        'xray:PutTraceSegments',
        'xray:PutTelemetryRecords',
        'xray:GetSamplingRules',
        'xray:GetSamplingTargets',
        'xray:GetSamplingStatisticSummaries'
      ],
      resources: ['*'],
    });

    getAllItemsFunction.addToRolePolicy(applicationSignalsPolicy);
    getByIdFunction.addToRolePolicy(applicationSignalsPolicy);
    putItemFunction.addToRolePolicy(applicationSignalsPolicy);

    // Grant permissions to Lambda functions
    sampleTable.grantReadWriteData(getAllItemsFunction);
    sampleTable.grantReadWriteData(getByIdFunction);
    sampleTable.grantReadWriteData(putItemFunction);
    
    // Grant S3 permissions to the putItemFunction
    contentBucket.grantReadWrite(putItemFunction);
    contentBucket.grantRead(getByIdFunction); // Allow read access for getByIdFunction to fetch item content

    // API Gateway
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'Sample API',
      description: 'API for sample serverless application',
      deployOptions: {
        stageName: 'Prod',
        tracingEnabled: true, // Enable X-Ray tracing
        metricsEnabled: true, // Enable CloudWatch metrics
      },
      defaultMethodOptions: {
        // Enable detailed metrics and logging for all methods
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': apigateway.Model.EMPTY_MODEL,
            },
          },
          {
            statusCode: '400',
            responseModels: {
              'application/json': apigateway.Model.ERROR_MODEL,
            },
          },
          {
            statusCode: '500',
            responseModels: {
              'application/json': apigateway.Model.ERROR_MODEL,
            },
          },
        ],
      },
    });

    // API Gateway Resources and Methods
    const items = api.root.addResource('items');
    
    // GET /items
    items.addMethod('GET', new apigateway.LambdaIntegration(getAllItemsFunction));
    
    // POST /items
    items.addMethod('POST', new apigateway.LambdaIntegration(putItemFunction));
    
    // GET /items/{id}
    const item = items.addResource('{id}');
    item.addMethod('GET', new apigateway.LambdaIntegration(getByIdFunction));

    // CloudWatch Logs - Log Groups with retention
    new logs.LogGroup(this, 'ApiAccessLogGroup', {
      logGroupName: `/aws/apigateway/${api.restApiId}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new logs.LogGroup(this, 'GetAllItemsLogGroup', {
      logGroupName: `/aws/lambda/${getAllItemsFunction.functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new logs.LogGroup(this, 'GetByIdLogGroup', {
      logGroupName: `/aws/lambda/${getByIdFunction.functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new logs.LogGroup(this, 'PutItemLogGroup', {
      logGroupName: `/aws/lambda/${putItemFunction.functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // SNS Topic for alarm notifications with active tracing
    const alarmTopic = new sns.Topic(this, 'ApiAlarmTopic', {
      displayName: 'API Gateway Alarms',
      tracingConfig: cdk.aws_sns.TracingConfig.ACTIVE, // Enable X-Ray tracing for SNS
    });
    
    // Add email subscription to the SNS topic
    new sns.Subscription(this, 'AlarmEmailSubscription', {
      topic: alarmTopic,
      protocol: sns.SubscriptionProtocol.EMAIL,
      endpoint: props.config.alarmEmail,
    });

    // Create CloudWatch alarms for API Gateway endpoints using the ApiGatewayAlarms class
    ApiGatewayAlarms.createAlarms(this, api, alarmTopic);

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      description: 'API Gateway endpoint URL for Prod stage',
      value: `${api.url}`,
    });

    new cdk.CfnOutput(this, 'SampleTableArn', {
      description: 'Sample Data Table ARN',
      value: sampleTable.tableArn,
    });
    
    new cdk.CfnOutput(this, 'ContentBucketName', {
      description: 'S3 Bucket for storing item content',
      value: contentBucket.bucketName,
    });
    
    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      description: 'SNS Topic ARN for API Gateway Alarms',
      value: alarmTopic.topicArn,
    });
  }
}
