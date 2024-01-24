/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET UNIX DOMAIN SOCKET (UDS) SERVER
  This is the main host for URNET. 

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import ipc, { Socket } from '@achrinza/node-ipc';
import { PR } from '@ursys/netcreate';
import { UDS_INFO } from './urnet-constants.mts';
import CLASS_NP from './class-urnet-packet.ts';
import CLASS_EP from './class-urnet-endpoint.ts';
import URNET from './class-urnet-endpoint.ts';
const NetPacket = CLASS_NP.default;
const Endpoint = CLASS_EP.default;

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
//
const EP = new Endpoint();

/// HELPERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_ConfigureServer() {
  const { uds_sysmsg } = UDS_INFO;

  // note: 'connect' doesn't provide useful data
  ipc.server.on('connect', () => {
    LOG(`${ipc.config.id} connect: connected`);
  });

  // setup plugin functions
  const f_wire_in = (wdata, socket) => {
    const pkt = EP.newPacket();
    if (!EP.validatedSocket(socket)) return;
    pkt.setFromObject(wdata);
    EP.dispatchPacket(pkt);
  };
  const f_wire_out = pkt => {
    const { uds_sysmsg } = UDS_INFO;
    const { socket } = pkt;
    if (!EP.validatedSocket(socket)) return;
    ipc.server.emit(socket, uds_sysmsg, pkt);
  };
  EP.setWireOut(f_wire_out);
  EP.setWireIn(f_wire_in);

  // configure node-ipc incoming connection server
  ipc.server.on(uds_sysmsg, EP.dispatchPacket);

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
