/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NODEJS CLIENT ENDPOINT FOR URNET

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR, FILES } from '@ursys/netcreate';
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

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function Connect() {
  /// node-ipc baseline configuration
  ipc.config.unlink = true; // unlink sock file on exit
  ipc.config.retry = 1500;
  ipc.config.maxRetries = 1;
  ipc.config.silent = true;

  await new Promise<void>((resolve, reject) => {
    const { uds_id, uds_sysmsg, sock_path } = UDS_INFO;
    /// check that UDS host is running
    if (!m_CheckForUDSHost()) {
      reject(`Connect: ${uds_id} pipe not found`); // reject promise
      return;
    }
    // if good connect to the sock file
    ipc.connectTo(uds_id, sock_path, () => {
      const client_sock = ipc.of[uds_id];
      client_sock.on('connect', () => {
        LOG(`${client_sock.id} connect: connected`);
        client_sock.emit(uds_sysmsg, 'hello');
        resolve(); // resolve promise
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
  }).catch(err => {
    LOG.error(err);
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
