import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
// import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class AlexaPowerPulseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 👇 create Dynamodb table
    const table = new dynamodb.Table(this, id, {
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'name', type: dynamodb.AttributeType.STRING },
      pointInTimeRecovery: true,
    });

    /* Create Lambda Function */
    const lmbAlexaHandlerName = 'lmb-alexa-handler-function';
    const lmbAlexaHandler = new lambda.Function(this, lmbAlexaHandlerName, {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 2048,
      timeout: cdk.Duration.minutes(3),
      code: lambda.Code.fromAsset(path.join(__dirname, '/../lib/lambda/lambdaAlexaHandler/dist')),
      handler: 'index.handler',
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        DYNAMODB_PERSISTENCE_TABLE_NAME: table.tableName,
        DYNAMODB_PERSISTENCE_REGION: 'us-east-1',
        LOG_LEVEL: 'debug',
      },
    });

    /* Create Lambda Function */
    const lmbESPAPIIntegrationName = 'lmb-esp-api-function';
    const lmbESPAPIIntegration = new lambda.Function(this, lmbESPAPIIntegrationName, {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 2048,
      timeout: cdk.Duration.minutes(3),
      code: lambda.Code.fromAsset(path.join(__dirname, '/../lib/lambda/lambdaESPIntegration/dist')),
      handler: 'index.handler',
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        ENDPOINT_ESP_STATUS: 'https://developer.sepush.co.za/business/2.0/status',
        ENDPOINT_ESP_TOKEN: '***',
        DYNAMODB_PERSISTENCE_TABLE_NAME: table.tableName,
        DYNAMODB_PERSISTENCE_REGION: 'us-east-1',
        LOG_LEVEL: 'debug',
      },
    });

    table.grantReadWriteData(lmbESPAPIIntegration);
    table.grantReadData(lmbAlexaHandler);

    // See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
    const rule = new events.Rule(this, 'esp-refresh-rule', {
      schedule: events.Schedule.expression('cron(1 * * * ? *)')
    });

    rule.addTarget(new targets.LambdaFunction(lmbESPAPIIntegration));

    /* Create API */
    // const espAPIName = 'api-alexa-power-pulse';

    // const espAPI = new apigateway.RestApi(this, espAPIName, {
    //   description: 'This is the API that Alexa will invoke...',
    // });

    // const apiEventsIntegration = new apigateway.LambdaIntegration(lmbESPAPIIntegration);

    // const resourceEvents = espAPI.root.addResource('events');
    // resourceEvents.addMethod('POST', apiEventsIntegration, {
    //   requestValidator: new apigateway.RequestValidator(
    //     this,
    //     'body-validator-events',
    //     {
    //       restApi: espAPI,
    //       requestValidatorName: 'body-validator-events',
    //       validateRequestBody: false,
    //     },
    //   ),
    // });
    // this.eventsUrl = espAPI.urlForPath(resourceEvents.path);

  }
}
