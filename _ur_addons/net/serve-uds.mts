/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET UNIX DOMAIN SOCKET (UDS) SERVER

  This is an URNET host that is spawned as a standalone process by 
  cli-serve-control.mts.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import ipc, { Socket } from '@achrinza/node-ipc';
import { PR } from '@ursys/netcreate';
import { UDS_INFO } from './urnet-constants.mts';
import CLASS_EP from './class-urnet-endpoint.ts';
const Endpoint = CLASS_EP.default;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('UDSHost', 'TagBlue');

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
//
const EP = new Endpoint();
EP.configAsServer('SRV01');

/// HELPERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_ConfigureServer() {
  const { uds_sysmsg } = UDS_INFO;

  // note: 'connect' doesn't provide useful data
  ipc.server.on('connect', () => {
    LOG(`${ipc.config.id} connect: connected`);
  });
  // configure node-ipc incoming connection server
  ipc.server.on(uds_sysmsg, (data, socket) => {
    // first time we're seeing this socket? save it
    if (EP.isNewSocket(socket)) {
      const uaddr = EP.addClient(socket);
      LOG('.. new client socket', uaddr);
    }
    // now handle the message
    const pkt = EP.newPacket().deserialize(data);
    EP.pktReceive(pkt);
  });
  // client socket disconnected
  ipc.server.on('socket.disconnected', (socket, destroyedSocketID) => {
    const uaddr = EP.removeClient(socket);
    LOG('.. client socket disconnected', uaddr, destroyedSocketID);
  });

  // after this is connected, it's assumed that the f_wire_in
  // is smart enough to handle the handshake connection, which
  // is independent of the transport layer
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Start() {
  // Start Unix Domain Socket Server
  const { uds_id, sock_path } = UDS_INFO;
  ipc.config.id = uds_id;
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
