// services/external-rates/external-rates.class.js
import axios from 'axios';

export class ExternalRatesService {
  constructor(options) {
    this.options = options;
    this.baseURL = 'https://openexchangerates.org/api/latest.json';
  }

  async find(params) {
    try {
      const response = await axios.get(this.baseURL, {
        params: {
          app_id: '81ac5bf6c8224d1ab19f9c14d567e3af'
        },
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching external rates:', error);
      throw new Error(`Failed to fetch rates: ${error.message}`);
    }
  }
}