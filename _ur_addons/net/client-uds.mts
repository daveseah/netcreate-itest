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
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** register the connection for the first time */
function m_Register(sock: ipc.IpcClient) {
  const fn = 'm_Register';
  const regPkt = EP.newRegistrationPacket();
  regPkt.hop_seq.push(`NEW${Date.now()}`);
  sock.send(regPkt);
  LOG(`${fn} sent registration packet`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** register the connection for the first time */
function UDS_Register(sock: I_NetSocket) {
  const fn = 'm_Register';
  const regPkt = EP.newRegistrationPacket();
  regPkt.hop_seq.push(`NEW${Date.now()}`);
  sock.send(regPkt);
  LOG(`${fn} sent registration packet`);
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function UDS_Connect(): Promise<boolean> {
  const fn = 'UDS_Connect';
  const { sock_path, sock_file } = UDS_INFO;
  const pipeExists = await new Promise<boolean>((resolve, reject) => {
    if (!m_CheckForUDSHost()) {
      reject(`${fn}: server pipe ${sock_path} not found. Is server running?`); // reject promise
      return;
    } else resolve(true);
  }).catch(err => {
    LOG.error(err);
  });
  if (!pipeExists) return false;
  // got this far, the UDS pipe file exists so server is running
  const connection = NET.createConnection({ path: sock_path }, () => {
    LOG(`Connected to server '${sock_file}'`);
    const client_sock = new NetSocket(connection, pkt =>
      connection.write(pkt.serialize())
    );
    UDS_Register(client_sock);

    connection.on('data', data => {
      console.log(data.toString());
    });
    connection.on('end', () => {
      console.log('data services ending');
      connection.end();
    });
    connection.on('close', () => {
      console.log('server closed connection');
      process.exit(0);
    });
  });
  return true;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function UDS_Disconnect() {
  const { sock_path } = UDS_INFO;
  await new Promise((resolve, reject) => {
    try {
      // ipc.disconnect(uds_id);
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
  UDS_Disconnect
};
