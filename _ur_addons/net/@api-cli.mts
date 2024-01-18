/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET standalone daemon

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import PATH from 'node:path';
import { fileURLToPath } from 'node:url';
import { PR, PROC } from '@ursys/netcreate';
import * as KV from './kv-json.mts';
import * as UDS from './urnet-client.mts';
import * as SERVE_CTRL from './serve-control.mts';
import * as SERVE_CTRL from './cli-serve-control.mts';
// ts files are commonjs with only default export availalble
import URNET from './class-urnet-endpoint.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;
const DBG_CLI = false;
const LOG = PR('API-URNET', 'TagCyan');
const ARGS = process.argv.slice(2);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const [m_script, m_addon, ...m_args] = PROC.DecodeAddonArgs(process.argv);
const m_kvfile = PATH.join(process.cwd(), 'pid_keyv_nocommit.json');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let IS_MAIN = true; // set when no other @api-cli is running

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

/// API: MESSAGER CLIENT //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function HandleSend() {
  await UDS.Connect();
  const data = ARGS.slice(2);
  const name = 'NET:TEST';
  await UDS.Send(name, { name, data });
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

  // set up signaltermination
  process.on('SIGTERM', () => {
    console.log('\n');
    LOG(`SIGTERM received`);
    (async () => {
      await SERVE_CTRL.TerminateServers();
      if (IS_MAIN) {
        if (DBG_CLI)
          LOG.info(`.. ${m_script} is main host, removing from process list`);
        await SERVE_CTRL.RemoveProcessKey(m_script);
        return;
      }
    })();
  });
  process.on('SIGINT', () => {
    console.log('\n');
    LOG(`SIGINT received`);
    (async () => {
      await SERVE_CTRL.TerminateServers();
      if (IS_MAIN) {
        if (DBG_CLI)
          LOG.info(`.. ${m_script} is main host, removing from process list`);
        await SERVE_CTRL.RemoveProcessKey(m_script);
        return;
      }
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
  const hosts = await SERVE_CTRL.GetActiveHostList();
  if (IS_MAIN && hosts.length === 0) {
    await SERVE_CTRL.RemoveProcessKey(m_script);
    if (DBG_CLI) LOG.info(`CLI: ${m_script} removed from process list`);
  } else if (DBG_CLI) LOG.info(`CLI: ${m_script} retained in process list`);
}

/// CLI: MAIN PARSER ///////////////////////////////////////////////////////////
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
      await SERVE_CTRL.ManageHosts();
      break;
    case 'start':
      await SERVE_CTRL.StartServers();
      break;
    case 'stop':
      await SERVE_CTRL.TerminateServers();
      break;
    case 'send':
      await HandleSend();
      break;
    case 'info':
      await HandleSend();
      break;
    case 'test':
      await HandleSend();
      break;
    case undefined:
      LOG.warn(`net command requires mode argument [start|stop|hosts|send]`);
      LOG.info(`reminder: working on 'net send' right now`);
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
// LOG(`net command: '${m_addon}${arglist}'`);
await InitializeCLI();
await ParseCommandLine();
await ShutdownCLI();
await m_Sleep(1000);
