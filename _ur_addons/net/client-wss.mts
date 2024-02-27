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
const [m_script, m_addon, ...m_args] = PROC.DecodeAddonArgs(process.argv);

/// DATA INIT /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const EP = new NetEndpoint();

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
async function Connect(): Promise<boolean> {
  const { ws_url } = WSS_INFO;
  const promiseConnect = new Promise<boolean>(resolve => {
    const server_link = new WebSocket(ws_url);
    server_link.on('open', async function open() {
      // 1. wire-up server_link to the endpoint via our netsocket wrapper
      LOG(`Connected to server '${ws_url}'`);
      const send = pkt => server_link.send(pkt.serialize()); // client send
      const onData = data => EP._serverDataIngest(data, client_sock); // client receive
      const client_sock = new NetSocket(server_link, { send, onData });
      server_link.on('message', onData);
      server_link.on('close', (code, reason) => {
        LOG('server closed', code, reason);
        EP.disconnectAsClient();
        process.exit(0);
      });
      server_link.on('error', err => LOG.error(err));
      // 2. start client; EP handles the rest
      const auth = { identity: 'my_voice_is_my_passport', secret: 'crypty' };
      const resdata = await EP.connectAsClient(client_sock, auth);
      LOG('EP.connectAsClient returned', resdata);
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
      LOG('EP.registerClient returned', regdata);
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
  LOG('EP.clientDeclare returned', resdata);
  let count = 0;
  let foo = setInterval(() => {
    if (count > 9) {
      clearInterval(foo);
      LOG('interval stopped');
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
async function Disconnect() {
  await new Promise((resolve, reject) => {
    try {
      resolve(true);
    } catch (err) {
      reject(err);
    }
    m_Sleep(1000, resolve);
  }).catch(err => {
    LOG.error(err);
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
