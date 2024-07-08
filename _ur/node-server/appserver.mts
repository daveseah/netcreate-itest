/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  AppServer with WebSocket Module

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import express from 'express';
import serveIndex from 'serve-index';
import { WebSocketServer } from 'ws';
import http from 'node:http';
import * as FILE from './files.mts';
import { makeTerminalOut, ANSI } from '../common/util-prompts.ts';
import { NetEndpoint } from '../common/class-urnet-endpoint.ts';
import { NetSocket } from '../common/class-urnet-socket.ts';
import { NetPacket } from '../common/class-urnet-packet.ts';

/// TYPE DEFINITIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import type { NP_Msg } from '../common/types-urnet.ts';
type AddressInfo = { port: number; family: string; address: string };
type RequestHandler = express.RequestHandler; // (req,res,next)=>void
type PacketHandler = (pkt: NetPacket) => void;
type HTOptions = {
  server_name?: string; // name of the server
  http_port?: number; // default is 8080
  http_host?: string; // default is localhost
  http_docs: string; // path to serve files
  show_index: boolean; // flag to display directory listing in browser
};
type WSOptions = {
  wss_path?: string; // default is 'urnet-ws'
};

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const { DIM, NRM } = ANSI;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = makeTerminalOut('UR', 'TagBlue');

/// DATA INIT /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let APP: express.Application; // express app instance, init by ListenHTTP
let SERVER: http.Server; // http server instance, init by ListenHTTP
let SERVER_NAME = 'AppServer';
let WSS: WebSocketServer; // websocket server, init by ListenWSS
let EP: NetEndpoint; // server endpoint, init by ListenWSS

/// SERVER INIT ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Start the HTTP server. The WebSocket server uses the same
 *  http server instance, which allows it to tunnel websocket traffic after
 *  the initial handshake. This allows nginx (if running) to proxy forward
 *  http traffic as https.
 */
