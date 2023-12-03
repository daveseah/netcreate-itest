/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import PATH from 'node:path';
import Keyv from 'keyv';
import { KeyvFile } from 'keyv-file';
import { PR } from '@ursys/netcreate';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('KV-JSON');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let m_keyvfile; // keyv-file json adapter for keyv
let m_keyv; // keyv instance that uses keyv-file

/// KEY STORE /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** initialize a json-based file which will be stored in the current working
 *  directory.  The file will be created if it does not exist. If it does exist
 *  it will be loaded and used as the backing store for the key-value store.
 */
function InitKeyStore(jsonFilePath: string, namespace?: string) {
  // Create a Keyv instance using file storage
  LOG(`.. initializing keyv file ${jsonFilePath}`);
  m_keyvfile = new KeyvFile({ filename: jsonFilePath });
  if (typeof namespace !== 'string') {
    namespace = '';
    LOG(`.. namespace set to blank ''`);
  }
  m_keyv = new Keyv({
    store: m_keyvfile,
    namespace // remove the namespace prefix added to key strings
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** save key value. keyv-file writes to json file as backer */
async function SaveKey(key: string, value: any): Promise<void> {
  await m_keyv.set(key, value);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** retrieve key */
async function GetKey(key: string): Promise<any> {
  // const foo = await m_keyv.get(pid);
  const value = await m_keyv.get(key);
  LOG(`.. test ${key} contains ${value}`);
  return value;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** retrieve all entries in the key-value store */
async function GetEntries(): Promise<
  { namespace: string; key: string; value: any }[]
> {
  const keys = await m_keyvfile.keys();
  const entries = [];
  for (const k of keys) {
    let [namespace, key] = k.split(':');
    const value = await m_keyv.get(key);
    key = key.slice(1);
    entries.push({ namespace, key, value });
  }
  return entries;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** retrieve all keys in { keys, entries } where keys is the short keys
 *  without the associated namespace
 */
async function GetKeys(): Promise<string[]> {
  const keys = await m_keyvfile.keys();
  const results = [];
  for (const k of keys) {
    const [, key] = k.split(':');
    results.push(key.slice(1));
  }
  return results;
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { InitKeyStore, SaveKey, GetKey, GetEntries, GetKeys };
