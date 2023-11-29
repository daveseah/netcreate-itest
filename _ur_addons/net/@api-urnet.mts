/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URNET standalone server (NetCreate compatible version)

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import * as URNET from './urnet-server.mts';
import PATH from 'path';
import Keyv from 'keyv';
import { KeyvFile } from '@ursys/netcreate';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = console.log;
const ARGS = process.argv.slice(2);

/// RUNTIME INITIALIZATION ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG('@api-urnet.mts called with args:', ARGS);

// Create a Keyv instance using file storage
const filename = PATH.join(process.cwd(), 'pid_nocommit.json');
const keyv = new Keyv({
  store: new KeyvFile({ filename })
});
// Using keyv
async function demo() {
  await keyv.set('foo', 'bar');
  const foo = await keyv.get('foo');
  console.log(foo); // 'bar'

  console.log('keys', await keyv.iterator());
}

demo();
