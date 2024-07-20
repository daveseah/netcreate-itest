/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET RUNTIME CONSTANTS

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import * as FILE from './files.mts';
// typescript imports as default
import * as CLIENT_CONSTANTS from '../common/constants-urnet-web.ts';

/// TYPES & INTERFACES ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// these are the types of servers that can be enabled
type TServerType = 'uds' | 'wss' | 'http';
/// UDS servers just need a socket file path
type T_UDS = {
  sock_file: string; // socket file name
  sock_path: string; // full socket file path
};
/// WSS servers are dedicated websocket servers running on a port and host
type T_WSS = {
  wss_host: string; // websocket server host
  wss_port: number; // websocket server port
  wss_path: string; // websocket server path rel to host url:port
  wss_url: string; // wss connection string
};
/// HTTP servers are combined app and websocket servers on the same port!
/// They build their webapp from a source directory before serving it.
type T_HTTP = {
  http_host: string; // http server host
  http_port: number; // http server port
  app_src: string; // source directory for the app
  app_index: string; // html file for the app
  app_bundle: string; // js bundle file for app
  app_bundle_map: string; // js bundle map file for app
  app_entry: string; // js entry file for app bundling
  http_url: string; // full app url address
  http_docs: string; // express served files directory
  wss_path: string; // websocket server path rel to host url:port
  wss_url: string; // wss connection string
};
type TESBUILD = { es_target: string };

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const { HTTP_CLIENT_INFO } = CLIENT_CONSTANTS;

/// RUNTIME CONTROL ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Utility to set what servers should be enabled in net addon */
// const SERVERS: Set<TServerType> = new Set(['http', 'wss', 'uds']);
const SERVERS: Set<TServerType> = new Set(['http']);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function UseServer(serverType: TServerType) {
  return SERVERS.has(serverType);
}

/// SERVER CONFIGURATION INFO /////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const dir_addon_net = FILE.AbsLocalPath('_ur_addons/net');
const sock_file = 'UDSHOST_nocommit.sock';
const UDS_INFO: T_UDS = {
  sock_file,
  sock_path: `${dir_addon_net}/${sock_file}`
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const wss_host = '127.0.0.1';
const wss_port = 2929;
const wss_path = 'urnet';
const WSS_INFO: T_WSS = {
  wss_host,
  wss_port,
  wss_path,
  wss_url: `ws://${wss_host}:${wss_port}${wss_path}` // full wss url address
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const { wss_path: wss_path_http, wss_url: wss_url_http } = HTTP_CLIENT_INFO;
const { http_host, http_port } = HTTP_CLIENT_INFO;
const HTTP_INFO: T_HTTP = {
  app_src: FILE.AbsLocalPath('_ur_addons/net/serve-http-app'),
  app_index: 'index-net-http.html',
  app_bundle: 'js/net-http.bundle.js',
  app_bundle_map: 'script/net-http.bundle.js.map',
  app_entry: '@app-init.ts',
  http_host,
  http_port,
  http_url: `http://${http_host}:${http_port}`, //
  http_docs: FILE.AbsLocalPath('_ur_addons/_public'),
  wss_path: wss_path_http,
  wss_url: wss_url_http
};

/// BUILD SYSTEM INFO /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ESBUILD_INFO: TESBUILD = {
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
export type { TServerType }; // export type for use in other modules
