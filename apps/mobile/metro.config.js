const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const workspaceRoot = path.resolve(__dirname, '../..')
const projectRoot = __dirname

const config = getDefaultConfig(projectRoot)

// Watch monorepo root so Metro can resolve libs/
config.watchFolders = [workspaceRoot]

// Module resolution: project first, then workspace
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// Map @phantom/ui to the library source
config.resolver.extraNodeModules = {
  '@phantom/ui': path.resolve(workspaceRoot, 'libs/mobile-ui/src'),
}

module.exports = config
