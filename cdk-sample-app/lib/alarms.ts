import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';

export class ApiGatewayAlarms {
  /**
   * Creates CloudWatch alarms for API Gateway endpoints
   */
  public static createAlarms(
    scope: Construct,
    api: apigateway.RestApi,
    alarmTopic: sns.Topic
  ): void {
    // Create success rate alarms
    this.createApiGatewaySuccessRateAlarm(
      scope,
      'GetAllItemsAlarm',
      api,
      'GET',
      '/items',
      alarmTopic,
      'API Gateway GET /items success rate below 80%'
    );

    this.createApiGatewaySuccessRateAlarm(
      scope,
      'GetItemByIdAlarm',
      api,
      'GET',
      '/items/{id}',
      alarmTopic,
      'API Gateway GET /items/{id} success rate below 80%'
    );

    this.createApiGatewaySuccessRateAlarm(
      scope,
      'PutItemAlarm',
      api,
      'POST',
      '/items',
      alarmTopic,
      'API Gateway POST /items success rate below 80%'
    );

    // Create latency alarms
    this.createApiGatewayLatencyAlarm(
      scope,
      'GetAllItemsLatencyAlarm',
      api,
      'GET',
      '/items',
      alarmTopic,
      'API Gateway GET /items latency exceeds 500ms'
    );

    this.createApiGatewayLatencyAlarm(
      scope,
      'GetItemByIdLatencyAlarm',
      api,
      'GET',
      '/items/{id}',
      alarmTopic,
      'API Gateway GET /items/{id} latency exceeds 500ms'
    );

    this.createApiGatewayLatencyAlarm(
      scope,
      'PutItemLatencyAlarm',
      api,
      'POST',
      '/items',
      alarmTopic,
      'API Gateway POST /items latency exceeds 500ms'
    );
  }

  /**
   * Creates a CloudWatch alarm for an API Gateway endpoint that triggers when the success rate falls below 80%
   */
  private static createApiGatewaySuccessRateAlarm(
    scope: Construct,
    id: string,
    api: apigateway.RestApi,
    method: string,
    resource: string,
    alarmTopic: sns.Topic,
    alarmDescription: string
  ): cloudwatch.Alarm {
    // Create a metric for 5XX errors
    const errorMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5XXError',
      dimensionsMap: {
        ApiName: api.restApiName,
        Stage: 'Prod',
        Method: method,
        Resource: resource,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    // Create a metric for the total count of requests
    const countMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Count',
      dimensionsMap: {
        ApiName: api.restApiName,
        Stage: 'Prod',
        Method: method,
        Resource: resource,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    // Create a metric expression for error rate (errors / total requests)
    const errorRateMetric = new cloudwatch.MathExpression({
      expression: '(m1 / m2) * 100',
      usingMetrics: {
        m1: errorMetric,
        m2: countMetric,
      },
      period: cdk.Duration.minutes(1),
    });

    // Create an alarm for when the error rate exceeds 20% (success rate below 80%)
    const alarm = new cloudwatch.Alarm(scope, id, {
      metric: errorRateMetric,
      threshold: 20, // 20% error rate = 80% success rate
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      evaluationPeriods: 3, // Number of periods to evaluate
      datapointsToAlarm: 2, // Number of datapoints within evaluation period that must be breaching to trigger alarm
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: alarmDescription,
    });

    alarm.addAlarmAction(new actions.SnsAction(alarmTopic));
    
    return alarm;
  }

  /**
   * Creates a CloudWatch alarm for API Gateway latency
   */
  private static createApiGatewayLatencyAlarm(
    scope: Construct,
    id: string,
    api: apigateway.RestApi,
    method: string,
    resource: string,
    alarmTopic: sns.Topic,
    alarmDescription: string
  ): cloudwatch.Alarm {
    // Create a metric for API Gateway latency
    const latencyMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: {
        ApiName: api.restApiName,
        Stage: 'Prod',
        Method: method,
        Resource: resource,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(1),
    });

    // Create an alarm for when the latency exceeds 500ms
    const alarm = new cloudwatch.Alarm(scope, id, {
      metric: latencyMetric,
      threshold: 500, // 500ms threshold
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      evaluationPeriods: 3, // Number of periods to evaluate
      datapointsToAlarm: 2, // Number of datapoints within evaluation period that must be breaching to trigger alarm
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: alarmDescription,
    });

    alarm.addAlarmAction(new actions.SnsAction(alarmTopic));
    
    return alarm;
  }
}
