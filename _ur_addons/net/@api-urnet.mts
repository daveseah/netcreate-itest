/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET standalone server (NetCreate compatible version)

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import * as URNET from './urnet-server.mts';
import PATH from 'path';
import Keyv from 'keyv';
import { KeyvFile } from 'keyv-file';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = console.log;
const ARGS = process.argv.slice(2);

/// RUNTIME INITIALIZATION ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG('@api-urnet.mts called with args:', ARGS);

// Create a Keyv instance using file storage
const filename = PATH.join(process.cwd(), 'pid_nocommit.json');
const keyvF = new KeyvFile({ filename });
const keyv = new Keyv({
  store: keyvF,
  namespace: '' // remove the namespace prefix added to key strings
});
// Using keyv
async function demo() {
  const pid = process.pid.toString();
  await keyv.set(pid, pid);
  const foo = await keyv.get(pid);
  console.log(foo); // 'bar'
  const keys = await keyvF.keys();
  for (const k of keys) {
    const key = k.slice(1); // namespace is '', but : separate remains
    console.log(`"${key}" -`, await keyv.get(key));
  }
}

demo();
