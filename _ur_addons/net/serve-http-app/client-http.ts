/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET EXPRESS/WS (HTTP) CLIENT MODULE

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { ConsoleStyler } from '@ursys/core';
import { NetEndpoint } from '../../net/class-urnet-endpoint.ts';
import { NetSocket } from '../../net/class-urnet-socket.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PR = ConsoleStyler('URNET', 'TagBlue');
const LOG = console.log.bind(console);
const DBG = false;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const EP = new NetEndpoint();
let SERVER_LINK: WebSocket;

/// HELPER METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_Sleep(ms, resolve?): Promise<void> {
  return new Promise(localResolve =>
    setTimeout(() => {
      if (typeof resolve === 'function') resolve();
      localResolve();
    }, ms)
  );
}

/// CLIENT API ////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** create a client connection to the HTTP/WS server */
function Connect(): Promise<boolean> {
  const promiseConnect = new Promise<boolean>(resolve => {
    let wsURI = 'ws://localhost:3029/urnet-http';
    SERVER_LINK = new WebSocket(wsURI);
    SERVER_LINK.addEventListener('open', async () => {
      LOG(...PR('Connected to server'));
      const send = pkt => SERVER_LINK.send(pkt.serialize());
      const onData = event => EP._serverDataIngest(event.data, client_sock);
      const client_sock = new NetSocket(SERVER_LINK, { send, onData });
      SERVER_LINK.addEventListener('message', onData);
      SERVER_LINK.addEventListener('close', () => {
        LOG(...PR('server closed connection'));
        EP.disconnectAsClient();
      });
      // 2. start client; EP handles the rest
      const auth = { identity: 'my_voice_is_my_passport', secret: 'crypty' };
      const resdata = await EP.connectAsClient(client_sock, auth);
      if (DBG) LOG(...PR('EP.connectAsClient returned', resdata));
      if (resdata.error) {
        LOG.error(resdata.error);
        resolve(false);
        return;
      }
      // 3. register client with server
      const info = { name: 'UDSClient', type: 'client' };
      const regdata = await EP.registerClient(info);
      if (DBG) LOG(...PR('EP.registerClient returned', regdata));
      if (regdata.error) {
        LOG.error(regdata.error);
        resolve(false);
        return;
      }
      resolve(true);
    }); // end createConnection
  });
  return promiseConnect;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** define message handlers and register after authentation to be added to
 *  URNET message network
 */
async function RegisterMessages() {
  EP.registerMessage('NET:CLIENT_TEST', data => {
    LOG(...PR('NET:CLIENT_TEST got', data));
    return { 'NET:CLIENT_TEST': 'received' };
  });
  const resdata = await EP.clientDeclare();
  if (DBG) LOG(...PR('EP.clientDeclare returned', resdata));
  // test code below can be removed //
  let count = 0;
  let foo = setInterval(() => {
    if (count > 3) {
      clearInterval(foo);
      LOG(...PR('netCall test sequence complete'));
      return;
    }
    if (count % 2) {
      EP.netCall('SRV:REFLECT', { foo: 'bar' }).then(res => {
        LOG(...PR('SRV:REFLECT returned', res));
      });
    } else {
      EP.netCall('SRV:MYSERVER', { hello: 'world' }).then(res => {
        LOG(...PR('SRV:MYSERVER returned', res));
      });
    }
    count++;
  }, 1000);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Disconnect(seconds = 15) {
  return new Promise((resolve, reject) => {
    LOG(...PR(`waiting for ${seconds} seconds...`));
    m_Sleep(seconds * 1000, () => {
      resolve(true);
      SERVER_LINK.close();
      LOG(...PR(`closing client connection...`));
    });
  });
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default {
  Endpoint: EP // endpoint implement calls
};
export {
  Connect, // await Connect() to start URNET client
  RegisterMessages, // await RegisterMessages() to declare client messages
  Disconnect // await Disconnect() to close client connection
};
