/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NetSocket implements a "socket-like" object that consists of a send()
  function and the original connection object. The send function implements
  the write operation to the connection object. This way, we can provide
  different methods for reading/writing to the connection object using the
  same API and extend it as needed. 

  CROSS PLATFORM USAGE --------------------------------------------------------

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
import { NetPacket } from './class-urnet-packet.ts';
import { NP_Address, NP_Msg } from './urnet-types.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('Socket', 'TagBlue');
const DBG = true;

/// LOCAL TYPES ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** the function that sends a packet to the wire */
type EP_SendFunc = (pkt: NetPacket) => void;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** this is the socket-ish object that we use to send data to the wire */
interface I_NetSocket {
  send: EP_SendFunc;
  uaddr?: NP_Address; // assigned uaddr for this socket-ish object
  auth?: any; // whatever authentication is needed for this socket
  msglist?: NP_Msg[]; // messages queued for this socket
  age?: number; // number of seconds since this socket was used
  label?: string; // name of the socket-ish object
}

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** wrapper class for */
class NetSocket implements I_NetSocket {
  connector: any; // the original connection object
  sendFunc: EP_SendFunc; // the send function for this socket
  //
  uaddr?: NP_Address; // assigned uaddr for this socket-ish object
  auth?: any; // whatever authentication is needed for this socket
  msglist?: NP_Msg[]; // messages queued for this socket
  age?: number; // number of seconds since this socket was used
  label?: string; // name of the socket-ish object

  constructor(connectObj: any, sendFunc: EP_SendFunc) {
    this.connector = connectObj;
    this.sendFunc = sendFunc.bind(connectObj);
  }

  send(pkt: NetPacket) {
    this.sendFunc(pkt);
  }

  getConnector() {
    return this.connector;
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { NetSocket };
export type { I_NetSocket, EP_SendFunc };
