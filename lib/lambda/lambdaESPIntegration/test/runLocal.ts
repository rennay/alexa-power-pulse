import { Context } from 'aws-lambda';
import logger from '../helpers/logger';

const { handler } = require('../index');

const context = {} as Context;
let event = {};

async function main() {
  logger.debug('hello world...');
  await handler(event, context);
}

main();
