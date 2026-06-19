const nodeExternals = require('webpack-node-externals');

/**
 * Custom webpack config for NestJS API.
 *
 * By default, NestJS webpack uses webpack-node-externals which externalizes
 * ALL node_modules and workspace packages, emitting bare
 * `require("@ever-jobs/source-linkedin")` calls.
 *
 * Node.js v24's built-in TypeScript support then resolves those to the raw
 * .ts source files via Yarn workspace symlinks and fails because of
 * extensionless ESM imports (e.g. `./linkedin.module` without `.js`).
 *
 * Fix: use a custom allowlist so that @ever-jobs/* packages are bundled
 * (inlined by webpack) rather than externalized.
 */
module.exports = (options) => {
  return {
    ...options,
    externals: [
      nodeExternals({
        // Bundle (inline) all @ever-jobs/* workspace packages
        allowlist: [/^@ever-jobs\//],
      }),
    ],
  };
};
