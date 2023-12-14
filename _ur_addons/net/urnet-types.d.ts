/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

export type UR_MsgName = `${'NET:' | 'UDS:' | ':'}${string}`;
export type UR_MsgData = {
  [key: string]: any;
};
export type UR_MsgID = `${UR_NetAddr}-${number}`;
export type UR_PktID = `PKT[${UR_MsgID}]`;
export type UR_NetAddr = string;
export type UR_MsgHandler = (data: UR_MsgData) => any;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** NetMessages are the encapsulated MESSAGE+DATA that are sent over URNET,
 *  with additional metadata to help with request/response and logging.
 *  They can
 */
export interface UR_NetMessage {
  id: UR_PktID;
  name: UR_MsgName;
  data: UR_MsgData;
  msg_type: 'ping' | 'signal' | 'send' | 'call';
  msg_log: string[];
  src_addr: UR_NetAddr;
  hop_seq: UR_NetAddr[];
  hop_dir: 'req' | 'res';
  hop_rsvp?: boolean;
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
