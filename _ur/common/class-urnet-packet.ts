/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NetPacket encapsulates a message sent over URNET, including metadata
  to route the packet across the network and return responses.

  Works closely with NetEndpoint, which handles the actual sending and
  receiving of packets. In practice, use Endpoint.newPacket() to create a new 
  packet that has the correct source address and id.

  -- CROSS PLATFORM IMPORT TRICKS -------------------------------------------

  When using from nodejs mts file, you can only import this ts file as 'default' 
  property. To access the NetPacket class do this:

    import CLASS_NP from './class-urnet-packet.ts';
    const NetPacket = CLASS_NP.default; // note .default

  This is not required when importing from another .ts typescript file
  such as class-urnet-endpoint.ts.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR } from '@ursys/core';
import { I_NetMessage, NP_Address } from './types-urnet.ts';
import { NP_ID, NP_Type, NP_Dir, I_NetSocket } from './types-urnet.ts';
import {
  IsValidMessage,
  IsValidAddress,
  IsValidType,
  UADDR_NONE
} from './types-urnet';
import { NP_Msg, NP_Data, DecodeMessage } from './types-urnet.ts';
import { NP_Options } from './types-urnet.ts';

const PR = typeof process !== 'undefined' ? 'Packet'.padEnd(13) : 'Packet:';
const LOG = (...args) => console.log(PR, ...args);

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NetPacket implements I_NetMessage {
  id: NP_ID; // network-wide unique id for this packet
  msg_type: NP_Type; // ping, signal, send, call
  msg: NP_Msg; // name of the URNET message
  data: any; // payload of the URNET message
  auth: string; // authentication token
  src_addr: NP_Address; // URNET address of the sender
  hop_seq: NP_Address[]; // URNET addresses that have seen this packet
  hop_log: string[]; // log of debug messages by hop
  hop_dir: NP_Dir; // direction of the packet 'req' or 'res'
  hop_rsvp?: boolean; // whether the packet is a response to a request
  err?: string; // returned error message

  constructor(msg?: NP_Msg, data?: NP_Data) {
    // metadata
    this.id = undefined;
    this.src_addr = undefined;
    this.hop_rsvp = false;
    this.hop_seq = [];
    this.hop_log = [];
    this.auth = undefined;
    this.err = undefined;
    //
    if (data !== undefined) this.data = data;
    if (typeof msg === 'string') {
      if (!IsValidMessage(msg)) throw Error(`invalid msg format: ${msg}`);
      this.msg = msg;
    }
  }

  /** after creating a new packet, use setMeta() to assign id and envelope
   *  meta used for routing and return packets
   */
  setMeta(msg_type: NP_Type, opt?: NP_Options) {
    if (!IsValidType(msg_type)) throw Error(`invalid msg_type: ${msg_type}`);
    this.msg_type = msg_type;
    // optional overrides
    this.hop_dir = opt?.dir || 'req';
    this.hop_rsvp = opt?.rsvp || false;
  }

  /** add hop to the hop sequence */
  addHop(hop: NP_Address) {
    if (!IsValidAddress(hop)) throw Error(`invalid hop: ${hop}`);
    this.hop_seq.push(hop);
  }

  /** utility setters w/ checks - - - - - - - - - - - - - - - - - - - - - - **/

  /** manually set the source address, with check */
  setSrcAddr(s_addr: NP_Address): NetPacket {
    if (!IsValidAddress(s_addr)) throw Error(`invalid src_addr: ${s_addr}`);
    // don't allow changing the src_addr once it's set by send()
    // use clone() to make a new packet with a different src_addr
    if (this.hop_seq.length > 0 && this.hop_seq[0] !== s_addr)
      throw Error(`src_addr ${s_addr} != ${this.hop_seq[0]}`);
    this.src_addr = s_addr;
    return this;
  }

  /** manually set direction */
  setDir(dir: NP_Dir): NetPacket {
    if (dir !== 'req' && dir !== 'res') throw Error(`invalid dir: ${dir}`);
    this.hop_dir = dir;
    return this;
  }

  /** set the authorization token */
  setAuth(auth: string): NetPacket {
    if (typeof auth !== 'string') {
      LOG('setAuth: invalid auth', auth);
      throw Error(`invalid auth: ${auth}`);
    }
    this.auth = auth;
    return this;
  }

  /** set message and data */
  setMsgData(msg: NP_Msg, data: NP_Data): NetPacket {
    this.setMsg(msg);
    this.setData(data);
    return this;
  }
  /** set message */
  setMsg(msg: NP_Msg): NetPacket {
    this.msg = msg;
    return this;
  }
  /** set data */
  setData(data: NP_Data): NetPacket {
    this.data = data;
    return this;
  }
  /** merge data */
  mergeData(data: NP_Data): NetPacket {
    this.data = { ...this.data, ...data };
    return this;
  }

  /** packet reconstruction - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** make a packet from existing JSON */
  setFromJSON(json: string): NetPacket {
    if (typeof json !== 'string')
      throw Error(`invalid json: ${json}, is ${typeof json}`);
    return this.deserialize(json);
  }
  /** make a packet from existing object */
  setFromObject(pktObj) {
    const fn = 'setFromObject';
    if (typeof pktObj !== 'object')
      throw Error(`invalid pktObj: ${pktObj}, is ${typeof pktObj}`);
    this.id = pktObj.id;
    this.msg = pktObj.msg;
    if (pktObj.data === undefined)
      LOG(fn, `... pktObj${pktObj.id} .data is undefined`);
    this.data = pktObj.data;
    this.src_addr = pktObj.src_addr;
    this.hop_log = pktObj.hop_log;
    this.msg_type = pktObj.msg_type;
    this.hop_seq = pktObj.hop_seq;
    this.hop_dir = pktObj.hop_dir;
    this.hop_rsvp = pktObj.hop_rsvp;
    this.err = pktObj.err;
    this.auth = pktObj.auth;
    return this;
  }

  /** packet transport  - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** rsvp required? */
  hasRsvp() {
    return this.hop_rsvp;
  }

  lastHop() {
    return this.hop_seq[this.hop_seq.length - 1];
  }

  hasAuth() {
    return this.auth !== undefined;
  }

  /** types that begin with _ are protocol messages that bypass dispatchPacket() */
  isSpecialPkt() {
    return this.msg_type.startsWith('_');
  }

  /** authorization packets are the first packet sent on a client connection to
   *  the message gateway server. They must not have a src_addr aassigned, using
   *  the special UADDR_NONE value instead.
   */
  isBadAuthPkt() {
    let error = '';
    let a = this.msg_type === '_auth';
    let b = this.msg === 'SRV:AUTH';
    let c = this.src_addr === UADDR_NONE;
    if (!a) error += `msg_type ${this.msg_type} not _auth. `;
    if (!b) error += `msg ${this.msg} not SRV:AUTH. `;
    if (!c) error += `src_addr ${this.src_addr} not ${UADDR_NONE} `;
    if (error.length > 0) return `isBadAuthPkt: ${error}`;
    return undefined;
  }

  /** registration packets are sent on a client connection after
   *  authentication. They must have a src_addr assigned, which was returned
   *  by the server in the response to the auth packet, and this must match
   *  the server's stored uaddr for the client connection.
   */
  isBadRegPkt(socket: I_NetSocket) {
    let error = '';
    let a = this.msg_type === '_reg';
    let b = this.msg === 'SRV:REG';
    let c = this.src_addr === socket.uaddr;
    if (!a) error += `msg_type ${this.msg_type} not _reg. `;
    if (!b) error += `msg ${this.msg} not SRV:REG. `;
    if (!c) error += `src_addr ${this.src_addr} not ${socket.uaddr}. `;
    if (error.length > 0) return `isBadRegPkt: ${error}`;
    return undefined;
  }

  authenticate(socket: I_NetSocket) {
    const { msg, src_addr, hop_dir, hop_seq } = this;
    if (!this.isResponse()) LOG(PR, `would auth ${src_addr} '${msg}'`);
    return true;
  }

  isRequest() {
    return this.hop_dir === 'req';
  }

  isResponse() {
    return this.hop_dir === 'res';
  }

  /** serialization - - - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  serialize(): string {
    return JSON.stringify(this);
  }
  deserialize(data: string): NetPacket {
    try {
      let obj = JSON.parse(data);
      return this.setFromObject(obj);
    } catch (err) {
      LOG('NetPacket.deserialize failed', data);
    }
  }

  /** information utilities - - - - - - - - - - - - - - - - - - - - - - - - **/

  isValidType(type: NP_Type): boolean {
    return IsValidType(type);
  }

  isValidMessage(msg: NP_Msg): boolean {
    return IsValidMessage(msg) !== undefined;
    // note difference with IsValidMessage(), which returns [chan, msg] if valid
  }

  decodeMessage(msg: NP_Msg): [chan: string, msg: string] {
    return DecodeMessage(msg);
  }

  /** debugging - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** add error string to packet error */
  error(msg: string) {
    if (!this.err) this.err = '';
    this.err += msg;
    return msg;
  }

  /** manually add a transport-related message eto the hog log. this is not
   *  the same as hop_seq which is used to track the routing of the packet.
   */
  hopLog(msg: string) {
    const info = `${this.id} ${this.hop_dir}`;
    this.hop_log.push(`${info}: ${msg}`);
    return msg;
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NetPacket;
export { NetPacket };
