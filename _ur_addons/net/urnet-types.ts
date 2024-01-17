/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET BASE TYPES

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// RUNTIME UTILITIES /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const VALID_CHANNELS = ['NET', 'UDS', ''] as const;
const VALID_TYPES = ['ping', 'signal', 'send', 'call'] as const;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** runtime check of NP_Type */
export function IsValidType(msg_type: string): boolean {
  return VALID_TYPES.includes(msg_type as NP_Type);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** runtime check of NP_Chan */
export function IsValidChannel(msg_chan: string): boolean {
  return VALID_CHANNELS.includes(msg_chan as NP_Chan);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** given a CHANNEL:MESSAGE string, return the channel and message name in
 *  an array */
export function DecodeMessage(msg: NP_Msg): [NP_Chan, string] {
  const bits = msg.split(':');
  if (bits.length !== 2) throw Error(`invalid message name: ${msg}`);
  if (!IsValidChannel(bits[0])) throw Error(`invalid channel: ${bits[0]}`);
  let [chan, name] = bits;
  return [chan as NP_Chan, name];
}

/// BASIC NETPACKET TYPES //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type NP_Chan = (typeof VALID_CHANNELS)[number];
export type NP_ID = `pkt[${NP_Address}${number}]`;
export type NP_Type = (typeof VALID_TYPES)[number];
export type NP_Msg = `${NP_Chan}${string}`;
export type NP_Data = { [key: string]: any };
export type NP_Dir = 'req' | 'res';
export type NP_Address = `UA${number}`; // range 001-999

/// NETPACKET-RELATED TYPES ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type NP_AuthToken = any;
export type NP_Opt = { [key: string]: any };
export type NP_Hash = `${NP_Address}:${NP_ID}`; // used for transaction lookups
export type NP_Options = {
  dir?: NP_Dir;
  rsvp?: boolean;
  addr?: NP_Address;
};

/// INTERFACES ////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** NetMessages are the encapsulated MESSAGE+DATA that are sent over URNET,
 *  with additional metadata to help with request/response and logging.
 *  They can
 */
export interface I_NetMessage {
  id: NP_ID;
  msg_type: NP_Type;
  msg: NP_Msg;
  data: NP_Data;
  src_addr: NP_Address;
  hop_dir: NP_Dir;
  hop_rsvp?: boolean;
  hop_seq: NP_Address[];
  hop_log: string[];
  err?: string;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** MessageDispatcher instances are used to dispatch several types of messages
 *  to URNET.
 */
export interface I_Messager {
  signal(msg: NP_Msg, data: NP_Data): void;
  send(msg: NP_Msg, data: NP_Data): void;
  call(msg: NP_Msg, data: NP_Data): Promise<NP_Data>;
  ping(msg: NP_Msg): Promise<NP_Data>;
}

/// FUNCTION SIGNATURES ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** NetMessage class implementation holds on to this static functions that are
 *  set during network connection */
export type NP_SendFunction = (pkt: I_NetMessage) => void;
export type NP_HandlerFunction = (pkt: I_NetMessage) => void;
