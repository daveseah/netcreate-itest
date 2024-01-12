/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET UNIX DOMAIN SOCKET (UDS) SERVER
  This is the main host for URNET. 

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import ipc, { Socket } from '@achrinza/node-ipc';
import { PR } from '@ursys/netcreate';
import { URNET_INFO } from './urnet-constants.mts';
import CLASS_NP from './class-urnet-packet.ts';
const NetPacket = CLASS_NP.default;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('UDS', 'TagBlue');

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
/// node-ipc baseline configuration
ipc.config.retry = 1500;
ipc.config.silent = true;
ipc.config.unlink = true; // unlink socket file on exit

/// HELPERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_ConfigureServer() {
  const { ipc_message } = URNET_INFO;
  ipc.server.on('connect', () => {
    LOG(`${ipc.config.id} connect: connected`);
  });
  ipc.server.on(ipc_message, (pktObj, socket) => {
    const pkt = new NetPacket();
    // pkt.setFromObject(pktObj);
    pkt.setFromJSON(JSON.stringify(pktObj));
    LOG(`${ipc.config.id} message '${ipc_message}' received packet`);
    LOG.info(JSON.stringify(pktObj));
    LOG(`${ipc.config.id} returning packet on '${socket.id}'`);
    LOG.info(pkt.serialize());
    ipc.server.emit(socket, ipc_message, pkt);
  });
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Start() {
  // Start Unix Domain Socket Server
  const { ipc_id, sock_path } = URNET_INFO;
  ipc.config.id = ipc_id;
  ipc.serve(sock_path, () => m_ConfigureServer());
  ipc.server.start();
  LOG(`.. UDS Server listening on '${ipc.server.path}'`);
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
