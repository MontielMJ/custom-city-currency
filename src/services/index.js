import { queue } from './queue/queue.js'
import { report } from './report/report.js'
import { convert } from './convert/convert.js'
import { rates } from './rates/rates.js'
import { externalRates } from './external-rates/external-rates.js'

export const services = async app => {
  app.configure(queue)
  app.configure(report)
  app.configure(convert)
  app.configure(externalRates)
  app.configure(rates)
  // All services will be registered here
}
