/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NetEndpoint implements a connection to URNET as an implementation-
  independent object. It provides the API for sending and receiving messages
  in conjunction with the NetPacket class.

  * Host: sending packets (as message originator)
  * Host: receiving packets (as message handler and router)
  * Client: sending packet (as message originator)
  * Client: receiving packets (as message returns and message handler)

  This class handles the logic for:

  * message **source** - originates a message
  * message **handler** - handles and possibly returns a message
  * message **router** - forwards messages it doesn't handle
  * message **return** - handles returning messages to originator
  
\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR } from '@ursys/netcreate';
import NetPacket from './class-urnet-packet.ts';
import { NP_Address, NP_Msg, NP_Data, NP_Hash } from './urnet-types.ts';
import { GetPacketHashString, UADDR_DIGITS } from './urnet-types.ts';
import { IsLocalMessage, IsValidAddress, GetMessageHash } from './urnet-types.ts';

/// LOCAL TYPES ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** this is the socket-ish object that we use to send data to a UDS socket */
type UDS_Socket = {
  UADDR: NP_Address; // assigned UADDR for this socket-ish object
  AUTH: string; //
  AGE: number; // number of seconds since this socket was used
  send: (data: any, err: (err: any) => void) => void; // send data to socket-ish
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** transactions store promises for resolving sent packet with return values */
type PktResolver = {
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type HandlerFunc = (data: NP_Data) => NP_Data | void;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type HandlerSet = Set<HandlerFunc>; // set(handler1, handler2, ...)
type AddressSet = Set<NP_Address>; // ['UA001', 'UA002', ...]
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type SocketMap = Map<NP_Address, UDS_Socket>; //
type ForwardMap = Map<NP_Msg, AddressSet>; // msg->set of uaddr
type HandlerMap = Map<NP_Msg, HandlerSet>; // msg->handler functions
type TransactionMap = Map<NP_Hash, PktResolver>; // hash->resolver

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('URNET', 'TagBlue');
const DBG = true;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let AGE_INTERVAL = 1000; // milliseconds
let AGE_MAX = 60 * 30; // 30 minutes

/// UTILITY FUNCTIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function u_NormalizeData(data: NP_Data): any {
  if (Array.isArray(data) && data.length == 1) return data[0];
  return data;
}

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NetEndpoint {
  sck_map: SocketMap; // uaddr->socket
  msg_fwd_map: ForwardMap; // msg->UADDR[]
  msg_hnd_map: HandlerMap; // msg->handlers[]
  transactions: TransactionMap; // hash->resolver

  client_counter: number; // counter for generating unique uaddr
  host_addr: NP_Address; // the address for this endpoint
  sck_timer: any; // timer for checking socket age
  auth_jwt: any; // jtw for authenticating socket

  constructor() {
    this.sck_map = new Map<NP_Address, UDS_Socket>();
    this.msg_fwd_map = new Map<NP_Msg, AddressSet>();
    this.msg_hnd_map = new Map<NP_Msg, HandlerSet>();
    this.transactions = new Map<NP_Hash, PktResolver>();

    this.host_addr = NetPacket.NP_GetDefaultAddress();

    this.client_counter = 1;
    this.sck_timer = null;
    this.auth_jwt = null;
    // note that the socket aging is currently disabled
  }

  /** client connection management  - - - - - - - - - - - - - - - - - - - - **/

  /** given a socket, see if it's already registered */
  validatedSocket(socket: UDS_Socket): boolean {
    const fn = 'validateSocket:';
    if (typeof socket !== 'object') throw new Error(`${fn} invalid socket`);
    if (socket.UADDR === undefined) this.addSocket(socket);
    return this.authorizedSocket(socket);
  }

  /** return true if this socket passes authentication status */
  authorizedSocket(socket: UDS_Socket): boolean {
    const fn = 'authorizedSocket:';
    LOG.warn(fn, 'would check JWT in socket.AUTH');
    if (!socket.AUTH) return false;
    return true;
  }

  /** when a client connects to this endpoint, register it as a socket and
   *  allocate a UADDR for it */
  addSocket(socket: UDS_Socket): NP_Address {
    const fn = 'addSocket:';
    let uaddr = socket.UADDR;
    if (typeof uaddr === 'string' && this.sck_map.has(uaddr))
      throw new Error(`${fn} socket ${uaddr} already registered`);
    //
    const id = `${this.client_counter++}`.padStart(UADDR_DIGITS, '0');
    socket.UADDR = `UA${id}` as NP_Address;
    socket.AGE = 0; // reset age
    socket.AUTH = undefined;
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
    // msg_fwd_map is msg->set of uaddr, so iterate over all messages
    const msg_list = this.getMessageListForAddress(uaddr);
    msg_list.forEach(msg => {
      const msg_set = this.msg_fwd_map.get(msg);
      if (!msg_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
      msg_set.delete(uaddr);
    });
    // delete the socket
    this.sck_map.delete(uaddr);
    if (DBG) LOG(fn, `socket ${uaddr} deleted`);
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

  /** message & address management - - - - - - - - - - - - - - - - - - - - -**/

  /** get list of messages allocated to a UADDR */
  getMessageListForAddress(uaddr: NP_Address): NP_Msg[] {
    const fn = 'getMessageListForAddress:';
    if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
    if (!this.sck_map.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
    // msg_fwd_map is msg->set of uaddr, so iterate over all messages
    const msg_list: NP_Msg[] = [];
    this.msg_fwd_map.forEach((addr_set, msg) => {
      if (addr_set.has(uaddr)) msg_list.push(msg);
    });
    return msg_list;
  }

  /** get list of UADDRs that a message is forwarded to */
  getAddressListForMessage(msg: NP_Msg): NP_Address[] {
    const fn = 'getAddressListForMessage:';
    if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
    // msg_fwd_map is msg->set of uaddr, so return set of uaddr as array
    const addr_set = this.msg_fwd_map.get(msg);
    if (!addr_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
    const addr_list = Array.from(addr_set);
    return addr_list;
  }

  /** return list of local handlers for given message */
  getLocalHandlers(msg: NP_Msg): HandlerFunc[] {
    const fn = 'getLocalHandlers:';
    if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
    const key = GetMessageHash(msg);
    if (!this.msg_hnd_map.has(key)) this.msg_hnd_map.set(key, new Set<HandlerFunc>());
    const handler_set = this.msg_hnd_map.get(key);
    if (!handler_set) throw new Error(`${fn} unexpected empty set '${key}'`);
    const handler_list = Array.from(handler_set);
    return handler_list;
  }

  /** return list of remote addresses for given message */
  getRemoteAddresses(msg: NP_Msg): NP_Address[] {
    const fn = 'getRemoteAddresses:';
    if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
    const key = GetMessageHash(msg);
    if (!this.msg_fwd_map.has(key)) this.msg_fwd_map.set(key, new Set<NP_Address>());
    const addr_set = this.msg_fwd_map.get(key);
    if (!addr_set) throw new Error(`${fn} unexpected empty set '${msg}'`);
    const addr_list = Array.from(addr_set);
    return addr_list;
  }

  /** register a message handler for a given message to passed uaddr */
  registerRemoteMessages(uaddr: NP_Address, msgList: NP_Msg[]) {
    const fn = 'registerRemoteMessages:';
    if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
    if (!this.sck_map.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
    msgList.forEach(msg => {
      if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
      if (msg !== msg.toUpperCase()) throw new Error(`${fn} msg must be uppercase`);
      const key = GetMessageHash(msg);
      if (!this.msg_fwd_map.has(key))
        this.msg_fwd_map.set(key, new Set<NP_Address>());
      const msg_set = this.msg_fwd_map.get(key);
      msg_set.add(uaddr);
    });
  }

  /** unregister a message handler for a given message to passed uaddr */
  removeRemote(uaddr: NP_Address): NP_Msg[] {
    const fn = 'removeRemote:';
    if (typeof uaddr !== 'string') throw new Error(`${fn} invalid uaddr`);
    if (!this.sck_map.has(uaddr)) throw new Error(`${fn} unknown uaddr ${uaddr}`);
    const removed = [];
    this.msg_fwd_map.forEach((msg_set, key) => {
      if (msg_set.has(uaddr)) removed.push(key);
      msg_set.delete(uaddr);
    });
    return removed;
  }

  /** for local handlers, register a message handler for a given message */
  registerHandler(msg: NP_Msg, handler: HandlerFunc) {
    const fn = 'registerHandler:';
    if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
    if (msg !== msg.toUpperCase()) throw new Error(`${fn} msg must be uppercase`);
    if (typeof handler !== 'function') throw new Error(`${fn} invalid handler`);
    const key = GetMessageHash(msg);
    if (!this.msg_hnd_map.has(key)) this.msg_hnd_map.set(key, new Set<HandlerFunc>());
    const handler_set = this.msg_hnd_map.get(key);
    handler_set.add(handler);
  }

  /** for local handlers, unregister a message handler for a given message */
  removeHandler(msg: NP_Msg, handler: HandlerFunc) {
    const fn = 'removeHandler:';
    if (typeof msg !== 'string') throw new Error(`${fn} invalid msg`);
    if (typeof handler !== 'function') throw new Error(`${fn} invalid handler`);
    const key = GetMessageHash(msg);
    const handler_set = this.msg_hnd_map.get(key);
    if (!handler_set) throw new Error(`${fn} unexpected empty set '${key}'`);
    handler_set.delete(handler);
  }

  /** message invocation - - - - - - - - - - - - - - - - - - - - - - - - - -**/

  /** call local message */
  async call(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    if (!IsLocalMessage(msg)) return await this._netCall(msg, data);
    const handlers = this.getLocalHandlers(msg);
    const promises = [];
    handlers.forEach(handler => {
      promises.push(
        new Promise((resolve, reject) => {
          try {
            resolve(handler({ ...data })); // copy of data
          } catch (err) {
            reject(err);
          }
        })
      );
    });
    const resData = await Promise.all(promises);
    return resData;
  }

  /** send local message, returning immediately */
  async send(msg: NP_Msg, data: NP_Data): Promise<void> {
    if (!IsLocalMessage(msg)) return await this._netSend(msg, data);
    const handlers = this.getLocalHandlers(msg);
    handlers.forEach(handler => {
      handler({ ...data }); // copy of data
    });
    return Promise.resolve();
  }

  /** signal local message, returning immediately. in the local context,
   *  signal is the same as send, but in net context it doesn't reflect
   *  to the originating address */
  async signal(msg: NP_Msg, data: NP_Data): Promise<void> {
    return await this.send(msg, data);
  }

  /** ping local message, return with number of handlers */
  async ping(msg: NP_Msg): Promise<NP_Data> {
    if (!IsLocalMessage(msg)) return await this._netPing(msg);
    const handlers = this.getLocalHandlers(msg);
    return Promise.resolve(handlers.length);
  }

  /** call net message, returning promise that will resolve on packet return */
  async _netCall(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = '_netCall:';
    const pkt = new NetPacket(msg, data);
    pkt.setMeta('call', {
      dir: 'req',
      rsvp: true
    });
    const p = new Promise((resolve, reject) => {
      const hash = GetPacketHashString(pkt);
      if (this.transactions.has(hash)) throw Error(`${fn} duplicate hash ${hash}`);
      this.transactions.set(hash, { resolve, reject });
      try {
        pkt.send();
      } catch (err) {
        reject(err);
      }
    });
    let resData = await p;
    return resData;
  }

  /** send net message, returning promise that will resolve on packet return */
  async _netSend(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = '_netSend:';
    const pkt = new NetPacket(msg, data);
    pkt.setMeta('send', {
      dir: 'req',
      rsvp: false
    });
    const p = new Promise((resolve, reject) => {
      const hash = GetPacketHashString(pkt);
      if (this.transactions.has(hash)) throw Error(`${fn} duplicate hash ${hash}`);
      this.transactions.set(hash, { resolve, reject });
      try {
        pkt.send();
      } catch (err) {
        reject(err);
      }
    });
    let resData = await p;
    return resData;
  }

  /** signal net message, returning void (not promise)  */
  _netSignal(msg: NP_Msg, data: NP_Data): void {
    const pkt = new NetPacket(msg, data);
    pkt.setMeta('signal', {
      dir: 'req',
      rsvp: false
    });
    pkt.send();
  }

  /** see if there is a return for the net message */
  async _netPing(msg: NP_Msg): Promise<NP_Data> {
    const fn = '_netPing:';
    const pkt = new NetPacket(msg);
    pkt.setMeta('ping', {
      dir: 'req',
      rsvp: true
    });
    const p = new Promise((resolve, reject) => {
      const hash = GetPacketHashString(pkt);
      if (this.transactions.has(hash)) throw Error(`${fn} duplicate hash ${hash}`);
      this.transactions.set(hash, { resolve, reject });
      try {
        pkt.send();
      } catch (err) {
        reject(err);
      }
    });
    let resData = await p;
    return resData;
  }

  /** packet receiver - - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** given a netmessage packet, dispatch it to the appropriate handlers */
  async receivePacket(pkt: NetPacket) {
    const fn = 'receivePacket:';
    let promises = this.resolveReturned(pkt);
    if (!promises.length) promises.push(...this.resolveHandlers(pkt));
    if (!promises.length) promises.push(...(await this.resolveRemote(pkt)));
    if (!promises.length) {
      LOG.error(`${fn} no handlers for ${pkt.msg}`);
      return;
    }
    // collect all the data from the promises
    let retData = await Promise.all(promises);
    retData = u_NormalizeData(retData);
    pkt.setData(retData);
    // don't return loopback packets because they are already returned
    if (pkt.isLoopback()) {
      this.resolveLoopback(pkt);
      return;
    }
    // otherwise return the packet
    pkt.setDir('req');
    LOG(fn, 'would return', pkt.msg, pkt.data);
    // pkt.send();
  }

  /** if the packet is a return, resolve the promise */
  resolveReturned(pkt: NetPacket): Promise<NP_Data>[] {
    const fn = 'resolveReturned:';
    // don't handle this packet if it's not a returning packet
    if (!pkt.isRsvp()) return [];
    LOG(fn, 'processing', pkt.msg, pkt.data);
    // get the hash for this packet and look up transaction
    const hash = GetPacketHashString(pkt);
    const transaction = this.transactions.get(hash);
    if (!transaction) {
      LOG.error(`${fn} unexpected error no transaction for ${hash}`);
      return [];
    }
    const { error, ...data } = pkt.data;
    if (error) {
      transaction.reject(error);
      return [];
    }
    this.transactions.delete(hash);
    transaction.resolve(data);
    return [];
  }

  /** if the packet is a request, call handlers and return response */
  resolveHandlers(pkt: NetPacket): Promise<NP_Data>[] {
    const fn = 'resolveHandlers:';
    const { msg, data } = pkt;
    const handler_list = this.getLocalHandlers(msg);
    const promises = [];
    handler_list.forEach(handler => {
      LOG(fn, '.. processing', pkt.msg, pkt.data);
      const p = new Promise((resolve, reject) => {
        try {
          resolve(handler(data));
        } catch (err) {
          reject(err);
        }
      });
      promises.push(p);
    });
    return promises;
  }

  /** if the packet has remote handlers, call them and return on completion */
  async resolveRemote(pkt: NetPacket) {
    const fn = 'resolveRemote:';
    const { msg, data } = pkt;
    const remote_addresses = this.getRemoteAddresses(msg);
    const promises = [];
    remote_addresses.forEach(uaddr => {
      LOG(fn, '.. processing', pkt.msg, pkt.data);
      const p = new Promise((resolve, reject) => {
        const clone = pkt.clone();
        const socket = this.sck_map.get(uaddr);
        if (!socket) reject(`${fn} unknown uaddr ${uaddr}`);
        const hash = GetPacketHashString(clone);
        this.transactions.set(hash, { resolve, reject });
        LOG(fn, 'forwarding', clone.msg, clone.data);
        // socket.send(clone, err => {
        //   reject(err);
        // });
      });
      promises.push(p);
    });
    return promises;
  }

  /** if the packet is a loopback, remove originating hash */
  async resolveLoopback(pkt: NetPacket) {
    const fn = 'resolveLoopback:';
    const hash = GetPacketHashString(pkt);
    if (this.transactions.has(hash)) LOG(fn, 'removing loopback hash', hash);
    this.transactions.delete(hash);
  }

  // end class
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NetEndpoint;
