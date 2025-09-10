export const queuePath = 'queue'

export const queueMethods = ['find', 'get', 'create']

export const queueClient = client => {
  const connection = client.get('connection')

  client.use(queuePath, connection.service(queuePath), {
    methods: queueMethods
  })
}
