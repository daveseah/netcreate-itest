/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET PACKET 
  
  encapsulates a message sent over URNET

  To use from esmodule code, need to import using commonjs semantics:

    import CLASS_NP from './class-urnet-packet.ts';
    const NetPacket = CLASS_NP.default;
    
\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import {
  UR_MsgName,
  UR_MsgData,
  UR_MsgType,
  UR_NetAddr,
  UR_NetDir,
  UR_PktID,
  UR_PktOpts,
  UR_NetMessage,
  UR_NetSocket
} from './urnet-types';

/// CONSTANTS AND DECLARATIONS ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

const MSG_CHANNELS = ['NET', 'UDS', ''];
const PKT_TYPES = ['ping', 'signal', 'send', 'call'];
function m_InvalidType(msg_type: UR_MsgType): boolean {
  return !PKT_TYPES.includes(msg_type);
}

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NetPacket implements UR_NetMessage {
  id: UR_PktID; // network-wide unique id for this packet
  msg_type: UR_MsgType; // ping, signal, send, call
  name: UR_MsgName; // name of the URNET message
  data: UR_MsgData; // payload of the URNET message
  src_addr: UR_NetAddr; // URNET address of the sender
  hop_log: string[]; // log of debug messages by hop
  hop_dir: UR_NetDir; // direction of the packet 'req' or 'res'
  hop_rsvp?: boolean; // whether the packet is a response to a request
  hop_seq: UR_NetAddr[]; // URNET addresses that have seen this packet
  err?: string; // returned error message

  constructor() {
    // metadata
    this.src_addr = undefined;
    this.hop_rsvp = false;
    this.hop_seq = [];
    this.hop_log = [];
    this.err = undefined;
    // to make a new packet, call initializeMeta() with msg_type
    // then setMsgData() with msg_name and msg_data
  }

  /** lifecycle - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - **/

  /** initialize new packet with id and type, with optional meta overrides */
  initializeMeta(msg_type: UR_MsgType, opt?: UR_PktOpts) {
    if (m_InvalidType(msg_type)) throw Error(`invalid msg_type: ${msg_type}`);
    this.msg_type = msg_type;
    this.id = NetPacket.NewPacketID(this);
    // optional overrides
    this.src_addr = opt?.addr;
    this.hop_dir = opt?.dir;
    this.hop_rsvp = opt?.rsvp;
  }
  /** make a new packet with a message name and data */
  setMsgData(msg: UR_MsgName, data: UR_MsgData): NetPacket {
    this.name = msg;
    this.data = data;
    return this;
  }
  /** set the address before sending */
  stampSrcAddr(s_addr: UR_NetAddr): NetPacket {
    const last = this.hop_seq[this.hop_seq.length - 1];
    if (last === s_addr) this.error(`duplicate address ${s_addr} ${this.id}`);
    this.src_addr = s_addr;
    return this;
  }
  /** invoke global endpoint to send packet */
  send() {
    this.hop_dir = 'req';
    NetPacket.Send(this);
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
    this.name = pktObj.name;
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

  /** static class elements - - - - - - - - - - - - - - - - - - - - - - - - **/

  static packet_counter = 100;
  static NewPacketID(pkt: NetPacket): UR_PktID {
    const addr = pkt.src_addr || 'NO_ADDR';
    const count = NetPacket.packet_counter++;
    return `PKT[${addr}-${count}]`;
  }
  static urnet_endpoint: UR_NetSocket;
  static SetEndpoint(endpoint: UR_NetSocket) {
    if (typeof endpoint.sendPacket !== 'function') {
      throw Error(`SetEndpoint: endpoint must have sendPacket() method`);
    }
    NetPacket.urnet_endpoint = endpoint;
  }
  static Send(pkt: NetPacket) {
    if (!NetPacket.urnet_endpoint) pkt.error(`urnet_endpoint, failed to send`);
    NetPacket.urnet_endpoint.sendPacket(pkt);
  }

  static ValidChannel(msg_channel: string): boolean {
    const ok = MSG_CHANNELS.includes(msg_channel);
    if (!ok) {
      if (MSG_CHANNELS.includes(msg_channel.toUpperCase())) {
        throw Error(`message channel ${msg_channel} must be UPPERCASE`);
      }
      return false;
    }
    return true;
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NetPacket;
