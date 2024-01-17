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
import { IsValidType, IsValidChannel } from './urnet-types';

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

  constructor() {
    // metadata
    this.src_addr = undefined;
    this.hop_rsvp = false;
    this.hop_seq = [];
    this.hop_log = [];
    this.err = undefined;
    // to make a new packet, call setMeta() with msg_type
    // then setMsgData() with msg_name and msg_data
  }

  /** lifecycle - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** initialize new packet with id and type, with optional meta overrides */
  setMeta(msg_type: NP_Type, opt?: NP_Options) {
    if (!IsValidType(msg_type)) throw Error(`invalid msg_type: ${msg_type}`);
    this.msg_type = msg_type;
    this.id = NetPacket.NewPacketID(this);
    // optional overrides
    this.src_addr = opt?.addr;
    this.hop_dir = opt?.dir;
    this.hop_rsvp = opt?.rsvp;
  }
  /** make a new packet with a message name and data */
  setMsgData(msg: NP_Msg, data: NP_Data): NetPacket {
    this.msg = msg;
    this.data = data;
    return this;
  }
  /** set the address before sending */
  setSrcAddr(s_addr: NP_Address): NetPacket {
    const last = this.hop_seq[this.hop_seq.length - 1];
    if (last === s_addr) this.error(`duplicate address ${s_addr} ${this.id}`);
    this.src_addr = s_addr;
    return this;
  }
  /** invoke global endpoint to send packet */
  send() {
    this.hop_dir = 'req';
    NetPacket.SendPacket(this);
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
    pkt.id = NetPacket.NewPacketID(pkt);
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

  /** static class methods - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** create a new packet id based on an existing packet. this is used for
   *  creating a new packet id for a cloned packet.
   */
  static NewPacketID(pkt: NetPacket): NP_ID {
    const addr = pkt.src_addr;
    const count = NetPacket.packet_counter++;
    return `pkt[${addr}${count}]`;
  }
  static SendPacket(pkt: NetPacket) {
    if (typeof NetPacket.urnet_send !== 'function')
      pkt.error(`urnet_send not defined, failed to send.`);
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
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NetPacket;
