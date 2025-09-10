// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  reportDataValidator,
  reportQueryValidator,
  reportResolver,
  reportExternalResolver,
  reportDataResolver,
  reportQueryResolver
} from './report.schema.js'
import { ReportService } from './report.class.js'
import { reportPath, reportMethods } from './report.shared.js'

export * from './report.class.js'
export * from './report.schema.js'
import fs from 'fs';
import path from 'path';

export const report = app => {
  app.use(reportPath, new ReportService(app), {
    methods: reportMethods,
    events: []
  })

  
  app.service(reportPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(reportExternalResolver), schemaHooks.resolveResult(reportResolver)]
    },
    before: {
      all: [schemaHooks.validateQuery(reportQueryValidator), schemaHooks.resolveQuery(reportQueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(reportDataValidator), schemaHooks.resolveData(reportDataResolver)],
      remove: []
    },
    after: {
      all: [],
      find: [
        async (context) => {
          if (context.result && context.result.pdfBuffer) {
            console.log('PDF report found, generating download...');
            return new Promise((resolve) => {
              context.result.pdfBuffer.getBuffer(async (buffer) => {
                try {
                  // Usar el objeto de respuesta de Express directamente
                  const res = context.params.res || context.response;

                  if (res && typeof res.setHeader === 'function') {
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="${context.result.fileName}"`);
                    res.setHeader('Content-Length', buffer.length);

                    res.write(buffer);
                    res.end();
                    context.dispatch = false;
                  } else {
                    console.warn('Response object not available for PDF download');
                  }

                } catch (error) {
                  console.error('Error in PDF hook:', error);
                }
                resolve(context);
              });
              
              if (context.result && context.result.pdfBuffer) {
                  const pdfDoc = context.result.pdfBuffer;
                  const filePath = path.join('debug-report.pdf');
                  pdfDoc.getBuffer((buffer) => {  
                    fs.writeFileSync(filePath, buffer);
                    console.log(`PDF saved to ${filePath}`);
                  });
              }
            });
          }
          return context;
        }
      ],
      get: [
        async (context) => {
          if (context.result && context.result.pdf) {
            console.log('Methodo GET Generated PDF report:', context.result.fileName);
            context.response.set('Content-Type', 'application/pdf');
            context.response.set(
              'Content-Disposition',
              `attachment; filename="${context.result.fileName}"`
            );
            context.response.set('Content-Length', context.result.length);

            context.response.write(context.result.pdf);
            context.response.end();
            context.dispatch = false;
          }
          return context;
        }
      ]
    },
    error: {
      all: []
    }
  })
}
