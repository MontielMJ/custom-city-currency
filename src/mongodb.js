// For more information about this file see https://dove.feathersjs.com/guides/cli/databases.html
import { MongoClient } from 'mongodb'

export const mongodb = async app => {
  const connection = app.get('mongodb')
  const database = new URL(connection).pathname.substring(1)
  const mongoClient = await MongoClient.connect(connection).then(client => client.db(database))
  app.set('mongodbClient', mongoClient)
  console.log('Conectado a la base de datos MongoDB:', database);
}
