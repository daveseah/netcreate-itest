/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NODE CLI TOOL
  designed to run inside of non-module nodejs legacy environment like
  the prototype version of NetCreate 2.0 (2023)

  it depends on UR library being built previously

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

const PATH = require('node:path');
const UR = require('@ursys/core');

/// CONSTANTS AND DECLARATIONS ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const APP_PORT = 3000;
const { ROOT, DIR_URADDS } = require('./env-build.cjs');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;
const LOG = console.log;

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** TEST **/
(async () => {
  LOG('## DEV TESTS');
  LOG('what keys are in imported UR?');
  LOG(Object.keys(UR));
  UR.Initialize({
    rootDir: ROOT
  });
  UR.ADDONMGR.ProcTest();
  UR.ADDONMGR.UR_Fork('parse', { cwd: DIR_URADDS });
  // there is an error somewhere that is causing
  // process.exit(0);
})();
