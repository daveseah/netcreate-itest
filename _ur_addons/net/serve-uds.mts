/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET UNIX DOMAIN SOCKET (UDS) SERVER

  This is an URNET host that is spawned as a standalone process by 
  cli-serve-control.mts.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import ipc, { Socket } from '@achrinza/node-ipc';
import PATH from 'node:path';
import { PR } from '@ursys/core';
import { UDS_INFO } from './urnet-constants.mts';
import CLASS_EP, { EP_Socket } from './class-urnet-endpoint.ts';
const Endpoint = CLASS_EP.default;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('UDSHost', 'TagBlue');

/// HELPERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_Sleep(ms, resolve?): Promise<void> {
  return new Promise(localResolve =>
    setTimeout(() => {
      if (typeof resolve === 'function') resolve();
      localResolve();
    }, ms)
  );
}

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
EP.configAsServer('SRV01'); // hardcode arbitrary server address

/// HELPERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_AddServerHandlers() {
  EP.registerHandler('SRV:REQ_ADDR', data => {
    LOG(`'SRV:REQ_ADDR' got`, data);
    return data;
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_Listen() {
  const { uds_sysmsg, uds_id, sock_path } = UDS_INFO;
  ipc.config.ud = uds_id;
  ipc.serve(sock_path, () => {
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
      if (pkt.msg_type === '_reg') {
        pkt.setDir('res');
        const { uaddr } = socket;
        LOG(`.. registration packet received, assigned ${uaddr}`);
        pkt.data = { uaddr };
        LOG('.. sending registration response');
        ipc.server.emit(socket, uds_sysmsg, pkt.serialize());
        return;
      }
      EP.pktReceive(pkt);
    });
    // client socket disconnected
    ipc.server.on('socket.disconnected', (socket, destroyedSocketID) => {
      const uaddr = EP.removeClient(socket);
      LOG('.. client socket disconnected', uaddr, destroyedSocketID);
    });
  });
  ipc.server.start();
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Start() {
  // Register Server Handlers
  m_AddServerHandlers();
  // Start Unix Domain Socket Server
  const { uds_id, sock_path } = UDS_INFO;
  ipc.config.id = uds_id;
  m_Listen();
  const shortPath = PATH.relative(process.cwd(), sock_path);
  LOG(`.. UDS Server listening on '${shortPath}'`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function Stop() {
  const { sock_path } = UDS_INFO;
  const shortPath = PATH.relative(process.cwd(), sock_path);
  LOG(`.. stopping UDS Server on ${shortPath}`);
  await ipc.server.stop(); // should also unlink socket file automatically
  LOG.info(`.. should process all pending transactions`);
  LOG.info(`.. should delete all registered messages`);
  LOG.info(`.. should nuke all connected sockets`);
  // disconnect all connected sockets
  const sockList = ipc.server.sockets;
  for (const sock of sockList) {
    LOG(`.. disconnecting socket ${sock.id}`);
    ipc.disconnect(sock.id);
  }
}

/// RUNTIME INITIALIZE ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Start();
