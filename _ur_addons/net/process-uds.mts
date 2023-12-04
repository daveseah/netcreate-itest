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
const UDS_SERVER_ID = 'UR-UDS-SRV'; // node-ipc server identifier
const UDS_CLIENT_ID = 'UR-UDS-CLI'; // node-ipc client identifier
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let m_urds_counter = 0; // counter for generating unique addresses

/// PROCESS SIGNAL HANDLING ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
process.on('SIGTERM', () => {
  (async () => {
    await Stop();
  })();
});
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
process.on('SIGINT', () => {
  (async () => {
    await Stop();
  })();
});

/// DATA INIT /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let URDS = new Map<string, Socket>(); // unix domain socket address dictionary
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// node-ipc baseline configuration
IPC.config.retry = 1500;
IPC.config.silent = true;
IPC.config.unlink = true; // unlink socket file on exit
IPC.config.socketRoot = UDS_ROOT;

/// SUPPORT FUNCTIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_GetNewURDS() {
  ++m_urds_counter;
  let cstr = m_urds_counter.toString(10).padStart(2, '0');
  return `URDS_${cstr}`; // UR DOMAIN SOCKET
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketAdd(socket) {
  let new_uaddr = m_GetNewURDS();
  socket.UADDR = new_uaddr;
  if (URDS.has(new_uaddr)) throw Error(`${new_uaddr} already in use`);
  URDS.set(new_uaddr, socket);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketDelete(socket) {
  let { uaddr } = socket;
  if (uaddr === undefined) throw Error(`socket has no uaddr`);
  if (URDS.has(uaddr)) URDS.delete(uaddr);
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
function Start() {
  LOG(`Starting Unix Domain Socket Server on '${UDS_PATH}'`);
  // Start Unix Domain Socket Server
  IPC.config.id = UDS_SERVER_ID;
  IPC.serve(UDS_PATH, () => {
    IPC.server.on('message', (data, socket) => {
      LOG('Received on UDS:', data);
      IPC.server.emit(socket, 'message', 'Reply from UDS server');
    });
  });
  IPC.server.start();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function Stop() {
  LOG(`Terminating Unix Domain Socket Server on '${UDS_PATH}'...`);
  await IPC.server.stop(); // should also unlink socket file automatically
  // process all pending transactions
  // delete all registered messages
  // delete all uaddr sockets
  LOG(`.. stopped unix domain server`);
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

/// RUNTIME INITIALIZE ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Start();

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
