// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve, getValidator, querySyntax } from '@feathersjs/schema'
import { dataValidator, queryValidator } from '../../validators.js'

// Main data model schema
export const ratesSchema = {
  $id: 'Rates',
  type: 'object',
  additionalProperties: false,
  required: ['_id', 'rates'],
  properties: {
    _id: { type: 'string' },
    rates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          currency: { type: 'string' },
          rate: { type: 'number' }
        },
        required: ['currency', 'rate']
      }
    }
  }
}

export const ratesResolver = {
  result: {
    rates: async (value, rate, context) => {
      try {
        if (typeof value === 'string') {
          const parsed = JSON.parse(value);
          const result = Object.entries(parsed).map(([currency, rateVal]) => ({
            currency,
            rate: parseFloat(rateVal)
          }));
          console.log('Resultado transformado:', result);
          return result;
        }
        
        console.log('⚡ Valor no es string, devolviendo tal cual');
        return value;
        
      } catch (error) {
        console.error('Error en resolver:', error);
        return [];
      }
    }
  }
};

export const ratesValidator = getValidator(ratesSchema, dataValidator)
export const ratesExternalResolver = resolve({})

// Schema for creating new data
export const ratesDataSchema = {
  $id: 'RatesData',
  type: 'object',
  additionalProperties: false,
  required: [], // ✅ Agregar rates aquí también
  properties: {
    ...ratesSchema.properties
  }
}
export const ratesDataValidator = getValidator(ratesDataSchema, dataValidator)
export const ratesDataResolver = resolve({})

// Schema for updating existing data
export const ratesPatchSchema = {
  $id: 'RatesPatch',
  type: 'object',
  additionalProperties: false,
  required: [],
  properties: {
    ...ratesSchema.properties
  }
}
export const ratesPatchValidator = getValidator(ratesPatchSchema, dataValidator)
export const ratesPatchResolver = resolve({})

// Schema for allowed query properties
export const ratesQuerySchema = {
  $id: 'RatesQuery',
  type: 'object',
  additionalProperties: false,
  properties: {
    ...querySyntax(ratesSchema.properties)
  }
}

export const ratesQueryValidator = getValidator(ratesQuerySchema, queryValidator)
export const ratesQueryResolver = resolve({})