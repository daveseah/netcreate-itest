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
const LOG = PR('API-URNET', 'TagCyan');
const ARGS = process.argv.slice(2);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const [m_script, m_addon, ...m_args] = PROC.DecodeAddonArgs(process.argv);
const m_kvfile = PATH.join(process.cwd(), 'pid_keyv_nocommit.json');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let DETACH_SERVERS = false; // disables child process detaching for debugging
let IS_MAIN = true; // set when no other @api-cli is running

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
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
/** convenience function to get all entries except the main script */
async function m_GetHostEntries() {
  const entries = await KV.GetEntries();
  if (entries.length === 0) return;
  if (entries.length === 1 && entries[0].value === m_script) return;
  return entries.filter(e => e.value !== m_script);
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
  if (DBG) LOG(`.. spawned ${identifier} (pid ${proc.pid})`);

  const pid = proc.pid.toString();
  await KV.SaveKey(pid, `${identifier}`);
  if (DETACH_SERVERS) proc.unref();
  else {
    const { DIM, RST } = LOG;
    if (DBG)
      LOG(`.. ${DIM}'${identifier}' will not be detached. Use ctrl-c to exit.${RST}`);
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function StartServers() {
  // main protocol host
  await SpawnServer('./host-urnet-uds.mts', 'uds');
  // supplementary protocol hosts
  await SpawnServer('./serve-wss.mts', 'wss');
  await SpawnServer('./serve-http.mts', 'http');
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function TerminateServers() {
  const entries = await KV.GetEntries();
  if (entries.length === 0) {
    LOG.info(`.. no running servers to terminate`);
    return;
  }
  if (entries.length === 1 && entries[0].value === m_script) {
    LOG.info(`.. no running servers to terminate`);
    return;
  }
  LOG(`Terminating Server Processes...`);
  entries.forEach(async e => {
    const pid = Number(e.key);
    const identifier = e.value;
    if (identifier === m_script) return; // skip main process
    try {
      process.kill(pid, 'SIGTERM');
      const identifier = await KV.DeleteKey(e.key);
      LOG(`.. SIGTERM '${identifier}' (pid ${pid})`);
    } catch (err) {
      if (err.code === 'ESRCH') {
        LOG(`.. '${e.key}' (pid ${pid}) has already exited`);
        await KV.DeleteKey(e.key);
      } else LOG(`** Error sending SIGTERM to process ${pid}:`, err.code);
    }
  });
  if (IS_MAIN) {
    LOG(`.. ${m_script} is main host, removing from process list`);
    await m_DeleteProcessEntry(m_script);
    return;
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** handle 'net hosts' command */
async function ManageHosts() {
  // kill
  if (ARGS[2] === 'kill') {
    LOG.warn(`killing process list in '${m_kvfile}`);
    await TerminateServers();
    await m_DeleteProcessEntry(m_script);
    LOG.warn(`if problems persist, delete file manually`);
    return;
  }
  // otherwise just list them
  const entries = await m_GetHostEntries();
  if (!entries) {
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
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** keep track of main api script running status in the process list */
async function InitializeCLI() {
  // initialize the key-value store
  await KV.InitKeyStore(m_kvfile);
  if (await KV.HasValue(m_script)) {
    if (DBG) LOG.info(`CLI: ${m_script} already running`);
    return;
  }
  // got this far, no other instance of this script is running
  IS_MAIN = true;
  LOG.info(`CLI: ${m_script} setting process signal handlers`);
  process.on('SIGTERM', () => {
    console.log('\n');
    (async () => {
      await TerminateServers();
    })();
  });
  process.on('SIGINT', () => {
    console.log('\n');
    (async () => {
      await TerminateServers();
    })();
  });
  // save m_script without the -identifier suffix
  // the suffix is used by SpawnServer to create a unique identifier
  const pid = process.pid.toString();
  await KV.SaveKey(pid, m_script);
  LOG.info(`CLI: ${m_script} added to process list`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Remove the main api script from the process list. The logic is a bit
 *  tortuous because DBG flag is used to suspend the process list cleanup
 *  and should be revisited
 */
async function ShutdownCLI() {
  const hosts = await m_GetHostEntries();
  if (IS_MAIN && hosts === undefined) {
    await m_DeleteProcessEntry(m_script);
    if (DBG) LOG.info(`CLI: ${m_script} removed from process list`);
  } else if (DBG) LOG.info(`CLI: ${m_script} retained in process list`);
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
