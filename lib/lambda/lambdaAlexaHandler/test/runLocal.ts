import { Context } from 'aws-lambda';
import * as fs from 'fs';
import logger from '../helpers/logger';

const { handler } = require('../index');

const context = {} as Context;
let event = {};

function readPayload(filename: string) {
  const inputData = fs.readFileSync(filename, 'utf-8');
  event = JSON.parse(inputData);
}

async function main() {
  logger.debug('hello world...');
  // readPayload('/Users/rennayd/dev/HL/test/kai3.json');
  // readPayload('/Users/rennayd/dev/HL/isa_topup_iac/application/lambda_functions/ts/lambdaLexbotHandler/test/json/ISA-001.json');
  readPayload('/Users/rennayd/dev/HL/test/kai2.json');

  await handler(event, context);
}

main();
