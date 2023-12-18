/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description
  client endpoint?

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR } from '@ursys/netcreate';
import { UDS_PATH, UDS_ROOT, UDS_CLIENT_ID } from './urnet-constants.mts';
import ipc, { Socket } from '@achrinza/node-ipc';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('NETCLI', 'TagBlue');

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Connect() {
  LOG('would connect to URNET');

  // Configure ipc options

  /// node-ipc baseline configuration
  ipc.config.socketRoot = UDS_ROOT;
  ipc.config.unlink = true; // unlink socket file on exit
  ipc.config.retry = 1500;
  ipc.config.maxRetries = 1;
  ipc.config.silent = true;

  // Connect to the socket file
  ipc.connectTo(UDS_CLIENT_ID, UDS_PATH, () => {
    // Handle connection events
    const client = ipc.of[UDS_CLIENT_ID];
    Object.keys(client).forEach(key => console.log(key));
    LOG('connected to', client.id, 'on', client.path);
    client.on('connect', () => {
      LOG('Connected to URNET');
    });

    client.on('disconnect', () => {
      LOG('Disconnected from URNET');
    });

    client.on('error', err => {
      LOG('Error connecting to URNET:', err);
    });
  });
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
