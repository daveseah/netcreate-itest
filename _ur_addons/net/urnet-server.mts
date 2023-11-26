/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET SERVER

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { Server as WebSocketServer, Socket } from 'ws';
import { LOG } from '@ursys/netcreate';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const D_PORT = 2929;
const D_ADDR = '127.0.0.1';
const D_UADDR = 'URNET-SRV';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let m_uaddr_counter = 0;

/// PERSISTENT SERVICES ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let WSS: WebSocketServer;
let UA_SOCKETS = new Map<string, Socket>();

/// SUPPORT FUNCTIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_GetNewUADDR() {
  ++m_uaddr_counter;
  let cstr = m_uaddr_counter.toString(10).padStart(2, '0');
  return `UADDR_${cstr}`;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketAdd(socket) {
  let new_uaddr = m_GetNewUADDR();
  socket.UADDR = new_uaddr;
  if (UA_SOCKETS.has(new_uaddr)) throw Error(`${new_uaddr} already in use`);
  UA_SOCKETS.set(new_uaddr, socket);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketDelete(socket) {
  let { uaddr } = socket;
  if (uaddr === undefined) throw Error(`socket has no uaddr`);
  if (UA_SOCKETS.has(uaddr)) UA_SOCKETS.delete(uaddr);
  else throw Error(`${uaddr} not found`);
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
  const options = { port: D_PORT, host: D_ADDR };
  WSS = new WebSocketServer(options);
  WSS.on('listening', () => {
    LOG(`listening on ${D_ADDR}:${D_PORT}`);
    WSS.on('connection', socket => m_OnSocketConnection(socket));
  });
  LOG(`starting websocket server for URNET`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Stop() {
  // process all pending transactions
  // delete all registered messages
  // delete all uaddr sockets
  WSS.close();
  LOG(`stopping websocket server for URNET`);
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { Start, Stop };
