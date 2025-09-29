// Main MongoDB module exports
export {
  default as connectToMongoDB,
  disconnectFromMongoDB,
} from './connection'
export { mongoClient } from './client'
export * from './models'
export * from './auth'

// Initialize MongoDB connection for the application
import connectToMongoDB from './connection'

// Auto-connect in non-production environments
if (process.env.NODE_ENV !== 'production') {
  connectToMongoDB().catch(console.error)
}
