/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET Types and Type Conformance Utilities

  This file contains the types used by NetEndpoint and NetPacket.
  The NetEndpoint class is the main interface for sending and receiving
  NetPackets. NetPackets are the encapsulated messages that are sent.

  Type Concepts:

  MSG Messages  - made of CHANNEL and a NAME, e.g. 'NET:HELLO_WORLD'
  ADDR Address  - every endpoint has an address, e.g. 'UR_001'
  NP NetPacket  - NetPacket-related types, e.g. NP_ID, NP_Chan, NP_Msg
  EP Endpoint   - Endpoint-related type are in class-urnet-endpoint.ts
  PKT Packet    - shorthand for NetPacket

  CROSS PLATFORM USAGE --------------------------------------------------------

  When using from nodejs mts file, you can only import functions from 'default',
  so to access the NetPacket class do this:

    import UR_TYPES from './urnet-types.ts';
    const { AllocateAddress } = UR_TYPES.default; // note .default

  You can import the types as usual, though:

    import UR_TYPES, { NP_Msg, NP_Data } from './urnet-types.ts';

  This is not required when importing from another .ts typescript file
  such as class-urnet-endpoint.ts.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// RUNTIME UTILITIES /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const UADDR_DIGITS = 3; // number of digits in UADDR (padded with 0)
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const VALID_MSG_CHANNELS = ['NET', 'SRV', 'LOCAL', ''] as const;
export const VALID_PKT_TYPES = [
  'ping',
  'signal',
  'send',
  'call',
  '_reg', // special packet
  '_auth' // special packet
] as const;
export const VALID_ADDR_PREFIX = ['NEW', 'UR_', 'WSS', 'UDS', 'MQT', 'SRV'] as const;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const USED_ADDRS = new Set<NP_Address>();

/// BASIC NETPACKET TYPES //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type NP_ID = `pkt[${NP_Address}:${number}]`;
export type NP_Chan = (typeof VALID_MSG_CHANNELS)[number];
export type NP_Type = (typeof VALID_PKT_TYPES)[number];
export type NP_Msg = `${NP_Chan}${string}`;
export type NP_Data = any;
export type NP_Dir = 'req' | 'res';
export type NP_AddrPre = (typeof VALID_ADDR_PREFIX)[number];
export type NP_Address = `${NP_AddrPre}${number}`; // range set by UADDR_DIGITS

/// NETPACKET-RELATED TYPES ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export type NP_Hash = `${NP_Address}:${NP_ID}`; // for endpoint transactions
export type NP_Options = {
  // for packet creation
  dir?: NP_Dir;
  rsvp?: boolean;
};

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

/// FUNCTION SIGNATURES ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** runtime check of NP_Type */
export function IsValidType(msg_type: string): boolean {
  return VALID_PKT_TYPES.includes(msg_type as NP_Type);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** runtime check of NP_Chan */
export function IsValidChannel(msg_chan: string): boolean {
  return VALID_MSG_CHANNELS.includes(msg_chan as NP_Chan);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** runtime check of NP_Address */
export function IsValidAddress(addr: string): boolean {
  if (typeof addr !== 'string') return false;
  let prelen = 0;
  if (
    !VALID_ADDR_PREFIX.some(pre => {
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
  if (!IsValidChannel(chan))
    throw Error(`prefix must be ${VALID_MSG_CHANNELS.join(' ').trim()} not ${chan}`);
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
  return chan === 'NET' || chan === 'SRV';
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return true if message is implemented by main URNET server */
export function IsServerMessage(msg: NP_Msg): boolean {
  const [chan] = DecodeMessage(msg);
  return chan === 'SRV';
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** given a packet, return a unique hash string */
export function GetPacketHashString(pkt: I_NetMessage): NP_Hash {
  return `${pkt.src_addr}:${pkt.id}`;
}
