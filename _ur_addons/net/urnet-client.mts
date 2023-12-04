/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description
  client endpoint?

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR } from '@ursys/netcreate';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('NETCLI', 'TagBlue');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const UDS_SERVER_ID = 'UR-UDS-SRV'; // node-ipc server identifier
const UDS_CLIENT_ID = 'UR-UDS-CLI'; // node-ipc client identifier

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Connect() {
  LOG('would connect to URNET');
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Disconnect() {
  LOG('would disconnect from URNET');
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Send() {
  LOG('would send to URNET');
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Signal() {
  LOG('would signal URNET');
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Call() {
  LOG('would call URNET');
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// used by direct module import
export {
  // client interfaces (experimental wip, nonfunctional)
  X_Connect as Connect,
  X_Disconnect as Disconnect,
  X_Send as Send,
  X_Signal as Signal,
  X_Call as Call
};
