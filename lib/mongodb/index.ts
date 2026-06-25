export {
  default as connectToMongoDB,
  disconnectFromMongoDB,
} from './connection'
export { mongoClient } from './client'
export * from './models'
export * from './auth'

import connectToMongoDB from './connection'

if (process.env.NODE_ENV !== 'production') {
  connectToMongoDB().catch(() => {})
}
