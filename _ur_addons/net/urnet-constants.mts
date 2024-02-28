/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET RUNTIME CONSTANTS

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { FILE } from '@ursys/core';

/// TYPES & INTERFACES ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type TServerType = 'uds' | 'wss' | 'http';

/// SERVER CONFIGURATION INFO /////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const dir_addon_net = FILE.AbsLocalPath('_ur_addons/net');
const sock_file = 'UDSHOST_nocommit.sock';
const sock_path = `${dir_addon_net}/${sock_file}`;
const UDS_INFO = {
  sock_file, // socket file name
  sock_path // full socket file path
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ws_host = '127.0.0.1';
const ws_port = 2929;
const ws_path = '/urnet';
const ws_url = `ws://${ws_host}:${ws_port}${ws_path}`;
const WSS_INFO = {
  ws_host, // websocket server host
  ws_port, // websocket server port
  ws_path, // websocket server path
  ws_url // full websocket url address
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const http_port = 8080;
const https_port = 8443;
const http_host = '127.0.0.1';
const http_docs = FILE.AbsLocalPath('_ur_addons/_public');
const app_src = FILE.AbsLocalPath('_ur_addons/net/serve-http-app');
const app_index = 'index-net-http.html';
const app_entry = '@app-init.ts';
const app_bundle = 'js/net-http.bundle.js';
const app_bundle_map = 'script/net-http.bundle.js.map';
const http_url = `http://${http_host}:${http_port}`;
const https_url = `https://${http_host}:${https_port}`;
const HTTP_INFO = {
  app_src, // source directory for the app
  app_index, // html file for the app
  app_bundle, // js bundle file for app
  app_bundle_map, // js bundle map file for app
  app_entry, // js entry file for app bundling
  http_host, // http server host
  http_port, // http server port
  http_url, // full app url address (http://)
  http_docs, // express served files directory
  //
  https_port, // https server port
  https_url // full app url address (https://)
};

/// BUILD SYSTEM INFO /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ESBUILD_INFO = {
  es_target: 'es2018' // esbuild target
};

/// RUNTIME CONTROL ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Utility to set what servers should be enabled in net addon */
const SERVERS: Set<TServerType> = new Set(['http']);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function UseServer(serverType: TServerType) {
  return SERVERS.has(serverType);
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  UDS_INFO, // used for net:node unix domain socket server and client
  WSS_INFO, // used for ws websocket server and client
  HTTP_INFO, // used for http and https server
  //
  UseServer, // check if a server type is enabled
  //
  ESBUILD_INFO // used for esbuild bundling
};
