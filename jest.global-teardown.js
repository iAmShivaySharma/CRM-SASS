module.exports = async () => {
  // Stop MongoDB Memory Server
  if (global.__MONGOINSTANCE) {
    await global.__MONGOINSTANCE.stop()
    console.log('MongoDB Memory Server stopped')
  }
}
