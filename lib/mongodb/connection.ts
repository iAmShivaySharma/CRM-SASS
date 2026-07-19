import mongoose from 'mongoose'

let connectionPromise: Promise<void> | null = null

async function connectToMongoDB(): Promise<void> {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.MONGODB_URI?.includes('placeholder')
  ) {
    return
  }

  if (mongoose.connection.readyState === 1) {
    return
  }

  if (connectionPromise) {
    return connectionPromise
  }

  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not defined')
  }

  connectionPromise = mongoose
    .connect(mongoUri, {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4,
      retryWrites: true,
      retryReads: true,
    })
    .then(() => {
      connectionPromise = null
    })
    .catch(err => {
      connectionPromise = null
      throw err
    })

  return connectionPromise
}

async function disconnectFromMongoDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect()
  }
}

if (typeof window === 'undefined') {
  process.on('SIGINT', async () => {
    await disconnectFromMongoDB()
    process.exit(0)
  })
}

export { connectToMongoDB, disconnectFromMongoDB }
export default connectToMongoDB
