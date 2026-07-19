import mongoose from 'mongoose'

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

  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not defined')
  }

  await mongoose.connect(mongoUri, {
    bufferCommands: false,
    maxPoolSize: 25,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    retryReads: true,
  })

  await new Promise((resolve, reject) => {
    if (mongoose.connection.readyState === 1) {
      resolve(true)
    } else {
      mongoose.connection.once('connected', resolve)
      mongoose.connection.once('error', reject)
    }
  })
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
