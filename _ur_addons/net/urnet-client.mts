/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description
  client endpoint?

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR, FILES } from '@ursys/netcreate';
import { UDS_INFO } from './urnet-constants.mts';
import ipc, { Socket } from '@achrinza/node-ipc';
// in node, ts files are imported as commonjs with only default export availalble
import TYPECHECK from './urnet-types.ts';
import CLASS_NP from './class-urnet-packet.ts';
// destructure commonjs default exports
const NetPacket = CLASS_NP.default;
const { DecodeMessage } = TYPECHECK;
// import types
import { NP_Msg, NP_Data } from './urnet-types.ts';

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
  const { sock_path } = UDS_INFO;
  UDS_DETECTED = FILES.FileExists(sock_path);
  return UDS_DETECTED;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_DecodePacketName(name: string): {
  msg_channel: string;
  msg_name: string;
} {
  if (typeof name !== 'string') {
    LOG(`message name must be a string`);
    return;
  }
  const bits = name.split(':');
  if (bits.length > 2) {
    LOG(`too many colons in message name`);
    return;
  }
  if (bits.length < 2) {
    return {
      msg_channel: '',
      msg_name: bits[0].toUpperCase()
    };
  }
}

/// MESSAGE DISPATCHER ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: Main Message Handler
 */
function m_HandleMessage(pktObj) {
  const pkt = new NetPacket();
  pkt.setFromObject(pktObj);
  const [channel, name] = DecodeMessage(pkt.msg);
  const { data } = pkt;

  let SOURCE = '';
  if (channel === 'NET') SOURCE = 'NET';
  else if (channel === '') SOURCE = 'LOCAL';
  else {
    LOG.error(`unknown message channel ${channel}`);
    LOG.info(pkt.serialize());
    return;
  }
  LOG(`${name} is a ${SOURCE} invocation`);
  LOG.info(JSON.stringify(data));
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Connect() {
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
      client.on(uds_sysmsg, pktObj => m_HandleMessage(pktObj));
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
async function X_Send(message: NP_Msg, data: NP_Data) {
  if (IS_CONNECTED) {
    //
    const pkt = new NetPacket();
    pkt.setMeta('send');
    pkt.setMsgData(message, data);
    const { uds_id, uds_sysmsg } = UDS_INFO;
    const client = ipc.of[uds_id];
    await client.emit(uds_sysmsg, pkt);
    //
    const json = JSON.stringify(data);
    LOG(`${client.id} sending to ${uds_sysmsg}`);
    LOG.info(json);
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
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function X_Disconnect() {
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
  X_Connect as Connect,
  X_Disconnect as Disconnect,
  X_Send as Send,
  X_Signal as Signal,
  X_Call as Call
};
