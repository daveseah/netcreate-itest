/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  entrypoint for client-side addons

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import * as UR from '@ursys/core'; // this is a .js file
import { NetEndpoint } from './net/class-urnet-endpoint.ts';
import { NetSocket } from './net/class-urnet-socket.ts';
import { NetPacket } from './net/class-urnet-packet.ts';

/// ASSEMBLE MODULES //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const { ConsoleStyler } = UR;
const PF = ConsoleStyler('UR/ADD', 'TagPink');
const CLASS = {
  NetEndpoint,
  NetSocket,
  NetPacket
};

/// TEST METHODS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function AddonClientTest() {
  console.log(...PF('System Integration of new URSYS addon successful!'));
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  CLASS, //
  AddonClientTest
};
