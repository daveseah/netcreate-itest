/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NODE CLI TOOL
  designed to run inside of non-module nodejs legacy environment like
  the prototype version of NetCreate 2.0 (2023)

  It interfaces with other modules that are written in ESM and TYPESCRIPT,
  transpiled into CJS, and imported here.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

const esbuild = require('esbuild');
const { umdWrapper } = require('esbuild-plugin-umd-wrapper');
const FSE = require('fs-extra');
// build-addons can not use URSYS library because it's built it!
// so we yoink the routines out of the source directly
const PROMPTS = require('../common/util-prompts');

/// CONSTANTS AND DECLARATIONS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const { ROOT, DIR_URADDS, DIR_URADDS_DIST } = require('./env_mods.cjs');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const LOG = PROMPTS.makeTerminalOut('BUILD-MOD', 'TagSystem');

/// ESBUILD API ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function _short(path) {
  if (path.startsWith(ROOT)) return path.slice(ROOT.length);
  return path;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** build the UR libraries for server and client */
async function ESBuildModules() {
  //
  // FSE.removeSync(DIR_UR_DIST); // don't do this because brunch watch will break
  FSE.ensureDir(DIR_URADDS_DIST);

  /** SERVER CLIENT SHARED BUILD SETTINGS **/
  const nodeBuild = {
    entryPoints: [`${DIR_URADDS}/@addons-server.mts`],
    bundle: true,
    platform: 'node',
    target: ['node18', 'esnext'],
    sourcemap: true,
    packages: 'external'
  };

  /* build the server library for nodejs */
  await esbuild.build({
    ...nodeBuild,
    outfile: `${DIR_URADDS_DIST}/addons-server-esm.mjs`,
    format: 'esm'
  });
  if (DBG) LOG('built ur_addons-server ESM');

  await esbuild.build({
    ...nodeBuild,
    outfile: `${DIR_URADDS_DIST}/addons-server.cjs`,
    format: 'cjs'
  });
  if (DBG) LOG('built ur_addons-server CJS');

  /** BROWSER CLIENT SHARED BUILD SETTINGS **/
  const browserBuild = {
    entryPoints: [`${DIR_URADDS}/@addons-client.ts`],
    bundle: true,
    platform: 'browser',
    target: ['es2018'], // brunch can't handle features beyond this date
    sourcemap: true
  };

  await esbuild.build({
    ...browserBuild,
    outfile: `${DIR_URADDS_DIST}/addons-client-esm.js`,
    format: 'esm'
  });
  if (DBG) LOG('built ur_addons-client ESM');

  await esbuild.build({
    ...browserBuild,
    outfile: `${DIR_URADDS_DIST}/addons-client-cjs.js`,
    format: 'cjs'
  });
  if (DBG) LOG('built ur_addons-client CJS');

  await esbuild.build({
    ...browserBuild,
    plugins: [umdWrapper()],
    outfile: `${DIR_URADDS_DIST}/mod-client-umd.js`,
    format: 'umd' // esbuild-plugin-umd-wrapper
  });
  if (DBG) LOG('built ur_addons-client UMD');

  // if !DBG, print simpler built message
  if (!DBG) console.log(`${LOG.DIM}info: built @ursys addons${LOG.RST}`);
}

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** TEST **/
(async () => {
  await ESBuildModules();
})();
