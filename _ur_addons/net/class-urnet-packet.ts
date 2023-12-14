/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET PACKET
  encapsulates a message sent over URNET

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import {
  UR_NetMessage,
  UR_MsgName,
  UR_MsgData,
  UR_MsgID,
  UR_PktID,
  UR_NetAddr
} from './urnet-types';
import { PR } from '@ursys/netcreate';

/// CONSTANTS AND DECLARATIONS ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('PKT', 'TagGray');

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default class NetPacket implements UR_NetMessage {
  id: UR_PktID;
  name: UR_MsgName;
  data: UR_MsgData;
  src_addr: UR_NetAddr;
  msg_log: string[];
  msg_type: 'ping' | 'signal' | 'send' | 'call';
  hop_seq: UR_NetAddr[];
  hop_dir: 'req' | 'res';
  hop_rsvp?: boolean;
  err?: string;

  constructor(...args: any[]) {
    if (args.length === 1) return this.deserialize(args[0]);
    if (args.length === 2) return this.construct(args[0], args[1]);
    LOG.error('invalid arguments', args);
  }

  /* lifecycle - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */
  construct(msg: UR_MsgName, data: UR_MsgData): NetPacket {
    // payload
    this.name = msg;
    this.data = data;
    // metadata
    this.msg_log = [];
    this.msg_type = 'signal';
    this.hop_seq = [];
    this.hop_dir = 'req';
    this.hop_rsvp = false;
    this.err = undefined;
    // set on send
    this.id = undefined;
    this.src_addr = undefined;
    return this;
  }
  init(src_addr: UR_NetAddr): NetPacket {
    this.id = NetPacket.NewPacketID(this);
    this.src_addr = src_addr;
    return this;
  }

  /* serialization - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */
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
  /* static class elements - - - - - - - - - - - - - - - - - - - - - - - - - */
  static packet_counter = 100;
  static NewPacketID(pkt: NetPacket): UR_PktID {
    const addr = pkt.src_addr;
    const count = NetPacket.packet_counter++;
    return `PKT[${addr}]-${count}]`;
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
