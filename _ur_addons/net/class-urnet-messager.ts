/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET MESSAGER

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { NP_Address, NP_Msg, NP_Data } from './urnet-types';
import NetPacket from './class-urnet-packet';

/// CONSTANTS AND DECLARATIONS ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export class NetMessager {
  _addr: NP_Address; // URNET address of this messager
  _epid: string; // endpoint id of this messager
  //
  constructor(addr: NP_Address, epid: string) {
    this._addr = addr;
    this._epid = epid;
  }
  /** broadcast instantaneous state change events */
  signal(msg: NP_Msg, data: NP_Data): void {}
  /** send data to other endpoints with matching msg */
  send(msg: NP_Msg, data: NP_Data): Promise<void> {
    return Promise.resolve();
  }
  /** send data and receive data response */
  call(msg: NP_Msg, data: NP_Data): Promise<NP_Data> {
    return Promise.resolve(data);
  }
  /** send ping and receive pong */
  ping(msg: NP_Msg): Promise<void> {
    return Promise.resolve();
  }
  /** handle a packet received from the network */
  dispatchPacket(pkt: NetPacket): void {
    NetPacket.SendPacket(pkt);
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
