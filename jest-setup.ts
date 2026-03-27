// Global Jest setup file
// Runs before each test suite

// Suppress console noise during tests
global.console.log = jest.fn()
global.console.info = jest.fn()
// Keep console.error and console.warn visible for debugging failures
