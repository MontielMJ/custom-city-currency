import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

export class QueueService {
  constructor(options = {}) {
    this.options = options;
    this.connection = null;
    this.channel = null;
    this.connected = false;
    this.initializeQueue();
  }

  async initializeQueue() {
    try {
      const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      this.connection = await amqp.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      
      // Declarar exchange para conversiones
      await this.channel.assertExchange('conversion_exchange', 'direct', {
        durable: true
      });
      
      // Declarar queue principal
      await this.channel.assertQueue('conversion_queue', {
        durable: true
      });
      
      // Bind queue to exchange
      await this.channel.bindQueue('conversion_queue', 'conversion_exchange', 'conversion.created');
      
      this.connected = true;
      console.log('✅ Queue service conectado exitosamente a RabbitMQ');

    } catch (error) {
      console.error('❌ Error conectando con RabbitMQ:', error.message);
      this.connected = false;
    }
  }

  async find(params) {
    // Retornar estado del servicio queue
    return {
      service: 'queue',
      connected: this.connected,
      timestamp: new Date().toISOString(),
      queue: 'conversion_queue',
      exchange: 'conversion_exchange',
      status: this.connected ? 'active' : 'inactive'
    };
  }

  async get(id, params) {
    // Obtener mensaje específico (no implementado para RabbitMQ)
    return {
      id,
      message: 'Queue service status',
      connected: this.connected,
      timestamp: new Date().toISOString()
    };
  }

  async create(data, params) {
    try {
      if (!this.connected) {
        await this.initializeQueue();
        if (!this.connected) {
          throw new Error('Queue service no está conectado a RabbitMQ');
        }
      }

      const messageId = data.messageId || uuidv4();
      const message = {
        id: messageId,
        type: data.type || 'conversion.detail',
        timestamp: new Date().toISOString(),
        data: {
          conversionId: data.conversionId,
          fromCurrency: data.fromCurrency,
          toCurrency: data.toCurrency,
          amount: data.amount,
          convertedAmount: data.convertedAmount,
          rate: data.rate,
          userId: data.userId,
          ipAddress: data.ipAddress,
          ...data.data
        },
        metadata: {
          service: 'currency-conversion-service',
          version: '1.0.0',
          ...data.metadata
        }
      };

      // Enviar mensaje a RabbitMQ
      const sent = this.channel.publish(
        'conversion_exchange',
        data.routingKey || 'conversion.created',
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          contentType: 'application/json',
          messageId: message.id,
          timestamp: Date.now(),
          headers: data.headers || {}
        }
      );

      if (!sent) {
        throw new Error('No se pudo enviar el mensaje a la queue');
      }

      console.log(`📨 Mensaje enviado a Queue: ${message.id}`);

      return {
        success: true,
        messageId: message.id,
        timestamp: message.timestamp,
        queue: 'conversion_queue',
        exchange: 'conversion_exchange',
        data: message.data
      };

    } catch (error) {
      console.error('❌ Error en Queue service:', error);
      throw new Error(`Error enviando mensaje: ${error.message}`);
    }
  }

  async teardown() {
    if (this.connection) {
      await this.connection.close();
      this.connected = false;
    }
  }
}
export default QueueService;