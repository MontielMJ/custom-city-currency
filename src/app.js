
import dotenv from 'dotenv'
import { feathers } from '@feathersjs/feathers'
import express, {
  rest,
  json,
  urlencoded,
  cors,
  serveStatic,
  notFound,
  errorHandler
} from '@feathersjs/express'
import configuration from '@feathersjs/configuration'
import socketio from '@feathersjs/socketio'
import { configurationValidator } from './configuration.js'
import { logger } from './logger.js'
import { logError } from './hooks/log-error.js'
import { mongodb } from './mongodb.js'
import { services } from './services/index.js'
import { channels } from './channels.js'
import { startRatesCron } from './scripts/update-rates-cron.js';



dotenv.config()

const app = express(feathers())
// Load app configuration
app.configure(configuration(configurationValidator))
app.use(cors())
app.use(json())
app.use(urlencoded({ extended: true }))
// Host the public folder
app.use('/', serveStatic(app.get('public')))

// Configure services and real-time functionality
app.configure(rest())
app.configure(
  socketio({
    cors: {
      origin: app.get('origins')
    }
  })
)

// ✅ Configuración asíncrona correcta
const configureApp = async () => {
  await app.configure(mongodb)
  await app.configure(services)
  await app.configure(channels)
}

// Ejecuta la configuración
configureApp().catch(error => {
  console.error('Error configuring app:', error)
  process.exit(1)
})


// Después de inicializar la app
app.setup().then(() => {
  // Iniciar cron job solo en producción
  //if (process.env.NODE_ENV === 'production') {
    startRatesCron();
  //}
});

// Configure a middleware for 404s and the error handler
app.use(notFound())
app.use(errorHandler({ logger }))

// Register hooks that run on all service methods
app.hooks({
  around: {
    all: [logError]
  },
  before: {},
  after: {},
  error: {}
})
// Register application setup and teardown hooks here
app.hooks({
  setup: [],
  teardown: []
})

export { app }
