/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  App Builder and Watcher

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { watch } from 'chokidar';
import fse from 'fs-extra';
import path from 'node:path';
import chokidar from 'chokidar';
import esbuild from 'esbuild';
import { copy } from 'esbuild-plugin-copy';

/// TYPE DECLARATIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type BuildOptions = {};
type WatchOptions = {};

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let SRC_JS; // javascript sources to build
let SRC_ASSETS; // asset sources
let PUBLIC; // destination for built files, copied assets

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function BuildApp(opts: BuildOptions) {
  fse.ensureDir(DST);
  // build the webapp and stuff it into public
  const context = await esbuild.context({
    entryPoints: [`${SRC}/${AO_NAME}-init.ts`],
    bundle: true,
    loader: { '.js': 'jsx' },
    target: 'es2020',
    platform: 'browser',
    format: 'iife',
    sourcemap: true,
    outfile: `${DST}/${AO_NAME}-bundle.js`,
    plugins: [
      copy({
        resolveFrom: 'cwd',
        assets: [
          {
            from: [`${HT_DOCS}/${AO_NAME}-index.html`],
            to: [`${DST}`]
          },
          {
            from: [`${HT_ASSETS}/**/*`],
            to: [`${DST}/assets`]
          },
          {
            from: [`${HT_DOCS}/css/*`],
            to: [`${DST}/css`]
          },
          {
            from: [`${HT_DOCS}/js/*`],
            to: [`${DST}/js`]
          }
        ],
        watch: true
      }),
      {
        name: 'rebuild-notify',
        setup(build) {
          build.onEnd(() => {
            const { count } = WSS.clients.size;
            if (count === undefined) return;
            EP.netSignal('NET:HOT_RELOAD_APP', { memo: 'hot reload' });
            LOG(`${DIM}'NET:HOT_RELOAD_APP' send to ${count} clients${NRM}`);
          });
        }
      }
    ]
  });
  // activate rebuild on change
  await context.watch();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Watch for changes with chokidar, rebuilding app with esbuild when a change
 *  to any source file is detected
 */
async function Watch() {
  const src_dir_glob = `${SRC}/**`;
  // Initialize watcher.
  const watcher = CHOKIDAR.watch([src_dir_glob], {
    persistent: true
  });
  watcher.on('change', async changed => {
    LOG(`${DIM}watcher: path changed ${NRM}${PATH.basename(changed)}`);
    await BuildApp();
    EP.netSignal('NET:HOT_RELOAD_APP', { memo: 'hot reload' });
  });
  LOG.info(`WEBPLAY URNET Server watching ${PATH.basename(SRC)}/**`);
  return Promise.resolve();
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  BuildApp, //
  Watch
};
