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
import { NP_ID, NP_Address, NP_Msg, NP_Data, NP_Hash } from './urnet-types.ts';
import { GetPacketHashString } from './urnet-types.ts';
import {
  IsLocalMessage,
  IsRemoteMessage,
  AllocateAddress,
  GetMessageHash
} from './urnet-types.ts';

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
  msg: NP_Msg;
  uaddr: NP_Address;
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
};
/** returned by getRoutingInfo() for external users of this class */
type PktRoutingInfo = {
  msg: NP_Msg;
  src_addr: NP_Address;
  remotes: NP_Address[];
  handlers: HandlerFunc[];
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

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// These define plugin function that convert packets to and from the "wire"
/// of a socket-like connection to the network transport layer. They have
/// to be setup during the URNET handshake for each platform/transport layer
/// for the message system to work.
type EP_PL_WireOut = (pkt: NetPacket) => void; // used by packet.send()
type EP_PL_WireIn = (...data: any) => void; // call endpoint.dispatch()

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('EP', 'TagBlue');
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
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** utility to dump packet info to console */
function pr_pkt(ep: NetEndpoint, fn: string, text: string, pkt: NetPacket) {
  const { id, msg } = pkt;
  let out = `${ep.urnet_addr} ${text} '${msg}' `.padEnd(40, '•');
  out += ` at ${fn.padEnd(16, ' ')} ${id}`;
  return out;
}

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NetEndpoint {
  sck_map: SocketMap; // uaddr->socket
  msg_fwd_map: ForwardMap; // msg->UADDR[]
  msg_hnd_map: HandlerMap; // msg->handlers[]
  transactions: TransactionMap; // hash->resolver

  client_counter: number; // counter for generating unique uaddr
  pkt_counter: number; // counter for generating packet ids

  urnet_addr: NP_Address; // the address for this endpoint
  f_wire_out: EP_PL_WireOut; // inherited function to send packet
  f_wire_in: EP_PL_WireIn; // inherited function to receive packet
  sck_timer: any; // timer for checking socket age
  auth_jwt: any; // jtw for authenticating socket

  constructor() {
    this.sck_map = new Map<NP_Address, UDS_Socket>();
    this.msg_fwd_map = new Map<NP_Msg, AddressSet>();
    this.msg_hnd_map = new Map<NP_Msg, HandlerSet>();
    this.transactions = new Map<NP_Hash, PktResolver>();

    // for testing, can set these manually to override
    this.urnet_addr = undefined;
    this.f_wire_out = undefined;
    this.f_wire_in = undefined;

    // authentication and aging
    this.sck_timer = null;
    this.auth_jwt = null;
    this.pkt_counter = 0;
    this.client_counter = 0;
    // note that the socket aging is currently disabled\
  }

  /** client connection management  - - - - - - - - - - - - - - - - - - - - **/

  /** given a socket, see if it's already registered */
  validatedSocket(socket: UDS_Socket): boolean {
    const fn = 'validateSocket:';
    if (typeof socket !== 'object') throw Error(`${fn} invalid socket`);
    if (socket.UADDR === undefined) this.addSocket(socket);
    return this.authorizedSocket(socket);
  }

  /** return true if this socket passes authentication status */
  authorizedSocket(socket: UDS_Socket): boolean {
    const fn = 'authorizedSocket:';
    LOG.warn(fn, 'would check JWT in socket.AUTH');
    LOG.warn(this.urnet_addr, 'would check JWT in socket.AUTH');
    if (!socket.AUTH) return false;
    return true;
  }

  /** when a client connects to this endpoint, register it as a socket and
   *  allocate a UADDR for it */
  addSocket(socket: UDS_Socket): NP_Address {
    const fn = 'addSocket:';
    let uaddr = socket.UADDR;
    if (typeof uaddr === 'string' && this.sck_map.has(uaddr))
      throw Error(`${fn} socket ${uaddr} already registered`);
    //
    socket.UADDR = AllocateAddress();
    socket.AGE = 0; // reset age
    socket.AUTH = undefined;
    if (DBG) LOG(this.urnet_addr, fn, `socket ${uaddr} registered`);
    return uaddr;
  }

  /** when a client disconnects from this endpoint, delete its socket and
   *  remove all message forwarding */
  deleteSocket(sobj: NP_Address | UDS_Socket): NP_Address {
    const fn = 'deleteSocket:';
    let uaddr = typeof sobj === 'string' ? sobj : sobj.UADDR;
    if (typeof uaddr !== 'string') throw Error(`${fn} invalid uaddr`);
    if (!this.sck_map.has(uaddr)) throw Error(`${fn} unknown uaddr ${uaddr}`);
    // msg_fwd_map is msg->set of uaddr, so iterate over all messages
    const msg_list = this.getMessageListForAddress(uaddr);
    msg_list.forEach(msg => {
      const msg_set = this.msg_fwd_map.get(msg);
      if (!msg_set) throw Error(`${fn} unexpected empty set '${msg}'`);
      msg_set.delete(uaddr);
    });
    // delete the socket
    this.sck_map.delete(uaddr);
    if (DBG) LOG(this.urnet_addr, fn, `socket ${uaddr} deleted`);
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
            if (DBG) LOG(this.urnet_addr, fn, `socket ${uaddr} expired`);
            // put stuff here
          }
        });
      }, AGE_INTERVAL);
      return;
    }
    if (this.sck_timer) clearInterval(this.sck_timer);
    this.sck_timer = null;
    if (DBG) LOG(this.urnet_addr, fn, `timer stopped`);
  }

  /** message & address management - - - - - - - - - - - - - - - - - - - - -**/

  /** get list of messages allocated to a UADDR */
  getMessageListForAddress(uaddr: NP_Address): NP_Msg[] {
    const fn = 'getMessageListForAddress:';
    if (typeof uaddr !== 'string') throw Error(`${fn} invalid uaddr`);
    if (!this.sck_map.has(uaddr)) throw Error(`${fn} unknown uaddr ${uaddr}`);
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
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    // msg_fwd_map is msg->set of uaddr, so return set of uaddr as array
    const addr_set = this.msg_fwd_map.get(msg);
    if (!addr_set) throw Error(`${fn} unexpected empty set '${msg}'`);
    const addr_list = Array.from(addr_set);
    return addr_list;
  }

  /** return list of local handlers for given message */
  getLocalHandlers(msg: NP_Msg): HandlerFunc[] {
    const fn = 'getLocalHandlers:';
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    const key = GetMessageHash(msg);
    if (!this.msg_hnd_map.has(key)) this.msg_hnd_map.set(key, new Set<HandlerFunc>());
    const handler_set = this.msg_hnd_map.get(key);
    if (!handler_set) throw Error(`${fn} unexpected empty set '${key}'`);
    const handler_list = Array.from(handler_set);
    return handler_list;
  }

  /** return list of remote addresses for given message */
  getRemoteAddresses(msg: NP_Msg): NP_Address[] {
    const fn = 'getRemoteAddresses:';
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    const key = GetMessageHash(msg);
    if (!this.msg_fwd_map.has(key)) this.msg_fwd_map.set(key, new Set<NP_Address>());
    const addr_set = this.msg_fwd_map.get(key);
    if (!addr_set) throw Error(`${fn} unexpected empty set '${msg}'`);
    const addr_list = Array.from(addr_set);
    return addr_list;
  }

  /** return list of active transactions for this endpoint */
  getTransactionList(): { hash: NP_Hash; msg: NP_Msg; uaddr: NP_Address }[] {
    // return array of objects { hash, msg, uaddr }
    const fn = 'getTransactionList:';
    const list = [];
    this.transactions.forEach((transaction, hash) => {
      const { msg, uaddr } = transaction;
      list.push({ hash, msg, uaddr });
    });
    return list;
  }

  /** register a message handler for a given message to passed uaddr */
  registerRemoteMessages(uaddr: NP_Address, msgList: NP_Msg[]) {
    const fn = 'registerRemoteMessages:';
    if (typeof uaddr !== 'string') throw Error(`${fn} invalid uaddr`);
    if (!this.sck_map.has(uaddr)) throw Error(`${fn} unknown uaddr ${uaddr}`);
    this._setRemoteMessages(uaddr, msgList);
  }

  /** secret utility function for registerRemoteMessages */
  _setRemoteMessages(uaddr: NP_Address, msgList: NP_Msg[]) {
    const fn = '_setRemoteMessages:';
    msgList.forEach(msg => {
      if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
      if (msg !== msg.toUpperCase()) throw Error(`${fn} msg must be uppercase`);
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
    if (typeof uaddr !== 'string') throw Error(`${fn} invalid uaddr`);
    if (!this.sck_map.has(uaddr)) throw Error(`${fn} unknown uaddr ${uaddr}`);
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
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    if (msg !== msg.toUpperCase()) throw Error(`${fn} msg must be uppercase`);
    if (typeof handler !== 'function') throw Error(`${fn} invalid handler`);
    const key = GetMessageHash(msg);
    if (!this.msg_hnd_map.has(key)) this.msg_hnd_map.set(key, new Set<HandlerFunc>());
    const handler_set = this.msg_hnd_map.get(key);
    handler_set.add(handler);
  }

  /** for local handlers, unregister a message handler for a given message */
  removeHandler(msg: NP_Msg, handler: HandlerFunc) {
    const fn = 'removeHandler:';
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    if (typeof handler !== 'function') throw Error(`${fn} invalid handler`);
    const key = GetMessageHash(msg);
    const handler_set = this.msg_hnd_map.get(key);
    if (!handler_set) throw Error(`${fn} unexpected empty set '${key}'`);
    handler_set.delete(handler);
  }

  /** return routing information for packet for external users of this class
   *  that are moving packets onto the wire implementation */
  getRoutingInfo(pkt: NetPacket): PktRoutingInfo {
    const fn = 'getRoutingInfo:';
    if (typeof pkt !== 'object') throw Error(`${fn} invalid packet`);
    const { msg, src_addr } = pkt;
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    if (typeof src_addr !== 'string') throw Error(`${fn} invalid src_addr`);
    const remotes = this.getAddressListForMessage(msg);
    const handlers = this.getLocalHandlers(msg);
    return { msg, src_addr, remotes, handlers };
  }

  /** packet utility - - - - - - - - - - - - - - - - - - - - - - - - - - - -**/

  assignPacketId(pkt: NetPacket): NP_ID {
    if (pkt.src_addr === undefined) pkt.src_addr = this.urnet_addr;
    const count = ++this.pkt_counter;
    pkt.id = `pkt[${pkt.src_addr}:${count}]`;
    return pkt.id;
  }
  /** create a new packet with proper address */
  newPacket(msg?: NP_Msg, data?: NP_Data): NetPacket {
    const fn = 'newPacket:';
    const pkt = new NetPacket(msg, data);
    if (this.urnet_addr === undefined)
      throw Error(`${fn} endpoint address was not assigned`);
    pkt.id = this.assignPacketId(pkt);
    return pkt;
  }
  /** clone a packet with new id */
  clonePacket(pkt: NetPacket): NetPacket {
    const clone = this.newPacket(pkt.msg, pkt.data);
    clone.setFromJSON(pkt.serialize());
    clone.src_addr = this.urnet_addr;
    clone.id = this.assignPacketId(clone);
    return clone;
  }
  /** return if it's a loopback to this endpoint */
  isLoopback(pkt: NetPacket): boolean {
    const sameOrigin = this.urnet_addr === pkt.src_addr;
    const oneHop = pkt.hop_seq.length === 1;
    return sameOrigin && oneHop;
  }

  /** low level wire interface - - - - - - - - - - - - - - - - - - - - - - -**/

  setAddress(urnet_addr: NP_Address) {
    this.urnet_addr = urnet_addr;
  }
  setWireOut(f_wire_out: EP_PL_WireOut) {
    this.f_wire_out = f_wire_out;
  }
  setWireIn(f_wire_in: EP_PL_WireIn) {
    this.f_wire_in = f_wire_in;
  }
  wireOut(pkt: NetPacket) {
    this.f_wire_out.call(this, pkt);
  }
  wireIn(...data: any) {
    this.f_wire_in.call(this, ...data);
  }

  /** message invocation - - - - - - - - - - - - - - - - - - - - - - - - - -**/

  /** call local message */
  async call(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = 'call:';
    if (!IsLocalMessage(msg)) throw Error(`${fn} '${msg}' not local (drop prefix)`);
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
    const fn = 'send:';
    if (!IsLocalMessage(msg)) throw Error(`${fn} '${msg}' not local (drop prefix)`);
    const handlers = this.getLocalHandlers(msg);
    handlers.forEach(handler => {
      handler({ ...data }); // copy of data
    });
    return Promise.resolve();
  }

  /** signal local message, returning immediately. similar to send */
  async signal(msg: NP_Msg, data: NP_Data): Promise<void> {
    const fn = 'signal:';
    if (!IsLocalMessage(msg)) throw Error(`${fn} '${msg}' not local (drop prefix)`);
    const handlers = this.getLocalHandlers(msg);
    handlers.forEach(handler => {
      handler({ ...data }); // copy of data
    });
    return Promise.resolve();
  }

  /** ping local message, return with number of handlers */
  async ping(msg: NP_Msg): Promise<NP_Data> {
    const fn = 'ping:';
    if (!IsLocalMessage(msg)) throw Error(`${fn} '${msg}' not local (drop prefix)`);
    const handlers = this.getLocalHandlers(msg);
    return Promise.resolve(handlers.length);
  }

  /** call net message, returning promise that will resolve on packet return */
  async netCall(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = 'netCall:';
    if (!IsRemoteMessage(msg)) throw Error(`${fn} '${msg}' missing NET prefix`);
    const pkt = this.newPacket(msg, data);
    pkt.setMeta('call', {
      dir: 'req',
      rsvp: true
    });
    const p = new Promise((resolve, reject) => {
      const hash = GetPacketHashString(pkt);
      if (this.transactions.has(hash)) throw Error(`${fn} duplicate hash ${hash}`);
      const meta = { msg, uaddr: this.urnet_addr };
      this.transactions.set(hash, { resolve, reject, ...meta });
      try {
        this.sendPacket(pkt);
      } catch (err) {
        reject(err);
      }
    });
    let resData = await p;
    return resData;
  }

  /** send net message, returning promise that will resolve on packet return */
  async netSend(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = 'netSend:';
    if (!IsRemoteMessage(msg)) throw Error(`${fn} '${msg}' missing NET prefix`);
    const p = new Promise((resolve, reject) => {
      const pkt = this.newPacket(msg, data);
      pkt.setMeta('send', {
        dir: 'req',
        rsvp: true
      });
      const hash = GetPacketHashString(pkt);
      if (this.transactions.has(hash)) throw Error(`${fn} duplicate hash ${hash}`);
      const meta = { msg, uaddr: this.urnet_addr };
      this.transactions.set(hash, { resolve, reject, ...meta });
      try {
        this.sendPacket(pkt);
      } catch (err) {
        reject(err);
      }
    });
    let resData = await p;
    return resData;
  }

  /** signal net message, returning void (not promise)  */
  netSignal(msg: NP_Msg, data: NP_Data): void {
    const fn = 'netSignal:';
    if (!IsRemoteMessage(msg)) throw Error(`${fn} '${msg}' missing NET prefix`);
    const pkt = this.newPacket(msg, data);
    pkt.setMeta('signal', {
      dir: 'req',
      rsvp: false
    });
    this.sendPacket(pkt);
  }

  /** see if there is a return for the net message */
  async netPing(msg: NP_Msg): Promise<NP_Data> {
    const fn = 'netPing:';
    if (!IsRemoteMessage(msg)) throw Error(`${fn} '${msg}' missing NET prefix`);
    const pkt = this.newPacket(msg);
    pkt.setMeta('ping', {
      dir: 'req',
      rsvp: true
    });
    const p = new Promise((resolve, reject) => {
      const hash = GetPacketHashString(pkt);
      if (this.transactions.has(hash)) throw Error(`${fn} duplicate hash ${hash}`);
      const meta = { msg, uaddr: this.urnet_addr };
      this.transactions.set(hash, { resolve, reject, ...meta });
      try {
        this.sendPacket(pkt);
      } catch (err) {
        reject(err);
      }
    });
    let resData = await p;
    return resData;
  }

  /** packet receiver - - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** main packet sender, which is called by all the other send functions */
  sendPacket(pkt: NetPacket) {
    const fn = 'sendPacket:';
    if (pkt.src_addr === undefined) throw Error(`${fn}src_addr undefined`);
    pkt.addHop(this.urnet_addr);
    const { msg, data } = pkt;
    if (data === undefined) throw Error(`${fn}data undefined`);
    if (DBG) LOG(pr_pkt(this, fn, '-send-', pkt), pkt.data);
    this.wireOut(pkt);
  }

  /** receive a packet from the wire */
  receivePacket(pkt: NetPacket) {
    const fn = 'receivePacket:';
    if (DBG) LOG(pr_pkt(this, fn, '-recv-', pkt), pkt.data);
    this.dispatchPacket(pkt);
  }

  /** return a packet  */
  returnPacket(pkt: NetPacket) {
    const fn = 'returnPacket:';
    if (pkt.hop_dir !== 'res') pkt.setDir('res'); // response
    else throw Error(`returnPacket: already a response packet`);
    pkt.addHop(this.urnet_addr);
    const { msg, data } = pkt;
    if (DBG) LOG(pr_pkt(this, fn, '-retn-', pkt), pkt.data);
    this.wireOut(pkt);
  }

  /** send a packet to matching sockets */
  forwardPacket(pkt: NetPacket) {}

  /** given a netmessage packet, dispatch it to the appropriate handlers */
  async dispatchPacket(pkt: NetPacket) {
    const fn = 'dispatchPacket:';
    let promises: Promise<NP_Data>[] = [];
    // 1. is this a returning packet?
    let tr = this.dp_resolveTransaction(pkt);
    // 2. is this a request packet and we have handlers?
    let hn = this.dp_hndlMessage(pkt);
    // 3. is this a request packet and we have no handlers but can forward?
    //    and this endpoint is managing clients?
    let fw = [];
    if (this.urnet_addr && this.msg_fwd_map.size) {
      fw.push(...(await this.dp_fwrdMessage(pkt)));
    }
    if (tr.length) {
      if (DBG) LOG(pr_pkt(this, fn, '-retn-', pkt), pkt.data);
      promises.push(...tr);
    } else if (hn.length) {
      if (DBG) LOG(pr_pkt(this, fn, '-hndl-', pkt), pkt.data);
      promises.push(...hn);
    } else if (fw.length) {
      if (DBG) LOG(pr_pkt(this, fn, '-fwrd-', pkt), pkt.data);
      promises.push(...fw);
    } else {
      LOG.info(this.urnet_addr, fn, `no handlers for ${pkt.msg}`);
      return;
    }
    // if got this far, then we have promises to resolve
    let retData = await Promise.all(promises).catch(err => {
      LOG.error(this.urnet_addr, 'ERROR', fn, err);
      pkt.setData({ error: err });
    });
    retData = u_NormalizeData(retData);
    pkt.setData(retData);
    // don't return loopback packets because they are already returned
    if (this.isLoopback(pkt)) {
      LOG(this.urnet_addr, fn, 'loopback packet, not returning data on wire');
      this.dp_resolveLoopback(pkt);
      return;
    }
    // otherwise return the packet
    if (pkt.isRsvp()) {
      if (DBG) LOG(pr_pkt(this, fn, '-retn-', pkt), pkt.data);
      this.returnPacket(pkt);
    }
  }

  /** if the packet is a return, resolve the promise transaction */
  dp_resolveTransaction(pkt: NetPacket): Promise<NP_Data>[] {
    const fn = 'dp_resolveTransaction:';
    // don't handle this packet if it's not a returning packet
    if (pkt.src_addr !== this.urnet_addr) return [];
    if (!pkt.isRsvp()) return [];
    if (!pkt.isResponse()) return [];
    // got this far, it should be a returning packet
    const hash = GetPacketHashString(pkt);
    const transaction = this.transactions.get(hash);
    if (!transaction) {
      LOG.error(
        `${this.urnet_addr}-${fn} unexpected error no transaction for ${hash}`
      );
      return [];
    }
    const { error, ...data } = pkt.data;
    if (error) {
      this.transactions.delete(hash);
      transaction.reject(error);
      return [];
    }
    this.transactions.delete(hash);
    transaction.resolve(data);
    return [];
  }

  /** if the packet is a request, call handlers and return response */
  dp_hndlMessage(pkt: NetPacket): Promise<NP_Data>[] {
    const fn = 'dp_hndlMessage:';
    const { msg, data } = pkt;
    const handler_list = this.getLocalHandlers(msg);
    const promises = [];
    handler_list.forEach(handler => {
      if (DBG) LOG(pr_pkt(this, fn, '-hndl-', pkt), pkt.data);
      const p = new Promise((resolve, reject) => {
        try {
          const retData = handler(data);
          resolve(retData);
        } catch (err) {
          reject(err);
        }
      });
      promises.push(p);
    });
    return promises;
  }

  /** if the packet has remote handlers, call them and return on completion */
  async dp_fwrdMessage(pkt: NetPacket) {
    const fn = 'dp_fwrdMessage:';
    const { msg } = pkt;
    const remote_addresses = this.getRemoteAddresses(msg);
    LOG.info(this.urnet_addr, `'${msg}' found remotes:`, remote_addresses);
    const promises = [];
    remote_addresses.forEach(uaddr => {
      const p = new Promise((resolve, reject) => {
        const clone = this.clonePacket(pkt);
        clone.id = this.assignPacketId(clone);
        // const socket = this.sck_map.get(uaddr);
        // if (!socket) reject(`${fn} -fwrd- unknown uaddr ${uaddr}`);
        const hash = GetPacketHashString(clone);
        const meta = { msg, uaddr };
        this.transactions.set(hash, { resolve, reject, ...meta });
        if (DBG) LOG(pr_pkt(this, fn, '-fwrd-', clone), clone.data);
        LOG.warn(fn, 'would send packet to remotes');
      });
      promises.push(p);
    });
    return promises;
  }

  /** if the packet is a loopback, remove originating hash */
  async dp_resolveLoopback(pkt: NetPacket) {
    const fn = 'dp_resolveLoopback:';
    const hash = GetPacketHashString(pkt);
    if (this.transactions.has(hash)) {
      if (DBG) LOG(this.urnet_addr, fn, 'removing loopback hash', hash);
      this.transactions.delete(hash);
    }
  }

  // end class
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NetEndpoint;
