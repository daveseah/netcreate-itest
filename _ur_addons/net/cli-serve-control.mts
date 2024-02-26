/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  urnet server-related CLI commands
  imported by @api-cli.mts and uses its process.argv

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import PATH from 'node:path';
import * as KV from './kv-json.mts';
import { SpawnOptions, spawn } from 'node:child_process';
import { PR, PROC, FILE } from '@ursys/core';
import { UDS_INFO } from './urnet-constants.mts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;
const LOG = PR('Process', 'TagCyan');
const DBG_PROC = true;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const [m_script, m_addon, ...m_args] = PROC.DecodeAddonArgs(process.argv);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let DETACH_SERVERS = false; // disables child process detaching for debugging
let UDS_ONLY = true; // set when only UDS server will be spawned

/// UTILITY METHODS ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** convenience function to get all active entries except the main script */
async function GetActiveHostList() {
  const entries = await KV.GetEntries();
  if (entries.length === 0) return [];
  // the m_script is also in the active host list but we don't include it
  if (entries.length === 1 && entries[0].value === m_script) return [];
  return entries;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Delete the script from the process list. Note this is used primarily to
 *  delete the the m_script entry; other process entries have suffixes like
 *  -wss and -uds and are deleted by TerminateServers()
 */
async function RemoveProcessKey(script: string) {
  const entry = await KV.GetEntryByValue(script);
  if (entry === undefined) return;
  const { key } = entry;
  if (key === undefined) {
    LOG.error(`!! ERR ${script} has undefined 'key' property`);
    return;
  }
  await KV.DeleteKey(key);
}

/// API: SERVER METHODS ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Given a server script with listener, spawn a process and save its pid
 *  with identifier. Allow only one such identifier */
async function SpawnServer(scriptName: string, id: string) {
  // make sure that this isn't already in here
  let identifier = `${m_script}`;
  if (id) identifier = `${identifier}-${id}`;
  const found = await KV.GetEntryByValue(identifier);
  if (found) {
    if (DBG)
      LOG.error(`!! server '${identifier}' already running (pid ${found.key})`);
    return;
  }
  // everything looks good, so spawn the process
  const options: SpawnOptions = {
    detached: true,
    stdio: DBG ? 'inherit' : 'ignore'
  };
  const proc = spawn(
    'ts-node-esm',
    ['--transpile-only', scriptName, ...m_args],
    options
  );
  if (DBG_PROC) LOG.info(`.. spawning ${identifier} with pid:${proc.pid}`);

  const pid = proc.pid.toString();
  await KV.SaveKey(pid, `${identifier}`);
  if (DETACH_SERVERS) proc.unref();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** spawn all communication servers */
async function StartServers() {
  LOG(`Starting Server Processes...`);
  const entries = await GetActiveHostList();
  if (entries.length > 0) {
    LOG.error(`!! server list is not empty...did you crash? use 'ur net stop'`);
    return;
  }
  if (m_args.find(a => a === '--detach')) DETACH_SERVERS = true;
  if (DETACH_SERVERS)
    LOG.warn(`note: servers will be detached; use 'net hosts --kill' to terminate`);
  else {
    LOG.warn(`note: 'net start' will not exit automatically; use ctrl-c to exit`);
  }
  // main protocol host
  await SpawnServer('./serve-uds.mts', 'uds');
  // supplementary protocol hosts
  if (!UDS_ONLY) {
    await SpawnServer('./serve-wss.mts', 'wss');
    await SpawnServer('./serve-http.mts', 'http');
  } else {
    LOG.warn(`UDS_ONLY flag is enabled, skipping other servers`);
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** shutdown all communication servers */
async function TerminateServers() {
  LOG(`Terminating Child Processes...`);
  const entries = await GetActiveHostList();
  if (entries.length === 0) {
    LOG.warn(`!! no running server processes`);
    return;
  }
  entries.forEach(async e => {
    const pid = Number(e.key);
    const identifier = e.value;
    if (identifier === m_script) return; // skip main process
    try {
      process.kill(pid, 'SIGTERM');
      const identifier = await KV.DeleteKey(e.key);
      if (DBG_PROC) LOG.info(`.. sending SIGTERM to pid:${pid} ${identifier}`);
    } catch (err) {
      if (err.code === 'ESRCH') {
        LOG(`.. '${e.key}' (pid ${pid}) has already exited`);
        await KV.DeleteKey(e.key);
      } else LOG(`** Error sending SIGTERM to process ${pid}:`, err.code);
    }
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** unlink the UDS socket file */
async function UnlinkSocketFiles() {
  const { sock_path } = UDS_INFO;
  const res = await FILE.UnlinkFile(sock_path);
  if (res) LOG(`.. unlinked ${FILE.ShortPath(sock_path)}`, res);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** handle 'net hosts' command */
async function ManageHosts() {
  // kill
  if (m_args.find(a => a === '--kill')) {
    LOG.warn(`killing processes listed in '${PATH.basename(KV.GetJSONFilePath())}'`);
    await TerminateServers();
    await RemoveProcessKey(m_script);
    LOG.warn(`if problems persist, delete file manually`);
    return;
  }
  // otherwise just list them
  const entries = await GetActiveHostList();
  if (entries.length === 0) {
    LOG(`.. no running server hosts`);
    return;
  }
  LOG(`URNET Processes:`);
  entries.forEach(e => {
    LOG(`.. ${e.key}: ${e.value}`);
  });
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  StartServers,
  TerminateServers,
  ManageHosts,
  //
  GetActiveHostList,
  //
  RemoveProcessKey,
  UnlinkSocketFiles
};
