/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NetEndpoint is a connection object that talks to the UR Messaging Network.
  Both servers and clients can use this class to build connections over
  different transports (HTTP, WS, etc).

  Server-Only API
  - configAsServer(srv_addr: NP_Address): void
  - addClient(socket: I_NetSocket): NP_Address
  - removeClient(uaddr: NP_Address): NP_Address
  - _ingestClientPacket(jsonData: string, socket: I_NetSocket): NetPacket

  Client-Only API
  - connectAsClient(gateway: I_NetSocket, auth: TClientAuth): Promise<NP_Data>
  - disconnectAsClient(): void
  - _ingestServerPacket(jsonData: string, socket: I_NetSocket): void

  Shared API
  - addMessageHandler(msg: NP_Msg, handler: HandlerFunc): void
  - call(msg: NP_Msg, data: NP_Data): Promise<NP_Data>
  - send(msg: NP_Msg, data: NP_Data): Promise<NP_Data>
  - signal(msg: NP_Msg, data: NP_Data): void
  - ping(msg: NP_Msg): Promise<NP_Data>
  - netCall(msg: NP_Msg, data: NP_Data): Promise<NP_Data>
  - netSend(msg: NP_Msg, data: NP_Data): Promise<NP_Data>
  - netSignal(msg: NP_Msg, data: NP_Data): void
  - netPing(msg: NP_Msg): Promise<NP_Data>

  See https://github.com/dsriseah/ursys/wiki/URSYS-Network-Concepts for
  documentation on using this class

  -- CROSS PLATFORM IMPORT TRICKS -------------------------------------------

  When using from nodejs mts file, you can only import 'default', which is the
  NetEndpoint class. If you want to import other exports, you need to
  destructure the .default prop; to access the NetPacket class do this:

    import EP_DEFAULT from './class-urnet-endpoint.ts';
    const NetEndpoint = EP_DEFAULT.default; // note .default

  You can import the types as usual, though:

    import EP_DEFAULT, { I_NetSocket } from './types-urnet.ts';

  This is not required when importing from another .ts typescript file.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR } from '@ursys/core';
import NetPacket from './class-urnet-packet.ts';
import { GetPacketHashString, SkipOriginType } from './types-urnet.ts';
import { IsLocalMessage, IsNetMessage, IsValidAddress } from './types-urnet.ts';
import { UADDR_NONE, AllocateAddress } from './types-urnet.ts';
import { NormalizeMessage, NormalizeData } from './types-urnet.ts';

/// TYPE DECLARATIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import type { NP_ID, NP_Address, NP_Msg, NP_Data, NP_Hash } from './types-urnet.ts';
import type { I_NetSocket } from './class-urnet-socket.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;
const PR =
  typeof process !== 'undefined'
    ? 'EndPoint'.padEnd(13) // nodejs
    : 'EndPoint'.padEnd(11); // browser
const LOG = console.log.bind(console);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let AGE_INTERVAL = 1000; // milliseconds
let AGE_MAX = 60 * 30; // 30 minutes

/// LOCAL TYPES ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type HandlerFunc = (data: NP_Data) => NP_Data | void;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type HandlerSet = Set<HandlerFunc>; // set(handler1, handler2, ...)
type AddressSet = Set<NP_Address>; // ['UA001', 'UA002', ...]
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type SocketMap = Map<NP_Address, I_NetSocket>; //
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
  gateway: I_NetSocket;
  clients: I_NetSocket[];
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type TClientAuth = {
  identity: string;
  secret: string;
};
type TClientReg = {
  name: string;
  type: string;
};
type TClientDeclare = {
  msg_list: NP_Msg[];
};

