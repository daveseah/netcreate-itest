/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  HTTP SERVER (HTTP)

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import http from 'node:http';
import https from 'node:https';
import express from 'express';
import serveIndex from 'serve-index';
import chokidar from 'chokidar';
import { PR, FILE } from '@ursys/core';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('HTTP', 'TagBlue');
const ARGS = process.argv.slice(2);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const HTTP_PORT = 8080;
const HTTPS_PORT = 8443;
const IP_ADDR = '127.0.0.1';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const m_addon_selector = ARGS[0];

/// DATA INIT /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let APP: express.Express; // express app instance
let SERVER: express.Express; // http server instance

/// PROCESS SIGNAL HANDLING ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
process.on('SIGTERM', () => {
  (async () => {
    await Stop();
  })();
});
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
process.on('SIGINT', () => {
  (async () => {
    await Stop();
  })();
});

/// SUPPORT FUNCTIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_AddDefaultRoutes() {
  // make sure public dir exists
  const localdir = '_ur_addons/_dist/_public';
  const htdocs = FILE.AbsLocalPath(localdir);
  FILE.EnsureDir(htdocs);
  //
  if (!APP) throw Error(`Can't add routes because APP not initialized`);
  APP.get('/', (req, res) => res.send(`<pre>hello world</pre>`));
  APP.get('/', express.static(htdocs));
  APP.get('/', serveIndex(htdocs));
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_AppListen() {
  if (!APP) throw Error(`Can't start server because APP not initialized`);
  SERVER = APP.listen(HTTP_PORT, IP_ADDR, () => {
    LOG(`.. HTTP Server listening at http://${IP_ADDR}:${HTTP_PORT}`);
  });
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Start() {
  // LOG.wa(`Starting Web Server on ${IP_ADDR}:${HTTP_PORT}`);
  APP = express();
  m_AddDefaultRoutes();
  m_AppListen();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function Stop() {
  LOG(`.. stopping HTTP Server on ${IP_ADDR}:${HTTP_PORT}`);
  SERVER.close();
}

/// RUNTIME INITIALIZE ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Start();
