/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET MESSAGER
  gateway is the upstream connection
  clients are the downstream connections

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import {
  UR_MsgName,
  UR_MsgData,
  UR_MsgHandler,
  UR_NetAddr,
  UR_NetSocket
} from './urnet-types';
import NetPacket from './class-urnet-packet';

/// CONSTANTS AND DECLARATIONS ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const m_handlers: Map<UR_MsgName, UR_MsgHandler[]> = new Map();
const m_clients: Map<UR_MsgName, UR_NetSocket> = new Map();
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let m_gateway: UR_NetSocket = undefined;

/// HELPERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** given a message name, return the message channel and name */
function m_DecodeMessage(msg: UR_MsgName): string[] {
  const bits = msg.split(':');
  if (bits.length !== 2) throw Error(`invalid message name: ${msg}`);
  return bits;
}
function m_SetGateway(gateway: UR_NetSocket): void {
  m_gateway = gateway;
}
function m_RouteOutgoing(pkt: NetPacket): void {
  if (m_gateway === undefined) return;
  m_gateway.sendPacket(pkt);
}

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** implementation of UR_MessageDispatcher */
export class NetMessager {
  _addr: UR_NetAddr; // URNET address of this messager
  _epid: string; // endpoint id of this messager
  //
  constructor(addr: UR_NetAddr, epid: string) {
    this._addr = addr;
    this._epid = epid;
  }
  /** broadcast instantaneous state change events */
  signal(msgName: UR_MsgName, data: UR_MsgData): void {
    const [channel, name] = m_DecodeMessage(msgName);
    if (channel === '') {
      const handlers = m_handlers.get(msgName) || [];
      for (const handler of handlers) {
        handler(data);
      }
      return;
    }
    const pkt = new NetPacket();
    pkt.setMsgData(msgName, data);
    pkt.initType('signal');
    this.dispatchPacket(pkt);
  }
  /** send data to other endpoints with matching msg */
  send(msgName: UR_MsgName, data: UR_MsgData): void {}
  /** send data and receive data response */
  call(msgName: UR_MsgName, data: UR_MsgData) {}
  /** send ping and receive pong */
  ping(msgName: UR_MsgName) {}

  /** handle a packet received from the network */
  dispatchPacket(pkt: NetPacket): void {}

  /** register a handler for a particular message */
  register(msg: UR_MsgName, handler: UR_MsgHandler): void {
    const handlers = m_handlers.get(msg) || [];
    handlers.push(handler);
    m_handlers.set(msg, handlers);
  }
  /** deregister a handler for a particular message and optional handler */
  deregister(msg: UR_MsgName, handler?: UR_MsgHandler): void {
    if (handler === undefined) {
      m_handlers.delete(msg);
      return;
    }
    const handlers = m_handlers.get(msg) || [];
    const idx = handlers.indexOf(handler);
    if (idx === -1) return;
    handlers.splice(idx, 1);
    m_handlers.set(msg, handlers);
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
