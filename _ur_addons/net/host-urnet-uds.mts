/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET UNIX DOMAIN SOCKET (UDS) SERVER
  This is the main host for URNET. 

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import ipc, { Socket } from '@achrinza/node-ipc';
import { PR, FILES, PROC } from '@ursys/netcreate';
import { UDS_PATH, UDS_ROOT, UDS_SERVER_ID } from './urnet-constants.mts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('UDS', 'TagBlue');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let m_urds_counter = 0; // counter for generating unique addresses

/// PROCESS SIGNAL HANDLING ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
process.on('SIGTERM', () => {
  (async () => {
    // LOG(`SIGTERM received ${process.pid}`);
    await Stop();
  })();
});
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
process.on('SIGINT', () => {
  (async () => {
    // LOG(`SIGINT received ${process.pid}`);
    await Stop();
  })();
});

/// DATA INIT /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let URDS = new Map<string, Socket>(); // unix domain socket address dictionary
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// node-ipc baseline configuration
ipc.config.retry = 1500;
ipc.config.silent = true;
ipc.config.unlink = true; // unlink socket file on exit
ipc.config.socketRoot = UDS_ROOT;

/// SUPPORT FUNCTIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Return new URDS ID. An URDS is the UDS version of a UADDR */
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
  // Start Unix Domain Socket Server
  ipc.config.id = UDS_SERVER_ID;
  ipc.serve(UDS_PATH, () => {
    LOG(`.. UDS Server listening on '${ipc.server.path}'`);

    ipc.server.on('urnet', (data, socket) => {
      LOG('Received on UDS:', data);
      ipc.server.emit(socket, 'urnet', 'Reply from UDS server');
    });

    ipc.server.on('connect', () => {
      LOG('Client connected');
    });

    ipc.server.on('disconnect', () => {
      LOG('Client disconnected1:');
    });
    ipc.server.on('socket.disconnect', (socket, destroydId) => {
      LOG('Client disconnected2:', socket.id, destroydId);
    });
  });
  ipc.server.start();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function Stop() {
  LOG(`.. stopping UDS Server on ${ipc.server.path}`);
  await ipc.server.stop(); // should also unlink socket file automatically
  // process all pending transactions
  // delete all registered messages
  // delete all uaddr sockets
}

/// RUNTIME INITIALIZE ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Start();
