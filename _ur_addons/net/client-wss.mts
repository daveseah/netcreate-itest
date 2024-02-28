/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET WEB SOCKET SERVER (WSS) NODE CLIENT

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR, PROC } from '@ursys/core';
import EP_DEFAULT from './class-urnet-endpoint.ts';
import { WebSocket } from 'ws';
import { WSS_INFO } from './urnet-constants.mts';
import NS_DEFAULT, { I_NetSocket } from './class-urnet-socket.ts';
const { NetEndpoint } = EP_DEFAULT;
const { NetSocket } = NS_DEFAULT;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('WSSClient', 'TagBlue');
const DBG = false;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const [m_script, m_addon, ...m_args] = PROC.DecodeAddonArgs(process.argv);

/// DATA INIT /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const EP = new NetEndpoint();
let SERVER_LINK: WebSocket;

/// HELPERS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_Sleep(ms, resolve?): Promise<void> {
  return new Promise(localResolve =>
    setTimeout(() => {
      if (typeof resolve === 'function') resolve();
      localResolve();
    }, ms)
  );
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** create a client connection to the UDS server */
function Connect(): Promise<boolean> {
  const { wss_url } = WSS_INFO;
  SERVER_LINK = new WebSocket(wss_url);
  const promiseConnect = new Promise<boolean>(resolve => {
    SERVER_LINK.on('open', async function open() {
      // 1. wire-up SERVER_LINK to the endpoint via our netsocket wrapper
      LOG(`Connected to server '${wss_url}'`);
      const send = pkt => SERVER_LINK.send(pkt.serialize()); // client send
      const onData = data => EP._serverDataIngest(data, client_sock); // client receive
      const client_sock = new NetSocket(SERVER_LINK, { send, onData });
      SERVER_LINK.on('message', onData);
      SERVER_LINK.on('close', (code, reason) => {
        LOG('server closed connection');
        EP.disconnectAsClient();
      });
      SERVER_LINK.on('error', err => LOG.error(err.code));
      // 2. start client; EP handles the rest
      const auth = { identity: 'my_voice_is_my_passport', secret: 'crypty' };
      const resdata = await EP.connectAsClient(client_sock, auth);
      if (resdata.error) {
        LOG.error(resdata.error);
        resolve(false);
        return;
      }
      // 3. register client with server
      const info = { name: 'WSSClient', type: 'client' };
      const regdata = await EP.registerClient(info);
      if (regdata.error) {
        LOG.error(regdata.error);
        resolve(false);
        return;
      }
      resolve(true);
    }); // end
  });
  return promiseConnect;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** define message handlers and register after authentation to be added to
 *  URNET message network
 */
async function RegisterMessages() {
  // register some message handlers
  EP.registerMessage('NET:CLIENT_TEST', data => {
    LOG('NET:CLIENT_TEST got', data);
    return { 'NET:CLIENT_TEST': 'received' };
  });
  const resdata = await EP.clientDeclare();
  // test code below can be removed //
  let count = 0;
  let foo = setInterval(() => {
    if (count > 3) {
      clearInterval(foo);
      LOG('netCall test sequence complete');
      return;
    }
    if (count % 2) {
      EP.netCall('SRV:REFLECT', { foo: 'bar' }).then(res => {
        LOG('SRV:REFLECT returned', res);
      });
    } else {
      EP.netCall('SRV:MYSERVER', { hello: 'world' }).then(res => {
        LOG('SRV:MYSERVER returned', res);
      });
    }
    count++;
  }, 1000);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** disconnect from the server after */
function Disconnect(seconds = 3) {
  return new Promise((resolve, reject) => {
    m_Sleep(seconds * 1000, () => {
      if (SERVER_LINK) SERVER_LINK.close();
      resolve(true);
    });
  });
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// used by direct module import
export {
  // client interfaces (experimental wip, nonfunctional)
  Connect,
  RegisterMessages,
  Disconnect
};
