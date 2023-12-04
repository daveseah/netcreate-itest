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

/// RUNTIME INITIALIZE ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Start();
