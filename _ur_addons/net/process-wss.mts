/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET WEB SOCKET SERVER (WSS)

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import PATH from 'node:path';
import WS from 'ws';
import { PR } from '@ursys/netcreate';
import * as KV from './kv-json.mts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('WSS', 'TagBlue');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const D_PORT = 2929;
const D_ADDR = '127.0.0.1';
const D_UADDR = 'URNET-SRV';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ARGS = process.argv.slice(2);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const m_addon_selector = ARGS[0];
let m_uaddr_counter = 0;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// PERSISTENT SERVICES ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let WSS: WS.WebSocketServer;
let UA_SOCKETS = new Map<string, WS.Socket>();

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
  WSS = new WS.WebSocketServer(options);
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

/// TESTING ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function TestProcessManager() {
  const pid = process.pid.toString();
  const filename = PATH.join(process.cwd(), 'pid_keyv_nocommit.json');
  await KV.InitKeyStore(filename);
  await KV.SaveKey(pid, m_addon_selector);
  const entries = await KV.GetEntries();
  LOG(JSON.stringify(entries));
  LOG(`PIDLIST`);
  entries.forEach(async e => {
    LOG(`.. pid:${e.key} = ${e.value}`);
  });
  LOG(`REMOVING PID`);
  const addonName = await KV.DeleteKey(pid);
  LOG(`.. removed pic:${pid} ${addonName}`);
}

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG(`${process.pid.toString()} starting URNET WSS`);
// Start();
// TestProcessManager();
LOG(`${process.pid.toString()} exiting URNET WSS`);

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { Start, Stop, TestProcessManager };
