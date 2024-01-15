/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET UNIX DOMAIN SOCKET (UDS) SERVER
  This is the main host for URNET. 

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import ipc, { Socket } from '@achrinza/node-ipc';
import { PR } from '@ursys/netcreate';
import { UDS_INFO } from './urnet-constants.mts';
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
  const { uds_sysmsg } = UDS_INFO;

  // note: 'connect' doesn't provide useful data
  ipc.server.on('connect', () => {
    LOG(`${ipc.config.id} connect: connected`);
  });

  // message handler, where uds_sysmsg is the message name
  ipc.server.on(uds_sysmsg, (pktObj, socket) => {
    // have we seen this socket before? PSEUDOCODE
    if (!ipc.server.sockets[socket.id]) {
      LOG(`${ipc.config.id} new socket '${socket.id}'`);
      ipc.server.sockets[socket.id] = socket;
      // set the state of this socket to 'awaiting authentication'
      ipc.server.sockets[socket.id].auth = false;
      // send a new UADDR back that's unique to this socket
      const pkt = new NetPacket();
      const welcomeData = { hello: 'there' };
      pkt.setMsgData('UDS:CONNECT', welcomeData); // remember
      ipc.server.emit(socket, uds_sysmsg, pkt);
      return;
    }
    // if we get a packet with UDS:CLIENT_AUTHENTICATED, set the state to 'authenticated'
    if (pktObj.name === 'UDS:CLIENT_AUTHENTICATE') {
      ipc.server.sockets[socket.id].auth = true; // this would be hardened
      LOG(`${ipc.config.id} socket '${socket.id}' authenticated`);
      // return the transacation with authentication token
      // return packet
      return;
    }

    // dummy handshake to send back
    const pkt = new NetPacket();
    // pkt.setFromObject(pktObj);
    pkt.setFromJSON(JSON.stringify(pktObj));
    LOG(`${ipc.config.id} message '${uds_sysmsg}' received packet`);
    LOG.info(JSON.stringify(pktObj));
    LOG(`${ipc.config.id} returning packet on '${socket.id}'`);
    LOG.info(pkt.serialize());
    ipc.server.emit(socket, uds_sysmsg, pkt);
  });
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
