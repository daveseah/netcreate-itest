/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NetSocket implements a "socket-like" object that consists of a send()
  function and the original connection object. The send function implements
  the write operation to the connection object. This way, we can provide
  different methods for reading/writing to the connection object using the
  same API and extend it as needed. 

  -- CROSS PLATFORM IMPORT TRICKS -------------------------------------------

  When using from nodejs mts file, you can only import 'default', which is the
  NetEndpoint class. If you want to import other exports, you need to
  destructure the .default prop; to access the NetPacket class do this:

    import EP_DEFAULT from './class-urnet-socket.ts';
    const { NetSocket } = EP_DEFAULT.default; // note .default

  You can import the types through dereferencing as usual:

    import EP_DEFAULT, { I_NetSocket } from './urnet-types.ts';

  This is not required when importing from another .ts typescript file.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR } from '@ursys/core';
import NetPacket from './class-urnet-packet.ts';
import {
  NP_Address,
  NP_Msg,
  I_NetSocket,
  NS_SendFunc,
  NS_CloseFunc,
  NS_DataFunc,
  NS_Options
} from './types-urnet.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;
const PR = typeof process !== 'undefined' ? 'Socket'.padEnd(13) : 'Socket:';
const LOG = (...args) => DBG && console.log(PR, ...args);

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** wrapper class a socket connection */
class NetSocket implements I_NetSocket {
  connector: any; // the original connection object
  sendFunc: NS_SendFunc; // the outgoing send function for this socket
  closeFunc: NS_CloseFunc; // function to disconnect
  onDataFunc: NS_DataFunc; // the incoming data function for this socket
  //
  uaddr?: NP_Address; // assigned uaddr for this socket-ish object
  auth?: any; // whatever authentication is needed for this socket
  msglist?: NP_Msg[]; // messages queued for this socket
  age?: number; // number of seconds since this socket was used
  label?: string; // name of the socket-ish object

  constructor(connectObj: any, io: NS_Options) {
    this.connector = connectObj;
    const { send, onData, close } = io;
    this.sendFunc = send.bind(connectObj);
    this.closeFunc = close.bind(connectObj);
    this.onDataFunc = onData.bind(connectObj);
  }

  send(pkt: NetPacket) {
    this.sendFunc(pkt);
  }

  close() {
    this.closeFunc();
  }

  getConnector() {
    return this.connector;
  }

  authenticated() {
    let a = this.auth !== undefined;
    return a;
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NetSocket;
export { NetSocket };
export type { I_NetSocket, NS_SendFunc, NS_DataFunc, NS_Options };
