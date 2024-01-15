/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET constants

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { FILES } from '@ursys/netcreate';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ADIR_NET = FILES.AbsLocalPath('_ur_addons/net');
const SOCKET_FILE = 'URNET_nocommit.sock';
const UDS_INFO = {
  ipc_id: 'URNET', // used for ipc.config.id and ipc.on('id')
  ipc_message: 'UDS.URNET', // used for ipc.server.on('UDS.URNET')
  net_dir: ADIR_NET,
  sock_file: SOCKET_FILE, // Name of the Unix Domain Socket file
  sock_path: `${ADIR_NET}/${SOCKET_FILE}` // Path to the Unix Domain Socket file
};

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  UDS_INFO // used for ipc.connectToNet
};
