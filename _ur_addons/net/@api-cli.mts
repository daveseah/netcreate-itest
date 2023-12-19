/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET standalone daemon

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import PATH from 'node:path';
import { fileURLToPath } from 'node:url';
import { SpawnOptions, spawn } from 'node:child_process';
import { PR, PROC } from '@ursys/netcreate';
import * as KV from './kv-json.mts';
import * as UDS from './urnet-client.mts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;
const DBG_CLI = false;
const DBG_PROC = false;
const LOG = PR('API-URNET', 'TagCyan');
const ARGS = process.argv.slice(2);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const [m_script, m_addon, ...m_args] = PROC.DecodeAddonArgs(process.argv);
const m_kvfile = PATH.join(process.cwd(), 'pid_keyv_nocommit.json');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let DETACH_SERVERS = false; // disables child process detaching for debugging
let IS_MAIN = true; // set when no other @api-cli is running
let UDS_ONLY = false; // set when only UDS server will be spawned

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
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
/** Delete the script from the process list. Note this is used primarily to
 *  delete the the m_script entry; other process entries have suffixes like
 *  -wss and -uds and are deleted by TerminateServers()
 */
async function m_DeleteProcessEntry(script: string) {
  const entry = await KV.GetEntryByValue(script);
  if (entry === undefined) return;
  const { key } = entry;
  if (key === undefined) {
    LOG.error(`!! ERR ${script} has undefined 'key' property`);
    return;
  }
  await KV.DeleteKey(key);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** convenience function to get all active entries except the main script */
async function m_GetActiveHostList() {
  const entries = await KV.GetEntries();
  if (entries.length === 0) return [];
  // the m_script is also in the active host list but we don't include it
  if (entries.length === 1 && entries[0].value === m_script) return [];
  return entries;
}

/// API: SERVERS //////////////////////////////////////////////////////////////
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
    ['--transpile-only', scriptName, ...ARGS],
    options
  );
  if (DBG_PROC) LOG(`.. spawning ${identifier} with pid:${proc.pid}`);

  const pid = proc.pid.toString();
  await KV.SaveKey(pid, `${identifier}`);
  if (DETACH_SERVERS) proc.unref();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function StartServers() {
  LOG(`Starting Server Processes...`);
  const entries = await m_GetActiveHostList();
  if (entries.length > 0) {
    LOG.error(`!! servers are already running`);
    return;
  }
  if (m_args.find(a => a === '--detach')) DETACH_SERVERS = true;
  if (DETACH_SERVERS)
    LOG.warn(`note: servers will be detached; use 'net hosts --kill' to terminate`);
  else {
    LOG.warn(`note: 'net start' will not exit automatically; use ctrl-c to exit`);
  }
  // main protocol host
  await SpawnServer('./host-urnet-uds.mts', 'uds');
  // supplementary protocol hosts
  if (!UDS_ONLY) {
    await SpawnServer('./serve-wss.mts', 'wss');
    await SpawnServer('./serve-http.mts', 'http');
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function TerminateServers() {
  LOG(`Terminating Server Processes...`);
  const entries = await m_GetActiveHostList();
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
      if (DBG_PROC) LOG(`.. sending SIGTERM to pid:${pid} ${identifier}`);
    } catch (err) {
      if (err.code === 'ESRCH') {
        LOG(`.. '${e.key}' (pid ${pid}) has already exited`);
        await KV.DeleteKey(e.key);
      } else LOG(`** Error sending SIGTERM to process ${pid}:`, err.code);
    }
  });
  if (IS_MAIN) {
    if (DBG_CLI) LOG.info(`.. ${m_script} is main host, removing from process list`);
    await m_DeleteProcessEntry(m_script);
    return;
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** handle 'net hosts' command */
async function ManageHosts() {
  // kill
  if (m_args.find(a => a === '--kill')) {
    LOG.warn(`killing processes listed in '${PATH.basename(m_kvfile)}'`);
    await TerminateServers();
    await m_DeleteProcessEntry(m_script);
    LOG.warn(`if problems persist, delete file manually`);
    return;
  }
  // otherwise just list them
  const entries = await m_GetActiveHostList();
  if (entries.length === 0) {
    LOG(`.. no running server hosts`);
    return;
  }
  LOG(`URNET Processes:`);
  entries.forEach(e => {
    LOG(`.. ${e.key}: ${e.value}`);
  });
}

/// API: MESSAGER CLIENT //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function HandleSend() {
  await UDS.Connect();
  await UDS.Send('hello world');
  await UDS.Disconnect();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** keep track of main api script running status in the process list */
async function InitializeCLI() {
  // initialize the key-value store
  await KV.InitKeyStore(m_kvfile);
  if (await KV.HasValue(m_script)) {
    if (DBG_CLI) LOG.info(`CLI: ${m_script} already running`);
    return;
  }
  // got this far, no other instance of this script is running
  IS_MAIN = true;
  if (DBG_CLI) LOG.info(`CLI: ${m_script} setting process signal handlers`);
  process.on('SIGTERM', () => {
    console.log('\n');
    LOG(`SIGTERM received`);
    (async () => {
      await TerminateServers();
    })();
  });
  process.on('SIGINT', () => {
    console.log('\n');
    LOG(`SIGINT received`);
    (async () => {
      await TerminateServers();
    })();
  });
  // save m_script without the -identifier suffix
  // the suffix is used by SpawnServer to create a unique identifier
  const pid = process.pid.toString();
  await KV.SaveKey(pid, m_script);
  if (DBG_CLI) LOG.info(`CLI: ${m_script} added to process list`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Remove the main api script from the process list on shutdown.
 *  If there are still processes running, don't remove it because
 *  it's used to indicate that net api is still active (review this later)
 */
async function ShutdownCLI() {
  const hosts = await m_GetActiveHostList();
  if (IS_MAIN && hosts.length === 0) {
    await m_DeleteProcessEntry(m_script);
    if (DBG_CLI) LOG.info(`CLI: ${m_script} removed from process list`);
  } else if (DBG_CLI) LOG.info(`CLI: ${m_script} retained in process list`);
}
/// - - - - - - - -å - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function ParseCommandLine() {
  // script check that this was invoked from the correct directory
  const addon_dir = PATH.basename(PATH.join(fileURLToPath(import.meta.url), '..'));
  if (addon_dir !== 'net') {
    LOG(`invoked without 'net [mode]' command line args`);
    process.exit(1);
  }
  // execute the command
  const [, command] = ARGS;
  switch (command) {
    case 'hosts':
      await ManageHosts();
      break;
    case 'start':
      await StartServers();
      break;
    case 'stop':
      await TerminateServers();
      break;
    case 'send':
      await HandleSend();
      break;
    case undefined:
      LOG.warn(`net command requires mode argument [start|stop|hosts]`);
      break;
    default:
      LOG.warn(`unknown net command '${command}'`);
  }
}

/// RUNTIME CLI ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
if (DBG) LOG('---');
let arglist = m_args ? m_args.join(' ') : '';
if (arglist.length > 0) arglist = ` ${arglist}`;
LOG(`net command: '${m_addon}${arglist}'`);
await InitializeCLI();
await ParseCommandLine();
await ShutdownCLI();
await m_Sleep(1000);
