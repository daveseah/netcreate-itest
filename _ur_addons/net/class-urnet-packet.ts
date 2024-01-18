/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET PACKET 
  
  encapsulates a message sent over URNET

  To use from esmodule code, need to import using commonjs semantics:

    import CLASS_NP from './class-urnet-packet.ts';
    const NetPacket = CLASS_NP.default;
    
\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { I_NetMessage, NP_Address } from './urnet-types';
import { NP_ID, NP_Type, NP_Msg, NP_Data, NP_Dir } from './urnet-types';
import { NP_Options, NP_SendFunction, NP_HandlerFunction } from './urnet-types';
import { IsValidType, IsValidMessage, IsValidAddress } from './urnet-types';

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

  /** lifecycle - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** initialize new packet with id and type, with optional meta overrides */
  setMeta(msg_type: NP_Type, opt?: NP_Options) {
    if (!IsValidType(msg_type)) throw Error(`invalid msg_type: ${msg_type}`);
    this.msg_type = msg_type;
    this.id = NetPacket.AssignNewID(this);
    // optional overrides
    this.src_addr = opt?.addr;
    this.hop_dir = opt?.dir;
    this.hop_rsvp = opt?.rsvp;
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
  /** set the address before sending */
  setSrcAddr(s_addr: NP_Address): NetPacket {
    const last = this.hop_seq[this.hop_seq.length - 1];
    if (last === s_addr) this.error(`duplicate address ${s_addr} ${this.id}`);
    this.src_addr = s_addr;
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
  // create a new NetPacket with the same data but new id
  clone(): NetPacket {
    const pkt = new NetPacket();
    pkt.setFromJSON(this.serialize());
    pkt.id = NetPacket.AssignNewID(pkt);
    return pkt;
  }

  /** debugging - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** add error string to packet error */
  error(msg: string) {
    if (!this.err) this.err = '';
    this.err += msg;
    return msg;
  }

  /** add a transport-related message eto the hog log */
  hopLog(msg: string) {
    const info = `${this.id} ${this.hop_dir}`;
    this.hop_log.push(`${info}: ${msg}`);
    return msg;
  }

  /** static class vars - - - - - - - - - - - - - - - - - - - - - - - - - -**/

  static packet_counter = 100;
  static urnet_send: NP_SendFunction;
  static urnet_handler: NP_HandlerFunction;
  static urnet_address: NP_Address;

  /** static class methods - - - - - - - - - - - - - - - - - - - - - - - - **/

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
