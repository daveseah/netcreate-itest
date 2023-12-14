/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET MESSAGER

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
const m_netroutes: Map<UR_MsgName, UR_NetSocket> = new Map();

/// HELPERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** given a message name, return the message channel and name */
function m_DecodeMessage(msg: UR_MsgName): string[] {
  const bits = msg.split(':');
  if (bits.length !== 2) throw Error(`invalid message name: ${msg}`);
  return bits;
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
  signal(msg: UR_MsgName, data: UR_MsgData): void {
    const pkt = new NetPacket(msg, data);
    pkt.init('signal');
  }
  /** send data to other endpoints with matching msg */
  send(msg: UR_MsgName, data: UR_MsgData): void {
    const pkt = new NetPacket(msg, data);
  }
  /** send data and receive data response */
  async call(msg: UR_MsgName, data: UR_MsgData) {
    const pkt = new NetPacket(msg, data);
    return await new Promise((resolve, reject) => {});
  }
  /** send ping and receive pong */
  async ping(msg: UR_MsgName) {
    const pkt = new NetPacket(msg, {});
    return await new Promise((resolve, reject) => {});
  }

  /** handle a packet received from the network */
  async dispatchPacket(pkt: NetPacket) {
    const { name, data } = pkt;
    const handlers = m_handlers.get(name) || [];
    for (const handler of handlers) {
      await handler(data);
    }
  }

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

  /* static class elements - - - - - - - - - - - - - - - - - - - - - - - - - */
  static gateway: UR_NetSocket;
  static SetGateway(gateway: UR_NetSocket) {
    NetMessager.gateway = gateway;
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
