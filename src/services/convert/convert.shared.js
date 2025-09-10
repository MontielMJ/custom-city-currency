export const convertPath = 'convert'

export const convertMethods = ['find', 'get', 'create', 'patch', 'remove']

export const convertClient = client => {
  const connection = client.get('connection')

  client.use(convertPath, connection.service(convertPath), {
    methods: convertMethods
  })
}
