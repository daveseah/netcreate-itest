/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET BASE TYPES

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// RUNTIME UTILITIES /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const UADDR_DIGITS = 3; // number of digits in UADDR (padded with 0)
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const VALID_CHANNELS = ['NET', 'UDS', 'LOCAL', ''] as const;
export const VALID_TYPES = ['ping', 'signal', 'send', 'call'] as const;
export const VALID_ADDR_PRE = ['UR_', 'SRV'] as const;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const USED_ADDRS = new Set<NP_Address>();

/// BASIC NETPACKET TYPES //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type NP_ID = `pkt[${NP_Address}:${number}]`;
export type NP_Chan = (typeof VALID_CHANNELS)[number];
export type NP_Type = (typeof VALID_TYPES)[number];
export type NP_Msg = `${NP_Chan}${string}`;
export type NP_Data = any;
export type NP_Dir = 'req' | 'res';
export type NP_AddrPre = (typeof VALID_ADDR_PRE)[number];
export type NP_Address = `${NP_AddrPre}${number}`; // range is nominally 001-999

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
/** runtime check of NP_Address */
export function IsValidAddress(addr: string): boolean {
  if (typeof addr !== 'string') return false;
  let prelen = 0;
  if (
    !VALID_ADDR_PRE.some(pre => {
      prelen = pre.length;
      return addr.startsWith(pre);
    })
  )
    return false;
  const num = parseInt(addr.slice(prelen));
  if (isNaN(num)) return false;
  return true;
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
type AllocateOptions = { prefix?: NP_AddrPre; addr?: NP_Address };
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** allocate a new address, optionally with a label */
export function AllocateAddress(opt?: AllocateOptions): NP_Address {
  const fn = 'AllocateAddress';
  let addr = opt?.addr; // manually-set address
  let pre = opt?.prefix || 'UA'; // address prefix
  if (addr === undefined) {
    // generate a new address
    let id = ++ADDR_MAX_ID;
    let padId = `${id}`.padStart(UADDR_DIGITS, '0');
    addr = `${pre}${padId}` as NP_Address;
  } else if (USED_ADDRS.has(addr)) {
    // the manually-set address is already in use
    throw Error(`${fn} - address ${addr} already allocated`);
  }
  USED_ADDRS.add(addr);
  return addr;
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
/** make sure that the message is always consistent */
export function NormalizeMessage(msg: NP_Msg): NP_Msg {
  let [chan, name] = DecodeMessage(msg);
  if (chan === 'LOCAL') chan = '';
  return `${chan}:${name}`;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** make sure that degenerate arrays turn into single objet */
export function NormalizeData(data: NP_Data): NP_Data {
  if (Array.isArray(data) && data.length == 1) return data[0];
  return data;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return true if message is a local request */
export function IsLocalMessage(msg: NP_Msg): boolean {
  const [chan] = DecodeMessage(msg);
  return chan === 'LOCAL';
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return true if message is a network request */
export function IsNetMessage(msg: NP_Msg): boolean {
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
