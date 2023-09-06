#!/usr/bin/env node
/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URSYNK RUNNER

  URSYNK is the name of the set of communication tools Sri is making to
  support modular asynchronous communication frameworks, based on 
  previous URSYS and UNISYS versions.

  WIP

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

const APPSERV = require('./_ur/_sys/appserver');
const IPC = require('./_ur/_sys/ipc');
const FILES = require('./_ur/_sys/files');
const { UR_Fork } = require('./_ur/_sys/ur-proc');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = require('./_ur/_sys/prompts').makeTerminalOut('UR', 'TagBlue');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;

/// PROTOTYPE BUILD ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// utilities
const { join } = require('path');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ROOT = __dirname;
const PUBDIR = join(__dirname, './public-es');
const SRCDIR = join(__dirname, './app');
const APP_PORT = 3000;
const ENTRY_JS = join(SRCDIR, 'init.jsx');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function _short(path) {
  if (path.startsWith(ROOT)) return path.slice(ROOT.length);
  return path;
}
/// PARCEL API ////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const { Parcel } = require('@parcel/core');
const { fileURLToPath } = require('url');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function ParcelBuildWebApp() {
  let bundler = new Parcel({
    entries: 'app/init.jsx',
    defaultConfig: '@parcel/config-default',
    mode: 'development',
    defaultTargetOptions: {
      distDir: 'public-parcel'
    }
  });
  try {
    let { bundleGraph, buildTime } = await bundler.run();
    let bundles = bundleGraph.getBundles();
    console.log(`✨ Built ${bundles.length} bundles in ${buildTime}ms!`);
  } catch (err) {
    console.log(err.diagnostics);
  }
}

/// ESBUILD API ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const esbuild = require('esbuild');
const { copy } = require('esbuild-plugin-copy');
async function ESBuildWebApp() {
  // make sure PUBDIR exists
  if (DBG) LOG('clearing', _short(PUBDIR));
  FILES.RemoveDir(PUBDIR);
  FILES.EnsureDir(PUBDIR);

  if (DBG) LOG('building webapp...');
  // build the webapp and stuff it into public
  const context = await esbuild.context({
    entryPoints: [ENTRY_JS],
    format: 'cjs',
    bundle: true,
    loader: { '.js': 'jsx' },
    target: 'es2020',
    platform: 'browser',
    sourcemap: true,
    packages: 'external',
    outfile: join(PUBDIR, 'scripts/netc-app.js'),
    plugins: [
      copy({
        resolveFrom: 'cwd',
        assets: [
          {
            from: [`${SRCDIR}/assets/**/*`],
            to: [PUBDIR]
          },
          {
            from: [`app-config/**/*`],
            to: [join(PUBDIR, 'config')]
          },
          {
            from: [`app-data/**/*`],
            to: [join(PUBDIR, 'data')]
          },
          {
            from: [`app-htmldemos/**/*`],
            to: [join(PUBDIR, 'htmldemos')]
          }
        ],
        watch: true
      })
    ]
  });
  // enable watching
  if (DBG) LOG('watching', _short(PUBDIR));
  await context.watch();
  // The return value tells us where esbuild's local server is
  if (DBG) LOG('serving', _short(PUBDIR));
  const { host, port } = await context.serve({
    servedir: PUBDIR,
    port: APP_PORT
  });
  LOG('appserver at', `http://${host}:${port}`);
}

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** TEST **/
(async () => {
  LOG('ur parent process started');
  // const proc_graph = await UR_Fork('graph');
  // const proc_parse = await UR_Fork('parse', { input: proc_graph });
  await ESBuildWebApp();
  // await ParcelBuildWebApp();
  LOG('parent process ended');
})();
