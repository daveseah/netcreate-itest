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
import * as SERVER_EP from './urnet-node.mts';
// cjs-style modules
import TEXT from '../common/util-text.ts';
import * as PROMPTS from '../common/util-prompts.ts';
// typescript classes
import UrModule from './class-urmodule.mts';
import OpSequencer from '../common/class-op-seq.ts';
import StateMgr from '../common/class-state-mgr.ts';
import NetSocket from '../common/class-urnet-socket.ts';
import NetEndpoint from '../common/class-urnet-endpoint.ts';
import NetPacket from '../common/class-urnet-packet.ts';
// typescript library modules
import * as UID from '../common/lib-uid.ts';
import * as CONSTANTS from './constants-urnet.mts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const { makeTerminalOut } = PROMPTS;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const CLASS = {
  OpSequencer,
  StateMgr,
  UrModule,
  NetSocket,
  NetEndpoint,
  NetPacket
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LIB = {
  UID
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const { UDS_INFO, WSS_INFO, HTTP_INFO } = CONSTANTS;
const { ESBUILD_INFO } = CONSTANTS;
const CONSTANT = {
  URNET: {
    UDS_INFO,
    WSS_INFO,
    HTTP_INFO
  },
  BUILD: {
    ESBUILD_INFO
  }
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
export {
  // ursys control
  Initialize,
  // common typescript classes, libraries
  CONSTANT,
  CLASS,
  LIB,
  // basic server modules
  ENV,
  FILE,
  PROC,
  TEXT,
  // URNET server modules
  SERVER_EP, // urnet endpoint for server
  // server-based services
  APPSERV, // application server
  ADDONMGR, // ur module manager
  // formatting
  makeTerminalOut as PR // prompt style formatter
};
