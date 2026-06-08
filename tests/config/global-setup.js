const { MongoMemoryServer } = require('mongodb-memory-server')

module.exports = async () => {
  // Start MongoDB Memory Server for testing
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'crm_test',
      port: 27017,
    },
  })

  const mongoUri = mongoServer.getUri()
  process.env.MONGODB_URI = mongoUri

  // Store the server instance globally so we can access it in teardown
  global.__MONGOINSTANCE = mongoServer

  console.log('MongoDB Memory Server started for testing')
}
