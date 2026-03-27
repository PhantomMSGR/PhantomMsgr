/**
 * Custom webpack config for NestJS monorepo production builds.
 * Excludes native modules (sharp, firebase-admin) from bundling
 * so they remain as runtime require() calls resolved from node_modules.
 */
module.exports = (options) => {
  return {
    ...options,
    externals: {
      // Native / hard-to-bundle modules stay as externals
      sharp: 'commonjs sharp',
      'firebase-admin': 'commonjs firebase-admin',
      // canvas, bcrypt (native) — not used but guard against accidental pulls
      bcrypt: 'commonjs bcrypt',
    },
  }
}
