import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  ratesDataValidator,
  ratesPatchValidator,
  ratesQueryValidator,
  ratesResolver,
  ratesExternalResolver,
  ratesDataResolver,
  ratesPatchResolver,
  ratesQueryResolver
} from './rates.schema.js'
import { RatesService } from './rates.class.js'
import { ratesPath, ratesMethods } from './rates.shared.js'

export * from './rates.class.js'
export * from './rates.schema.js'

export const rates = (app) => {
  const options = {
    paginate: app.get('paginate'),
    Model: async () => {
      const db = await app.get('mongodbClient');
      return db.collection('rates');
    }
  };

  const service = new RatesService(options, app);

  app.use(ratesPath, service, {
    methods: ratesMethods,
    events: []
  });


  // Initialize hooks
  app.service(ratesPath).hooks({
    around: {
      all: [
        //authenticate('jwt'),
        schemaHooks.resolveExternal(ratesExternalResolver),
        schemaHooks.resolveResult(ratesResolver),
      ]
    },
    before: {
      all: [schemaHooks.validateQuery(ratesQueryValidator), schemaHooks.resolveQuery(ratesQueryResolver)],
      find: [],
      get: [],
      create: [
        async (context) => {
          console.log('✅ Validating rate update data');
          return context;
        },
        schemaHooks.validateData(ratesDataValidator),
        schemaHooks.resolveData(ratesDataResolver)
      ],
      patch: [schemaHooks.validateData(ratesPatchValidator), schemaHooks.resolveData(ratesPatchResolver)],
      remove: []
    },
    after: {
      all: [],
      create: [
       async (context) => {
        console.log('✅ Rate update completed successfully');
        return context;
      }]
    },
    error: {
      all: []
    }
  })
}
