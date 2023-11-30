/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET standalone server (NetCreate compatible version)

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import PATH from 'path';
import Keyv from 'keyv';
import { KeyvFile } from 'keyv-file';
import * as URNET from './urnet-server.mts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = console.log;
const ARGS = process.argv.slice(2);
let KEYVF, KEYV;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const m_addon_selector = ARGS[0];

/// KEY STORE /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function InitKeyStore() {
  // Create a Keyv instance using file storage
  const filename = PATH.join(process.cwd(), 'pid_keyv_nocommit.json');
  KEYVF = new KeyvFile({ filename });
  KEYV = new Keyv({
    store: KEYVF,
    namespace: '' // remove the namespace prefix added to key strings
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function TestKeyStore() {
  const pid = process.pid.toString();
  await KEYV.set(pid, m_addon_selector);
  const foo = await KEYV.get(pid);
  LOG(`.. test ${pid} contains ${foo}`);
  const keys = await KEYVF.keys();
  for (const k of keys) {
    const key = k.slice(1); // namespace is '', but : separate remains
    LOG(`.. persisted pid ${key} ...`, await KEYV.get(key));
  }
}

/// RUNTIME INITIALIZATION ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG('---');
LOG('@api-urnet.mts called with args:', ARGS);

InitKeyStore();
TestKeyStore();
