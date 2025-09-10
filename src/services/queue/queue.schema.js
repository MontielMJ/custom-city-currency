// queue.schema.js - Usar import
import { resolve, getValidator, querySyntax } from '@feathersjs/schema';
import { ObjectIdSchema } from '@feathersjs/schema';
import { dataValidator, queryValidator } from '../../validators.js';

// Main data model schema for queue messages
export const queueMessageSchema = {
  $id: 'QueueMessage',
  type: 'object',
  additionalProperties: false,
  required: ['fromCurrency', 'toCurrency', 'amount', 'convertedAmount', 'rate'],
  properties: {
    fromCurrency: { 
      type: 'string',
      minLength: 3,
      maxLength: 3
    },
    toCurrency: { 
      type: 'string',
      minLength: 3,
      maxLength: 3
    },
    amount: { 
      type: 'number',
      minimum: 0
    },
    convertedAmount: { 
      type: 'number'
    },
    rate: { 
      type: 'number',
      minimum: 0
    },
    conversionId: { 
      type: 'string'
    },
    userId: { 
      type: 'string'
    },
    ipAddress: { 
      type: 'string'
    },
    routingKey: { 
      type: 'string'
    },
    headers: { 
      type: 'object'
    },
    metadata: { 
      type: 'object'
    }
  }
};

// Schema for queue response
export const queueResponseSchema = {
  $id: 'QueueResponse',
  type: 'object',
  additionalProperties: false,
  properties: {
    success: { 
      type: 'boolean' 
    },
    messageId: { 
      type: 'string' 
    },
    timestamp: { 
      type: 'string' 
    },
    queue: { 
      type: 'string' 
    },
    exchange: { 
      type: 'string' 
    },
    data: { 
      type: 'object' 
    }
  }
};

// Validators
export const queueMessageValidator = getValidator(queueMessageSchema, dataValidator);
export const queueResponseValidator = getValidator(queueResponseSchema, dataValidator);

// Resolvers
export const queueMessageResolver = resolve({
  conversions: {
    fromCurrency: async (value) => value ? value.toUpperCase() : value,
    toCurrency: async (value) => value ? value.toUpperCase() : value,
    amount: async (value) => parseFloat(value),
    convertedAmount: async (value) => parseFloat(value),
    rate: async (value) => parseFloat(value)
  }
});

export const queueResponseResolver = resolve({});

// Schema for creating new queue messages
export const queueDataSchema = {
  $id: 'QueueData',
  type: 'object',
  additionalProperties: false,
  required: ['fromCurrency', 'toCurrency', 'amount', 'convertedAmount', 'rate'],
  properties: {
    ...queueMessageSchema.properties
  }
};

export const queueDataValidator = getValidator(queueDataSchema, dataValidator);
export const queueDataResolver = resolve({
  conversions: {
    fromCurrency: async (value) => value ? value.toUpperCase() : value,
    toCurrency: async (value) => value ? value.toUpperCase() : value,
    amount: async (value) => parseFloat(value),
    convertedAmount: async (value) => parseFloat(value),
    rate: async (value) => parseFloat(value)
  }
});

// Schema for allowed query properties
export const queueQuerySchema = {
  $id: 'QueueQuery',
  type: 'object',
  additionalProperties: false,
  properties: {
    ...querySyntax({
      connected: { type: 'boolean' },
      status: { type: 'string' },
      timestamp: { type: 'string' }
    })
  }
};

export const queueQueryValidator = getValidator(queueQuerySchema, queryValidator);
export const queueQueryResolver = resolve({});