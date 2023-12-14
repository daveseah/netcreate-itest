/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET PACKET
  encapsulates a message sent over URNET

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import {
  UR_NetMessage,
  UR_MsgName,
  UR_MsgData,
  UR_NetDir,
  UR_MsgID,
  UR_PktOpts,
  UR_PktID,
  UR_MsgType,
  UR_NetAddr
} from './urnet-types';

/// CONSTANTS AND DECLARATIONS ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_InvalidType(msg_type: UR_MsgType): boolean {
  return !['ping', 'signal', 'send', 'call'].includes(msg_type);
}

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default class NetPacket implements UR_NetMessage {
  id: UR_PktID;
  name: UR_MsgName;
  data: UR_MsgData;
  src_addr: UR_NetAddr;
  msg_log: string[];
  msg_type: UR_MsgType;
  hop_seq: UR_NetAddr[];
  hop_dir: UR_NetDir;
  hop_rsvp?: boolean;
  err?: string;

  constructor(...args: any[]) {
    if (args.length === 1) return this.deserialize(args[0]);
    if (args.length === 2) return this.construct(args[0], args[1]);
    throw Error(`invalid constructor args: ${args}`);
  }

  /** lifecycle - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - **/
  /** make a new packet with a message name and data */
  construct(msg: UR_MsgName, data: UR_MsgData): NetPacket {
    // payload
    this.name = msg;
    this.data = data;
    // metadata
    this.msg_log = [];
    this.hop_seq = [];
    this.hop_dir = 'req';
    this.hop_rsvp = false;
    this.err = undefined;
    // set on send
    this.id = undefined;
    this.src_addr = undefined;
    this.msg_type = undefined;
    //
    return this;
  }
  /** initialize new packet with id and type, with optional meta overrides */
  init(msg_type: UR_MsgType, opt?: UR_PktOpts) {
    if (m_InvalidType(msg_type)) throw Error(`invalid msg_type: ${msg_type}`);
    this.msg_type = msg_type;
    this.id = NetPacket.NewPacketID(this);
    this.src_addr = opt?.addr;
    this.hop_dir = opt?.dir;
    this.hop_rsvp = opt?.rsvp;
  }
  /** return */

  /** serialization - - - - - - - - - - - - - - - - - - - - - - - - - - - - **/
  serialize(): string {
    return JSON.stringify(this);
  }
  deserialize(data: string): NetPacket {
    let obj = JSON.parse(data);
    this.id = obj.id;
    this.name = obj.name;
    this.data = obj.data;
    this.src_addr = obj.src_addr;
    this.msg_log = obj.msg_log;
    this.msg_type = obj.msg_type;
    this.hop_seq = obj.hop_seq;
    this.hop_dir = obj.hop_dir;
    this.hop_rsvp = obj.hop_rsvp;
    this.err = obj.err;
    return this;
  }
  // create a new NetPacket with the same data but new id
  clone(): NetPacket {
    const pkt = new NetPacket(this.serialize());
    pkt.id = NetPacket.NewPacketID(pkt);
    return pkt;
  }

  /** static class elements - - - - - - - - - - - - - - - - - - - - - - - - **/
  static packet_counter = 100;
  static NewPacketID(pkt: NetPacket): UR_PktID {
    const addr = pkt.src_addr;
    const count = NetPacket.packet_counter++;
    return `PKT[${addr}]-${count}]`;
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
