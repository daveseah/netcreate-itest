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
import { NP_Address, NP_Msg, NP_Data } from './urnet-types.ts';

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
let AGE_INTERVAL = 1000; // milliseconds
let AGE_MAX = 60 * 30; // 30 minutes

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NetEndpoint {
  sck_map: SocketMap; // uaddr->socket
  fwd_map: ForwardMap; // msg->UADDR[]
  hnd_map: HandlerMap; // msg->handlers[]
  uaddr_counter: number; // counter for generating unique uaddr
  sck_timer: any; // timer for checking socket age

  constructor() {
    this.sck_map = new Map();
    this.fwd_map = new Map();
    this.hnd_map = new Map();
    this.uaddr_counter = 1;
    this.sck_timer = null;

    // note that the socket aging is currently disabled
  }

  /** allocate a unique UADDR for a socket */
  allocateAddress(socket: UDS_Socket): NP_Address {
    const fn = 'allocateAddress:';
    const id = `${this.uaddr_counter++}`.padStart(3, '0');
    const uaddr = `UA${id}` as NP_Address;
    socket.UADDR = uaddr; // save uaddr to socket
    socket.AGE = 0; // reset age
    this.sck_map.set(uaddr, socket); // save socket to uaddr map
    if (DBG) LOG(fn, `socket ${uaddr} allocated`);
    return uaddr;
  }

  /** start a timer to check for dead sockets */
  enableSocketAging(activate: boolean) {
    const fn = 'enableSocketAging:';
    if (activate) {
      if (this.sck_timer) clearInterval(this.sck_timer);
      this.sck_timer = setInterval(() => {
        this.sck_map.forEach((socket, uaddr) => {
          socket.AGE += AGE_INTERVAL;
          if (socket.AGE > AGE_MAX) {
            if (DBG) LOG(fn, `socket ${uaddr} expired`);
            // put stuff here
          }
        });
      }, AGE_INTERVAL);
      return;
    }
    if (this.sck_timer) clearInterval(this.sck_timer);
    this.sck_timer = null;
    if (DBG) LOG(fn, `timer stopped`);
  }

  /** get list of messages allocated to a UADDR */
  getMessageListForAddress(uaddr: NP_Address): NP_Msg[] {
    const fn = 'getMessageListForAddress:';
    if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
    if (!this.sck_map.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
    // fwd_map is msg->set of uaddr, so iterate over all messages
    const msg_list: NP_Msg[] = [];
    this.fwd_map.forEach((addr_set, msg) => {
      if (addr_set.has(uaddr)) msg_list.push(msg);
    });
    return msg_list;
  }

  /** get list of UADDRs that a message is forwarded to */
  getAddressListForMessage(msg: NP_Msg): NP_Address[] {
    const fn = 'getAddressListForMessage:';
    if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
    // fwd_map is msg->set of uaddr, so return set of uaddr as array
    const addr_set = this.fwd_map.get(msg);
    if (!addr_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
    const addr_list = Array.from(addr_set);
    return addr_list;
  }

  /** return list of local handlers for given message */
  getLocalHandlers(msg: NP_Msg): HandlerFunc[] {
    const fn = 'getLocalHandlers:';
    if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
    const handler_set = this.hnd_map.get(msg);
    if (!handler_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
    const handler_list = Array.from(handler_set);
    return handler_list;
  }

  /** return list of remote addresses for given message */
  getRemoteAddresses(msg: NP_Msg): NP_Address[] {
    const fn = 'getRemoteAddresses:';
    if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
    const addr_set = this.fwd_map.get(msg);
    if (!addr_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
    const addr_list = Array.from(addr_set);
    return addr_list;
  }

  /** when a client connects to this endpoint, register it as a socket and
   *  allocate a UADDR for it */
  addSocket(socket: UDS_Socket): NP_Address {
    const fn = 'addSocket:';
    let uaddr = socket.UADDR;
    if (typeof uaddr === 'string' && this.sck_map.has(uaddr))
      throw new Error(`${fn} socket ${uaddr} already registered`);
    uaddr = this.allocateAddress(socket);
    if (DBG) LOG(fn, `socket ${uaddr} registered`);
    return uaddr;
  }

  /** when a client disconnects from this endpoint, delete its socket and
   *  remove all message forwarding */
  deleteSocket(sobj: NP_Address | UDS_Socket): NP_Address {
    const fn = 'deleteSocket:';
    let uaddr = typeof sobj === 'string' ? sobj : sobj.UADDR;
    if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
    if (!this.sck_map.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
    // fwd_map is msg->set of uaddr, so iterate over all messages
    const msg_list = this.getMessageListForAddress(uaddr);
    msg_list.forEach(msg => {
      const msg_set = this.fwd_map.get(msg);
      if (!msg_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
      msg_set.delete(uaddr);
    });
    // delete the socket
    this.sck_map.delete(uaddr);
    if (DBG) LOG(fn, `socket ${uaddr} deleted`);
    return uaddr;
  }

  /** register a message handler for a given message to passed uaddr */
  registerRemoteMessages(uaddr: NP_Address, msgList: NP_Msg[]) {
    const fn = 'registerRemoteMessages:';
    if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
    if (!this.sck_map.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
    msgList.forEach(msg => {
      const msg_set = this.fwd_map.get(msg);
      if (!msg_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
      msg_set.add(uaddr);
    });
  }

  /** unregister a message handler for a given message to passed uaddr */
  unregisterRemote(uaddr: NP_Address): NP_Msg[] {
    const fn = 'unregisterRemote:';
    if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
    if (!this.sck_map.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
    const removed = [];
    this.fwd_map.forEach((msg_set, msg) => {
      if (msg_set.has(uaddr)) removed.push(msg);
      msg_set.delete(uaddr);
    });
    return removed;
  }

  /** for local handlers, register a message handler for a given message */
  addMessageHandler(msg: NP_Msg, handler: HandlerFunc) {
    const fn = 'addMessageHandler:';
    if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
    if (typeof handler !== 'function') throw new Error(`${fn} invalid handler`);
    const handler_set = this.hnd_map.get(msg);
    if (!handler_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
    handler_set.add(handler);
  }

  /** for local handlers, unregister a message handler for a given message */
  removeMessageHandler(msg: NP_Msg, handler: HandlerFunc) {
    const fn = 'removeMessageHandler:';
    if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
    if (typeof handler !== 'function') throw new Error(`${fn} invalid handler`);
    const handler_set = this.hnd_map.get(msg);
    if (!handler_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
    handler_set.delete(handler);
  }

  /** given a netmessage packet, dispatch it to the appropriate handlers */
  dispatchMessage(pkt: NetPacket) {
    const fn = 'dispatchMessage:';
    const { msg } = pkt;
    // local handlers
    const local_handlers = this.getLocalHandlers(msg);
    if (local_handlers.length > 0) {
      local_handlers.forEach(handler => {
        // todo: promises here
        // has to handle transactions
        handler(pkt.data);
      });
      // otherwise, see if there were remote handlers
      const remote_addresses = this.getRemoteAddresses(msg);
      if (remote_addresses.length === 0) {
        if (DBG) LOG.error(`${fn} no remote handlers for message '${msg}'`);
        return;
      }
      remote_addresses.forEach(uaddr => {
        const clone = pkt.clone();
        const socket = this.sck_map.get(uaddr);
        if (!socket) throw new Error(`${fn} unknown uaddr ${uaddr}`);
        // todo: promises here
        // has to handle transactions as a forwarding operation
        // with caching of responses and address chains
        socket.send(clone, err => {
          LOG.error(`${fn} ${err}`);
        });
      });
    }
  }
} // end class

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NetEndpoint;
