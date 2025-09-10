import { ExternalRatesService } from './externar-rates.class.js';
export const externalRatesPath = 'external-rates';
export const externalRatesMethods = ['find'];

export const externalRates = (app) => {
  app.use(externalRatesPath, new ExternalRatesService(), {
    methods: externalRatesMethods,
    events: []
  });
};