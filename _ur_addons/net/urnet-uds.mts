/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET UNIX DOMAIN SOCKET (UDS) SERVER

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import IPC, { Socket } from '@achrinza/node-ipc';
import { PR, FILES } from '@ursys/netcreate';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('UDS', 'TagBlue');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const UDS_PATH = 'uds_nocommit.sock'; // Name of the Unix Domain Socket file
const UDS_ROOT = FILES.LocalPath('_ur_addons/net');
const UDS_SERVER_ID = 'UR-UDS-SRV';
const UDS_CLIENT_ID = 'UR-UDS-CLI';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let m_uaddr_counter = 0;

/// PERSISTENT SERVICES ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UDS_SOCKETS = new Map<string, Socket>();
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// node-ipc baseline configuration
IPC.config.retry = 1500;
IPC.config.silent = true;
IPC.config.unlink = true;
IPC.config.socketRoot = UDS_ROOT;

/// SUPPORT FUNCTIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_GetNewUADDR() {
  ++m_uaddr_counter;
  let cstr = m_uaddr_counter.toString(10).padStart(2, '0');
  return `URDS_${cstr}`; // UR DOMAIN SOCKET
}

/// PERSISTENT SERVICES ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// SUPPORT FUNCTIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketAdd(socket) {
  let new_uaddr = m_GetNewUADDR();
  socket.UADDR = new_uaddr;
  if (UDS_SOCKETS.has(new_uaddr)) throw Error(`${new_uaddr} already in use`);
  UDS_SOCKETS.set(new_uaddr, socket);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketDelete(socket) {
  let { uaddr } = socket;
  if (uaddr === undefined) throw Error(`socket has no uaddr`);
  if (UDS_SOCKETS.has(uaddr)) UDS_SOCKETS.delete(uaddr);
  else throw Error(`${uaddr} not found`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketConnectionAck(socket) {
  let data = {
    UADDR: socket.UADDR
  };
  socket.write(JSON.stringify(data)); // UDS uses 'write' instead of send
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketMessage(socket, json) {
  if (socket.UADDR === undefined) throw Error(`socket has no uaddr`);
  LOG(`socket ${socket.UADDR} message: ${json}`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_OnSocketConnection(socket) {
  m_SocketAdd(socket);
  m_SocketConnectionAck(socket);
  socket.on('close', socket => m_SocketDelete(socket));
  socket.on('message', json => {
    m_SocketMessage(socket, json);
  });
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function StartServer() {
  LOG(`starting UDS server for URNET`);

  // StartServer Unix Domain Socket Server
  IPC.config.id = UDS_SERVER_ID;
  LOG(`starting ${UDS_SERVER_ID} on ${UDS_PATH}`);
  IPC.serve(UDS_PATH, () => {
    IPC.server.on('message', (data, socket) => {
      LOG('Received on UDS:', data);
      IPC.server.emit(socket, 'message', 'Reply from UDS server');
    });
  });
  IPC.server.start();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function StopServer() {
  LOG(`stopping ${UDS_SERVER_ID} on ${UDS_PATH}`);
  IPC.server.stop();
  // process all pending transactions
  // delete all registered messages
  // delete all uaddr sockets
}

/// UDS CLIENTS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Client connect to the UDS server example */
function X_Connect() {
  // connect to server
  IPC.config.id = UDS_CLIENT_ID;
  LOG(`connecting to ${UDS_SERVER_ID} on ${UDS_PATH}`);
  IPC.connectTo(UDS_SERVER_ID, UDS_PATH, () => {
    IPC.of[UDS_SERVER_ID].on('connect', () => {
      IPC.of[UDS_SERVER_ID].emit('message', 'hello');
    });
    IPC.of[UDS_SERVER_ID].on('message', data => {
      LOG('Received on UDS:', data);
    });
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Client disconnect from the UDS server example */
function X_Disconnect() {
  IPC.config.id = UDS_CLIENT_ID;
  LOG(`disconnecting ${UDS_CLIENT_ID} from ${UDS_PATH}`);
  IPC.disconnect(UDS_SERVER_ID);
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  StartServer, // start the UDS server
  StopServer, // stop the UDS server
  X_Connect, // client connect to server
  X_Disconnect // client disconnect from server
};
