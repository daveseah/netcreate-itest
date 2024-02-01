/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  mini app demo

  this runs when running the 'ur midi' command.
  It launches an esbuild process to build the midi app bundle,
  which is loaded by the index-midi.html file in the assets directory.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR, FILES } from '@ursys/core';
import FSE from 'fs-extra';
import { copy } from 'esbuild-plugin-copy';
import esbuild from 'esbuild';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('MIDI', 'TagPurple');

/// BUILD FILES ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function ESBuildApp() {
  const SRC = FILES.AbsLocalPath('_ur_addons/midi');
  const DST = FILES.AbsLocalPath('_ur_addons/_dist/_public');
  FSE.ensureDir(DST);

  // build the webapp and stuff it into public
  const context = await esbuild.context({
    entryPoints: [`${SRC}/midi-init.ts`],
    bundle: true,
    loader: { '.js': 'jsx' },
    target: 'es2020',
    platform: 'browser',
    format: 'iife',
    sourcemap: true,
    outfile: `${DST}/scripts/midi-bundle.js`,
    plugins: [
      copy({
        resolveFrom: 'cwd',
        assets: [
          {
            from: [`assets/**/*`],
            to: [DST]
          }
        ],
        watch: true
      })
    ]
  });
  await context.watch();
  // The return value tells us where esbuild's local server is
  let { host, port } = await context.serve({
    servedir: DST,
    port: 8888
  });
  if (host === '0.0.0.0') host = 'localhost';
  LOG('appserver is listening at', `http://${host}:${port}`);
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG('mini app demo using esbuild, html5');
await ESBuildApp();
LOG.info('control-c to exit');
