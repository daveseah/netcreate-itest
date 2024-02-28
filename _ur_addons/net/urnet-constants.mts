/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET RUNTIME CONSTANTS

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { FILE } from '@ursys/core';

/// TYPES & INTERFACES ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type TServerType = 'uds' | 'wss' | 'http';

/// RUNTIME CONTROL ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Utility to set what servers should be enabled in net addon */
const SERVERS: Set<TServerType> = new Set(['http', 'wss', 'uds']);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function UseServer(serverType: TServerType) {
  return SERVERS.has(serverType);
}

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
const wss_host = '127.0.0.1';
const wss_port = 2929; // websocket server port
const wss_path = '/urnet'; // websocket server path
const WSS_INFO = {
  wss_host, // websocket server host
  wss_port, // websocket server port
  wss_path, // websocket server path
  wss_url: `ws://${wss_host}:${wss_port}${wss_path}` // full wss url address
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
const http_wss_path = wss_path + '-http';
const http_wss_port = wss_port + 100;
const http_wss_host = wss_host;
const http_wss_url = `ws://${http_wss_host}:${http_wss_port}${http_wss_path}`;
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
  wss_host, // websocket server host
  wss_path: http_wss_path, // websocket server path
  wss_port: http_wss_port, // websocket server port
  wss_url: http_wss_url, // full wss url address
  //
  https_port, // https server port
  https_url // full app url address (https://)
};

/// BUILD SYSTEM INFO /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ESBUILD_INFO = {
  es_target: 'es2018' // esbuild target
};

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
