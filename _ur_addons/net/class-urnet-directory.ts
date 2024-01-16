/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  The URNET Directory is a system that manages message dictionaries and
  associated addresses of "sockets"

  This module abstracts network connection points as URNET ADDRESSES or 
  UADDRs. These are network-unique ids that are assigned to a socket-like
  object.

  Each socket connection is called an endpoint with its own unique UADDR.
  Each endpoint has a list of its own message handlers and possibly a list of
  remote UADDRs that it forwards messages to for messages it doesn't handle.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR } from '@ursys/netcreate';
import NetPacket from './class-urnet-packet.ts';

/// TYPES /////////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// COPIED FROM _ur/_types/urnet.d.ts for development purposes
type NP_Chan = 'LOCAL:' | 'NET:' | 'UDS:' | '';
type NP_Msg = `${NP_Chan}${string}`;
type NP_Type = 'msend' | 'msig' | 'mreq' | 'mres';
type NP_AuthToken = any;
type NP_Data = { [key: string]: any };
type NP_Opt = { [key: string]: any };
type NP_ID = `pkt${number}`;
type NP_ADDR = `UA${number}`; // range 001-999
type NP_Hash = `${NP_ADDR}:${NP_ID}`; // used for transaction lookups
/// notion of an endpoint that is connected to...something
type NP_Sockish = {
  UADDR: NP_ADDR; // assigned UADDR for this socket-ish object
  AGE: number; // number of seconds since this socket was used
  send: (data: any, err: (err: any) => void) => void; // send data to socket-ish
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type NP_HandlerFunc = (data: NP_Data) => Promise<NP_Data>;
type NP_HandlerSet = Set<NP_HandlerFunc>; // set(handler1, handler2, ...)
type NP_AddrSet = Set<NP_ADDR>; // ['UA001', 'UA002', ...]
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type NP_SocketMap = Map<NP_ADDR, NP_Sockish>; //
type NP_MsgDispatchMap = Map<NP_Msg, NP_HandlerSet>; // msg->handler functions
type NP_MsgForwardMap = Map<NP_Msg, NP_AddrSet>; // msg->set of uaddr

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('URNET', 'TagBlue');
const DBG = true;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const SOCK_MAP: NP_SocketMap = new Map(); // uaddr->socket
const MSG_FWD_MAP: NP_MsgForwardMap = new Map(); // msg->UADDR[]
const MSG_DIS_MAP: NP_MsgDispatchMap = new Map(); // msg->handlers[]
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UADDR_COUNTER = 0;
let AGE_TIMER = null;
let AGE_INTERVAL = 1000; // milliseconds
let AGE_MAX = 60 * 30; // 30 minutes

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** assigned a new UADDR from this host */
function m_AllocateUADDR(socket: NP_Sockish): NP_ADDR {
  const fn = 'm_AllocateUADDR:';
  const id = `${UADDR_COUNTER++}`.padStart(3, '0');
  const uaddr = `UADDR-${id}` as NP_ADDR;
  socket.UADDR = uaddr; // save uaddr to socket
  socket.AGE = 0; // reset age
  SOCK_MAP.set(uaddr, socket); // save socket to uaddr map
  MSG_FWD_MAP.set(uaddr, new Set()); // save empty set of remote messages
  if (DBG) LOG(fn, `socket ${uaddr} allocated`);
  return uaddr;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** start a timer to check for dead sockets */
function m_EnableDeadSocketCheck(activate: boolean) {
  const fn = 'm_EnableDeadSocketCheck:';
  if (activate) {
    if (AGE_TIMER) clearInterval(AGE_TIMER);
    AGE_TIMER = setInterval(() => {
      SOCK_MAP.forEach((socket, uaddr) => {
        socket.AGE += AGE_INTERVAL;
        if (socket.AGE > AGE_MAX) {
          if (DBG) LOG(fn, `socket ${uaddr} expired`);
          // put stuff here
        }
      });
    }, AGE_INTERVAL);
    return;
  }
  if (AGE_TIMER) clearInterval(AGE_TIMER);
  AGE_TIMER = null;
  if (DBG) LOG(fn, `timer stopped`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** get list of messages allocated to a UADDR */
function m_GetMessageListForAddress(uaddr: NP_ADDR): NP_Msg[] {
  const fn = 'm_GetMessageList:';
  if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
  if (!SOCK_MAP.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
  // MSG_FWD_MAP maps msg->set of uaddr, so iterate over all messages
  const msg_list: NP_Msg[] = [];
  MSG_FWD_MAP.forEach((msg_set, msg) => {
    if (msg_set.has(uaddr)) msg_list.push(msg);
  });
  return msg_list;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** get list of UADDRs that a message is forwarded to */
function m_GetAddressListForMessage(msg: NP_Msg): NP_ADDR[] {
  const fn = 'm_GetAddressListForMessage:';
  if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
  // MSG_FWD_MAP maps msg->set of uaddr, so return set of uaddr as array
  const addr_set = MSG_FWD_MAP.get(msg);
  if (!addr_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
  const addr_list = Array.from(addr_set);
  return addr_list;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return list of local handlers for given message */
function m_GetLocalHandlers(msg: NP_Msg): NP_HandlerFunc[] {
  const fn = 'm_GetLocalHandlers:';
  if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
  const handler_set = MSG_DIS_MAP.get(msg);
  if (!handler_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
  const handler_list = Array.from(handler_set);
  return handler_list;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return list of remote addresses for given message */
function m_GetRemoteAddresses(msg: NP_Msg): NP_ADDR[] {
  const fn = 'm_GetRemoteAddresses:';
  if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
  const addr_set = MSG_FWD_MAP.get(msg);
  if (!addr_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
  const addr_list = Array.from(addr_set);
  return addr_list;
}

/// API: MAIN DISPATCHER //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** main dispatcher for incoming messages or packets */
function DispatchMessage(pkt: NetPacket) {
  const fn = 'DispatchMessage:';
  const { name: msg } = pkt;
  // local handlers
  const local_handlers = m_GetLocalHandlers(msg);
  if (local_handlers.length > 0) {
    local_handlers.forEach(handler => {
      // todo: promises here
      // has to handle transactions
      handler(pkt.data);
    });
    return;
  }
  // remote handlers
  const remote_addresses = m_GetRemoteAddresses(msg);
  remote_addresses.forEach(uaddr => {
    const clone = pkt.clone();
    const socket = SOCK_MAP.get(uaddr);
    if (!socket) throw new Error(`${fn} unknown uaddr ${uaddr}`);
    // todo: promises here
    // has to handle transactions as a forwarding operation
    // with caching of responses and address chains
    socket.send(clone, err => {
      LOG.error(`${fn} ${err}`);
    });
  });
}

/// API: SOCKETS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** when a client connects to this endpoint, register it as a socket and
 *  allocate a UADDR for it.
 */
function AddSocket(socket: NP_Sockish): NP_ADDR {
  const fn = 'AddSocket:';
  let uaddr = socket.UADDR;
  if (typeof uaddr === 'string' && SOCK_MAP.has(uaddr))
    throw new Error(`${fn} socket ${uaddr} already registered`);
  uaddr = m_AllocateUADDR(socket);
  socket.UADDR = uaddr;
  if (DBG) LOG(`AddSocket: socket ${uaddr} registered`);
  return uaddr;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** when a client disconnects from this endpoint, delete its socket and
 *  remove all message forwarding.
 */
function DeleteSocket(uaddr: NP_ADDR) {
  const fn = 'DeleteSocket:';
  if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
  if (!SOCK_MAP.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
  // MSG_FWD_MAP maps msg->set of uaddr, so iterate over all messages
  const msg_list = m_GetMessageListForAddress(uaddr);
  msg_list.forEach(msg => {
    const msg_set = MSG_FWD_MAP.get(msg);
    if (!msg_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
    msg_set.delete(uaddr);
  });
  // delete the socket
  SOCK_MAP.delete(uaddr);
  if (DBG) LOG(fn, `socket ${uaddr} deleted`);
}

/// API: REMOTE HANDLERS //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// MSG_FWD_MAP is a map of msg->set of uaddr to forward
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** register a message handler for a given message to passed uaddr.
 */
function RegisterRemoteHandler(uaddr: NP_ADDR, msgList: NP_Msg[]) {
  const fn = 'RegisterRemoteHandler:';
  if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
  if (!SOCK_MAP.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
  msgList.forEach(msg => {
    const msg_set = MSG_FWD_MAP.get(msg);
    if (!msg_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
    msg_set.add(uaddr);
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** unregister a message handler for a given message to passed uaddr.
 */
function UnregisterRemoteHandler(uaddr: NP_ADDR) {
  const fn = 'UnregisterRemoteHandler:';
  if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
  if (!SOCK_MAP.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
  MSG_FWD_MAP.forEach(msg_set => {
    msg_set.delete(uaddr);
  });
}

/// API: LOCAL HANDLERS ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// MSG_DIS_MAP is a map of msg->set of handler functions for direct invocation
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** for local handlers, register a message handler for a given message. */
function RegisterHandler(msg: NP_Msg, handler: NP_HandlerFunc) {
  const fn = 'RegisterHandler:';
  if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
  if (typeof handler !== 'function') throw new Error(`${fn} invalid handler`);
  const handler_set = MSG_DIS_MAP.get(msg);
  if (!handler_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
  handler_set.add(handler);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** for local handlers, unregister a message handler for a given message. */
function UnregisterHandler(msg: NP_Msg, handler: NP_HandlerFunc) {
  const fn = 'UnregisterHandler:';
  if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
  if (typeof handler !== 'function') throw new Error(`${fn} invalid handler`);
  const handler_set = MSG_DIS_MAP.get(msg);
  if (!handler_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
  handler_set.delete(handler);
}

/// RUNTIME INIT //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
m_EnableDeadSocketCheck(true);

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  AddSocket,
  DeleteSocket,
  //
  RegisterRemoteHandler,
  UnregisterRemoteHandler,
  //
  RegisterHandler,
  UnregisterHandler,
  //
  DispatchMessage
};
