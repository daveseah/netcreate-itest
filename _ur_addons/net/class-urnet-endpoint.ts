/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NetEndpoint implements a connection to URNET as an implementation-
  independent object. It provides the API for sending and receiving messages
  in conjunction with the NetPacket class.

  CROSS PLATFORM USAGE --------------------------------------------------------

  When using from nodejs mts file, you can only import 'default', which is the
  NetEndpoint class. If you want to import other exports, you need to
  destructure the .default prop; to access the NetPacket class do this:

    import EP_DEFAULT from './class-urnet-endpoint.ts';
    const NetEndpoint = UR_TYPES.default; // note .default

  You can import the types as usual, though:

    import EP_DEFAULT, { EP_Socket } from './urnet-types.ts';

  This is not required when importing from another .ts typescript file.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR } from '@ursys/core';
import NetPacket from './class-urnet-packet.ts';
import { NP_ID, NP_Address, NP_Msg, NP_Data, NP_Hash } from './urnet-types.ts';
import { GetPacketHashString } from './urnet-types.ts';
import {
  IsLocalMessage,
  IsNetMessage,
  IsValidAddress,
  AllocateAddress,
  NormalizeMessage,
  NormalizeData
} from './urnet-types.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('Endpoint', 'TagBlue');
const DBG = true;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let AGE_INTERVAL = 1000; // milliseconds
let AGE_MAX = 60 * 30; // 30 minutes

