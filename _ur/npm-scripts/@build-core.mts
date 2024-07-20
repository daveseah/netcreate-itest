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
// build-core can not use URSYS library because it's BUILDING it!
// so we yoink the routines out of the source directly
import PROMPT from '../common/util-prompts.ts';

/// CONSTANTS AND DECLARATIONS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { ROOT, DIR_UR_DIST } from './env-build.mts';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const LOG = PROMPT.makeTerminalOut('BuildCore', 'TagSystem');

/// ESBUILD API ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** build the UR libraries for server and client */
async function ESBuildLibrary() {
  // FSE.removeSync(DIR_UR_DIST); // don't do this because brunch watch will break
  FSE.ensureDir(DIR_UR_DIST);

  /** SERVER CLIENT SHARED BUILD SETTINGS **/
  const nodeBuild = {
    entryPoints: [`${ROOT}/_ur/node-server/@server.mts`],
    bundle: true,
    platform: 'node',
    target: ['node18', 'esnext'],
    logOverride: {
      'empty-import-meta': 'silent'
    },
    sourcemap: true,
    packages: 'external'
  };

  /* build the server library for nodejs */
  // @ts-ignore - build options
  await esbuild.build({
    ...nodeBuild,
    outfile: `${DIR_UR_DIST}/server-esm.mjs`,
    format: 'esm'
  });
  if (DBG) LOG('built ur-server ESM');

  // @ts-ignore - build options
  await esbuild.build({
    ...nodeBuild,
    outfile: `${DIR_UR_DIST}/server.cjs`,
    format: 'cjs'
  });
  if (DBG) LOG('built ur-server CJS');

  /** BROWSER CLIENT SHARED BUILD SETTINGS **/
  const browserBuild = {
    entryPoints: [`${ROOT}/_ur/browser-client/@client.ts`],
    bundle: true,
    platform: 'browser',
    target: ['es2018'], // brunch can't handle features beyond this date
    sourcemap: true
  };

  // @ts-ignore - build options
  await esbuild.build({
    ...browserBuild,
    outfile: `${DIR_UR_DIST}/client-esm.js`,
    format: 'esm'
  });
  if (DBG) LOG('built ur-client ESM');

  // @ts-ignore - build options
  await esbuild.build({
    ...browserBuild,
    outfile: `${DIR_UR_DIST}/client-cjs.js`,
    format: 'cjs'
  });
  if (DBG) LOG('built ur-client CJS');

  await esbuild.build({
    ...browserBuild,
    plugins: [umdWrapper()],
    outfile: `${DIR_UR_DIST}/client-umd.js`,
    // @ts-ignore - esbuild-plugin-umd-wrapper option
    format: 'umd' // esbuild-plugin-umd-wrapper
  });
  if (DBG) LOG('built ur-client UMD');

  // if !DBG just emit a simpler message
  if (!DBG) console.log(`${LOG.DIM}info: built @ursys core${LOG.RST}`);
}

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** TEST **/
(async () => {
  await ESBuildLibrary();
})();
