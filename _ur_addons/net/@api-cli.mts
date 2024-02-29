/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URSYS NET CLI
  invoked by the _ur/ur command line module loader

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import PATH from 'node:path';
import { fileURLToPath } from 'node:url';
import { PR, PROC, FILE } from '@ursys/core';
import * as KV from './kv-json.mts';
import * as CTRL from './cli-serve-control.mts';
import * as TEST from './cli-test.mts';
import { UseServer } from './urnet-constants.mts';
import * as CLIENT_UDS from './client-uds.mts';
import * as CLIENT_WSS from './client-wss.mts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;
const DBG_CLI = false;
const LOG = PR('UR-CLI', 'TagCyan');
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

/// API: CLI MANAGEMENT ///////////////////////////////////////////////////////
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
      await CTRL.TerminateServers();
      if (IS_MAIN) {
        if (DBG_CLI)
          LOG.info(`.. ${m_script} is main host, removing from process list`);
        await CTRL.RemoveProcessKey(m_script);
        return;
      }
    })();
  });
  process.on('SIGINT', () => {
    console.log('\n');
    LOG(`SIGINT received`);
    (async () => {
      await CTRL.TerminateServers();
      if (IS_MAIN) {
        if (DBG_CLI)
          LOG.info(`.. ${m_script} is main host, removing from process list`);
        await CTRL.RemoveProcessKey(m_script);
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
  const hosts = await CTRL.GetActiveHostList();
  if (IS_MAIN && hosts.length === 0) {
    await CTRL.RemoveProcessKey(m_script);
    if (DBG_CLI) LOG.info(`CLI: ${m_script} removed from process list`);
  } else if (DBG_CLI) LOG.info(`CLI: ${m_script} retained in process list`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** called by COMMAND_DICT */
async function ClientUDS() {
  if (await CLIENT_UDS.Connect()) {
    LOG('uds client connected');
    await CLIENT_UDS.RegisterMessages();
    LOG('uds client declared messages');
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** called by COMMAND_DICT */
async function ClientWSS() {
  if (await CLIENT_WSS.Connect()) {
    LOG('wss client connected');
    await CLIENT_WSS.RegisterMessages();
    LOG('uds client declared messages');
  }
}

/// CLI: MAIN PARSER ///////////////////////////////////////////////////////////
/// - - - - - - - -å - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const COMMAND_DICT = {
  'start': async () => {
    await CTRL.StartServers();
  },
  'client': async () => {
    const sec = 15;
    if (UseServer('uds')) await ClientUDS();
    if (UseServer('wss')) await ClientWSS();
    LOG(`will disconnect clients in ${sec} seconds...`);
    await m_Sleep(sec * 1000);
    LOG('disconnecting clients...');
    const p = [];
    if (UseServer('wss')) p.push(CLIENT_WSS.Disconnect());
    if (UseServer('uds')) p.push(CLIENT_UDS.Disconnect());
    await Promise.all(p);
    await m_Sleep(1000);
    process.exit(0);
  },
  'stop': async () => {
    await CTRL.TerminateServers();
    await CTRL.UnlinkSocketFiles();
  },
  'restart': async () => {
    await CTRL.TerminateServers();
    await CTRL.StartServers();
  },
  'hosts': async () => {
    await CTRL.ManageHosts();
  },
  'test': async () => {
    await TEST.RunTests();
  }
};
/// - - - - - - - -å - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Parse the command line arguments and execute the command */
async function ParseCommandLine() {
  try {
    // script check that this was invoked from the correct directory
    const addon_dir = PATH.basename(PATH.join(fileURLToPath(import.meta.url), '..'));
    if (addon_dir !== 'net') {
      LOG(`invoked without 'net [mode]' command line args`);
      process.exit(1);
    }
    // execute the command
    const [, command] = ARGS;
    if (command === undefined) {
      const commands = Object.keys(COMMAND_DICT).join('|');
      LOG.warn(`syntax: ur net [${commands}]`);
      return;
    }
    const exec = COMMAND_DICT[command];
    if (exec) await exec();
    else LOG.warn(`unknown net command '${command}'`);
  } catch (err) {
    // format the error message to be nicer to read
    LOG.error(err.message);
    LOG.info(err.stack.split('\n').slice(1).join('\n').trim());
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
