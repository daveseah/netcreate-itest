/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description
  client endpoint?

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR, FILES } from '@ursys/netcreate';
import {
  UDS_PATH,
  UDS_ROOT,
  UDS_CLIENT_ID,
  UDS_SERVER_ID
} from './urnet-constants.mts';
import ipc, { Socket } from '@achrinza/node-ipc';
import { UR_MsgName } from './urnet-types.ts';
import CLASS_NP from './class-urnet-packet.ts';
const NetPacket = CLASS_NP.default;

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
function m_CheckForUDSHost() {
  const pipeFile = `${UDS_ROOT}/${UDS_PATH}`;
  UDS_DETECTED = FILES.FileExists(pipeFile);
  return UDS_DETECTED;
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Connect() {
  /// node-ipc baseline configuration
  ipc.config.socketRoot = UDS_ROOT;
  ipc.config.unlink = true; // unlink socket file on exit
  ipc.config.retry = 1500;
  ipc.config.maxRetries = 1;
  ipc.config.silent = true;
  await new Promise<void>((resolve, reject) => {
    /// check that UDS host is running
    if (!m_CheckForUDSHost()) {
      reject(`Connect: URNET host pipe not detected`);
    } else {
      // Connect to the socket file
      ipc.connectTo('client', UDS_PATH, () => {
        // Handle connection events
        const client = ipc.of['client'];
        client.on('urnet', data => {
          LOG(`on_urnet: received '${data}'`);
        });
        client.on('connect', () => {
          LOG(`on_connect: connected to ${client.path}`);
          IS_CONNECTED = true;
          resolve();
        });
        client.on('disconnected', () => {
          LOG(`on_disconnect: disconnected`);
          IS_CONNECTED = false;
        });
        client.on('socket.disconnected', (socket, destroyedId) => {
          LOG(`${destroyedId} socket.disconnected!`);
          IS_CONNECTED = false;
        });
      });
    }
  }).catch(err => {
    LOG.error(err);
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Disconnect() {
  await new Promise((resolve, reject) => {
    if (!IS_CONNECTED) {
      reject(`Disconnect: was not connected to URNET host`);
    } else {
      ipc.disconnect('client');
      IS_CONNECTED = false;
      m_Sleep(1000, resolve);
    }
  }).catch(err => {
    LOG.error(err);
  });
}

/// URSYS MESSAGE API /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Send(message: UR_MsgName, data: any) {
  if (IS_CONNECTED) {
    //
    const pkt = new NetPacket();
    pkt.setMsgData(message, data);
    await ipc.of['client'].emit('urnet', pkt);
    //
    const id = ipc.of['client'].id;
    LOG(`${id}: sending '${data}' to URNET host`);
    await m_Sleep(1000);
    return;
  }
  LOG.error(`Send: not connected to URNET host`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Signal() {
  LOG('would signal URNET');
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Call() {
  LOG('would call URNET');
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// used by direct module import
export {
  // client interfaces (experimental wip, nonfunctional)
  X_Connect as Connect,
  X_Disconnect as Disconnect,
  X_Send as Send,
  X_Signal as Signal,
  X_Call as Call
};
