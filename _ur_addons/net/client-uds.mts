/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NODEJS CLIENT ENDPOINT FOR URNET

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR, FILES } from '@ursys/core';
import { UDS_INFO } from './urnet-constants.mts';
import ipc from '@achrinza/node-ipc';
import EP_DEFAULT from './class-urnet-endpoint.ts';
const NetEndpoint = EP_DEFAULT.default;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('UDSClient', 'TagBlue');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UDS_DETECTED = false;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const EP = new NetEndpoint();

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
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** check for UDS host sock file, meaning UDS server is running */
function m_CheckForUDSHost() {
  const { sock_path } = UDS_INFO;
  UDS_DETECTED = FILES.FileExists(sock_path);
  return UDS_DETECTED;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** register the connection for the first time */
function m_Register(sock: ipc.IpcClient) {
  const fn = 'm_Register';
  const { uds_sysmsg } = UDS_INFO;
  const regPkt = EP.newRegistrationPacket();
  regPkt.hop_seq.push(`NEW${Date.now()}`);
  sock.emit(uds_sysmsg, regPkt.serialize());
  LOG(`${fn} sent registration packet`);
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function Connect() {
  const fn = 'Connect';
  /// node-ipc baseline configuration
  ipc.config.unlink = true; // unlink sock file on exit
  ipc.config.retry = 1500;
  ipc.config.maxRetries = 1;
  ipc.config.silent = true;
  const { uds_id, uds_sysmsg, sock_path } = UDS_INFO;

  /// check that UDS host is running
  await new Promise<void>((resolve, reject) => {
    if (!m_CheckForUDSHost()) {
      reject(`${fn} ${uds_id} pipe not found`); // reject promise
      return;
    } else resolve();
  });

  // if good connect to the sock file
  ipc.connectTo(uds_id, sock_path, () => {
    const client_sock = ipc.of[uds_id];

    client_sock.on('connect', () => {
      LOG(`${client_sock.id} connect: connected`);
      m_Register(client_sock);
    });

    client_sock.on(uds_sysmsg, json => {
      const pkt = EP.packetFromJSON(json);
      const { msg, data } = pkt;
      LOG(`${fn} got message: ${msg} w/ data`, data);
      LOG.warn(`would finish processing`);
    });

    client_sock.on('disconnected', () => {
      LOG(`${client_sock.id} disconnect: disconnected`);
    });
    client_sock.on('sock.disconnected', (sock, destroyedId) => {
      let status = '';
      if (sock) status += `sock:${sock.id || 'undefined'}`;
      if (destroyedId) status += ` destroyedId:${destroyedId || 'undefined'}`;
      LOG(`${client_sock.id} sock.disconnected: disconnected ${status}`);
    });
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function Disconnect() {
  const { uds_id, uds_sysmsg, sock_path } = UDS_INFO;
  await new Promise((resolve, reject) => {
    try {
      ipc.disconnect(uds_id);
      resolve(true);
    } catch (err) {
      reject(err);
    }
    m_Sleep(1000, resolve);
  }).catch(err => {
    LOG.error(err);
  });
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// used by direct module import
export {
  // client interfaces (experimental wip, nonfunctional)
  Connect,
  Disconnect
};
