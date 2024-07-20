/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NODE CLI TOOL
  designed to run inside of non-module nodejs legacy environment like
  the prototype version of NetCreate 2.0 (2023)

  It interfaces with other modules that are written in ESM and TYPESCRIPT,
  transpiled into CJS, and imported here.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import esbuild from 'esbuild';
import { umdWrapper } from 'esbuild-plugin-umd-wrapper';
import FSE from 'fs-extra';
import PROMPT from '../common/util-prompts.ts';

/// CONSTANTS AND DECLARATIONS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { ROOT, DIR_URADDS, DIR_URADDS_DIST } from './env_mods.mts';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const LOG = PROMPT.makeTerminalOut('BUILD-MOD', 'TagSystem');

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
  // @ts-ignore - build options
  await esbuild.build({
    ...nodeBuild,
    outfile: `${DIR_URADDS_DIST}/addons-server-esm.mjs`,
    format: 'esm'
  });
  if (DBG) LOG('built ur_addons-server ESM');

  // @ts-ignore - build options
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

  // @ts-ignore - build options
  await esbuild.build({
    ...browserBuild,
    outfile: `${DIR_URADDS_DIST}/addons-client-esm.js`,
    format: 'esm'
  });
  if (DBG) LOG('built ur_addons-client ESM');

  // @ts-ignore - build options
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
    // @ts-ignore - esbuild-plugin-umd-wrapper
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
