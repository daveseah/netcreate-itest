/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  entrypoint for client

  when making live changes, make sure that the ur builder is also running and
  users of this library are watching for changes to the ur library

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

// note: cjs-style modules in 'common' can not be destructured on import
import PROMPTS from '../common/util-prompts.ts';
// cjs-style modules
import TEXT from '../common/util-text.js';
// typescript classes
import OpSequencer from '../common/class-op-seq.ts';
import StateMgr from '../common/class-state-mgr.ts';
import * as CLIENT_EP from './urnet-browser.ts';
import * as UID from '../common/lib-uid.ts';
import NetSocket from '../common/class-urnet-socket.ts';
import NetEndpoint from '../common/class-urnet-endpoint.ts';
import NetPacket from '../common/class-urnet-packet.ts';
import {
  HTTP_CLIENT_INFO,
  GetClientInfoFromWindowLocation
} from '../common/constants-urnet-web.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const { makeStyleFormatter } = PROMPTS;
const PR = makeStyleFormatter('UR', 'TagCyan');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const CLASS = {
  OpSequencer,
  StateMgr,
  NetSocket,
  NetEndpoint,
  NetPacket
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LIB = {
  UID
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const CONSTANT = {
  URNET: { ...HTTP_CLIENT_INFO, GetClientInfoFromWindowLocation }
};

/// TEST METHODS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function ClientTest(): void {
  console.log(...PR('System Integration of new URSYS module successful!'));
  // console.log(...PR('@ursys/core integration...works?'));
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  // cjs modules
  PROMPTS,
  TEXT,
  // typescript classes, libraries
  CONSTANT,
  CLASS,
  LIB,
  // services
  CLIENT_EP, // endpoint for browser
  // formatting
  makeStyleFormatter as ConsoleStyler, // style formatter for browser
  // temporary test exports
  StateMgr,
  ClientTest
};
