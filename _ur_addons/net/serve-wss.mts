/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET WEB SOCKET (WSS) NODE SERVER

  This is an URNET host spawned as a standalone process by
  cli-serve-control.mts.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { WebSocketServer } from 'ws';
import { PR, PROC } from '@ursys/core';
import CLASS_EP from './class-urnet-endpoint.ts';
import CLASS_NS from './class-urnet-socket.ts';
import { WSS_INFO } from './urnet-constants.mts';
const { NetEndpoint } = CLASS_EP;
const { NetSocket } = CLASS_NS;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('WSSHost', 'TagBlue');
const [m_script, m_addon, ...m_args] = PROC.DecodeAddonArgs(process.argv);

/// PROCESS SIGNAL HANDLING ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
process.on('SIGTERM', () => {
  (async () => {
    LOG(`SIGTERM received by '${m_script}' (pid ${process.pid})`);
    await Stop();
  })();
});
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
process.on('SIGINT', () => {
  (async () => {
    LOG(`SIGINT received by '${m_script}' (pid ${process.pid})`);
    await Stop();
  })();
});

/// DATA INIT /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let WSS: WebSocketServer; // websocket server instance
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const EP = new NetEndpoint(); // server endpoint
EP.configAsServer('SRV02'); // hardcode arbitrary server address

/// HELPERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function WSS_RegisterServices() {
  EP.registerMessage('SRV:MYSERVER', data => {
    return { memo: 'defined in serve-uds.UDS_RegisterServices' };
  });
  // note that default services are also registered in Endpoint
  // configAsServer() method
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function WSS_Listen() {
  const { ws_port, ws_host, ws_url } = WSS_INFO;
  const options = { port: ws_port, host: ws_host, clientTracking: true };
  WSS = new WebSocketServer(options, () => {
    LOG.info(`UDS Server listening on '${ws_url}'`);
    WSS.on('connection', (connection, request) => {
      const send = pkt => connection.send(pkt.serialize());
      const onData = data => {
        const returnPkt = EP._clientData(data, socket);
        if (returnPkt) connection.send(returnPkt.serialize());
      };
      const io = { send, onData };
      const socket = new NetSocket(connection, io);
      if (EP.isNewSocket(socket)) {
        EP.addClient(socket);
        const uaddr = socket.uaddr;
        LOG(`${uaddr} client connected`);
      }
      // handle incoming data and return on wire
      connection.on('message', onData);
      connection.on('end', () => {
        const uaddr = EP.removeClient(socket);
        LOG(`${uaddr} client disconnected`);
      });
      connection.on('close', () => {
        const { uaddr } = socket;
        LOG(`${uaddr} client disconnected`);
      });
      connection.on('error', err => {
        LOG.error(`.. socket error: ${err}`);
      });
    });
  });
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Start() {
  WSS_RegisterServices();
  WSS_Listen();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Stop() {
  return new Promise<void>(resolve => {
    const { ws_url } = WSS_INFO;
    LOG(`.. stopping WSS Server on ${ws_url}`);
    WSS.clients.forEach(client => client.close());
    WSS.close();
    const _checker = setInterval(() => {
      if (typeof WSS.clients.every !== 'function') {
        clearInterval(_checker);
        return;
      }
      if (WSS.clients.every(client => client.readyState === WebSocketServer.CLOSED)) {
        clearInterval(_checker);
        resolve();
      }
    }, 1000);
  });
}

/// RUNTIME INITIALIZE ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Start();
