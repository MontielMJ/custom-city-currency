import { hooks as schemaHooks } from '@feathersjs/schema';
import {
  queueDataValidator,
  queueDataResolver,
  queueQueryValidator,
  queueQueryResolver,
  queueMessageSchema,
  queueResponseSchema
} from './queue.schema.js';
import { QueueService } from './queue.class.js';
import { queueMethods, queuePath } from './queue.shared.js';


export const queue = (app) => {

  const options = {
    paginate: app.get('paginate'),
    Model: async () => {
      const db = await app.get('mongodbClient');
      return db.collection('queue');
    }
  };

  // Initialize our service with any options it requires
  app.use(queuePath, new QueueService(options, app), {
    methods: queueMethods,
    events: []
  });

  // Initialize hooks
  app.service(queuePath).hooks({
    around: {
      all: [
        //authenticate('jwt'),
      ]
    },
    before: {
      all: [],
      find: [],
      get: [],
      create: [],
      patch: [],
      remove: []
    },
    after: {
      all: [],
      create: [
        async (context) => {
          console.log('Mensaje enviado exitosamente a la queue:', context.result.messageId);
          return context;
        }
      ]
    },
    error: {
      all: [
        async (context) => {
          console.error('Error en Queue service:', context.error);
          return context;
        }
      ]
    }
  })
};