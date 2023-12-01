/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET UNIX DOMAIN SOCKET (UDS) SERVER

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { LOG } from '@ursys/netcreate';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let m_uaddr_counter = 0;

/// PERSISTENT SERVICES ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// SUPPORT FUNCTIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_GetNewUADDR() {
  ++m_uaddr_counter;
  let cstr = m_uaddr_counter.toString(10).padStart(2, '0');
  return `UADDR_${cstr}_UDS`;
}

/// PERSISTENT SERVICES ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// SUPPORT FUNCTIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketAdd(socket) {
  let new_uaddr = m_GetNewUADDR();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketDelete(socket) {
  let { uaddr } = socket;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketConnectionAck(socket) {
  let data = {
    UADDR: socket.UADDR
  };
  socket.send(JSON.stringify(data));
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
  LOG(`starting UDS server for URNET`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Stop() {
  // process all pending transactions
  // delete all registered messages
  // delete all uaddr sockets
  LOG(`stopping UDS server for URNET`);
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { Start, Stop };
