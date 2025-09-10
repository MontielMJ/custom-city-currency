import cron from 'node-cron';
import { app } from '../app.js';

export function startRatesCron() {
  // Actualizar cada hora
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('⏰ Running scheduled rates update...');
      const ratesService = app.service('rates');
      await ratesService.updateRatesFromExternal();
      console.log('✅ Scheduled update completed');
    } catch (error) {
      console.error('❌ Scheduled update failed:', error);
    }
  });
  
  console.log('📅 Rates update cron job started');
}