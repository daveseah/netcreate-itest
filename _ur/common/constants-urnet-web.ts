/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET RUNTIME CONSTANTS for HTTP BROWSER CLIENTS

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// TYPES & INTERFACES ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// HTTP servers are combined app and websocket servers on the same port!
/// They build their webapp from a source directory before serving it.
type T_HTTP_CLIENT = {
  http_host: string; // http server host used by client app
  http_port: number; // http server port used by client app
  http_url: string; // full app url address
  wss_path: string; // websocket server path rel to host url:port
  wss_url: string; // wss connection string
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const http_host = '127.0.0.1'; // default set http server host forced to ipv4
const http_port = 8080; // default http server port
const wss_path = 'urnet-http'; // websocket server path rel to host url:port
let HTTP_CLIENT_INFO: T_HTTP_CLIENT = {
  http_host,
  http_port,
  http_url: `http://${http_host}:${http_port}`, //
  wss_path: wss_path,
  wss_url: `ws://${http_host}:${http_port}/${wss_path}`
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Return new client info for a different hostname/path, which can not access
 *  to default localhost but needs a real domain name-based server address.
 *  Assumptions:
 *  - nginx is proxying http to https on the server side
 *  - no port is required, as this is handled by proxy
 */
function GetClientInfoFromWindowLocation(winLocation: Location) {
  const { host, pathname, protocol } = winLocation;
  const { http_port, wss_path } = HTTP_CLIENT_INFO;
  const tls = protocol === 'https:';
  const hostpath = host + pathname;
  const http_url = tls ? `https://${hostpath}` : `http://${hostpath}`;
  const wss_url = tls
    ? `wss://${hostpath}/${wss_path}`
    : `ws://${hostpath}${wss_path}`;
  let new_info = {
    ...HTTP_CLIENT_INFO,
    http_host: hostpath,
    http_url,
    wss_url
  };
  HTTP_CLIENT_INFO = new_info;
  return new_info;
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  HTTP_CLIENT_INFO,
  GetClientInfoFromWindowLocation // return new client info for a different hostpath
};
