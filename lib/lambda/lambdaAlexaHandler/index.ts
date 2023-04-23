/* eslint-disable import/prefer-default-export */
const Alexa = require('ask-sdk-core');
const AWS = require("aws-sdk");
import logger from "./helpers/logger";

// Create the DynamoDB service object
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const LaunchRequestHandler = {
  canHandle(handlerInput: any) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput: any) {
    const speakOutput = 'Welcome, you can say Status or Help. Which would you like to try?';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

const NationalStatusIntentHandler = {
  canHandle(handlerInput: any) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NationalStatusIntent';
  },
  async handle(handlerInput: any) {
    logger.debug('**** NationalStatusIntentHandler.handle ****');
    let speakOutput = `At the top of this hour, `;
    try {
      const dynamoTableName = process.env.DYNAMODB_PERSISTENCE_TABLE_NAME;

      logger.debug(`DYNAMODB_PERSISTENCE_TABLE_NAME: ${dynamoTableName}`);

      var params = {
        TableName: dynamoTableName,
      };

      const data = await ddb.scan(params).promise();
      logger.debug(data);
      if (!data.Items || (data.Items.length === 0)) {
        throw new Error('No records found in table!');
      }
      data.Items.forEach((item: any) => {
        const name = item.name.S;
        const stage = item.stage.N;

        speakOutput += `${name} is in Stage ${stage}. `
      });
    } catch (error) {
      speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
      logger.debug('**** error ****');
      logger.debug(error);
    }
    logger.debug(`speakOutput: ${speakOutput}`);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      // .reprompt('add a reprompt if you want to keep the session open for the user to respond')
      .getResponse();
  }
};

const LoadSheddingDefinitionIntentHandler = {
  canHandle(handlerInput: any) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LoadSheddingDefinitionIntent';
  },
  handle(handlerInput: any) {
    let speakOutput = 'Load shedding is when your electricity provider intentionally turns off your power for a period of time to balance the ';
    speakOutput += 'amount of electricity being used with the amount being generated. They do this to prevent a total power outage or blackout. ';
    speakOutput += 'It can happen because of maintenance work, bad weather, or when there is not enough electricity being generated to meet the demand. ';
    speakOutput += 'When load shedding occurs, your electricity supply is turned off for a certain amount of time before being turned back on again.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      // .reprompt(speakOutput)
      .getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput: any) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput: any) {
    const speakOutput = 'You can ask me what the National Loadshedding Status is.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput: any) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput: any) {
    const speakOutput = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet
 * */
const FallbackIntentHandler = {
  canHandle(handlerInput: any) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput: any) {
    const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs
 * */
const SessionEndedRequestHandler = {
  canHandle(handlerInput: any) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput: any) {
    logger.debug(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
  }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents
 * by defining them above, then also adding them to the request handler chain below
 * */
const IntentReflectorHandler = {
  canHandle(handlerInput: any) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput: any) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const speakOutput = `You just triggered ${intentName}`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
      .getResponse();
  }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below
 * */
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput: any, error: any) {
    const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
    logger.debug(`~~~~ Error handled: ${JSON.stringify(error)}`);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom
 * */
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    NationalStatusIntentHandler,
    LoadSheddingDefinitionIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler)
  .addErrorHandlers(
    ErrorHandler)
  .withCustomUserAgent('sample/hello-world/v1.2')
  .lambda();