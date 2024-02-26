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
  const pipeExists = await new Promise<boolean>((resolve, reject) => {
    if (!m_CheckForUDSHost()) {
      reject(`${fn}: server pipe ${sock_file} not found. Is server running?`); // reject promise
      return;
    } else resolve(true);
  }).catch(err => {
    LOG.error(err);
  });
  if (!pipeExists) return false;
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
    const identity = 'my_voice_is_my_passport';
    const resdata = await EP.connectAsClient(client_sock, identity);
    LOG('EP.connectAsClient returned', resdata);
  }); // end createConnection
  return true;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** define message handlers and register after authentation to be added to
 *  URNET message network
 */
function UDS_Register() {
  // register some message handlers
  EP.registerMessage('NET:CLIENT_TEST', data => {
    console.log('NET:CLIENT_TEST got', data);
  });
  // register client with server
  EP.registerClient();
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
  UDS_Register,
  UDS_Disconnect
};