/// UTILITY FUNCTIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** utility to dump packet info to console */
function _PKT(ep: NetEndpoint, fn: string, text: string, pkt: NetPacket) {
  let { id, msg, msg_type } = pkt;
  if (id === undefined && msg_type === '_reg') id = `pkt[${UADDR_NONE}:0]`;
  let out = `${ep.uaddr} ${text} '${msg}' `.padEnd(40, '~');
  out += ` ${id.padEnd(12)} ${fn}`;
  return out;
}

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NetEndpoint {
  handled_msgs: HandlerMap; // msg->handlers[]
  //
  uaddr: NP_Address; // the address for this endpoint
  client_socks: SocketMap; // uaddr->I_NetSocket
  remoted_msgs: ForwardMap; // msg->uaddr[]
  transactions: TransactionMap; // hash->resolver
  //
  cli_counter: number; // counter for generating unique uaddr
  pkt_counter: number; // counter for generating packet ids
  //
  cli_gateway: I_NetSocket; // gateway to server
  cli_sck_timer: any; // timer for checking socket age
  cli_ident: any; // client credentials to request authentication
  cli_auth: any; // client access token for
  cli_reg: TClientReg; // client registration status

  constructor() {
    //
    this.uaddr = undefined; // assigned address
    // endpoint as client
    this.cli_ident = undefined; // client identity
    this.cli_auth = undefined; // client access token
    this.cli_reg = undefined; // client registration status
    this.cli_gateway = undefined; // client gateway
    // endpoint as server
    this.client_socks = undefined;
    this.remoted_msgs = undefined;
    // endpoint message handling support
    this.handled_msgs = new Map<NP_Msg, HandlerSet>();
    this.transactions = new Map<NP_Hash, PktResolver>();
    // runtime packet, socket counters
    this.pkt_counter = 0;
    this.cli_counter = 0;
    this.cli_sck_timer = null; // socket aging placeholder
  }

  /** API: initialize this endpoint's client server, providing a hardcoded
   *  server UADDR that is distinct from those used by client pools
   */
  configAsServer(srv_addr: NP_Address) {
    const fn = 'configAsServer:';
    if (!IsValidAddress(srv_addr)) throw Error(`${fn} invalid srv_addr ${srv_addr}`);
    if (this.uaddr && this.uaddr !== srv_addr) {
      let err = `${fn} uaddr ${this.uaddr} already set.`;
      throw Error(err);
    }
    this.uaddr = srv_addr;
    // make sure we don't nuke
    if (this.client_socks !== undefined)
      LOG(PR, this.uaddr, `already configured`, [...this.client_socks.keys()]);
    this.client_socks = new Map<NP_Address, I_NetSocket>();
    if (this.remoted_msgs !== undefined)
      LOG(PR, this.uaddr, `already configured`, [...this.remoted_msgs.keys()]);
    this.remoted_msgs = new Map<NP_Msg, AddressSet>();
    // add default service message handlers here
    this.addMessageHandler('SRV:REFLECT', data => {
      data.info = `built-in service`;
      return data;
    });
  }

  /** API: Server data event handler for incoming data from a client connection.
   *  This is the mirror to _ingestServerPacket() function used by client endpoints.
   *  This is the entry point for incoming data from clients */
  _ingestClientPacket(jsonData: string, socket: I_NetSocket): NetPacket {
    let pkt = this.newPacket().deserialize(jsonData);
    let retPkt: NetPacket;

    // 1. protocol: authentication packet (once)
    retPkt = this._handleAuthRequest(pkt, socket);
    if (retPkt) return retPkt; // ...to client _ingestServerPacket()

    /** from this point forward, packets are authenticated **/

    // 2. is this a special registration packet (anytime)
    retPkt = this._handleRegRequest(pkt, socket);
    if (retPkt) return retPkt; // ...to client _ingestServerPacket()

    // 3. is this a special declaration packet (anytime)
    retPkt = this._handleDeclRequest(pkt, socket);
    if (retPkt) return retPkt; // ...to client _ingestServerPacket()

    // 4. otherwise, handle the packet normally through the message interface
    this.dispatchPacket(pkt);
  }

  /** API: when a client connects to this endpoint, register it as a socket and
   *  allocate a uaddr for it */
  addClient(socket: I_NetSocket): NP_Address {
    const fn = 'addClient:';
    if (typeof socket !== 'object') throw Error(`${fn} invalid socket`);
    if (socket.uaddr !== undefined) throw Error(`${fn} socket already added`);
    const new_uaddr = AllocateAddress({ prefix: 'UR_' });
    socket.uaddr = new_uaddr;
    socket.age = 0;
    socket.auth = undefined; // filled-in by socket authorization
    socket.msglist = undefined; // filled-in by message registration
    this.client_socks.set(new_uaddr, socket);
    // LOG(PR,this.uaddr, `socket ${new_uaddr} registered`);
    return new_uaddr;
  }

  /** API: when a client disconnects from this endpoint, delete its socket and
   *  remove all message forwarding */
  removeClient(uaddr_obj: NP_Address | I_NetSocket): NP_Address {
    const fn = 'removeClient:';
    let uaddr = typeof uaddr_obj === 'string' ? uaddr_obj : uaddr_obj.uaddr;
    if (typeof uaddr !== 'string') {
      LOG(PR, `${fn} invalid uaddr ${typeof uaddr}`);
      return undefined;
    }
    if (!this.client_socks.has(uaddr)) throw Error(`${fn} unknown uaddr ${uaddr}`);
    // remoted_msgs is msg->set of uaddr, so iterate over all messages
    this._deleteRemoteMessagesForAddress(uaddr);
    // delete the socket
    this.client_socks.delete(uaddr);
    // LOG(PR,this.uaddr, `socket ${uaddr} deleted`);
    return uaddr;
  }

  /** API: given a uaddr, return the socket */
  getClient(uaddr: NP_Address): I_NetSocket {
    const fn = 'getClient:';
    if (this.client_socks === undefined) return undefined;
    return this.client_socks.get(uaddr);
  }

  /** API: start a timer to check for dead sockets */
  enableClientAging(activate: boolean) {
    const fn = 'enableClientAging:';
    if (activate) {
      if (this.cli_sck_timer) clearInterval(this.cli_sck_timer);
      this.cli_sck_timer = setInterval(() => {
        this.client_socks.forEach((socket, uaddr) => {
          socket.age += AGE_INTERVAL;
          if (socket.age > AGE_MAX) {
            LOG(PR, this.uaddr, `socket ${uaddr} expired`);
            // put stuff here
          }
        });
      }, AGE_INTERVAL);
      return;
    }
    if (this.cli_sck_timer) clearInterval(this.cli_sck_timer);
    this.cli_sck_timer = null;
    LOG(PR, this.uaddr, `timer stopped`);
  }

  /** support: handle auth packet if the session.auth is not defined */
  _handleAuthRequest(pkt: NetPacket, socket: I_NetSocket): NetPacket {
    if (!socket.authenticated()) {
      pkt.setDir('res');
      pkt.addHop(this.uaddr);
      const error = pkt.isBadAuthPkt();
      if (error) {
        console.error(PR, error);
        pkt.data = { error };
        return pkt;
      }
      /** placeholder authentication check **/
      const { identity, secret } = pkt.data;
      if (identity) {
        socket.auth = identity;
        pkt.data = { uaddr: socket.uaddr, cli_auth: 'ServerProvidedAuthToken' };
      } else {
        pkt.data = { error: 'invalid identity' };
      }
      /** end placeholder **/
      return pkt;
    }
    return undefined;
  }

  /** support: handle registration packet */
  _handleRegRequest(pkt: NetPacket, socket: I_NetSocket): NetPacket {
    if (!pkt.isBadRegPkt(socket)) {
      pkt.setDir('res');
      pkt.addHop(this.uaddr);
      if (pkt.msg !== 'SRV:REG') {
        pkt.data = { error: `invalid reg packet ${pkt.msg}` };
        return pkt;
      }
      if (pkt.src_addr !== socket.uaddr) {
        LOG(PR, 'src address mismatch', pkt.src_addr, '!= sock', socket.uaddr);
        pkt.data = { error: 'address mismatch' };
        return pkt;
      }
      const { name, type } = pkt.data;
      if (name) {
        const { uaddr } = socket;
        pkt.data = { ok: true, status: `registered name:${name} type:${type}` };
        return pkt;
      }
      pkt.data = { error: 'registration failed' };
      return pkt;
    }
    return undefined;
  }

  /** support: handle client dynamic definitions */
  _handleDeclRequest(pkt: NetPacket, socket: I_NetSocket): NetPacket {
    if (pkt.msg_type === '_decl') {
      pkt.setDir('res');
      pkt.addHop(this.uaddr);
      if (pkt.msg !== 'SRV:DEF') {
        console.log('invalid def packet', pkt.msg);
        pkt.data = { error: `invalid def packet ${pkt.msg}` };
        return pkt;
      }
      // currently support msg_list only
      pkt.data.status = [];
      const { msg_list } = pkt.data;
      const { uaddr } = socket;
      if (Array.isArray(msg_list)) {
        this.registerRemoteMessagesToAddress(uaddr, msg_list);
        pkt.data.status.push(`registered ${msg_list.length} messages`);
      }
      //
      // ... other definitions can go here
      //
      if (pkt.data.status.length === 0) {
        pkt.data = { error: 'no definitions' };
        return pkt;
      }
    }
    return undefined;
  }

  /** client connection handshaking - - - - - - - - - - - - - - - - - - - - **/

  /** API: client endpoints need to have an "address" assigned to them,
   *  otherwise the endpoint will not work */
  async connectAsClient(gateway: I_NetSocket, auth: TClientAuth): Promise<NP_Data> {
    const fn = 'connectAsClient:';
    if (gateway && typeof gateway.send === 'function') {
      this.cli_gateway = gateway;
    } else throw Error(`${fn} invalid gateway`);
    if (auth) {
      const pkt = this.newAuthPacket(auth);
      const { msg } = pkt;

      /** MAGIC **/
      /** await promise, which resolves when server responds to the auth packet */
      let authData: NP_Data = await this._queueTransaction(pkt, gateway);
      /** resumes when _handleAuthResponse() resolves the transaction **/
      /** END MAGIC **/

      // handle authdata
      const { uaddr, cli_auth, error } = authData;
      if (error) {
        LOG(PR, `${fn} error:`, error);
        return false;
      }
      if (!IsValidAddress(uaddr)) throw Error(`${fn} invalid uaddr ${uaddr}`);
      this.uaddr = uaddr;
      if (cli_auth === undefined) throw Error(`${fn} invalid cli_auth`);
      this.cli_auth = cli_auth;
      LOG(PR, 'AUTHENTICATED', uaddr, cli_auth);
      this.cli_auth = cli_auth;
      return authData;
    }
    throw Error(`${fn} arg must be identity`);
  }

  /** API: Client data event handler for incoming data from the gateway. This is
   *  the mirror to _ingestClientPacket() function that is used by servers. This
   *  is entry point for incoming data from server
   */
  _ingestServerPacket(jsonData: string, socket: I_NetSocket): void {
    const fn = '_ingestServerPacket:';
    const pkt = this.newPacket().deserialize(jsonData);
    // 1. is this connection handshaking for clients?
    if (this.cli_gateway) {
      // only clients have this.cli_gateway socket defined
      // special packets are handled separately from the normal message dispatcher
      // the parallel _ingestClientPacket() function for servers are who return
      // these response packets
      if (this._handleAuthResponse(pkt)) return;
      if (this._handleRegResponse(pkt)) return;
      if (this._handleDeclResponse(pkt)) return;
    }
    // 2. otherwise handle the message interface normally
    this.dispatchPacket(pkt);
  }

  /** API: register client with client endpoint info */
  async declareClientProperties(info: TClientReg): Promise<NP_Data> {
    const fn = 'declareClientProperties:';
    if (!this.cli_gateway) throw Error(`${fn} no gateway`);
    const pkt = this.newRegPacket();
    pkt.data = { ...info };

    /** MAGIC **/
    /** suspend through transaction **/
    let regData: NP_Data = await this._queueTransaction(pkt, this.cli_gateway);
    /** resumes when _handleAuthResponse() resolves the transaction **/
    /** END MAGIC **/

    const { ok, status, error } = regData;
    if (error) {
      LOG(PR, `${fn} error:`, error);
      return regData;
    }
    if (ok) {
      LOG(PR, 'REGISTERED', status);
      this.cli_reg = info; // save registration info
      return regData;
    }
    throw Error(`${fn} unexpected response`, regData);
  }

  /** API: declare client messages */
  async declareClientMessages() {
    const fn = 'declareClientMessages:';
    const msg_list = this.getNetMessageNames();
    const response = await this._declareClientServices({ msg_list });
    const { msg_list: rmsg_list, error } = response;
    if (error) {
      LOG(PR, `${fn} error:`, error);
    } else {
      LOG(PR, `DECLARED ${rmsg_list.length} messages`);
      rmsg_list.forEach(msg => LOG(PR, `  '${msg}'`));
    }
    return response;
  }

  /** support: handle authentication response packet directly rather than through
   *  the netcall interface in dispatchPacket() */
  _handleAuthResponse(pkt: NetPacket): boolean {
    const fn = '_handleAuthResponse:';
    if (pkt.msg_type !== '_auth') return false;
    if (pkt.hop_dir !== 'res') return false;
    this.resolveTransaction(pkt);
    // auth resumes in connectAsClient() magical await requestAuth
    return true;
  }

  /** support: handle registration response packet directly rather than through
   *  the netcall interface in dispatchPacket() */
  _handleRegResponse(pkt: NetPacket): boolean {
    const fn = '_handleRegResponse:';
    if (pkt.msg_type !== '_reg') return false;
    if (pkt.hop_dir !== 'res') return false;
    if (pkt.src_addr !== this.uaddr) throw Error(`${fn} misaddressed packet???`);
    // resuming from declareClientProperties() await requestReg
    this.resolveTransaction(pkt);
    return true;
  }

  /** support: handle declaration packet */
  _handleDeclResponse(pkt: NetPacket): boolean {
    const fn = '_handleDeclResponse:';
    if (pkt.msg_type !== '_decl') return false;
    if (pkt.hop_dir !== 'res') return false;
    if (pkt.src_addr !== this.uaddr) throw Error(`${fn} misaddressed packet???`);
    // resuming from _declareClientServices() await requestReg
    this.resolveTransaction(pkt);
    return true;
  }

  /** message declaration and invocation - - - - - - - - - - - - - - - - - -**/

  /** API: declare a message handler for a given message */
  addMessageHandler(msg: NP_Msg, handler: HandlerFunc) {
    const fn = 'addMessageHandler:';
    // LOG(PR,this.uaddr, `reg handler '${msg}'`);
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    if (msg !== msg.toUpperCase()) throw Error(`${fn} msg must be uppercase`);
    if (typeof handler !== 'function') throw Error(`${fn} invalid handler`);
    const key = NormalizeMessage(msg);
    if (!this.handled_msgs.has(key))
      this.handled_msgs.set(key, new Set<HandlerFunc>());
    const handler_set = this.handled_msgs.get(key);
    handler_set.add(handler);
  }

  /** API: remove a previously declared message handler for a given message */
  deleteMessageHandler(msg: NP_Msg, handler: HandlerFunc) {
    const fn = 'deleteMessageHandler:';
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    if (typeof handler !== 'function') throw Error(`${fn} invalid handler`);
    const key = NormalizeMessage(msg);
    const handler_set = this.handled_msgs.get(key);
    if (!handler_set) throw Error(`${fn} unexpected empty set '${key}'`);
    handler_set.delete(handler);
  }

  /** API: call local message registered on this endPoint only */
  async call(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = 'call:';
    if (!IsLocalMessage(msg)) throw Error(`${fn} '${msg}' not local (drop prefix)`);
    const handlers = this.getMessageHandlers(msg);
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

  /** API: send local message registered on this endPoint only, returning no data */
  async send(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = 'send:';
    if (!IsLocalMessage(msg)) throw Error(`${fn} '${msg}' not local (drop prefix)`);
    const handlers = this.getMessageHandlers(msg);
    if (handlers.length === 0)
      return Promise.resolve({ error: `no handler for '${msg}'` });
    handlers.forEach(handler => {
      handler({ ...data }); // copy of data
    });
    return Promise.resolve(true);
  }

  /** API: signal local message registered on this endPoint only, returning no data.
   */
  signal(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = 'signal:';
    if (!IsLocalMessage(msg)) throw Error(`${fn} '${msg}' not local (drop prefix)`);
    const handlers = this.getMessageHandlers(msg);
    if (handlers.length === 0)
      return Promise.resolve({ error: `no handler for '${msg}'` });
    handlers.forEach(handler => {
      handler({ ...data }); // copy of data
    });
  }

  /** API: ping local message, return with number of handlers */
  async ping(msg: NP_Msg): Promise<NP_Data> {
    const fn = 'ping:';
    if (!IsLocalMessage(msg)) throw Error(`${fn} '${msg}' not local (drop prefix)`);
    const handlers = this.getMessageHandlers(msg);
    return Promise.resolve(handlers.length);
  }

  /** API: call net message, resolves when packet returns from server with data */
  async netCall(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = 'netCall:';
    if (!IsNetMessage(msg)) throw Error(`${fn} '${msg}' missing NET prefix`);
    const pkt = this.newPacket(msg, data);
    pkt.setMeta('call', {
      dir: 'req',
      rsvp: true
    });
    /** MAGIC **/
    let resData = await new Promise((resolve, reject) => {
      const meta = { msg, uaddr: this.uaddr }; // this is transaction meta, not pkt meta
      // note: this is similar to _queueTransaction() but without the extra checks
      const hash = GetPacketHashString(pkt);
      if (this.transactions.has(hash)) throw Error(`${fn} duplicate hash ${hash}`);
      this.transactions.set(hash, { resolve, reject, ...meta });
      try {
        this.initialSend(pkt);
      } catch (err) {
        reject(err);
      }
    });
    /** end MAGIC **/
    return resData;
  }

  /** API: send net message, returning promise that will resolve when the server has
   *  received and processed/forwarded the message */
  async netSend(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    const fn = 'netSend:';
    if (!IsNetMessage(msg)) throw Error(`${fn} '${msg}' missing NET prefix`);
    const pkt = this.newPacket(msg, data);
    pkt.setMeta('send', {
      dir: 'req',
      rsvp: true
    });
    /** MAGIC **/
    let resData = await new Promise((resolve, reject) => {
      // note: this is similar to _queueTransaction() but without the extra checks
      const hash = GetPacketHashString(pkt);
      if (this.transactions.has(hash)) throw Error(`${fn} duplicate hash ${hash}`);
      const meta = { msg, uaddr: this.uaddr }; // this is transaction meta, not pkt meta
      this.transactions.set(hash, { resolve, reject, ...meta });
      try {
        this.initialSend(pkt);
      } catch (err) {
        reject(err);
      }
    });
    /** end MAGIC **/
    return resData;
  }

  /** API: signal net message, returning void (not promise)
   *  used for the idea of 'raising signals' as opposed to 'sending data'. It
   *  resolves immediately when the signal is sent, and does not check with the
   *  server  */
  netSignal(msg: NP_Msg, data: NP_Data): void {
    const fn = 'netSignal:';
    if (!IsNetMessage(msg)) throw Error(`${fn} '${msg}' missing NET prefix`);
    const pkt = this.newPacket(msg, data);
    pkt.setMeta('signal', {
      dir: 'req',
      rsvp: false
    });
    /** no magic, just send and forget **/
    this.initialSend(pkt);
  }

  /** API: returns with a list of uaddr from the server which is the uaddr of the
   *  all clients that have registered for the message */
  async netPing(msg: NP_Msg): Promise<NP_Data> {
    const fn = 'netPing:';
    if (!IsNetMessage(msg)) throw Error(`${fn} '${msg}' missing NET prefix`);
    const pkt = this.newPacket(msg);
    pkt.setMeta('ping', {
      dir: 'req',
      rsvp: true
    });
    /** MAGIC **/
    let resData = await new Promise((resolve, reject) => {
      // note: this is similar to _queueTransaction() but without the extra checks
      const hash = GetPacketHashString(pkt);
      if (this.transactions.has(hash)) throw Error(`${fn} duplicate hash ${hash}`);
      const meta = { msg, uaddr: this.uaddr }; // this is transaction meta, not pkt meta
      this.transactions.set(hash, { resolve, reject, ...meta });
      try {
        this.initialSend(pkt);
      } catch (err) {
        reject(err);
      }
    });
    /** end MAGIC **/
    return resData;
  }

  /** packet utilities  - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** declare client attributes is a generic declaration packet that can contain
   *  any number of attributes that the client wants to declare to the server.
   *  for example, see declareClientMessages() */
  async _declareClientServices(def: TClientDeclare): Promise<NP_Data> {
    const fn = '_declareClientServices:';
    if (!this.cli_gateway) throw Error(`${fn} no gateway`);
    const pkt = this.newDeclPacket();
    pkt.data = { ...def };
    const { msg } = pkt;

    /** MAGIC **/
    /** suspend through transaction **/
    let declared: NP_Data = await this._queueTransaction(pkt, this.cli_gateway);
    /** resumes when _handleAuthResponse() resolves the transaction **/
    /** END MAGIC **/

    const { error, status } = declared;
    if (error) {
      LOG(PR, `${fn} error:`, error);
      return declared;
    }
    if (status) return declared;
    // neither error or status, so something went wrong
    throw Error(`${fn} unexpected response`, declared);
  }

  /** shuts down the gateway to server, forcing close
   *  Chrome 125.0.6422.77 doesn't seem to send a close frame on reload
   *  Firefox 126.0 doesn't fire beforeunload
   */
  disconnectAsClient() {
    if (this.cli_gateway === undefined) return;
    if (typeof this.cli_gateway.close === 'function') {
      this.cli_gateway.close();
    }
    this.cli_gateway = undefined;
  }

  /** endpoint lookup tables - - - - - - - - - - - - - - - - - - - -  - - - **/

  /** return true if the message is handled anywhere */
  packetHasHandler(pkt: NetPacket): boolean {
    const fn = 'messageHasHandler:';
    const a = this.getMessageHandlers(pkt.msg).length > 0;
    const b = this.isServer() && this.getMessageAddresses(pkt.msg).length > 0;
    return a || b;
  }

  /** get list of messages allocated to a uaddr */
  getMessagesForAddress(uaddr: NP_Address): NP_Msg[] {
    const fn = 'getMessagesForAddress:';
    if (!this.isServer()) return []; // invalid for client-only endpoints
    if (typeof uaddr !== 'string') throw Error(`${fn} invalid uaddr`);
    if (!this.client_socks.has(uaddr)) throw Error(`${fn} unknown uaddr ${uaddr}`);
    // remoted_msgs is msg->set of uaddr, so iterate over all messages
    const msg_list: NP_Msg[] = [];
    this.remoted_msgs.forEach((addr_set, msg) => {
      if (addr_set.has(uaddr)) msg_list.push(msg);
    });
    return msg_list;
  }

  /** get list of UADDRs that a message is forwarded to */
  getMessageAddresses(msg: NP_Msg): NP_Address[] {
    const fn = 'getMessageAddresses:';
    if (!this.isServer()) return []; // invalid for client-only endpoints
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    const key = NormalizeMessage(msg);
    if (!this.remoted_msgs.has(key))
      this.remoted_msgs.set(key, new Set<NP_Address>());
    const addr_set = this.remoted_msgs.get(key);
    const addr_list = Array.from(addr_set);
    return addr_list;
  }

  /** return list of local handlers for given message */
  getMessageHandlers(msg: NP_Msg): HandlerFunc[] {
    const fn = 'getMessageHandlers:';
    if (this.handled_msgs === undefined) return [];
    if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
    const key = NormalizeMessage(msg);
    if (!this.handled_msgs.has(key))
      this.handled_msgs.set(key, new Set<HandlerFunc>());
    const handler_set = this.handled_msgs.get(key);
    if (!handler_set) throw Error(`${fn} unexpected empty set '${key}'`);
    const handler_list = Array.from(handler_set);
    return handler_list;
  }

  /** informational routing information - - - - - - - - - - - - - - - - - - **/

  /** return handler list for this endpoint */
  getMessageNames(): NP_Msg[] {
    // get message keys from handled_msgs
    const list = [];
    this.handled_msgs.forEach((handler_set, key) => {
      list.push(key);
    });
    return list;
  }

  /** return only net messages */
  getNetMessageNames(): NP_Msg[] {
    const list = [];
    this.handled_msgs.forEach((handler_set, key) => {
      if (IsNetMessage(key)) list.push(key);
    });
    return list;
  }

  /** return list of active transactions for this endpoint */
  getPendingTransactions(): { hash: NP_Hash; msg: NP_Msg; uaddr: NP_Address }[] {
    // return array of objects { hash, msg, uaddr }
    const fn = 'getPendingTransactions:';
    const list = [];
    this.transactions.forEach((transaction, hash) => {
      const { msg, uaddr } = transaction;
      list.push({ hash, msg, uaddr });
    });
    return list;
  }

  /** server endpoints manage list of messages in clients  - - - - -  - - - **/

  /** register a message handler for a given message to passed uaddr */
  registerRemoteMessagesToAddress(uaddr: NP_Address, msgList: NP_Msg[]) {
    const fn = 'registerRemoteMessagesToAddress:';
    if (typeof uaddr !== 'string') throw Error(`${fn} invalid uaddr`);
    if (!this.client_socks.has(uaddr)) throw Error(`${fn} unknown uaddr ${uaddr}`);
    msgList.forEach(msg => {
      if (typeof msg !== 'string') throw Error(`${fn} invalid msg`);
      if (msg !== msg.toUpperCase()) throw Error(`${fn} msg must be uppercase`);
      const key = NormalizeMessage(msg);
      if (!this.remoted_msgs.has(key))
        this.remoted_msgs.set(key, new Set<NP_Address>());
      const msg_set = this.remoted_msgs.get(key);
      msg_set.add(uaddr);
      // LOG(PR,this.uaddr, `reg remote ${key} for ${uaddr}`);
    });
  }

  /** unregister message handlers for a given message to passed uaddr */
  _deleteRemoteMessagesForAddress(uaddr: NP_Address): NP_Msg[] {
    const fn = '_deleteRemoteMessagesForAddress:';
    if (typeof uaddr !== 'string') throw Error(`${fn} invalid uaddr`);
    if (!this.client_socks.has(uaddr)) throw Error(`${fn} unknown uaddr ${uaddr}`);
    const removed = [];
    this.remoted_msgs.forEach((msg_set, key) => {
      if (msg_set.has(uaddr)) removed.push(key);
      msg_set.delete(uaddr);
    });
    return removed;
  }

  /** packet interface  - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** Receive a single packet from the wire, and determine what to do with it.
   *  It's assumed that _ingestClientPacket() has already handled
   *  authentication for clients before this method is received.
   *  The packet has several possible processing options!
   *  - packet is response to an outgoing transaction
   *  - packet is a message that we handle
   *  - packet is a message that we forward
   *  - packet is unknown message so we return it with error
   *  If the packet has the rsvp flag set, we need to return
   *  it to the source address in the packet with any data
   */
  async dispatchPacket(pkt: NetPacket): Promise<void> {
    const fn = 'dispatchPacket:';

    // filter out response packets
    if (pkt.isResponse()) {
      if (pkt.src_addr === this.uaddr) {
        // this is a returning packet that originated from this endpoint
        this.resolveTransaction(pkt);
      } else {
        // otherwise, it's a response packet to a downstream client
        this.returnToSender(pkt);
      }
      return; // done processing, so exit
    }

    // make sure only request packets are processed
    if (!pkt.isRequest()) {
      LOG(PR, this.uaddr, fn, `invalid packet`, pkt);
      return;
    }

    // handle ping packets
    if (pkt.msg_type === 'ping') {
      const pingArr = this.getMessageAddresses(pkt.msg);
      const pingHandlers = this.getMessageHandlers(pkt.msg);
      if (pingHandlers.length > 0) pingArr.push(this.uaddr);
      pkt.setData(pingArr);
      this.returnToSender(pkt);
      return;
    }

    // handle signal packets
    if (pkt.msg_type === 'signal') {
      await this.awaitHandlers(pkt);
      if (this.isServer()) await this.awaitRemoteHandlers(pkt);
      return;
    }

    // handle call and send packets
    let retData: any;
    if (this.packetHasHandler(pkt)) {
      // handle send and call, which do not reflect back to sender
      retData = await this.awaitHandlers(pkt);
      if (this.isServer()) retData = await this.awaitRemoteHandlers(pkt);
    } else {
      LOG(PR, this.uaddr, fn, `unknown message`, pkt);
      retData = { error: `unknown message '${pkt.msg}'` };
    }

    // if the packet doesn't have an RSVP flag, then we don't
    // have to return any data so quit
    if (!pkt.hasRsvp()) return;

    // otherwise, we need to return the appropriate data
    // to the callee. ping and signal have already been handled
    if (pkt.msg_type === 'call') {
      pkt.data = NormalizeData(retData);
    } else if (pkt.msg_type === 'send') {
      pkt.data = true;
    }
    // now send the response, eventually
    this.returnToSender(pkt);
  }

  /** Start a transaction, which returns promises to await. This method
   *  is a queue that uses Promises to wait for the return, which is
   *  triggered by a returning packet in dispatchPacket(pkt).
   */
  async awaitRemoteHandlers(pkt: NetPacket) {
    const fn = 'awaitRemoteHandlers:';
    if (pkt.hop_dir !== 'req') throw Error(`${fn} packet is not a request`);
    // prep for return
    const { gateway, clients } = this.getRoutingInformation(pkt);
    const promises = [];
    if (gateway) {
      // LOG(PR,_PKT(this, fn, '-wait-req-', pkt), pkt.data);
      const p = this.awaitTransaction(pkt, gateway);
      if (p) promises.push(p);
    }
    if (Array.isArray(clients)) {
      // LOG(PR,_PKT(this, fn, '-wait-req-', pkt), pkt.data);
      clients.forEach(sock => {
        // LOG(PR,fn,this.uaddr, 'await remote', pkt.msg, sock.uaddr);
        const p = this.awaitTransaction(pkt, sock);
        if (p) promises.push(p);
      });
    }
    let data = await Promise.all(promises);
    return data; // an array of results
  }

  /** Start a handler call, which might have multiple implementors.
   *  Returns data from all handlers as an array or a single item
   */
  async awaitHandlers(pkt: NetPacket) {
    const fn = 'awaitHandlers:';
    const { msg } = pkt;
    const handlers = this.getMessageHandlers(msg);
    if (handlers.length === 0) return Promise.resolve([]);
    const promises = [];
    // LOG(PR,_PKT(this, fn, '-wait-hnd-', pkt), pkt.data);
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
    return data; // an array of data
  }

  /** Send a single packet on all available interfaces based on the
   *  message. Use for initial outgoing packets only from the
   *  netCall, netSend, netSignal, and netPing methods.
   */
  initialSend(pkt: NetPacket) {
    const fn = 'initialSend:';
    // sanity checks
    if (pkt.src_addr === undefined) throw Error(`${fn}src_addr undefined`);
    if (this.uaddr === undefined) throw Error(`${fn} uaddr undefined`);
    if (pkt.hop_seq.length !== 0) throw Error(`${fn} pkt must have no hops yet`);
    if (pkt.msg_type !== 'ping' && pkt.data === undefined)
      throw Error(`${fn} data undefined`);
    // prep for sending
    // LOG(PR,_PKT(this, fn, '-send-req-', pkt), pkt.data);
    const { gateway, clients } = this.getRoutingInformation(pkt);
    // send on the wire
    pkt.addHop(this.uaddr);
    if (gateway) {
      if (this.cli_reg === undefined) throw Error(`${fn} endpoint not registered`);
      gateway.send(pkt);
    }
    if (Array.isArray(clients)) {
      clients.forEach(sock => sock.send(pkt));
    }
  }

  /** Used to forward a transaction from server to a remote client
   */
  awaitTransaction(pkt: NetPacket, sock: I_NetSocket): Promise<any> {
    const clone = this.clonePacket(pkt);
    clone.id = this.assignPacketId(clone);
    if (pkt.src_addr === sock.uaddr && SkipOriginType(pkt.msg_type)) return;
    return this._queueTransaction(clone, sock);
  }

  /** Used to resolve a forwarded transaction received by server from
   *  a remote client
   */
  resolveTransaction(pkt: NetPacket) {
    const fn = 'resolveTransaction:';
    // LOG(PR, fn, this.uaddr, 'resolving', pkt.msg);
    if (pkt.hop_rsvp !== true) throw Error(`${fn} packet is not RSVP`);
    if (pkt.hop_dir !== 'res') throw Error(`${fn} packet is not a response`);
    if (pkt.hop_seq.length < 2 && !pkt.isSpecialPkt())
      throw Error(`${fn} packet has no hops`);
    this._dequeueTransaction(pkt);
  }

  /** utility method for conducting transactions */
  _queueTransaction(pkt: NetPacket, sock: I_NetSocket): Promise<any> {
    const fn = '_queueTransaction:';
    const hash = GetPacketHashString(pkt);
    if (this.transactions.has(hash)) throw Error(`${fn} duplicate hash ${hash}`);
    const { src_addr } = pkt;
    const { uaddr: dst_addr } = sock;
    // LOG(PR, fn, `${pkt.msg} dst:${dst_addr} src:${src_addr}`);
    return new Promise((resolve, reject) => {
      const meta = { msg: pkt.msg, uaddr: pkt.src_addr };
      this.transactions.set(hash, { resolve, reject, ...meta });
      sock.send(pkt);
    });
  }

  /** utility method for completing transactions */
  _dequeueTransaction(pkt: NetPacket) {
    const fn = '_finishTransaction:';
    const hash = GetPacketHashString(pkt);
    const resolver = this.transactions.get(hash);
    if (!resolver) throw Error(`${fn} no resolver for hash ${hash}`);
    const { resolve, reject } = resolver;
    const { data } = pkt;
    // LOG(PR,_PKT(this, fn, '-recv-res-', pkt), pkt.data);
    if (pkt.err) reject(pkt.err);
    else resolve(data);
    this.transactions.delete(hash);
  }

  /** Return a packet to its source address. If this endpoint is a server,
   *  then it might have the socket stored. Otherwise, if this endpoint is
   *  also a client of another server, pass the back through the gateway.
   *  This is used by server endpoints to return packets to clients.
   */
  returnToSender(pkt: NetPacket) {
    const fn = 'returnToSender:';
    // check for validity
    if (pkt.hop_rsvp !== true) throw Error(`${fn} packet is not RSVP`);
    if (pkt.hop_seq.length < 1) throw Error(`${fn} packet has no hops`);
    // prep for return
    pkt.setDir('res');
    pkt.addHop(this.uaddr);
    // LOG(PR,_PKT(this, fn, '-send-res-', pkt), pkt.data);
    const { gateway, src_addr } = this.getRoutingInformation(pkt);
    if (this.isServer()) {
      // LOG(PR,fn,this.uaddr, 'returning to', src_addr);
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
    LOG(PR, `${fn} unroutable packet`, pkt);
  }

  /** return array of sockets to use for sending packet,
   *  based on pkt.msg and pkt.src_addr
   */
  getRoutingInformation(pkt: NetPacket): PktRoutingInfo {
    const fn = 'getRoutingInformation:';
    const { msg, src_addr } = pkt;
    if (!IsNetMessage(msg)) throw Error(`${fn} '${msg}' is invalid message`);
    // check if there's a gateway first and add it
    const gateway = this.cli_gateway;
    const self_addr = this.uaddr;
    // check if we're a server
    const msg_list = this.getMessageAddresses(msg);
    const clients = [];
    msg_list.forEach(uaddr => {
      if (uaddr === this.uaddr) return; // skip self
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

  /** packet utility - - - - - - - - - - - - - - - - - - - - - - - - - - - -**/

  assignPacketId(pkt: NetPacket): NP_ID {
    if (pkt.src_addr === undefined) pkt.src_addr = this.uaddr;
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
    pkt.setSrcAddr(this.uaddr || UADDR_NONE);
    if (this.cli_auth) pkt.setAuth(this.cli_auth);
    pkt.id = this.assignPacketId(pkt);
    return pkt;
  }

  /** clone a packet with new id */
  clonePacket(pkt: NetPacket): NetPacket {
    const clone = this.newPacket(pkt.msg, pkt.data);
    clone.setFromJSON(pkt.serialize());
    clone.src_addr = this.uaddr;
    clone.id = this.assignPacketId(clone);
    return clone;
  }

  /** create an authentication packet, which is the first packet that must be sent
   *  after connecting to the server */
  newAuthPacket(authObj: TClientAuth): NetPacket {
    const pkt = this.newPacket('SRV:AUTH', { ...authObj });
    pkt.setMeta('_auth', { rsvp: true });
    pkt.setSrcAddr(UADDR_NONE); // provide null address
    this.assignPacketId(pkt);
    return pkt;
  }

  /** create a registration packet */
  newRegPacket(): NetPacket {
    const pkt = this.newPacket('SRV:REG');
    pkt.setMeta('_reg', { rsvp: true });
    return pkt;
  }

  /** create a declaration packet shell */
  newDeclPacket(): NetPacket {
    const pkt = this.newPacket('SRV:DEF');
    pkt.setMeta('_decl', { rsvp: true });
    return pkt;
  }

  /** environment utilities - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** return true if this endpoint is managing connections */
  isServer() {
    return this.client_socks !== undefined && this.remoted_msgs !== undefined;
  }

  /** socket utilities  - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** given a socket, see if it's already registered */
  isNewSocket(socket: I_NetSocket): boolean {
    const fn = 'isNewSocket:';
    if (typeof socket !== 'object') return false;
    return socket.uaddr === undefined;
  }

  /** client endpoints need to have an authentication token to
   *  access URNET beyond registration
   */
  authorizeSocket(auth: any) {
    const fn = 'authorizeSocket:';
    LOG(PR, this.uaddr, 'would check auth token');
  }
} // end NetEndpoint class

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NetEndpoint;
export { NetEndpoint };
