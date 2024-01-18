/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NetPacket encapsulates a message sent over URNET.

  This is implemented as a pure typescript class for use in both nodejs
  and browser environments. When using from nodejs, you can only import
  as default, so you will have to destructure in two steps.
  
    import CLASS_NP from './class-urnet-packet.ts';
    const NetPacket = CLASS_NP.default;
    
\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { I_NetMessage, NP_Address } from './urnet-types';
import { NP_ID, NP_Type, NP_Dir } from './urnet-types';
import { IsValidMessage, IsValidAddress, IsValidType } from './urnet-types';
import { NP_Msg, NP_Chan, NP_Data, DecodeMessage } from './urnet-types';
import { NP_Options, NP_SendFunction, NP_HandlerFunction } from './urnet-types';

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NetPacket implements I_NetMessage {
  id: NP_ID; // network-wide unique id for this packet
  msg_type: NP_Type; // ping, signal, send, call
  msg: NP_Msg; // name of the URNET message
  data: NP_Data; // payload of the URNET message
  src_addr: NP_Address; // URNET address of the sender
  hop_seq: NP_Address[]; // URNET addresses that have seen this packet
  hop_log: string[]; // log of debug messages by hop
  hop_dir: NP_Dir; // direction of the packet 'req' or 'res'
  hop_rsvp?: boolean; // whether the packet is a response to a request
  err?: string; // returned error message

  constructor(msg?: NP_Msg, data?: NP_Data) {
    // metadata
    this.src_addr = undefined;
    this.hop_rsvp = false;
    this.hop_seq = [];
    this.hop_log = [];
    this.err = undefined;
    //
    if (data === undefined) data = {};
    if (IsValidMessage(msg)) this.setMsgData(msg, data);
  }

  /** after creating a new packet, use setMeta() to assign id and envelope
   *  meta used for routing and return packets
   */
  setMeta(msg_type: NP_Type, opt?: NP_Options) {
    if (!IsValidType(msg_type)) throw Error(`invalid msg_type: ${msg_type}`);
    this.msg_type = msg_type;
    this.id = NetPacket.AssignNewID(this);
    // optional overrides
    this.src_addr = opt?.addr || NetPacket.urnet_address;
    this.hop_dir = opt?.dir || 'req';
    this.hop_rsvp = opt?.rsvp || false;
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
    return this.deserialize(json);
  }
  /** make a packet from existing object */
  setFromObject(pktObj) {
    this.id = pktObj.id;
    this.msg = pktObj.msg;
    this.data = pktObj.data;
    this.src_addr = pktObj.src_addr;
    this.hop_log = pktObj.hop_log;
    this.msg_type = pktObj.msg_type;
    this.hop_seq = pktObj.hop_seq;
    this.hop_dir = pktObj.hop_dir;
    this.hop_rsvp = pktObj.hop_rsvp;
    this.err = pktObj.err;
    return this;
  }

  /** packet transport  - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** is this packet a return? */
  isPacketReturning() {
    const fn = 'isReturn:';
    if (this.src_addr === undefined) {
      console.error(`${fn} src_addr undefined`);
      return false;
    }
    if (this.hop_rsvp === false) return false;
    if (this.hop_dir !== 'res') return false;
    if (this.hop_seq.length < 2) return false;
    if (this.hop_seq.length[0] !== this.src_addr) return false;
    return true;
  }

  /** rsvp required? */
  isPacketRsvp() {
    return this.hop_rsvp;
  }

  /** invoke global endpoint to send packet */
  send() {
    this.hop_seq.push(this.src_addr);
    NetPacket.SendPacket(this);
    return this;
  }
  /** return the packet to source */
  return() {
    this.hop_dir = 'res';
    this.send();
  }

  /** serialization - - - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  serialize(): string {
    return JSON.stringify(this);
  }
  deserialize(data: string): NetPacket {
    let obj = JSON.parse(data);
    return this.setFromObject(obj);
  }
  /** create a new NetPacket with the same data but new id */
  clone(): NetPacket {
    const pkt = new NetPacket();
    pkt.setFromJSON(this.serialize());
    pkt.id = NetPacket.AssignNewID(pkt);
    return pkt;
  }

  /** information utilities - - - - - - - - - - - - - - - - - - - - - - - - **/

  isValidType(type: NP_Type): boolean {
    return IsValidType(type);
  }

  isValidMessage(msg: NP_Msg): boolean {
    return IsValidMessage(msg);
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

  /// STATIC CLASS VARIABLES /////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  static packet_counter = 100;
  static urnet_send: NP_SendFunction;
  static urnet_handler: NP_HandlerFunction;
  static urnet_address: NP_Address;

  /// STATIC CLASS METHODS //////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** create a new packet id based on an existing packet. this is used for
   *  creating a new packet id for a cloned packet.
   */
  static AssignNewID(pkt: NetPacket): NP_ID {
    const addr = pkt.src_addr || NetPacket.urnet_address;
    const count = NetPacket.packet_counter++;
    pkt.id = `pkt[${addr}${count}]`;
    return pkt.id;
  }
  /** send a packet to the global endpoint. it's assumed that NetPacket static
   *  globals are set early in the URNET handshake and they are the same for
   *  as long as the URNET connection is active on the connected app instance.
   */
  static SendPacket(pkt: NetPacket) {
    if (NetPacket.urnet_address === undefined)
      throw Error(`NetPacket urnet_address not initialized, aborted.`);
    if (typeof NetPacket.urnet_send !== 'function')
      throw Error(`NetPacket urnet_send not defined, aborted.`);
    if (!pkt.id) throw Error(`NetPacket ${pkt.id} id not defined, aborted.`);
    if (!pkt.src_addr)
      throw Error(`NetPacket ${pkt.id} src_addr not defined, aborted.`);
    NetPacket.urnet_send(pkt);
  }
  /** set the function that sends packets for the given type
   *  of transport (e.g. websockets, unix domain sockets, mqtt, etc.)
   */
  static URNET_SetSendFunction(f: NP_SendFunction) {
    const fn = 'URNET_SetSendFunction:';
    if (typeof f !== 'function') throw Error(`${fn} invalid send function`);
    NetPacket.urnet_send = f;
  }
  /** set the function that handles incoming packets for the given type
   *  of transport (e.g. websockets, unix domain sockets, mqtt, etc.)
   */
  static URNET_SetHandlerFunction(f: NP_HandlerFunction) {
    const fn = 'URNET_SetHandlerFunction:';
    if (typeof f !== 'function') throw Error(`${fn} invalid dispatch function`);
    NetPacket.urnet_handler = f;
  }
  /** set the global address for all packets on this platform */
  static URNET_SetAddress(addr: NP_Address) {
    const fn = 'URNET_SetAddress:';
    if (!IsValidAddress(addr)) throw Error(`${fn} invalid address`);
    NetPacket.urnet_address = addr;
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NetPacket;
