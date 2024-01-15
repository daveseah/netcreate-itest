/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description
  client endpoint?

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR, FILES } from '@ursys/netcreate';
import { UDS_INFO } from './urnet-constants.mts';
import ipc, { Socket } from '@achrinza/node-ipc';
import {
  UR_NetMessage,
  UR_MsgName,
  UR_MsgData,
  UR_MsgHandler
} from './urnet-types.ts';
import CLASS_NP from './class-urnet-packet.ts';
const NetPacket = CLASS_NP.default;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('NETCLI', 'TagBlue');
const LOCAL_HANDLERS = new Map<string, UR_MsgHandler[]>();

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
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_DecodePacket(pkt: UR_NetMessage): {
  msg_channel: string;
  msg_name: string;
  msg_data: UR_MsgData;
} {
  const { name, data } = pkt;
  const { msg_channel, msg_name } = m_DecodePacketName(name);
  return { msg_channel, msg_name, msg_data: data };
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_RegisterHandler(name: UR_MsgName, handler: UR_MsgHandler) {
  const { msg_channel, msg_name } = m_DecodePacketName(name);
  if (!NetPacket.ValidChannel(msg_channel)) {
    LOG(`invalid message channel ${msg_channel}`);
    return;
  }
  if (typeof handler !== 'function') {
    LOG(`message handler must be a function`);
    return;
  }
  const handlerKey = name; // only use non-channel name
  if (!LOCAL_HANDLERS.has(handlerKey)) LOCAL_HANDLERS.set(handlerKey, []);
  const handlers = LOCAL_HANDLERS.get(handlerKey);
  handlers.push(handler);
}

/// MESSAGE DISPATCHER ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: Main Message Handler
 */
function m_HandleMessage(pktObj) {
  const pkt = new NetPacket();
  pkt.setFromObject(pktObj);
  const { msg_name, msg_channel, msg_data } = m_DecodePacket(pkt);

  let SOURCE = '';
  if (msg_channel === 'NET') SOURCE = 'NET';
  else if (msg_channel === '') SOURCE = 'LOCAL';
  else {
    LOG.error(`unknown message channel ${msg_channel}`);
    LOG.info(pkt.serialize());
    return;
  }
  const handlers = LOCAL_HANDLERS.get(msg_name);

  LOG(`${msg_name} is a ${SOURCE} invocation`);

  LOG.info(JSON.stringify(msg_data));
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
    const { ipc_id, ipc_message, sock_path } = UDS_INFO;
    /// check that UDS host is running
    if (!m_CheckForUDSHost()) {
      reject(`Connect: ${ipc_id} pipe not found`); // reject promise
      return;
    }
    // if good connect to the socket file
    ipc.connectTo(ipc_id, sock_path, () => {
      const client = ipc.of[ipc_id];
      client.on('connect', () => {
        LOG(`${client.id} connect: connected`);
        IS_CONNECTED = true;
        resolve(); // resolve promise
      });
      client.on(ipc_message, pktObj => m_HandleMessage(pktObj));
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
async function X_Send(message: UR_MsgName, data: UR_MsgData) {
  if (IS_CONNECTED) {
    //
    const pkt = new NetPacket();
    pkt.initializeMeta('send');
    pkt.setMsgData(message, data);
    const { ipc_id, ipc_message } = UDS_INFO;
    const client = ipc.of[ipc_id];
    await client.emit(ipc_message, pkt);
    //
    const json = JSON.stringify(data);
    LOG(`${client.id} sending to ${ipc_message}`);
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
      const { ipc_id } = UDS_INFO;
      ipc.disconnect(ipc_id);
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
