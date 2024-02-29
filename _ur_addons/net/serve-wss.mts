/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET WEB SOCKET (WSS) NODE SERVER

  This is an URNET host spawned as a standalone process by
  cli-serve-control.mts.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { WebSocketServer } from 'ws';
import { PR, PROC } from '@ursys/core';
import CLASS_EP from './class-urnet-endpoint.ts';
import CLASS_NS from './class-urnet-socket.ts';
const { NetEndpoint } = CLASS_EP;
const { NetSocket } = CLASS_NS;
import { WSS_INFO } from './urnet-constants.mts';

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
let WSS: WebSocketServer; // websocket client_link instance
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const EP = new NetEndpoint(); // client_link endpoint
EP.configAsServer('SRV02'); // hardcode arbitrary client_link address

/// HELPERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function WSS_RegisterServices() {
  EP.registerMessage('SRV:MYSERVER', data => {
    return { memo: `defined in ${m_script}.RegisterServices` };
  });
  // note that default services are also registered in Endpoint
  // configAsServer() method
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function WSS_Listen() {
  const { wss_port, wss_host, wss_url } = WSS_INFO;
  const options = { port: wss_port, host: wss_host, clientTracking: true };
  WSS = new WebSocketServer(options, () => {
    LOG.info(`WSS Server listening on '${wss_url}'`);
    WSS.on('connection', (client_link, request) => {
      const send = pkt => client_link.send(pkt.serialize());
      const onData = data => {
        const returnPkt = EP._clientDataIngest(data, client_sock);
        if (returnPkt) client_link.send(returnPkt.serialize());
      };
      const client_sock = new NetSocket(client_link, { send, onData });
      if (EP.isNewSocket(client_sock)) {
        EP.addClient(client_sock);
        const uaddr = client_sock.uaddr;
        LOG(`${uaddr} client connected`);
      }
      // handle incoming data and return on wire
      client_link.on('message', onData);
      client_link.on('end', () => {
        const uaddr = EP.removeClient(client_sock);
        LOG(`${uaddr} client disconnected`);
      });
      client_link.on('close', () => {
        const { uaddr } = client_sock;
        LOG(`${uaddr} client disconnected`);
      });
      client_link.on('error', err => {
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
    const { wss_url } = WSS_INFO;
    LOG.info(`.. stopping WSS Server on ${wss_url}`);
    WSS.clients.forEach(client => client.close());
    WSS.close();
    const _checker = setInterval(() => {
      if (typeof WSS.clients.every !== 'function') {
        clearInterval(_checker);
        process.exit(0); // force exit...
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
