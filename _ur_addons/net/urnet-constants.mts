/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NODEJS URNET RUNTIME CONSTANTS

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { FILES } from '@ursys/core';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ADIR_NET = FILES.AbsLocalPath('_ur_addons/net');
const SOCKET_FILE = 'UDSHOST_nocommit.sock';
const UDS_INFO = {
  uds_id: 'UDSHOST-URNET', // used for ipc.config.id and ipc.on('id')
  uds_sysmsg: 'UDS.URNET', // used for ipc.server.on('UDS.URNET')
  net_dir: ADIR_NET,
  sock_file: SOCKET_FILE, // Name of the Unix Domain Socket file
  sock_path: `${ADIR_NET}/${SOCKET_FILE}` // Path to the Unix Domain Socket file
};

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  UDS_INFO // used for ipc.connectToNet
};
