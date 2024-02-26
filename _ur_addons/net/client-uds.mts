/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NODEJS CLIENT ENDPOINT FOR URNET

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR, FILE, PROC } from '@ursys/core';
import { UDS_INFO } from './urnet-constants.mts';
import NET from 'node:net';
import ipc from '@achrinza/node-ipc';
import PATH from 'node:path';
import EP_DEFAULT from './class-urnet-endpoint.ts';
import NS_DEFAULT, { I_NetSocket } from './class-urnet-socket.ts';
const { NetEndpoint } = EP_DEFAULT;
const { NetSocket } = NS_DEFAULT;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('UDSClient', 'TagBlue');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UDS_DETECTED = false;
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
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** check for UDS host sock file, meaning UDS server is running */
function m_CheckForUDSHost() {
  const { sock_path } = UDS_INFO;
  UDS_DETECTED = FILE.FileExists(sock_path);
  return UDS_DETECTED;
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** create a connection to the UDS server */
async function UDS_Connect(): Promise<boolean> {
  const fn = 'UDS_Connect';
  const { sock_path, sock_file } = UDS_INFO;
  const promiseConnect = new Promise<boolean>(resolve => {
    if (!m_CheckForUDSHost()) {
      resolve(false);
      return;
    }
    // got this far, the UDS pipe file exists so server is running
    const connection = NET.createConnection({ path: sock_path }, async () => {
      // 1. wire-up connection to the endpoint via our netsocket wrapper
      LOG(`Connected to server '${sock_file}'`);
      const send = pkt => connection.write(pkt.serialize());
      const onData = data => EP._onData(data, client_sock);
      const client_sock = new NetSocket(connection, { send, onData });
      connection.on('data', onData);
      connection.on('end', () => {
        LOG('server ended connection');
        EP.disconnectAsClient();
      });
      connection.on('close', () => {
        LOG('server closed connection...exiting process');
        process.exit(0);
      });
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
      const info = { name: 'UDSClient', type: 'client' };
      const regdata = await EP.registerClient(info);
      if (regdata.error) {
        LOG.error(regdata.error);
        resolve(false);
        return;
      }
      LOG('EP.registerClient returned', regdata);
      resolve(true);
    }); // end createConnection
  });
  return promiseConnect;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** define message handlers and register after authentation to be added to
 *  URNET message network
 */
async function UDS_RegisterMessages() {
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
async function UDS_Disconnect() {
  const { sock_path } = UDS_INFO;
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
  UDS_Connect,
  UDS_RegisterMessages,
  UDS_Disconnect
};
