/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NetPacket encapsulates a message sent over URNET.

  This is implemented as a pure typescript class for use in both nodejs
  and browser environments. When using from nodejs, you can only import
  as default, so you will have to destructure in two steps.
  
    import CLASS_NP from './class-urnet-packet.ts';
    const NetPacket = CLASS_NP.default;

  Packets know how to "Send themselves" by invoking a global Send method that
  is assigned to it during the URNET handshake. Likewise, packets also own
  the global handler function that is assigned to it during the URNET handshake.
  The idea is that the packet class should know about both incoming and 
  outgoing packet transport, but it should not know about the transport itself.
  This allows the packet class to be used in both nodejs and browser

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { I_NetMessage, NP_Address } from './urnet-types';
import { NP_ID, NP_Type, NP_Dir } from './urnet-types';
import { IsValidMessage, IsValidAddress, IsValidType } from './urnet-types';
import { NP_Msg, NP_Data, DecodeMessage } from './urnet-types';
import { NP_Options } from './urnet-types';

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type NP_PacketSend = (pkt: NetPacket) => void;
export type NP_PacketReceive = (pkt: NetPacket) => void;

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NetPacket implements I_NetMessage {
  id: NP_ID; // network-wide unique id for this packet
  msg_type: NP_Type; // ping, signal, send, call
  msg: NP_Msg; // name of the URNET message
  data: any; // payload of the URNET message
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
    else throw Error(`invalid msg format: ${msg}`);
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

  /** manually set direction */
  setDir(dir: NP_Dir): NetPacket {
    if (dir !== 'req' && dir !== 'res') throw Error(`invalid dir: ${dir}`);
    this.hop_dir = dir;
    return this;
  }

  /** set message and data */
  setMsgData(msg: NP_Msg, data: NP_Data): NetPacket {
    this.setMsg(msg);
    this.setData(data);
    console.log('setMsgData: ', msg, data);
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

  /** rsvp required? */
  isRsvp() {
    return this.hop_rsvp;
  }

  lastHop() {
    return this.hop_seq[this.hop_seq.length - 1];
  }

  isLoopback() {
    const sameOrigin = NetPacket.urnet_address === this.src_addr;
    const oneHop = this.hop_seq.length === 1;
    return sameOrigin && oneHop;
  }

  isRequest() {
    return this.hop_dir === 'req';
  }

  isResponse() {
    return this.hop_dir === 'res';
  }

  /** invoke global endpoint to send packet */
  send() {
    this.hop_seq.push(this.src_addr);
    NetPacket.SendPacket(this);
    return this;
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

  /// STATIC CLASS METHODS ////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  static packet_counter = 0;
  static f_packet_out: NP_PacketSend;
  static f_packet_in: NP_PacketReceive;
  static urnet_address: NP_Address;
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** create a new packet id based on an existing packet. this is used for
   *  creating a new packet id for a cloned packet.
   */
  static AssignNewID(pkt: NetPacket): NP_ID {
    const addr = pkt.src_addr || NetPacket.urnet_address;
    const count = ++NetPacket.packet_counter;
    pkt.id = `pkt[${addr}:${count}]`;
    return pkt.id;
  }
  /** send a packet to the global endpoint. it's assumed that NetPacket static
   *  globals are set early in the URNET handshake and they are the same for
   *  as long as the URNET connection is active on the connected app instance.
   */
  static SendPacket(pkt: NetPacket) {
    if (NetPacket.urnet_address === undefined)
      throw Error(`NetPacket urnet_address not initialized, aborted.`);
    if (typeof NetPacket.f_packet_out !== 'function')
      throw Error(`NetPacket f_packet_out not defined, aborted.`);
    if (!pkt.id) throw Error(`NetPacket ${pkt.id} id not defined, aborted.`);
    if (!pkt.src_addr)
      throw Error(`NetPacket ${pkt.id} src_addr not defined, aborted.`);
    NetPacket.f_packet_out(pkt);
  }

  /** static defaults - - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** set the function that sends packets for the given type
   *  of transport (e.g. websockets, unix domain sockets, mqtt, etc.)
   */
  static NP_SetPacketSender(f: NP_PacketSend) {
    const fn = 'NP_SetPacketSender:';
    if (typeof f !== 'function') throw Error(`${fn} invalid send function`);
    NetPacket.f_packet_out = f;
  }
  /** set the function that handles incoming packets for the given type
   *  of transport (e.g. websockets, unix domain sockets, mqtt, etc.)
   */
  static NP_SetPacketReceiver(f: NP_PacketReceive) {
    const fn = 'NP_SetPacketReceiver:';
    if (typeof f !== 'function') throw Error(`${fn} invalid dispatch function`);
    NetPacket.f_packet_in = f;
  }
  /** set the global address for all packets on this platform */
  static NP_SetDefaultAddress(addr: NP_Address) {
    const fn = 'NP_SetDefaultAddress:';
    if (!IsValidAddress(addr)) throw Error(`${fn} invalid address`);
    NetPacket.urnet_address = addr;
  }
  /** return the global address for all packets on this platform */
  static NP_GetDefaultAddress(): NP_Address {
    return NetPacket.urnet_address;
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NetPacket;
