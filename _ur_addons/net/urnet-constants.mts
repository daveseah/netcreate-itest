/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET RUNTIME CONSTANTS

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { FILE } from '@ursys/core';

/// TYPES & INTERFACES ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type TServerType = 'uds' | 'wss' | 'http';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DIR_ADDON_NET = FILE.AbsLocalPath('_ur_addons/net');
const sock_file = 'UDSHOST_nocommit.sock';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const UDS_INFO = {
  sock_file,
  sock_path: `${DIR_ADDON_NET}/${sock_file}`
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ws_host = '127.0.0.1';
const ws_port = 2929;
const ws_path = '/urnet';
const ws_url = `ws://${ws_host}:${ws_port}${ws_path}`;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const WSS_INFO = {
  ws_host,
  ws_port,
  ws_path,
  ws_url
};

/// RUNTIME CONTROL ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const SERVERS: Set<TServerType> = new Set(['uds', 'wss']);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function UseServer(serverType: TServerType) {
  return SERVERS.has(serverType);
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  DIR_ADDON_NET, // abs path to the _ur_addons/net directory
  UDS_INFO, // used for net:node unix domain socket server and client
  WSS_INFO, // used for ws websocket server and client
  //
  UseServer // check if a server type is enabled
};
