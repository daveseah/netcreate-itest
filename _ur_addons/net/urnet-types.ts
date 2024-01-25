/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET BASE TYPES

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// RUNTIME UTILITIES /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const UADDR_DIGITS = 3; // number of digits in UADDR (padded with 0)
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const VALID_CHANNELS = ['NET', 'UDS', 'LOCAL', ''] as const;
export const VALID_TYPES = ['ping', 'signal', 'send', 'call'] as const;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const GENERATED_ADDRS = new Set<NP_Address>();

/// BASIC NETPACKET TYPES //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type NP_Chan = (typeof VALID_CHANNELS)[number];
export type NP_ID = `pkt[${NP_Address}:${number}]`;
export type NP_Type = (typeof VALID_TYPES)[number];
export type NP_Msg = `${NP_Chan}${string}`;
export type NP_Data = any;
export type NP_Dir = 'req' | 'res';
export type NP_Address = `UA${number}`; // range is nominally 001-999

/// NETPACKET-RELATED TYPES ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type NP_AuthToken = any;
export type NP_Opt = { [key: string]: any };
export type NP_Hash = `${NP_Address}:${NP_ID}`; // used for transaction lookups
export type NP_Options = {
  dir?: NP_Dir;
  rsvp?: boolean;
};
export type NP_Callback = (data: NP_Data) => void;

/// INTERFACES ////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** NetMessages are the encapsulated MESSAGE+DATA that are sent over URNET,
 *  with additional metadata to help with request/response and logging.
 *  This defines the data structure only. See NetPacket class for more.
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
/** runtime check of NP_Msg, returns array if good otherwise it returns undefined */
export function IsValidMessage(msg: string): [NP_Chan, string] {
  try {
    return DecodeMessage(msg);
  } catch (err) {
    console.log(err.message);
    console.log(err.stack.split('\n').slice(1).join('\n').trim());
    return undefined;
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** runtime create formatted address */
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let ADDR_MAX_ID = 0;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function AllocateAddress(opt?: { label?: string }): NP_Address {
  const fn = 'AllocateAddress';
  let label = opt.label || '';
  if (label) label = `- ${label}`;
  let id = ++ADDR_MAX_ID;
  let padId = `${id}`.padStart(UADDR_DIGITS, '0');
  let addr = `UA${padId}` as NP_Address;
  // check for collision
  if (GENERATED_ADDRS.has(addr)) return AllocateAddress();
  GENERATED_ADDRS.add(addr);
  console.log(fn, `${addr}${label}`);
  return addr;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** runtime check of NP_Address */
export function IsValidAddress(addr: string): boolean {
  if (typeof addr !== 'string') return false;
  if (!addr.startsWith('UA')) return false;
  const num = parseInt(addr.slice(2));
  if (isNaN(num)) return false;
  return true;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** given a CHANNEL:MESSAGE string, return the channel and message name in
 *  an array */
export function DecodeMessage(msg: NP_Msg): [NP_Chan, string] {
  if (typeof msg !== 'string') throw Error(`message must be string: ${msg}`);
  if (msg !== msg.toUpperCase()) throw Error(`message must be uppercase: ${msg}`);
  const bits = msg.split(':');
  if (bits.length === 0) throw Error(`invalid empty message`);
  if (bits.length > 2) throw Error(`invalid channel:message format ${msg}`);
  let [chan, name] = bits;
  if (bits.length === 1) {
    name = chan;
    chan = 'LOCAL';
  }
  if (chan === '') chan = 'LOCAL';
  if (!IsValidChannel(chan)) throw Error(`invalid channel: ${chan}`);
  return [chan as NP_Chan, name];
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function GetMessageHash(msg: NP_Msg): NP_Msg {
  let [chan, name] = DecodeMessage(msg);
  if (chan === 'LOCAL') chan = '';
  return `${chan}:${name}`;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return true if message is a local request */
export function IsLocalMessage(msg: NP_Msg): boolean {
  const [chan] = DecodeMessage(msg);
  return chan === 'LOCAL';
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return true if message is a network request */
export function IsRemoteMessage(msg: NP_Msg): boolean {
  const [chan] = DecodeMessage(msg);
  return chan === 'NET';
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return true if message is implemented by main URNET server */
export function IsServerMessage(msg: NP_Msg): boolean {
  const [chan] = DecodeMessage(msg);
  return chan === 'UDS';
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** given a packet, return a unique hash string */
export function GetPacketHashString(pkt: I_NetMessage): NP_Hash {
  return `${pkt.src_addr}:${pkt.id}`;
}
