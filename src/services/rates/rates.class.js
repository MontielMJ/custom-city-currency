import { MongoDBService } from '@feathersjs/mongodb'
import { ObjectId } from 'mongodb';

export class RatesService extends MongoDBService {
  constructor(options, app) {
    super(options);
    this.app = app;
  }

  async get(id) {
    try {
      const db = await this.app.get('mongodbClient');
      const result = await db.collection('rates').findOne({ _id: new ObjectId(id) });

      if (!result) {
        throw new Error('Rate not found');
      }

      return {
        _id: result._id.toString(),
        rates: this.transformRates(result.rates)
      };

    } catch (error) {
      console.error('❌ Service error:', error);
      throw error;
    }
  }

  async create(data) {
    try {
      console.log('🔄 Received update request:', data);

      const { rates } = data;

      if (!rates || !Array.isArray(rates) || rates.length === 0) {
        throw new Error('Missing required field: rates array with currency and rate objects');
      }

      const results = [];
      for (const rateData of rates) {
        const { currency, rate } = rateData;

        if (!currency || rate === undefined || rate === null) {
          results.push({
            success: false,
            currency: currency || 'unknown',
            error: 'Missing currency or rate field'
          });
          continue;
        }

        if (typeof currency !== 'string' || currency.length !== 3) {
          results.push({
            success: false,
            currency: currency,
            error: 'Currency must be a 3-letter code'
          });
          continue;
        }

        const numericValue = parseFloat(rate);
        if (isNaN(numericValue)) {
          results.push({
            success: false,
            currency: currency,
            error: 'Rate must be a valid number'
          });
          continue;
        }

        const updateResult = await this.updateRate(currency.toUpperCase(), numericValue);
        results.push({
          success: true,
          ...updateResult
        });
      }

      return {
        success: true,
        message: `Processed ${rates.length} rate updates`,
        results: results
      };

    } catch (error) {
      console.error('❌ Error updating rate:', error);
      throw error;
    }
  }

  async updateRate(currencyCode, newValue) {
    const db = await this.app.get('mongodbClient');
    const ratesDoc = await db.collection('rates').findOne({ _id: new ObjectId('68ba3285161296caad4c9450') });

    if (!ratesDoc) {
      throw new Error('No rates document found');
    }

    let ratesArray = this.normalizeRatesToArray(ratesDoc.rates);

    const foundIndex = ratesArray.findIndex(rate =>
      rate.currency.toUpperCase() === currencyCode.toUpperCase()
    );

    let action = '';
    let oldRate = null;

    if (foundIndex !== -1) {
      oldRate = ratesArray[foundIndex].rate;
      ratesArray[foundIndex].rate = newValue;
      ratesArray[foundIndex].updatedAt = new Date();
      action = 'updated';
    } else {
      ratesArray.push({
        currency: currencyCode.toUpperCase(),
        rate: newValue,
        createdAt: new Date()
      });
      action = 'added';
    }

    await db.collection('rates').updateOne(
      { _id: new ObjectId('68ba3285161296caad4c9450') },
      {
        $set: {
          rates: ratesArray,
          lastUpdated: new Date()
        }
      }
    );

    return {
      action: action,
      currency: currencyCode,
      oldRate: oldRate,
      newRate: newValue,
      totalCurrencies: ratesArray.length
    };
  }

  normalizeRatesToArray(ratesData) {
    if (Array.isArray(ratesData)) {
      return ratesData;
    }

    if (typeof ratesData === 'string') {
      try {
        ratesData = JSON.parse(ratesData);
      } catch (error) {
        throw new Error('Failed to parse rates JSON: ' + error.message);
      }
    }

    if (typeof ratesData === 'object' && ratesData !== null) {
      return Object.entries(ratesData).map(([currency, rate]) => ({
        currency: currency.toUpperCase(),
        rate: typeof rate === 'number' ? rate : parseFloat(rate)
      }));
    }

    throw new Error('Cannot normalize rates data to array');
  }

  transformRates(ratesData) {
    return this.normalizeRatesToArray(ratesData);
  }

  async updateRatesFromExternal() {
    try {
      const externalService = this.app.service('external-rates');
      const externalData = await externalService.find();

      const ratesData = this.transformExternalData(externalData);

      const db = await this.app.get('mongodbClient');
      const result = await db.collection('rates').updateOne(
        { _id: new ObjectId('68ba3285161296caad4c9450') },
        {
          $set: {
            rates: ratesData, // Guardar directamente como array
            lastUpdated: new Date(),
            source: 'external-api'
          }
        },
        { upsert: true }
      );

      console.log('✅ Rates updated successfully');
      return result;

    } catch (error) {
      console.error('❌ Error updating rates:', error);
      throw error;
    }
  }

  transformExternalData(externalData) {
    const { rates } = externalData;
    const transformed = [];

    for (const [currency, rateValue] of Object.entries(rates)) {
      transformed.push({
        currency: currency.toUpperCase(),
        rate: parseFloat(rateValue)
      });
    }

    return transformed;
  }
}