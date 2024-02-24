/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  entrypoint for server

  when making live changes, make sure that the ur builder is also running and
  users of this library are watching for changes to the ur library

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/* added for pull request #81 so 'npm run lint' test appears clean */
/* eslint-disable no-unused-vars */

import * as ADDONMGR from './ur-addon-mgr.mts';
import * as APPSERV from './appserver.mts';
import * as ENV from './env-node.mts';
import * as FILE from './files.mts';
import * as PROC from './processes.mts';
// cjs-style modules
import TEXT from '../common/util-text.js';
import PROMPTS from '../common/util-prompts.js';
// typescript classes
import UrModule from './class-urmodule.mts';
import OpSequencer from '../common/class-op-seq.ts';
import StateMgr from '../common/class-state-mgr.ts';
const { makeTerminalOut } = PROMPTS;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const CLASS = {
  OpSequencer,
  StateMgr,
  UrModule
};

/// RUNTIME API ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** first time initialization */
function Initialize(options: UR_InitOptions): void {
  const { rootDir } = options;
  ENV.SetRootPaths(rootDir);
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const { makeStyleFormatter } = PROMPTS;
export {
  // URSYS CONTROL
  Initialize,
  // MAIN MODULES
  APPSERV, // application server
  ADDONMGR, // ur module manager
  CLASS,
  ENV, // environment utilities and constants
  FILE, // file utilities
  PROC, // interprocess communication utils
  // UTILITIES
  TEXT,
  // COMMON UTILS
  makeTerminalOut as PR // prompt style formatter
};
