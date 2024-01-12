/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

export type UR_MsgName = `${'NET:' | 'UDS:' | ':'}${string}`;
export type UR_MsgData = {
  [key: string]: any;
};
export type UR_MsgType = 'ping' | 'signal' | 'send' | 'call';
export type UR_NetDir = 'req' | 'res';
export type UR_MsgID = `${UR_NetAddr}-${number}`;
export type UR_PktID = `PKT[${UR_MsgID}]`;
export type UR_PktOpts = {
  dir?: UR_NetDir;
  rsvp?: boolean;
  addr?: UR_NetAddr;
};
export type UR_NetAddr = string;
export type UR_MsgHandler = (data: UR_MsgData) => any;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** NetMessages are the encapsulated MESSAGE+DATA that are sent over URNET,
 *  with additional metadata to help with request/response and logging.
 *  They can
 */
export interface UR_NetMessage {
  id: UR_PktID;
  msg_type: UR_MsgType;
  name: UR_MsgName;
  data: UR_MsgData;
  src_addr: UR_NetAddr;
  hop_dir: UR_NetDir;
  hop_rsvp?: boolean;
  hop_seq: UR_NetAddr[];
  hop_log: string[];
  err?: string;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** MessageDispatcher instances are used to dispatch several types of messages
 *  to URNET.
 */
export interface UR_MessageDispatcher {
  signal(msg: UR_MsgName, data: UR_MsgData): void;
  send(msg: UR_MsgName, data: UR_MsgData): void;
  call(msg: UR_MsgName, data: UR_MsgData): Promise<UR_MsgData>;
  ping(msg: UR_MsgName): Promise<UR_MsgData>;
  register(msg: UR_MsgName, handler: UR_MsgHandler): void;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** NetSockets are adapters that know how to send and receive NetMessage
 *  packets over a particular transport protocol.
 */
export interface UR_NetSocket {
  sendPacket(pkt: UR_NetMessage): void;
  dispatchPacket(pkt: UR_NetMessage): void;
}
