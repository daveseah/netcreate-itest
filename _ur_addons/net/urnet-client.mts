/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description
  client endpoint?

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR, FILES } from '@ursys/netcreate';
import { UDS_INFO } from './urnet-constants.mts';
import ipc from '@achrinza/node-ipc';
import NetEndpoint from './class-urnet-endpoint.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('NETCLI', 'TagBlue');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UDS_DETECTED = false;
let IS_CONNECTED = false;

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
/** check for UDS host socket file, meaning UDS server is running */
function m_CheckForUDSHost() {
  const { sock_path } = UDS_INFO;
  UDS_DETECTED = FILES.FileExists(sock_path);
  return UDS_DETECTED;
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function Connect() {
  /// node-ipc baseline configuration
  ipc.config.unlink = true; // unlink socket file on exit
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
    // if good connect to the socket file
    ipc.connectTo(uds_id, sock_path, () => {
      const client = ipc.of[uds_id];
      client.on('connect', () => {
        LOG(`${client.id} connect: connected`);
        IS_CONNECTED = true;
        resolve(); // resolve promise
      });

      /** replace all this
      client.on(uds_sysmsg, pktObj => m_HandleMessage(pktObj));
      **/
      client.on('disconnected', () => {
        LOG(`${client.id} disconnect: disconnected`);
        IS_CONNECTED = false;
      });

      client.on('socket.disconnected', (socket, destroyedId) => {
        let status = '';
        if (socket) status += `socket:${socket.id || 'undefined'}`;
        if (destroyedId) status += ` destroyedId:${destroyedId || 'undefined'}`;
        LOG(`${client.id} socket.disconnected: disconnected ${status}`);
        IS_CONNECTED = false;
      });
    });
  }).catch(err => {
    LOG.error(err);
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function Disconnect() {
  await new Promise((resolve, reject) => {
    if (!IS_CONNECTED) {
      reject(`Disconnect: was not connected to URNET host`);
    } else {
      const { uds_id } = UDS_INFO;
      ipc.disconnect(uds_id);
      IS_CONNECTED = false;
      m_Sleep(1000, resolve);
    }
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
