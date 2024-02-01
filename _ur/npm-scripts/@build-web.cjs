/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NODE CLI TOOL
  designed to run inside of non-module nodejs legacy environment like
  the prototype version of NetCreate 2.0 (2023)

  it depends on UR library being built previously

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

const esbuild = require('esbuild');
const { copy } = require('esbuild-plugin-copy');
const PATH = require('node:path');
const UR = require('@ursys/core');
const { EnsureDir } = UR.FILES;
// build-web can not use URSYS library because it's BUILDING it!
// so we yoink the routines out of the source directly
const PROMPTS = require('../common/prompts');

/// CONSTANTS AND DECLARATIONS ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const APP_PORT = 3000;
const { ROOT, DIR_PUBLIC } = require('./env-build.cjs');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const LOG = PROMPTS.makeTerminalOut('BUILD-APP', 'TagSystem');
const ENTRY_JS = PATH.join(ROOT, 'app/init.jsx');

/// ESBUILD API ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function _short(path) {
  if (path.startsWith(ROOT)) return path.slice(ROOT.length);
  return path;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function ESBuildWebApp() {
  // make sure DIR_PUBLIC exists
  EnsureDir(DIR_PUBLIC);

  // build the webapp and stuff it into public
  const context = await esbuild.context({
    entryPoints: [ENTRY_JS],
    bundle: true,
    loader: { '.js': 'jsx' },
    target: 'es2020',
    platform: 'browser',
    format: 'cjs',
    sourcemap: true,
    outfile: PATH.join(DIR_PUBLIC, 'scripts/netc-app.js'),
    plugins: [
      copy({
        resolveFrom: 'cwd',
        assets: [
          {
            from: [`app/assets/**/*`],
            to: [DIR_PUBLIC]
          },
          {
            from: [`app-config/**/*`],
            to: [PATH.join(DIR_PUBLIC, 'config')]
          },
          {
            from: [`app-data/**/*`],
            to: [PATH.join(DIR_PUBLIC, 'data')]
          },
          {
            from: [`app-htmldemos/**/*`],
            to: [PATH.join(DIR_PUBLIC, 'htmldemos')]
          }
        ],
        watch: true
      })
    ]
  });
  // done!
  if (!DBG)
    console.log(
      `${LOG.DIM}info: built @ursys web from ${_short(ENTRY_JS)}${LOG.RST}`
    );

  // enable watching
  if (DBG) LOG('watching', _short(DIR_PUBLIC));
  await context.watch();
  // The return value tells us where esbuild's local server is
  if (DBG) LOG('serving', _short(DIR_PUBLIC));
  const { host, port } = await context.serve({
    servedir: DIR_PUBLIC,
    port: APP_PORT
  });
  LOG('appserver at', `http://${host}:${port}`);
}

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** TEST **/
(async () => {
  ESBuildWebApp();
})();
