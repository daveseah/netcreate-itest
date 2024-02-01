/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET WEB SOCKET SERVER (WSS)

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { WebSocketServer, Socket } from 'ws';
import { PR } from '@ursys/core';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('WSS', 'TagBlue');
const ARGS = process.argv.slice(2);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const D_PORT = 2929;
const D_ADDR = '127.0.0.1';
const D_UADDR = 'URNET-SRV';

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
let WSS: WebSocketServer; // websocket server instance
let UADDRS = new Map<string, Socket>(); // websocket address dictionary
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const m_addon_selector = ARGS[0];
let m_uaddr_counter = 0; // counter for generating unique addresses

/// SUPPORT FUNCTIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_GetNewUADDR() {
  ++m_uaddr_counter;
  let cstr = m_uaddr_counter.toString(10).padStart(2, '0');
  return `UADDR_${cstr}`; // UR ADDRESS
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketAdd(socket) {
  let new_uaddr = m_GetNewUADDR();
  socket.UADDR = new_uaddr;
  if (UADDRS.has(new_uaddr)) throw Error(`${new_uaddr} already in use`);
  UADDRS.set(new_uaddr, socket);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SocketDelete(socket) {
  let { uaddr } = socket;
  if (uaddr === undefined) throw Error(`socket has no uaddr`);
  if (UADDRS.has(uaddr)) UADDRS.delete(uaddr);
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
  LOG(`-> socket ${socket.UADDR} message: ${json}`);
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
  // LOG(`Starting Websocket Server on ${D_ADDR}:${D_PORT}`);
  const options = { port: D_PORT, host: D_ADDR };
  WSS = new WebSocketServer(options);
  WSS.on('listening', () => {
    LOG(`.. WebSocket Server listening on ${D_ADDR}:${D_PORT}`);
    WSS.on('connection', socket => m_OnSocketConnection(socket));
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function Stop() {
  // LOG(`Terminating Websocket Server on ${D_ADDR}:${D_PORT}...`);
  await WSS.close();
  // process all pending transactions
  // delete all registered messages
  // delete all uaddr sockets
  LOG(`.. stopping Websocket Server`);
}

/// RUNTIME INITIALIZE ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Start();
