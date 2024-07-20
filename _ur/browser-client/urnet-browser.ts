/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET BROWSER CLIENT
  provides simple API to connect to URNET server from browser

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

// cjs-style modules
import PROMPTS from '../common/util-prompts.js';
// typescript classes
import NetEndpoint from '../common/class-urnet-endpoint.ts';
import NetSocket from '../common/class-urnet-socket.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PR = PROMPTS.makeStyleFormatter('URNET', 'TagPurple');
const LOG = console.log.bind(console);
const DBG = false;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const TIMEOUT = 360; // seconds before client closes connection
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const EP = new NetEndpoint(); // URNET endpoint wrapper
let SERVER_LINK: WebSocket; // WebSocket connection object
let EP_UADDR = EP.uaddr; // this is set after connection
let LISTENER_COUNT = 0; // prevent multiple onbeforeunload listeners

/// HELPER METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_Sleep(ms: number, resolve?: Function): Promise<void> {
  return new Promise(localResolve =>
    setTimeout(() => {
      if (typeof resolve === 'function') resolve();
      localResolve();
    }, ms)
  );
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** WINDOW EVENT LISTENER: used to add/remove event listeners */
function m_DisconnectListener() {
  EP.disconnectAsClient();
}

/// CLIENT API ////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: Create a client connection to the HTTP/WS server */
function Connect(): Promise<boolean> {
  const wss_url = '/webplay-ws';
  const promiseConnect = new Promise<boolean>(resolve => {
    SERVER_LINK = new WebSocket(wss_url);
    SERVER_LINK.addEventListener('open', async () => {
      let out = `Connected to ${wss_url}`;
      LOG(...PR(out));
      const send = pkt => SERVER_LINK.send(pkt.serialize());
      const onData = event => EP._ingestServerPacket(event.data, client_sock);
      const close = () => SERVER_LINK.close();
      const client_sock = new NetSocket(SERVER_LINK, { send, onData, close });
      SERVER_LINK.addEventListener('message', onData);
      SERVER_LINK.addEventListener('close', () => {
        out = `Server closed connection.`;
        LOG(...PR(out));
        EP.disconnectAsClient();
      });
      // needed on chrome, which doesn't appear to send a websocket closeframe
      if (LISTENER_COUNT === 0) {
        window.addEventListener('beforeunload', m_DisconnectListener);
        LISTENER_COUNT++;
      }
      // 2. start client; EP handles the rest
      const auth = { identity: 'my_voice_is_my_passport', secret: 'crypty' };
      const resdata = await EP.connectAsClient(client_sock, auth);
      if (DBG) LOG(...PR('EP.connectAsClient returned', resdata));
      if (resdata.error) {
        console.error(resdata.error);
        resolve(false);
        return;
      }
      // 3. register client with server
      const info = { name: 'UDSClient', type: 'client' };
      const regdata = await EP.declareClientProperties(info);
      if (DBG) LOG(...PR('EP.declareClientProperties returned', regdata));
      if (regdata.error) {
        console.error(regdata.error);
        resolve(false);
        return;
      }
      // 4. save global uaddr
      EP_UADDR = EP.uaddr;
      resolve(true);
    }); // end createConnection
  });
  return promiseConnect;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: Declare message handlers and register after authentation to be added to
 *  URNET message network
 */
async function RegisterMessages() {
  // declare messages to server
  const resdata = await EP.declareClientMessages();
  if (DBG) LOG(...PR('EP.declareClientMessages returned', resdata));
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: Force close the client connection, after waiting for the prescribed
 *  number of seconds (see beforeunload event listener in Connect() also)
 */
function Disconnect(seconds = TIMEOUT) {
  return new Promise((resolve, reject) => {
    LOG(...PR(`waiting for ${seconds} seconds...`));
    if (LISTENER_COUNT > 0) {
      window.removeEventListener('beforeunload', m_DisconnectListener);
      LISTENER_COUNT--;
    }
    m_Sleep(seconds * 1000, () => {
      resolve(true);
      SERVER_LINK.close();
      let out = `Client closing connection.`;
      LOG(...PR(out));
    });
  });
}

/// EXAMPLE USE ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Example of starting the client and registering messages */
async function EX_Start() {
  await Connect();
  EP.addMessageHandler('NET:HOT_RELOAD_APP', data => {
    LOG(...PR(`HOT_RELOAD_APP`));
    window.location.reload();
  });
  await RegisterMessages();
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  /* MAIN API */
  Connect, // create a client connection to the HTTP/WS server
  RegisterMessages, // delare message handlers and register after authentation
  Disconnect, // force close the client connection
  /* EXAMPLE USE */
  EX_Start
};
