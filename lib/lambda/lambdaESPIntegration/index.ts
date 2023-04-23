// SPDX-License-Identifier: Apache-2.0

/* eslint import/no-import-module-exports: 'off' */
const AWS = require('aws-sdk');
import { SQSEvent, Context } from 'aws-lambda';
import fetch from 'node-fetch';
import moment from 'moment';
import { z } from 'zod';
import logger from './helpers/logger';

// Create the DynamoDB service object
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10', region: 'us-east-1' });

const ENV_ENDPOINT_ESP_STATUS = 'ENDPOINT_ESP_STATUS';
const ENV_DYNAMODB_PERSISTENCE_TABLE_NAME = 'DYNAMODB_PERSISTENCE_TABLE_NAME';
const ENDPOINT_ESP_TOKEN = 'ENDPOINT_ESP_TOKEN';

const ENV_VARS = [ENV_ENDPOINT_ESP_STATUS, ENV_DYNAMODB_PERSISTENCE_TABLE_NAME, ENDPOINT_ESP_TOKEN];

const ESPStatusArea = z.object({
  name: z.string(),
  stage: z.string(),
  stage_updated: z.string(),
  next_stages: z.array(z.object({
    stage: z.string(),
    stage_start_timestamp: z.string(),
  }))
});

const ESPStatusResponse = z.object({
  status: z.object({
    capetown: ESPStatusArea,
    eskom: ESPStatusArea
  })
});

type ESPStatusResponseType = z.infer<typeof ESPStatusResponse>;

async function postJsonToAPI(): Promise<ESPStatusResponseType> {
  try {
    const ENDPOINT_ESP_STATUS = process.env[ENV_ENDPOINT_ESP_STATUS] ?? '';
    logger.debug(`ENDPOINT_ESP_STATUS***: ${ENDPOINT_ESP_STATUS}`);

    const response = await fetch(ENDPOINT_ESP_STATUS, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'token': process.env.ENDPOINT_ESP_TOKEN ?? '',
      },
      redirect: 'follow',
    });
    logger.debug(`response.ok: ${response.ok}`);
    logger.debug(`response.status: ${response.status}`);
    const json = await response.json();
    // const json = {
    //   'status': {
    //     'capetown': {
    //       'name': 'Cape Town',
    //       'next_stages': [
    //         {
    //           'stage': '4',
    //           'stage_start_timestamp': '2023-04-21T05:00:00+02:00'
    //         },
    //         {
    //           'stage': '6',
    //           'stage_start_timestamp': '2023-04-21T20:00:00+02:00'
    //         },
    //         {
    //           'stage': '4',
    //           'stage_start_timestamp': '2023-04-22T05:00:00+02:00'
    //         },
    //         {
    //           'stage': '6',
    //           'stage_start_timestamp': '2023-04-22T20:00:00+02:00'
    //         }
    //       ],
    //       'stage': '2',
    //       'stage_updated': '2023-04-20T20:00:00.553697+02:00'
    //     },
    //     'eskom': {
    //       'name': 'Eskom',
    //       'next_stages': [
    //         {
    //           'stage': '5',
    //           'stage_start_timestamp': '2023-04-21T05:00:00+02:00'
    //         },
    //         {
    //           'stage': '6',
    //           'stage_start_timestamp': '2023-04-21T16:00:00+02:00'
    //         },
    //         {
    //           'stage': '5',
    //           'stage_start_timestamp': '2023-04-22T05:00:00+02:00'
    //         },
    //         {
    //           'stage': '6',
    //           'stage_start_timestamp': '2023-04-22T16:00:00+02:00'
    //         }
    //       ],
    //       'stage': '2',
    //       'stage_updated': '2023-04-20T16:00:00.830806+02:00'
    //     }
    //   }
    // };

    logger.debug(`response.json: ${JSON.stringify(json, null, 4)}`);
    const espStatusResponse = ESPStatusResponse.parse(json);
    logger.debug(espStatusResponse);
    return espStatusResponse;
  } catch (error) {
    console.log('**** error ****');
    logger.error(error);
    throw error;
  }
};

function checkEnvironment() {
  logger.debug('Checking environment...');
  ENV_VARS.forEach((envVar) => {
    if (!process.env[envVar]) {
      throw new Error(`Environment variable [${envVar}] not set!`);
    }
  });
}

async function updateDynamoDB(dynamoTableName: string, espResponse: ESPStatusResponseType) {
  const currentMoment = moment();
  const params = {
    RequestItems: {
      [dynamoTableName]: [
        {
          PutRequest: {
            Item: {
              id: {
                S: "1"
              },
              name: {
                S: espResponse.status.capetown.name
              },
              stage: {
                N: espResponse.status.capetown.stage
              },
              stage_updated: {
                S: espResponse.status.capetown.stage_updated
              },
              last_updated: {
                S: `${currentMoment.format()}`
              }
            }
          }
        },
        {
          PutRequest: {
            Item: {
              id: {
                S: "2"
              },
              name: {
                S: espResponse.status.eskom.name
              },
              stage: {
                N: espResponse.status.eskom.stage
              },
              stage_updated: {
                S: espResponse.status.eskom.stage_updated
              },
              last_updated: {
                S: `${currentMoment.format()}`
              }
            }
          }
        }
      ]
    }
  };

  try {
    // Call DynamoDB to add the item to the table
    logger.debug('About to batchWriteItem...');
    const dynamoDBResponse = await ddb.batchWriteItem(params).promise();
    logger.debug(`${dynamoTableName} updated...`);
    logger.debug(dynamoDBResponse);
  }
  catch (error) {
    logger.error(`Error updating dynamodb table [${dynamoTableName}]: ${JSON.stringify(error)}`);
    throw error;
  }
}

/**
* Lambda handler
* @param event  Lambda event
* @param context
* @returns
//  */
exports.handler = async function handler(event: any, context: Context) {
  context.callbackWaitsForEmptyEventLoop = false;
  logger.debug('*** ESP INTEGRATION ***');
  try {
    /* Check environment variable */
    checkEnvironment();

    logger.debug('calling API...');

    const espResponse = await postJsonToAPI();
    if (!espResponse) {
      throw new Error('Invalid response from ESP!');
    }

    const dynamoTableName = process.env.DYNAMODB_PERSISTENCE_TABLE_NAME ?? '';

    logger.debug(`DYNAMODB_PERSISTENCE_TABLE_NAME**: ${dynamoTableName}`);

    await updateDynamoDB(dynamoTableName, espResponse);
    logger.debug('Table updated successfully...');
  } catch (error) {
    logger.error('ERROR:', error);
  } finally {
    // clean up
  }
  return {};
};
