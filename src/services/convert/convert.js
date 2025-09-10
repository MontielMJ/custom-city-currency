// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  convertDataValidator,
  convertPatchValidator,
  convertQueryValidator,
  convertResolver,
  convertExternalResolver,
  convertDataResolver,
  convertPatchResolver,
  convertQueryResolver
} from './convert.schema.js'
import { ConvertService } from './convert.class.js'
import { convertPath, convertMethods } from './convert.shared.js'

export * from './convert.class.js'
export * from './convert.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const convert = app => {

 const options = {
    paginate: app.get('paginate'),
    Model: async () => {
      const db = await app.get('mongodbClient');
      return db.collection('convert');
    }
  };

  // Register our service on the Feathers application
  app.use(convertPath, new ConvertService(options,app), {
    methods: convertMethods,
    events: []
  })


  // Initialize hooks
  app.service(convertPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(convertExternalResolver), schemaHooks.resolveResult(convertResolver)]
    },
    before: {
      all: [schemaHooks.validateQuery(convertQueryValidator), schemaHooks.resolveQuery(convertQueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(convertDataValidator), schemaHooks.resolveData(convertDataResolver)],
      patch: [schemaHooks.validateData(convertPatchValidator), schemaHooks.resolveData(convertPatchResolver)],
      remove: []
    },
    after: {
      all: []
    },
    error: {
      all: []
    }
  })
}