function ListenHTTP(opt: HTOptions) {
  const { http_port, http_host, http_docs, show_index, server_name } = opt;
  if (typeof server_name === 'string') SERVER_NAME = server_name;
  return new Promise<void>((resolve, reject) => {
    // sanity checks
    if (SERVER) reject('HTTP server already started');
    if (!FILE.DirExists(http_docs)) reject('HTTP docs directory not found');
    // configure HTTP server
    APP = express();
    if (show_index) APP.get('/', serveIndex(http_docs));
    APP.use(express.static(http_docs));
    SERVER = APP.listen(http_port, http_host, () => {
      LOG.info(`${SERVER_NAME} started on http://${http_host}:${http_port}`);
      resolve();
    });
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Start the websocket server. Must be called after the http server is started
 *  to use the same server instance's address and port.
 */
function ListenWSS(opt: WSOptions) {
  const wss_path = opt.wss_path || 'urnet-ws';
  return new Promise<void>((resolve, reject) => {
    if (SERVER === undefined) reject(`${SERVER_NAME} HTTP not started`);
    if (EP === undefined) EP = new NetEndpoint();
    const { port, address } = SERVER.address() as AddressInfo;
    /** START WEBSOCKET SERVER with EXISTING HTTP SERVER **/
    const config = {
      clientTracking: true
    };
    WSS = new WebSocketServer({
      server: SERVER,
      path: `/${wss_path}`, // requires leading slash
      clientTracking: true
    });
    /** Initialize the endpoint **/
    WSS.on('connection', (client_link, request) => {
      if (DBG) LOG(`${DIM}client connect ${request.socket.remoteAddress}${NRM}`);
      const send = pkt => client_link.send(pkt.serialize());
      const onData = data => {
        const { message } = data;
        if (DBG) LOG(`${DIM}client message ${message}${NRM}`);
        const returnPkt = EP._ingestClientPacket(data, client_sock);
        if (returnPkt) client_link.send(returnPkt.serialize());
      };
      const close = () => {
        if (DBG) LOG(`${DIM}client disconnect${NRM}`);
        client_link.close();
      };
      const client_sock = new NetSocket(client_link, { send, onData, close });
      if (EP.isNewSocket(client_sock)) {
        EP.addClient(client_sock);
        const uaddr = client_sock.uaddr;
        if (DBG) LOG(`${uaddr} client connected`);
      }
      // handle incoming data and return on wire
      client_link.on('message', onData);
      client_link.on('end', () => {
        const uaddr = EP.removeClient(client_sock);
        if (DBG) LOG(`${uaddr} client 'end' disconnect`);
      });
      client_link.on('close', () => {
        const uaddr = EP.removeClient(client_sock);
        if (DBG) LOG(`${uaddr} client 'close' disconnect`);
      });
      client_link.on('error', err => {
        LOG.error(`.. socket error: ${err}`);
      });
    });
    /** resolve and exit **/
    if (DBG) {
      const location = `ws://${address}:${port}/${wss_path}`;
      LOG.info(`${SERVER_NAME}-URNET listening on ${location}`);
    }
    resolve();
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Convenience method to start HTTP and WS servers */
async function StartAll(opt: HTOptions & WSOptions) {
  await ListenHTTP(opt);
  await ListenWSS(opt);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Stop the HTTP server */
function StopHTTP() {
  return new Promise<void>((resolve, reject) => {
    if (SERVER === undefined) reject(`${SERVER_NAME} HTTP not started`);
    SERVER.close(() => {
      SERVER = undefined;
      LOG.info(`${SERVER_NAME} stopped`);
      resolve();
    });
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Stop the WebSocket server */
function StopWSS() {
  return new Promise<void>((resolve, reject) => {
    if (SERVER === undefined) reject(`${SERVER_NAME} HTTP not started`);
    if (WSS === undefined) reject(`${SERVER_NAME}-URNET not started`);
    WSS.close(() => {
      WSS = undefined;
      LOG.info(`${SERVER_NAME}-URNET stopped`);
      resolve();
    });
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Convenience method to stop HTTP and WS servers */
async function StopAll() {
  await StopWSS();
  await StopHTTP();
}

/// MIDDLEWARE ////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** To implement a service, add a packet handler to the endpoint. */
function AddPacketHandler(message: NP_Msg, pktHandler: PacketHandler) {
  try {
    EP.addMessageHandler(message, pktHandler);
  } catch (err) {
    LOG.error(`AddPacketHandler: ${err}`);
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** To remove a service, remove the packet handler from the endpoint.
 *  If the handler is not provided, all handlers for the message are removed.
 */
function RemovePacketHandler(message: NP_Msg, pktHandlr?: PacketHandler) {
  try {
    EP.deleteMessageHandler(message, pktHandlr);
  } catch (err) {
    LOG.error(`RemovePacketHandler: ${err}`);
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Get the APP instance for adding middleware */
function GetAppInstance(): express.Application {
  return APP;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Get the ENDPOINT instance for inspection */
function GetServerEndpoint(): NetEndpoint {
  return EP;
}

/// PROCESS SIGNAL HANDLING ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
process.on('SIGTERM', () => {
  (async () => {
    LOG(`SIGTERM received by AppServer (pid ${process.pid})`);
    await StopAll();
  })();
});
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
process.on('SIGINT', () => {
  (async () => {
    LOG(`SIGINT received by AppServer' (pid ${process.pid})`);
    await StopAll();
  })();
});
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// this might not be necessary; check nohup.out log for this message when
/// invoking ur with nohup net cmd &
process.on('SIGHUP', () => LOG(`ignoring SIGHUP received by AppServer`));

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  // simple lifecycle
  StartAll,
  StopAll,
  // startup
  ListenHTTP, // start the http server
  ListenWSS, // start the websocket server (after ListenHTTP)
  StopHTTP, // stop the http server
  StopWSS, // stop the websocket server
  // register URNET services
  AddPacketHandler,
  RemovePacketHandler,
  // expose instances
  GetAppInstance,
  GetServerEndpoint
};
