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
// build-lib can not use URSYS library because it's built it!
// so we yoink the routines out of the source directly
const PROMPTS = require('../common/prompts');

/// CONSTANTS AND DECLARATIONS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const { ROOT, DIR_URMODS, DIR_URMODS_DIST } = require('./env_mods.cjs');
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
  FSE.ensureDir(DIR_URMODS_DIST);

  /** SERVER CLIENT SHARED BUILD SETTINGS **/
  const nodeBuild = {
    entryPoints: [`${DIR_URMODS}/@mod-server.mts`],
    bundle: true,
    platform: 'node',
    target: ['node18', 'esnext'],
    sourcemap: true,
    packages: 'external'
  };

  /* build the server library for nodejs */
  await esbuild.build({
    ...nodeBuild,
    outfile: `${DIR_URMODS_DIST}/mod-server-esm.mjs`,
    format: 'esm'
  });
  if (DBG) LOG('built ur_mods-server ESM');

  await esbuild.build({
    ...nodeBuild,
    outfile: `${DIR_URMODS_DIST}/mod-server.cjs`,
    format: 'cjs'
  });
  if (DBG) LOG('built ur_mods-server CJS');

  /** BROWSER CLIENT SHARED BUILD SETTINGS **/
  const browserBuild = {
    entryPoints: [`${DIR_URMODS}/@mod-client.ts`],
    bundle: true,
    platform: 'browser',
    target: ['esnext'],
    sourcemap: true
  };

  await esbuild.build({
    ...browserBuild,
    outfile: `${DIR_URMODS_DIST}/mod-client-esm.js`,
    format: 'esm'
  });
  if (DBG) LOG('built ur_mods-client ESM');

  await esbuild.build({
    ...browserBuild,
    outfile: `${DIR_URMODS_DIST}/mod-client-cjs.js`,
    format: 'cjs'
  });
  if (DBG) LOG('built ur_mods-client CJS');

  await esbuild.build({
    ...browserBuild,
    plugins: [umdWrapper()],
    outfile: `${DIR_URMODS_DIST}/mod-client-umd.js`,
    format: 'umd' // esbuild-plugin-umd-wrapper
  });
  if (DBG) LOG('built ur_mods-client UMD');

  // if !DBG, print simpler built message
  if (!DBG) LOG('built @ursys modules');
}

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** TEST **/
(async () => {
  await ESBuildModules();
})();
