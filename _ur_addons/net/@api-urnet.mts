/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET standalone server (NetCreate compatible version)

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR } from '@ursys/netcreate';
import * as UDS from './urnet-uds.mts';
import * as WSS from './urnet-wss.mts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('API-URNET', 'TagCyan');
const ARGS = process.argv.slice(2);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const m_addon_selector = ARGS[0];

/// TEST FUNCTIONS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function TestUDS() {
  UDS.StartServer();
  UDS.X_Connect();
  setTimeout(() => UDS.X_Disconnect(), 5000);
  setTimeout(() => UDS.StopServer(), 6000);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function TestWSS() {
  WSS.TestProcessManager();
}

/// RUNTIME INITIALIZATION ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG('---');
LOG('@api-urnet.mts called with args:', ARGS);
TestUDS();
TestWSS();
