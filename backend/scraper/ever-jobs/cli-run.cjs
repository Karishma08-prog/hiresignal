/**
 * cli-run.cjs — CommonJS bootstrap for the ever-jobs CLI.
 *
 * The repo ships only tsconfig.base.json (no root tsconfig.json), and Node's
 * native TypeScript handling tries to run apps/cli/src/main.ts as an ES module,
 * which breaks extensionless relative imports and @ever-jobs/* path aliases.
 *
 * Running through a .cjs entry forces the CommonJS loader, then ts-node's
 * require hook compiles the TS on the fly (CommonJS) and tsconfig-paths resolves
 * the workspace path aliases from tsconfig.base.json.
 *
 * Usage:  node cli-run.cjs <ever-jobs cli args...>
 *   e.g.  node cli-run.cjs search --help
 */
const path = require('path');

process.env.TS_NODE_TRANSPILE_ONLY = process.env.TS_NODE_TRANSPILE_ONLY || 'true';
process.env.TS_NODE_PROJECT =
  process.env.TS_NODE_PROJECT || path.join(__dirname, 'tsconfig.base.json');

require('ts-node/register');
require('tsconfig-paths/register');
require('./apps/cli/src/main.ts');
