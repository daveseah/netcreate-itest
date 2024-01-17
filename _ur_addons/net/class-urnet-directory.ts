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
import { NP_Address, NP_Msg, NP_Data } from './urnet-types';

/// LOCAL TYPES ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** this is the socket-ish object that we use to send data to a UDS socket */
type UDS_Socket = {
  UADDR: NP_Address; // assigned UADDR for this socket-ish object
  AGE: number; // number of seconds since this socket was used
  send: (data: any, err: (err: any) => void) => void; // send data to socket-ish
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type HandlerFunc = (data: NP_Data) => Promise<NP_Data>;
type HandlerSet = Set<HandlerFunc>; // set(handler1, handler2, ...)
type AddressSet = Set<NP_Address>; // ['UA001', 'UA002', ...]
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type SocketMap = Map<NP_Address, UDS_Socket>; //
type ForwardMap = Map<NP_Msg, AddressSet>; // msg->set of uaddr
type HandlerMap = Map<NP_Msg, HandlerSet>; // msg->handler functions

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('URNET', 'TagBlue');
const DBG = true;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const SOCK_MAP: SocketMap = new Map(); // uaddr->socket
const MAP_FORWARD: ForwardMap = new Map(); // msg->UADDR[]
const MAP_HANDLER: HandlerMap = new Map(); // msg->handlers[]
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UADDR_COUNTER = 0;
let AGE_TIMER = null;
let AGE_INTERVAL = 1000; // milliseconds
let AGE_MAX = 60 * 30; // 30 minutes

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** assigned a new UADDR from this host */
function m_AllocateAddress(socket: UDS_Socket): NP_Address {
  const fn = 'm_AllocateAddress:';
  const id = `${UADDR_COUNTER++}`.padStart(3, '0');
  const uaddr = `UADDR-${id}` as NP_Address;
  socket.UADDR = uaddr; // save uaddr to socket
  socket.AGE = 0; // reset age
  SOCK_MAP.set(uaddr, socket); // save socket to uaddr map
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
function m_GetMessageListForAddress(uaddr: NP_Address): NP_Msg[] {
  const fn = 'm_GetMessageList:';
  if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
  if (!SOCK_MAP.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
  // MAP_FORWARD maps msg->set of uaddr, so iterate over all messages
  const msg_list: NP_Msg[] = [];
  MAP_FORWARD.forEach((msg_set, msg) => {
    if (msg_set.has(uaddr)) msg_list.push(msg);
  });
  return msg_list;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** get list of UADDRs that a message is forwarded to */
function m_GetAddressListForMessage(msg: NP_Msg): NP_Address[] {
  const fn = 'm_GetAddressListForMessage:';
  if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
  // MAP_FORWARD maps msg->set of uaddr, so return set of uaddr as array
  const addr_set = MAP_FORWARD.get(msg);
  if (!addr_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
  const addr_list = Array.from(addr_set);
  return addr_list;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return list of local handlers for given message */
function m_GetLocalHandlers(msg: NP_Msg): HandlerFunc[] {
  const fn = 'm_GetLocalHandlers:';
  if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
  const handler_set = MAP_HANDLER.get(msg);
  if (!handler_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
  const handler_list = Array.from(handler_set);
  return handler_list;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return list of remote addresses for given message */
function m_GetRemoteAddresses(msg: NP_Msg): NP_Address[] {
  const fn = 'm_GetRemoteAddresses:';
  if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
  const addr_set = MAP_FORWARD.get(msg);
  if (!addr_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
  const addr_list = Array.from(addr_set);
  return addr_list;
}

/// API: UPLINK TO GATEWAY /////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Become a downstream distribution endpoint for a gateway host
function X_ConnectToGateway() {
  // do stuff here
}

/// API: MAIN DISPATCHER //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** main dispatcher for incoming messages or packets */
function DispatchMessage(pkt: NetPacket) {
  const fn = 'DispatchMessage:';
  const { msg } = pkt;
  // local handlers
  const local_handlers = m_GetLocalHandlers(msg);
  if (local_handlers.length > 0) {
    local_handlers.forEach(handler => {
      // todo: promises here
      // has to handle transactions
      handler(pkt.data);
    });
    // ALWAYS return if the handlers were local
    return;
  }
  // otherwise, see if there were remote handlers
  const remote_addresses = m_GetRemoteAddresses(msg);
  if (remote_addresses.length === 0) {
    if (DBG) LOG.error(`${fn} no remote handlers for message '${msg}'`);
    return;
  }
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
function AddSocket(socket: UDS_Socket): NP_Address {
  const fn = 'AddSocket:';
  let uaddr = socket.UADDR;
  if (typeof uaddr === 'string' && SOCK_MAP.has(uaddr))
    throw new Error(`${fn} socket ${uaddr} already registered`);
  uaddr = m_AllocateAddress(socket);
  socket.UADDR = uaddr;
  if (DBG) LOG(`AddSocket: socket ${uaddr} registered`);
  return uaddr;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** when a client disconnects from this endpoint, delete its socket and
 *  remove all message forwarding.
 */
function DeleteSocket(sobj: NP_Address | UDS_Socket): NP_Address {
  const fn = 'DeleteSocket:';
  let uaddr = typeof sobj === 'string' ? sobj : sobj.UADDR;
  if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
  if (!SOCK_MAP.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
  // MAP_FORWARD maps msg->set of uaddr, so iterate over all messages
  const msg_list = m_GetMessageListForAddress(uaddr);
  msg_list.forEach(msg => {
    const msg_set = MAP_FORWARD.get(msg);
    if (!msg_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
    msg_set.delete(uaddr);
  });
  // delete the socket
  SOCK_MAP.delete(uaddr);
  if (DBG) LOG(fn, `socket ${uaddr} deleted`);
  return uaddr;
}

/// API: REMOTE HANDLERS //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// MAP_FORWARD is a map of msg->set of uaddr to forward
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** register a message handler for a given message to passed uaddr.
 */
function RegisterRemoteMessages(uaddr: NP_Address, msgList: NP_Msg[]) {
  const fn = 'RegisterRemoteMessages:';
  if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
  if (!SOCK_MAP.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
  msgList.forEach(msg => {
    const msg_set = MAP_FORWARD.get(msg);
    if (!msg_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
    msg_set.add(uaddr);
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** unregister a message handler for a given message to passed uaddr.
 */
function UnregisterRemote(uaddr: NP_Address): NP_Msg[] {
  const fn = 'UnregisterRemote:';
  if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
  if (!SOCK_MAP.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
  const removed = [];
  MAP_FORWARD.forEach((msg_set, msg) => {
    if (msg_set.has(uaddr)) removed.push(msg);
    msg_set.delete(uaddr);
  });
  return removed;
}

/// API: LOCAL HANDLERS ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// MAP_HANDLER is a map of msg->set of handler functions for direct invocation
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** for local handlers, register a message handler for a given message. */
function AddMessageHandler(msg: NP_Msg, handler: HandlerFunc) {
  const fn = 'AddMessageHandler:';
  if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
  if (typeof handler !== 'function') throw new Error(`${fn} invalid handler`);
  const handler_set = MAP_HANDLER.get(msg);
  if (!handler_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
  handler_set.add(handler);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** for local handlers, unregister a message handler for a given message. */
function RemoveMessageHandler(msg: NP_Msg, handler: HandlerFunc) {
  const fn = 'RemoveMessageHandler:';
  if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
  if (typeof handler !== 'function') throw new Error(`${fn} invalid handler`);
  const handler_set = MAP_HANDLER.get(msg);
  if (!handler_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
  handler_set.delete(handler);
}

/// RUNTIME INIT //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
m_EnableDeadSocketCheck(true);

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  AddSocket, // (socket)=>
  DeleteSocket, // (uaddr)=>void
  //
  RegisterRemoteMessages, // (uaddr, msgList)=>void
  UnregisterRemote, // (uaddr)=>void
  //
  AddMessageHandler, // (msg, handler)=>void
  RemoveMessageHandler, // (msg, handler)=>void
  //
  DispatchMessage // (pkt)=>void
};
