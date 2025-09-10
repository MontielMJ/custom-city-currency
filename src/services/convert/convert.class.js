import { MongoDBService } from '@feathersjs/mongodb'
import { ObjectId } from 'mongodb';


// Convert service class  for currency conversion
export class ConvertService extends MongoDBService {
  constructor(options, app) {
    super(options);
    this.app = app;
  }

  async create(data) {
    try {
      console.log('🔄 Conversion request:', data);

      // Validar parámetros
      const { from, to, amount } = data;

      if (!from || !to || amount === undefined || amount === null) {
        throw new Error('Missing required parameters: from, to, amount');
      }

      if (typeof from !== 'string' || from.length !== 3) {
        throw new Error('From currency must be a 3-letter code (e.g., USD, EUR)');
      }

      if (typeof to !== 'string' || to.length !== 3) {
        throw new Error('To currency must be a 3-letter code (e.g., USD, EUR)');
      }

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount)) {
        throw new Error('Amount must be a valid number');
      }

      if (numericAmount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Obtener tasas de cambio
      const rates = await this.getLatestRates();
      // Realizar conversión
      const conversionResult = this.convertCurrency(rates, from.toUpperCase(), to.toUpperCase(), numericAmount);
      const savedConversion = await this.saveConversion(conversionResult);

      // Crear el objeto de respuesta completo
      const conversionResponse = {
        success: true,
        conversion: conversionResult,
        recordId: savedConversion._id,
        timestamp: new Date(),
        _id: savedConversion._id,
        ...conversionResult
      };

      // Enviar mensaje a RabbitMQ (async - no bloqueante)
      this.sendToRabbitMQ(conversionResponse)
        .then(rabbitResult => {
          console.log('✅ Mensaje enviado a RabbitMQ:', rabbitResult.messageId);
        })
        .catch(rabbitError => {
          console.warn('⚠️ Error enviando a RabbitMQ:', rabbitError.message);
        });

      /*return {
        success: true,
        conversion: result,
        recordId: savedConversion._id,
        timestamp: new Date()
      };*/
      return conversionResponse;
    } catch (error) {
      console.error('❌ Conversion error:', error);
      throw error;
    }
  }

  async saveConversion(conversionData, params) {
    const db = await this.app.get('mongodbClient');

    const conversionRecord = {
      ...conversionData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('conversions').insertOne(conversionRecord);

    console.log('💾 Conversion saved with ID:', result.insertedId);

    return {
      _id: result.insertedId,
      ...conversionRecord
    };
  }

  async getLatestRates() {
    const db = await this.app.get('mongodbClient');
    const ratesDoc = await db.collection('rates').findOne({ _id: new ObjectId('68ba3285161296caad4c9450') });

    if (!ratesDoc) {
      throw new Error('No exchange rates available');
    }

    return this.normalizeRatesToArray(ratesDoc.rates);
  }

  normalizeRatesToArray(ratesData) {
    if (Array.isArray(ratesData)) {
      return ratesData;
    }

    if (typeof ratesData === 'string') {
      try {
        ratesData = JSON.parse(ratesData);
      } catch (error) {
        throw new Error('Failed to parse rates data');
      }
    }

    if (typeof ratesData === 'object' && ratesData !== null) {
      return Object.entries(ratesData).map(([currency, rate]) => ({
        currency: currency.toUpperCase(),
        rate: typeof rate === 'number' ? rate : parseFloat(rate)
      }));
    }

    throw new Error('Invalid rates data format');
  }

  convertCurrency(ratesArray, fromCurrency, toCurrency, amount) {
    const fromRate = this.findRateByCurrency(ratesArray, fromCurrency);
    const toRate = this.findRateByCurrency(ratesArray, toCurrency);

    if (!fromRate) {
      throw new Error(`Exchange rate not found for ${fromCurrency}`);
    }

    if (!toRate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }

    if (fromCurrency === toCurrency) {
      return {
        from: fromCurrency,
        to: toCurrency,
        originalAmount: amount,
        convertedAmount: amount,
        rate: 1
      };
    }

    const amountInUSD = fromCurrency === 'USD' ? amount : amount / fromRate.rate;
    const convertedAmount = toCurrency === 'USD' ? amountInUSD : amountInUSD * toRate.rate;
    const directRate = toRate.rate / fromRate.rate;

    return {
      from: fromCurrency,
      to: toCurrency,
      originalAmount: amount,
      convertedAmount: parseFloat(convertedAmount.toFixed(6)),
      rate: parseFloat(directRate.toFixed(6)),
      fromRate: fromRate.rate,
      toRate: toRate.rate,
      lastUpdated: new Date()
    };
  }

  findRateByCurrency(ratesArray, currencyCode) {
    return ratesArray.find(rate =>
      rate.currency.toUpperCase() === currencyCode.toUpperCase()
    );
  }

  async sendToRabbitMQ(conversion) {
    try {
      // Obtener el servicio queue
      const queueService = this.app.service('queue');

      if (!queueService) {
        throw new Error('Queue service not available');
      }

      // Preparar datos para RabbitMQ
      const messageData = {
        conversionId: conversion._id ? conversion._id.toString() : conversion.recordId,
        fromCurrency: conversion.from,
        toCurrency: conversion.to,
        amount: conversion.originalAmount,
        convertedAmount: conversion.convertedAmount,
        rate: conversion.rate,
        timestamp: conversion.timestamp || new Date(),

      };

      // Enviar mensaje a la queue
      const rabbitResult = await queueService.create(messageData);

      // Opcional: Actualizar la conversión con metadata de RabbitMQ
      if (conversion._id) {
        try {
          const db = await this.app.get('mongodbClient');
          await db.collection('conversions').updateOne(
            { _id: new ObjectId(conversion._id) },
            {
              $set: {
                rabbitmq: {
                  messageId: rabbitResult.messageId,
                  sentAt: rabbitResult.timestamp,
                  status: 'sent'
                },
                updatedAt: new Date()
              }
            }
          );
        } catch (dbError) {
          console.warn('⚠️ No se pudo actualizar con metadata RabbitMQ:', dbError.message);
        }
      }

      return rabbitResult;

    } catch (error) {
      console.warn('⚠️ Error en sendToRabbitMQ:', error.message);
      throw error;
    }
  }

  getClientIp(params) {
    if (!params || !params.headers) return null;

    const headers = params.headers;
    return headers['x-forwarded-for'] ||
      headers['x-real-ip'] ||
      (params.connection && params.connection.remoteAddress) ||
      null;
  }

  async saveConversion(conversionData) {
    const db = await this.app.get('mongodbClient');

    const conversionRecord = {
      ...conversionData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('conversions').insertOne(conversionRecord);

    console.log('💾 Conversion saved with ID:', result.insertedId);

    return {
      _id: result.insertedId,
      ...conversionRecord
    };
  }

  async getLatestRates() {
    const db = await this.app.get('mongodbClient');
    const ratesDoc = await db.collection('rates').findOne({ _id: new ObjectId('68ba3285161296caad4c9450') });

    if (!ratesDoc) {
      throw new Error('No exchange rates available');
    }

    return this.normalizeRatesToArray(ratesDoc.rates);
  }

  normalizeRatesToArray(ratesData) {
    if (Array.isArray(ratesData)) {
      return ratesData;
    }

    if (typeof ratesData === 'string') {
      try {
        ratesData = JSON.parse(ratesData);
      } catch (error) {
        throw new Error('Failed to parse rates data');
      }
    }

    if (typeof ratesData === 'object' && ratesData !== null) {
      return Object.entries(ratesData).map(([currency, rate]) => ({
        currency: currency.toUpperCase(),
        rate: typeof rate === 'number' ? rate : parseFloat(rate)
      }));
    }

    throw new Error('Invalid rates data format');
  }
  convertCurrency(ratesArray, fromCurrency, toCurrency, amount) {
    const fromRate = this.findRateByCurrency(ratesArray, fromCurrency);
    const toRate = this.findRateByCurrency(ratesArray, toCurrency);

    if (!fromRate) {
      throw new Error(`Exchange rate not found for ${fromCurrency}`);
    }

    if (!toRate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }

    if (fromCurrency === toCurrency) {
      return {
        from: fromCurrency,
        to: toCurrency,
        originalAmount: amount,
        convertedAmount: amount,
        rate: 1
      };
    }

    const amountInUSD = fromCurrency === 'USD' ? amount : amount / fromRate.rate;
    const convertedAmount = toCurrency === 'USD' ? amountInUSD : amountInUSD * toRate.rate;
    const directRate = toRate.rate / fromRate.rate;

    return {
      from: fromCurrency,
      to: toCurrency,
      originalAmount: amount,
      convertedAmount: parseFloat(convertedAmount.toFixed(6)),
      rate: parseFloat(directRate.toFixed(6)),
      fromRate: fromRate.rate,
      toRate: toRate.rate,
      lastUpdated: new Date()
    };
  }

  findRateByCurrency(ratesArray, currencyCode) {
    return ratesArray.find(rate =>
      rate.currency.toUpperCase() === currencyCode.toUpperCase()
    );
  }
}
export const getOptions = (app) => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('conversions'))
  };
};