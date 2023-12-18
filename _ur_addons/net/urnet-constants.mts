/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET constants

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { FILES } from '@ursys/netcreate';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const UDS_PATH = 'uds_nocommit.sock'; // Name of the Unix Domain Socket file
const UDS_ROOT = FILES.AbsLocalPath('_ur_addons/net');
const UDS_SERVER_ID = 'URDS_SRV'; // node-ipc server identifier
const UDS_CLIENT_ID = 'URDS_CLI'; // node-ipc client identifier

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  UDS_PATH, // used for ipc.connectToNet
  UDS_ROOT, // used for ipc.config.socketRoot
  UDS_CLIENT_ID, // used for ipc.config.id for clients
  UDS_SERVER_ID // used for ipc.config.id for servers
};
