/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET UNIX DOMAIN SOCKET (UDS) NODE SERVER

  This is an URNET host that is spawned as a standalone process by 
  cli-serve-control.mts.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import NET from 'node:net';
import PATH from 'node:path';
import { PR, PROC, FILE } from '@ursys/core';
import { UDS_INFO } from './urnet-constants.mts';
import CLASS_EP from './class-urnet-endpoint.ts';
import CLASS_NS from './class-urnet-socket.ts';
const { NetEndpoint } = CLASS_EP;
const { NetSocket } = CLASS_NS;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('UDSHost', 'TagBlue');
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
let UDS: NET.Server; // unix domain socket server instance
const EP = new NetEndpoint(); // server endpoint
EP.configAsServer('SRV01'); // hardcode arbitrary server address

/// HELPERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function UDS_RegisterServices() {
  EP.registerMessage('SRV:MYSERVER', data => {
    return { memo: `defined in ${m_script}.RegisterServices` };
  });
  // note that default services are also registered in Endpoint
  // configAsServer() method
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function UDS_Listen() {
  const { sock_path } = UDS_INFO;

  UDS = NET.createServer(client_link => {
    // socket housekeeping
    const send = pkt => client_link.write(pkt.serialize());
    const onData = data => {
      const returnPkt = EP._clientDataIngest(data, socket);
      if (returnPkt) client_link.write(returnPkt.serialize());
    };
    const socket = new NetSocket(client_link, { send, onData });
    if (EP.isNewSocket(socket)) {
      EP.addClient(socket);
      const uaddr = socket.uaddr;
      LOG(`${uaddr} client connected`);
    }
    // handle incoming data and return on wire
    client_link.on('data', onData);
    client_link.on('end', () => {
      const uaddr = EP.removeClient(socket);
      LOG(`${uaddr} client disconnected`);
    });
    client_link.on('error', err => {
      LOG.error(`.. socket error: ${err}`);
    });
  });

  UDS.listen(sock_path, () => {
    const shortPath = PATH.relative(process.cwd(), sock_path);
    LOG.info(`UDS Server listening on '${shortPath}'`);
  });
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Start() {
  UDS_RegisterServices();
  UDS_Listen();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Stop() {
  return new Promise<void>(resolve => {
    const { sock_path } = UDS_INFO;
    const shortPath = FILE.ShortPath(sock_path);
    LOG.info(`.. stopping UDS Server on ${shortPath}`);
    // request end all socket connections
    EP.srv_socks.forEach(sock => sock.connector.end());
    if (FILE.UnlinkFile(sock_path)) LOG.info(`.. unlinked ${shortPath}`);
    const _checker = setInterval(() => {
      // check if EP.srv_socks map is empty
      if (EP.srv_socks.size === 0) {
        clearInterval(_checker);
        process.exit(0); // force exit...
        return;
      }
      const clients = Array.from(EP.srv_socks.values());
      if (
        clients.every(client => {
          const test = client.connector.destroyed;
          if (!test) LOG(`client ${client.uaddr} still active`);
          return test;
        })
      ) {
        clearInterval(_checker);
        resolve();
      }
    }, 1000);
  });
}

/// RUNTIME INITIALIZE ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Start();
