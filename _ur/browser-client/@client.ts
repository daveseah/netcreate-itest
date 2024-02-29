/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  entrypoint for client

  when making live changes, make sure that the ur builder is also running and
  users of this library are watching for changes to the ur library

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

// note: cjs-style modules in 'common' can not be destructured on import
import PROMPTS from '../common/util-prompts.js';
const { makeStyleFormatter } = PROMPTS;
// cjs-style modules
import TEXT from '../common/util-text.js';
// typescript classes
import OpSequencer from '../common/class-op-seq.ts';
import StateMgr from '../common/class-state-mgr.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PR = makeStyleFormatter('UR', 'TagCyan');
const CLASS = {
  OpSequencer,
  StateMgr
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
  // classes
  TEXT,
  CLASS,
  PROMPTS,
  StateMgr,
  // formatting
  makeStyleFormatter as ConsoleStyler, // style formatter for browser
  // test
  ClientTest
};
