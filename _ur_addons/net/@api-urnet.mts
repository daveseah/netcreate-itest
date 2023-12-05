/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET standalone server (NetCreate compatible version)

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import PATH from 'node:path';
import { fileURLToPath } from 'node:url';
import { SpawnOptions, spawn } from 'node:child_process';
import { PR } from '@ursys/netcreate';
import * as KV from './kv-json.mts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false; // side effect: disables child process detaching
const LOG = PR('API-URNET', 'TagCyan');
const ARGS = process.argv.slice(2);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const m_addon_selector = ARGS[0];
const m_kvfile = PATH.join(process.cwd(), 'pid_keyv_nocommit.json');

/// PROCESS SIGNAL HANDLING ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
process.on('SIGTERM', () => {
  console.log('\n');
  (async () => {
    await TerminateServers();
  })();
});
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
process.on('SIGINT', () => {
  console.log('\n');
  (async () => {
    await TerminateServers();
  })();
});

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Given a server script with listener, spawn a process and save its pid
 *  with identifier. Allow only one such identifier */
async function SpawnServer(scriptName: string, id: string) {
  // make sure that this isn't already in here
  let identifier = `${m_addon_selector}`;
  if (id) identifier = `${identifier}-${id}`;
  const found = await KV.GetEntryByValue(identifier);
  if (found) {
    LOG(`!! server '${identifier}' already running (pid ${found.key})`);
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
  LOG(`.. spawned child pid ${proc.pid}`);

  const pid = proc.pid.toString();
  await KV.SaveKey(pid, `${identifier}`);
  if (!DBG) proc.unref();
  else {
    const { DIM, RST } = LOG;
    LOG(
      `   ${DIM}DBG mode: process '${identifier}' will not be detached. Use ctrl-c to exit.${RST}`
    );
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function TerminateServers() {
  const entries = await KV.GetEntries();
  if (entries.length === 0) {
    LOG(`!! Server Process List is empty...exiting.`);
    return;
  }
  LOG(`Terminating Server Processes...`);
  entries.forEach(async e => {
    const pid = Number(e.key);
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
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function Initialize() {
  await KV.InitKeyStore(m_kvfile);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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
    case 'start':
      await SpawnServer('./process-uds.mts', 'uds');
      await SpawnServer('./process-wss.mts', 'wss');
      break;
    case 'stop':
      await TerminateServers();
      break;
    case undefined:
      LOG(`net command requires mode argument [start|stop]`);
      break;
    default:
      LOG(`unknown net command '${command}'`);
  }
}

/// RUNTIME CLI ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG('---');
LOG('@api-urnet.mts called with args:', ARGS);
await Initialize();
await ParseCommandLine();