/// LOCAL TYPES ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type EP_SendFunc = (pkt: NetPacket) => void;
/** this is the socket-ish object that we use to send data to the wire */
export type EP_Socket = {
  send: EP_SendFunc;
  // set by addClient()
  uaddr?: NP_Address; // assigned uaddr for this socket-ish object
  auth?: any; // whatever authentication is needed for this socket
  age?: number; // number of seconds since this socket was used
  label?: string; // name of the socket-ish object
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type HandlerFunc = (data: NP_Data) => NP_Data | void;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type HandlerSet = Set<HandlerFunc>; // set(handler1, handler2, ...)
type AddressSet = Set<NP_Address>; // ['UA001', 'UA002', ...]
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type SocketMap = Map<NP_Address, EP_Socket>; //
type ForwardMap = Map<NP_Msg, AddressSet>; // msg->set of uaddr
type HandlerMap = Map<NP_Msg, HandlerSet>; // msg->handler functions
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** transactions store promises for resolving sent packet with return values */
type TransactionMap = Map<NP_Hash, PktResolver>; // hash->resolver
type PktResolver = {
  msg: NP_Msg;
  uaddr: NP_Address;
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** returned by getRoutingInfo() for external users of this class */
type PktRoutingInfo = {
  msg: NP_Msg;
  src_addr: NP_Address;
  self_addr: NP_Address;
  gateway: EP_Socket;
  clients: EP_Socket[];
};

/// UTILITY FUNCTIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** utility to dump packet info to console */
function _PKT(ep: NetEndpoint, fn: string, text: string, pkt: NetPacket) {
  let { id, msg, msg_type } = pkt;
  if (id === undefined && msg_type === '_reg') id = 'pkt[NEW0:0]';
  let out = `${ep.urnet_addr} ${text} '${msg}' `.padEnd(40, '~');
  out += ` ${id.padEnd(12)} ${fn}`;
  return out;
}

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NetEndpoint {
  urnet_addr: NP_Address; // the address for this endpoint
  //
  cli_gateway: EP_Socket; // gateway to server
  srv_socks: SocketMap; // uaddr->EP_Socket
  srv_msgs: ForwardMap; // msg->uaddr[]
  msg_handlers: HandlerMap; // msg->handlers[]
  transactions: TransactionMap; // hash->resolver
  //
  cli_counter: number; // counter for generating unique uaddr
  pkt_counter: number; // counter for generating packet ids
  //
  cli_sck_timer: any; // timer for checking socket age
  cli_auth: any; // jtw for authenticating socket

  constructor() {
    //
    this.urnet_addr = undefined; // assigned address
    // endpoint as client
    this.cli_auth = undefined; // jwt
    this.cli_gateway = undefined;
    // endpoint as server
    this.srv_socks = undefined;
    this.srv_msgs = undefined;
    // endpoint message handling support
    this.msg_handlers = new Map<NP_Msg, HandlerSet>();
    this.transactions = new Map<NP_Hash, PktResolver>();
    // runtime packet, socket counters
    this.pkt_counter = 0;
    this.cli_counter = 0;
    this.cli_sck_timer = null; // socket aging placeholder
  }

  /** client connection management  - - - - - - - - - - - - - - - - - - - - **/

  /** client endpoints need to have an "address" assigned to them, otherwise
   *  the endpoint will not work */
  configAsClient(urnet_addr: NP_Address, gateway: EP_Socket) {
    const fn = 'configAsClient:';
    if (IsValidAddress(urnet_addr)) this.urnet_addr = urnet_addr;
    else throw Error(`${fn} invalid urnet_addr`);
    if (gateway && typeof gateway.send === 'function') {
      this.cli_gateway = gateway;
    } else throw Error(`${fn} invalid gateway`);
  }

  /** return true if this endpoint is managing connections */
  configAsServer(srv_addr: NP_Address) {
    const fn = 'configAsServer:';
    if (!IsValidAddress(srv_addr)) throw Error(`${fn} invalid srv_addr ${srv_addr}`);
    if (this.urnet_addr && this.urnet_addr !== srv_addr) {
      let err = `${fn} urnet_addr ${this.urnet_addr} already set.`;
      err += `currently, `;
      throw Error(err);
    }
    this.urnet_addr = srv_addr;
    // make sure we don't nuke
    if (this.srv_socks !== undefined)
      LOG(this.urnet_addr, `already configured`, [...this.srv_socks.keys()]);
    this.srv_socks = new Map<NP_Address, EP_Socket>();
    if (this.srv_msgs !== undefined)
      LOG(this.urnet_addr, `already configured`, [...this.srv_msgs.keys()]);
    this.srv_msgs = new Map<NP_Msg, AddressSet>();
  }

  /** return true if this endpoint is managing connections */
  isServer() {
    return this.srv_socks !== undefined && this.srv_msgs !== undefined;
  }

  /** socket utilities  - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** given a socket, see if it's already registered */
  isNewSocket(socket: EP_Socket): boolean {
    const fn = 'isNewSocket:';
    if (typeof socket !== 'object') return false;
    return socket.uaddr === undefined;
  }

  /** client endpoints need to have an authentication token to
   *  access URNET beyond registration
   */
  authorizeSocket(auth: any) {
    const fn = 'authorizeSocket:';
    LOG(this.urnet_addr, 'would check auth token');
    this.cli_auth = auth;
  }

  /** return true if this socket passes authentication status */
  isAuthorizedSocket(socket: EP_Socket): boolean {
    const fn = 'authorizeSocket:';
    LOG.warn(fn, 'would check JWT in socket.auth');
    LOG.warn(this.urnet_addr, 'would check JWT in socket.auth');
    if (!socket.auth) return false;
    return true;
  }

  /** endpoint client management  - - - - - - - - - - - - - - - - - - - - - **/

  /** when a client connects to this endpoint, register it as a socket and
   *  allocate a uaddr for it */
  addClient(socket: EP_Socket): NP_Address {
    const fn = 'addClient:';
    if (typeof socket !== 'object') throw Error(`${fn} invalid socket`);
    if (socket.uaddr !== undefined) throw Error(`${fn} socket already added`);
    const new_uaddr = AllocateAddress({ prefix: 'UR_' });
    socket.uaddr = new_uaddr;
    socket.age = 0;
    socket.auth = undefined;
    this.srv_socks.set(new_uaddr, socket);
    // if (DBG) LOG(this.urnet_addr, `socket ${new_uaddr} registered`);
    return new_uaddr;
  }

  /** given a uaddr, return the socket */
  getClient(uaddr: NP_Address): EP_Socket {
    const fn = 'getClient:';
    if (this.srv_socks === undefined) return undefined;
    return this.srv_socks.get(uaddr);
  }

  /** when a client disconnects from this endpoint, delete its socket and
   *  remove all message forwarding */
  removeClient(uaddr_obj: NP_Address | EP_Socket): NP_Address {
    const fn = 'removeClient:';
    let uaddr = typeof uaddr_obj === 'string' ? uaddr_obj : uaddr_obj.uaddr;
    if (typeof uaddr !== 'string') {
      LOG.error(`${fn} invalid uaddr ${typeof uaddr}`);
      return undefined;
    }
    if (!this.srv_socks.has(uaddr)) throw Error(`${fn} unknown uaddr ${uaddr}`);
    // srv_msgs is msg->set of uaddr, so iterate over all messages
    this._delRemoteMessages(uaddr);
    // delete the socket
    this.srv_socks.delete(uaddr);
    if (DBG) LOG(this.urnet_addr, `socket ${uaddr} deleted`);
    return uaddr;
  }

  /** start a timer to check for dead sockets */
  enableClientAging(activate: boolean) {
    const fn = 'enableClientAging:';
    if (activate) {
      if (this.cli_sck_timer) clearInterval(this.cli_sck_timer);
      this.cli_sck_timer = setInterval(() => {
        this.srv_socks.forEach((socket, uaddr) => {
          socket.age += AGE_INTERVAL;
          if (socket.age > AGE_MAX) {
            if (DBG) LOG(this.urnet_addr, `socket ${uaddr} expired`);
            // put stuff here
          }
        });
      }, AGE_INTERVAL);
      return;
    }
    if (this.cli_sck_timer) clearInterval(this.cli_sck_timer);
    this.cli_sck_timer = null;
    if (DBG) LOG(this.urnet_addr, `timer stopped`);
  }

  /** endpoint lookup tables - - - - - - - - - - - - - - - - - - - -  - - - **/

  /** get list of messages allocated to a uaddr */
  getMessagesForAddress(uaddr: NP_Address): NP_Msg[] {
    const fn = 'getMessagesForAddress:';
    if (!this.isServer()) return []; // invalid for client-only endpoints
    if (typeof uaddr !== 'string') throw Error(`${fn} invalid uaddr`);
    if (!this.srv_socks.has(uaddr)) throw Error(`${fn} unknown uaddr ${uaddr}`);
    // srv_msgs is msg->set of uaddr, so iterate over all messages
    const msg_list: NP_Msg[] = [];
    this.srv_msgs.forEach((addr_set, msg) => {
      if (addr_set.has(uaddr)) msg_list.push(msg);
    });
    return msg_list;
  }

  /** get list of UADDRs that a message is forwarded to */
  getAddressesForMessage(msg: NP_Msg): NP_Address[] {
    const fn = 'getAddressesForMessage:';
    if (!this.isServer()) return []; // invalid for client-only endpoints
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    const key = NormalizeMessage(msg);
    if (!this.srv_msgs.has(key)) this.srv_msgs.set(key, new Set<NP_Address>());
    const addr_set = this.srv_msgs.get(key);
    const addr_list = Array.from(addr_set);
    return addr_list;
  }

  /** return list of local handlers for given message */
  getHandlersForMessage(msg: NP_Msg): HandlerFunc[] {
    const fn = 'getHandlersForMessage:';
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    const key = NormalizeMessage(msg);
    if (!this.msg_handlers.has(key))
      this.msg_handlers.set(key, new Set<HandlerFunc>());
    const handler_set = this.msg_handlers.get(key);
    if (!handler_set) throw Error(`${fn} unexpected empty set '${key}'`);
    const handler_list = Array.from(handler_set);
    return handler_list;
  }

  /** informational routing information - - - - - - - - - - - - - - - - - - **/

  /** return handler list for this endpoint */
  listMessages(): NP_Msg[] {
    // get message keys from msg_handlers
    const list = [];
    this.msg_handlers.forEach((handler_set, key) => {
      list.push(key);
    });
    return list;
  }

  /** return only net messages */
  listNetMessages(): NP_Msg[] {
    const list = [];
    this.msg_handlers.forEach((handler_set, key) => {
      if (IsNetMessage(key)) list.push(key);
    });
    return list;
  }

  /** return list of active transactions for this endpoint */
  listTransactions(): { hash: NP_Hash; msg: NP_Msg; uaddr: NP_Address }[] {
    // return array of objects { hash, msg, uaddr }
    const fn = 'listTransactions:';
    const list = [];
    this.transactions.forEach((transaction, hash) => {
      const { msg, uaddr } = transaction;
      list.push({ hash, msg, uaddr });
    });
    return list;
  }

  /** server endpoints manage list of messages in clients  - - - - -  - - - **/

  /** register a message handler for a given message to passed uaddr */
  registerRemoteMessages(uaddr: NP_Address, msgList: NP_Msg[]) {
    const fn = 'registerRemoteMessages:';
    if (typeof uaddr !== 'string') throw Error(`${fn} invalid uaddr`);
    if (!this.srv_socks.has(uaddr)) throw Error(`${fn} unknown uaddr ${uaddr}`);
    this._setRemoteMessages(uaddr, msgList);
  }

  /** secret utility function for registerRemoteMessages */
  _setRemoteMessages(uaddr: NP_Address, msgList: NP_Msg[]) {
    const fn = '_setRemoteMessages:';
    msgList.forEach(msg => {
      if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
      if (msg !== msg.toUpperCase()) throw Error(`${fn} msg must be uppercase`);
      const key = NormalizeMessage(msg);
      if (!this.srv_msgs.has(key)) this.srv_msgs.set(key, new Set<NP_Address>());
      const msg_set = this.srv_msgs.get(key);
      msg_set.add(uaddr);
      // if (DBG) LOG(this.urnet_addr, `reg remote ${key} for ${uaddr}`);
    });
  }

  /** unregister message handlers for a given message to passed uaddr */
  _delRemoteMessages(uaddr: NP_Address): NP_Msg[] {
    const fn = '_delRemoteMessages:';
    if (typeof uaddr !== 'string') throw Error(`${fn} invalid uaddr`);
    if (!this.srv_socks.has(uaddr)) throw Error(`${fn} unknown uaddr ${uaddr}`);
    const removed = [];
    this.srv_msgs.forEach((msg_set, key) => {
      if (msg_set.has(uaddr)) removed.push(key);
      msg_set.delete(uaddr);
    });
    return removed;
  }

  /** local message handlers registration - - - - - - - - - - - - - - - - - **/

  /** for local handlers, register a message handler for a given message */
  registerHandler(msg: NP_Msg, handler: HandlerFunc) {
    const fn = 'registerHandler:';
    // if (DBG) LOG(this.urnet_addr, `reg handler '${msg}'`);
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    if (msg !== msg.toUpperCase()) throw Error(`${fn} msg must be uppercase`);
    if (typeof handler !== 'function') throw Error(`${fn} invalid handler`);
    const key = NormalizeMessage(msg);
    if (!this.msg_handlers.has(key))
      this.msg_handlers.set(key, new Set<HandlerFunc>());
    const handler_set = this.msg_handlers.get(key);
    handler_set.add(handler);
  }

  /** for local handlers, unregister a message handler for a given message */
  removeHandler(msg: NP_Msg, handler: HandlerFunc) {
    const fn = 'removeHandler:';
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    if (typeof handler !== 'function') throw Error(`${fn} invalid handler`);
    const key = NormalizeMessage(msg);
    const handler_set = this.msg_handlers.get(key);
    if (!handler_set) throw Error(`${fn} unexpected empty set '${key}'`);
    handler_set.delete(handler);
  }

  /** packet utility - - - - - - - - - - - - - - - - - - - - - - - - - - - -**/

  assignPacketId(pkt: NetPacket): NP_ID {
    if (pkt.src_addr === undefined) pkt.src_addr = this.urnet_addr;
    const count = ++this.pkt_counter;
    pkt.id = `pkt[${pkt.src_addr}:${count}]`;
    return pkt.id;
  }

  /** convert JSON to packet and return */
  packetFromJSON(json: string): NetPacket {
    const pkt = new NetPacket();
    pkt.setFromJSON(json);
    return pkt;
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
  /** create a registration packet */
  newRegistrationPacket(): NetPacket {
    const fn = 'newRegistrationPacket:';
    const pkt = new NetPacket('SRV:REQ_ADDR', {});
    pkt.setMeta('_reg', { rsvp: true });
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

  /** message invocation - - - - - - - - - - - - - - - - - - - - - - - - - -**/

  /** call local message */
  async call(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = 'call:';
    if (!IsLocalMessage(msg)) throw Error(`${fn} '${msg}' not local (drop prefix)`);
    const handlers = this.getHandlersForMessage(msg);
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
    if (promises.length === 0)
      return Promise.resolve({ error: `no handler for '${msg}'` });
    // wait for all promises to resolve
    const resData = await Promise.all(promises);
    return resData;
  }

  /** send local message, returning immediately */
  async send(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = 'send:';
    if (!IsLocalMessage(msg)) throw Error(`${fn} '${msg}' not local (drop prefix)`);
    const handlers = this.getHandlersForMessage(msg);
    if (handlers.length === 0)
      return Promise.resolve({ error: `no handler for '${msg}'` });
    handlers.forEach(handler => {
      handler({ ...data }); // copy of data
    });
    return Promise.resolve(true);
  }

  /** signal local message, returning immediately. similar to send */
  async signal(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = 'signal:';
    if (!IsLocalMessage(msg)) throw Error(`${fn} '${msg}' not local (drop prefix)`);
    const handlers = this.getHandlersForMessage(msg);
    if (handlers.length === 0)
      return Promise.resolve({ error: `no handler for '${msg}'` });
    handlers.forEach(handler => {
      handler({ ...data }); // copy of data
    });
    return Promise.resolve(true);
  }

  /** ping local message, return with number of handlers */
  async ping(msg: NP_Msg): Promise<NP_Data> {
    const fn = 'ping:';
    if (!IsLocalMessage(msg)) throw Error(`${fn} '${msg}' not local (drop prefix)`);
    const handlers = this.getHandlersForMessage(msg);
    return Promise.resolve(handlers.length);
  }

  /** call net message, returning promise that will resolve on packet return */
  async netCall(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = 'netCall:';
    if (!IsNetMessage(msg)) throw Error(`${fn} '${msg}' missing NET prefix`);
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
        this.pktSendRequest(pkt);
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
    if (!IsNetMessage(msg)) throw Error(`${fn} '${msg}' missing NET prefix`);
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
        this.pktSendRequest(pkt);
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
    if (!IsNetMessage(msg)) throw Error(`${fn} '${msg}' missing NET prefix`);
    const pkt = this.newPacket(msg, data);
    pkt.setMeta('signal', {
      dir: 'req',
      rsvp: false
    });
    this.pktSendRequest(pkt);
  }

  /** see if there is a return for the net message */
  async netPing(msg: NP_Msg): Promise<NP_Data> {
    const fn = 'netPing:';
    if (!IsNetMessage(msg)) throw Error(`${fn} '${msg}' missing NET prefix`);
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
        this.pktSendRequest(pkt);
      } catch (err) {
        reject(err);
      }
    });
    let resData = await p;
    return resData;
  }

  /** packet interface  - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** Receive a single packet from the wire, and determine
   *  what to do with it. The packet has several possible
   *  processing options!
   *  - packet is response to an outgoing transaction
   *  - packet is a message that we handle
   *  - packet is a message that we forward
   *  - packet is unknown message so we return it with error
   *  If the packet has the rsvp flag set, we need to return
   *  it to the source address in the packet with any data
   */
  async pktReceive(pkt: NetPacket) {
    try {
      const fn = 'pktReceive:';
      // is this a response to a transaction?
      if (pkt.isResponse()) {
        if (pkt.src_addr === this.urnet_addr) this.pktResolveRequest(pkt);
        else this.pktSendResponse(pkt);
        return;
      }
      // otherwise it's a request
      if (!pkt.isRequest()) {
        LOG.error(this.urnet_addr, fn, `invalid packet`, pkt);
        return;
      }
      // if it's a ping, we just want to return number of
      // messages this server knows about.
      if (pkt.msg_type === 'ping') {
        const addrs = this.getAddressesForMessage(pkt.msg);
        const handlers = this.getHandlersForMessage(pkt.msg);
        if (handlers.length > 0) addrs.push(this.urnet_addr);
        pkt.setData(addrs);
        this.pktSendResponse(pkt);
        return;
      }
      // if it's a signal, this is not an rsvp, but log it
      if (pkt.msg_type === 'signal') {
        if (DBG) LOG(_PKT(this, fn, '-recv-sig-', pkt), pkt.data);
        // will be handled normally and get routed
      }
      //
      const { msg } = pkt;
      let retData;
      if (this.msg_handlers.has(msg)) {
        retData = await this.pktAwaitHandlers(pkt);
      } else if (this.srv_msgs.has(msg)) {
        retData = await this.pktAwaitRequest(pkt);
      } else {
        LOG.error(this.urnet_addr, fn, `unknown message '${msg}'`, pkt);
        retData = { error: `unknown message '${msg}'` };
      }

      if (!pkt.isRsvp()) return;

      // if we got this far, then we have data to return
      if (pkt.msg_type !== 'call') pkt.data = true;
      else {
        retData = NormalizeData(retData);
        pkt.setData(retData);
      }
      this.pktSendResponse(pkt);
    } catch (err) {
      // format the error message to be nicer to read
      LOG.error(err.message);
      LOG.info(err.stack.split('\n').slice(1).join('\n').trim());
    }
  }

  /** Send a single packet on all available interfaces based on the
   *  message. And endpoint can be a client (with gateway) or a server
   *  (with clients). Use for initial outgoing packets only.
   */
  pktSendRequest(pkt: NetPacket) {
    const fn = 'pktSendRequest:';
    // sanity checks
    if (pkt.src_addr === undefined) throw Error(`${fn}src_addr undefined`);
    if (this.urnet_addr === undefined) throw Error(`${fn} urnet_addr undefined`);
    if (pkt.hop_seq.length !== 0) throw Error(`${fn} pkt must have no hops yet`);
    if (pkt.msg_type !== 'ping' && pkt.data === undefined)
      throw Error(`${fn} data undefined`);
    // prep for sending
    if (DBG) LOG(_PKT(this, fn, '-send-req-', pkt), pkt.data);
    const { gateway, clients } = this.pktGetSocketRouting(pkt);
    // send on the wire
    pkt.addHop(this.urnet_addr);
    if (gateway) gateway.send(pkt);
    if (Array.isArray(clients)) {
      clients.forEach(sock => sock.send(pkt));
    }
  }

  /** Given a packet and a socket, clone it and then return a
   *  promise that sends it out on all network interfaces. This
   *  is used by server endpoints as a utility to send a clone
   *  packet on a particular socket to a particular address.
   */
  pktQueueRequest(pkt: NetPacket, sock: EP_Socket): Promise<any> {
    const fn = 'pktQueueRequest:';
    const clone = this.clonePacket(pkt);
    clone.id = this.assignPacketId(clone);
    const hash = GetPacketHashString(clone);
    if (this.transactions.has(hash)) throw Error(`${fn} duplicate hash ${hash}`);
    const p = new Promise((resolve, reject) => {
      const meta = { msg: pkt.msg, uaddr: pkt.src_addr };
      this.transactions.set(hash, { resolve, reject, ...meta });
      sock.send(clone);
    });
    return p;
  }

  /** Resolve a transaction when a packet is returned to it through
   *  pktReceive(pkt) which determines that it is a returning transaction
   */
  pktResolveRequest(pkt: NetPacket) {
    const fn = 'pktResolveRequest:';
    // if (DBG) LOG(this.urnet_addr, 'resolving', pkt.msg);
    if (pkt.hop_rsvp !== true) throw Error(`${fn} packet is not RSVP`);
    if (pkt.hop_dir !== 'res') throw Error(`${fn} packet is not a response`);
    if (pkt.hop_seq.length < 2) throw Error(`${fn} packet has no hops`);
    const hash = GetPacketHashString(pkt);
    const resolver = this.transactions.get(hash);
    if (!resolver) throw Error(`${fn} no resolver for hash ${hash}`);
    const { resolve, reject } = resolver;
    const { data } = pkt;
    if (DBG) LOG(_PKT(this, fn, '-recv-res-', pkt), pkt.data);
    if (pkt.err) reject(pkt.err);
    else resolve(data);
    this.transactions.delete(hash);
  }

  /** Return a packet to its source address. If this endpoint is a server,
   *  then it might have the socket stored. Otherwise, if this endpoint is
   *  also a client of another server, pass the back through the gateway.
   *  This is used by server endpoints to return packets to clients.
   */
  pktSendResponse(pkt: NetPacket) {
    const fn = 'pktSendResponse:';
    // check for validity
    if (pkt.hop_rsvp !== true) throw Error(`${fn} packet is not RSVP`);
    if (pkt.hop_dir !== 'req') throw Error(`${fn} packet is not a request`);
    if (pkt.hop_seq.length < 1) throw Error(`${fn} packet has no hops`);
    // prep for return
    pkt.setDir('res');
    pkt.addHop(this.urnet_addr);
    if (DBG) LOG(_PKT(this, fn, '-send-res-', pkt), pkt.data);
    const { gateway, src_addr } = this.pktGetSocketRouting(pkt);
    if (this.isServer()) {
      // if (DBG) LOG(this.urnet_addr, 'returning to', src_addr);
      const socket = this.getClient(src_addr);
      if (socket) socket.send(pkt);
      // responses go to a single address; if we found it here,
      // then we're done
      return;
    }
    // if we have a gateway, pass the buck onward and let it
    // find the client
    if (gateway) {
      gateway.send(pkt);
      return;
    }
    if (DBG) LOG(`${fn} unroutable packet`, pkt);
  }

  /** Start a transaction, which returns promises to await. This method
   *  is a queue that uses Promises to wait for the return, which is
   *  triggered by a returning packet in pktReceive(pkt).
   */
  async pktAwaitRequest(pkt: NetPacket) {
    const fn = 'pktAwaitRequest:';
    if (pkt.hop_dir !== 'req') throw Error(`${fn} packet is not a request`);
    // prep for return
    const { gateway, clients } = this.pktGetSocketRouting(pkt);
    const promises = [];
    if (gateway) {
      if (DBG) LOG(_PKT(this, fn, '-wait-req-', pkt), pkt.data);
      promises.push(this.pktQueueRequest(pkt, gateway));
    }
    if (Array.isArray(clients)) {
      if (DBG) LOG(_PKT(this, fn, '-wait-req-', pkt), pkt.data);
      clients.forEach(sock => {
        // if (DBG) LOG(this.urnet_addr, 'await remote', pkt.msg, sock.uaddr);
        promises.push(this.pktQueueRequest(pkt, sock));
      });
    }
    let data = await Promise.all(promises);
    if (Array.isArray(data) && data.length === 1) data = data[0];
    if (DBG) LOG(_PKT(this, fn, '-retn-req-', pkt), pkt.data);
    return data;
  }

  /** Start a handler call, which might have multiple implementors.
   *  Returns data from all handlers as an array or a single item
   */
  async pktAwaitHandlers(pkt: NetPacket) {
    const fn = 'pktAwaitHandlers:';
    const { msg } = pkt;
    const handlers = this.getHandlersForMessage(msg);
    if (handlers.length === 0)
      return Promise.resolve({ error: `no handler for '${msg}'` });
    const promises = [];
    if (DBG) LOG(_PKT(this, fn, '-wait-hnd-', pkt), pkt.data);
    handlers.forEach(handler => {
      promises.push(
        new Promise((resolve, reject) => {
          try {
            resolve(handler({ ...pkt.data })); // copy of data
          } catch (err) {
            reject(err);
          }
        })
      );
    });
    let data = await Promise.all(promises);
    if (Array.isArray(data) && data.length === 1) data = data[0];
    if (DBG) LOG(_PKT(this, fn, '-retn-hnd-', pkt), pkt.data);
    return data;
  }

  /** return array of sockets to use for sending packet,
   *  based on pkt.msg and pkt.src_addr
   */
  pktGetSocketRouting(pkt: NetPacket): PktRoutingInfo {
    const fn = 'pktGetSocketRouting:';
    const { msg, src_addr } = pkt;
    if (!IsNetMessage(msg)) throw Error(`${fn} '${msg}' is invalid message`);
    // check if there's a gateway first and add it
    const gateway = this.cli_gateway;
    const self_addr = this.urnet_addr;
    // check if we're a server
    const msg_list = this.getAddressesForMessage(msg);
    const clients = [];
    msg_list.forEach(uaddr => {
      if (uaddr === this.urnet_addr) return; // skip self
      const socket = this.getClient(uaddr);
      if (socket) clients.push(socket);
    });
    return {
      msg,
      src_addr,
      self_addr,
      gateway,
      clients
    };
  }

  // end class
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NetEndpoint;
