/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET UNIX DOMAIN SOCKET (UDS) SERVER

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
const EP = new NetEndpoint(); // server endpoint
EP.configAsServer('SRV01'); // hardcode arbitrary server address

/// HELPERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function UDS_RegisterServices() {
  EP.registerMessage('SRV:MYSERVER', data => {
    return { memo: 'defined in serve-uds.UDS_RegisterServices' };
  });
  // note that default services are also registered in Endpoint
  // configAsServer() method
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function UDS_Listen() {
  const { sock_path } = UDS_INFO;

  const server = NET.createServer(connection => {
    // socket housekeeping
    const send = pkt => connection.write(pkt.serialize());
    const onData = data => {
      const returnPkt = EP.handleClient(data, socket);
      if (returnPkt) connection.write(returnPkt.serialize());
    };
    const io = { send, onData };
    const socket = new NetSocket(connection, io);
    if (EP.isNewSocket(socket)) {
      EP.addClient(socket);
      const uaddr = socket.uaddr;
      LOG(`${uaddr} client connected`);
    }
    // handle incoming data and return on wire
    connection.on('data', onData);
    connection.on('end', () => {
      const uaddr = EP.removeClient(socket);
      LOG(`${uaddr} client disconnected`);
    });
    connection.on('error', err => {
      LOG.error(`.. socket error: ${err}`);
    });
  });
  server.listen(sock_path, () => {
    const shortPath = PATH.relative(process.cwd(), sock_path);
    LOG.info(`UDS Server listening on '${shortPath}'`);
  });
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Start() {
  // Start Unix Domain Socket Server
  UDS_RegisterServices();
  UDS_Listen();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function Stop() {
  const { sock_path } = UDS_INFO;
  const shortPath = FILE.ShortPath(sock_path);
  LOG(`.. stopping UDS Server on ${shortPath}`);
  // request end all socket connections
  EP.srv_socks.forEach(sock => sock.connector.end());
  if (FILE.UnlinkFile(sock_path)) LOG(`.. unlinked ${shortPath}`);
}

/// RUNTIME INITIALIZE ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Start();
