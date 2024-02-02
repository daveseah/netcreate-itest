/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import Keyv from 'keyv';
import { KeyvFile } from 'keyv-file';
import { PR } from '@ursys/core';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('KV-JSON');
const DBG = false;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let m_keyvfile; // keyv-file json adapter for keyv
let m_keyv; // keyv instance that uses keyv-file
let m_jsonfile: string; // path to json file used by keyv-file

/// KEY STORE /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** initialize a json-based file which will be stored in the current working
 *  directory.  The file will be created if it does not exist. If it does exist
 *  it will be loaded and used as the backing store for the key-value store.
 */
function InitKeyStore(jsonFilePath: string, namespace?: string) {
  // Create a Keyv instance using file storage
  if (DBG) LOG(`.. initializing keyv file ${jsonFilePath}`);
  m_keyvfile = new KeyvFile({ filename: jsonFilePath });
  if (typeof namespace !== 'string') {
    namespace = '';
    if (DBG) LOG(`.. namespace set to blank ''`);
  }
  m_keyv = new Keyv({
    store: m_keyvfile,
    namespace // remove the namespace prefix added to key strings
  });
  m_jsonfile = jsonFilePath;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** save key value. keyv-file writes to json file as backer */
async function SaveKey(key: string, value: any): Promise<void> {
  await m_keyv.set(key, value);
  if (DBG) LOG(`.. saved ${key} with value ${value}`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return true if key */
async function HasKey(key: string): Promise<any> {
  const value = await m_keyv.has(key);
  return value;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** retrieve key */
async function GetKey(key: string): Promise<any> {
  const value = await m_keyv.get(key);
  if (DBG) LOG(`.. test ${key} contains ${value}`);
  return value;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** delete key */
async function DeleteKey(key: string): Promise<any> {
  const value = await m_keyv.get(key);
  await m_keyv.delete(key);
  if (DBG) LOG(`.. deleted ${key} with value ${value}`);
  return value;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function DeleteAllKeys(): Promise<void> {
  await m_keyv.clear();
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
    entries.push({ namespace, key, value });
  }
  return entries;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** search for an entry that has the matching value (as opposed to key) */
async function GetEntryByValue(
  value: any
): Promise<{ namespace: string; key: string; value: any }> {
  const entries = await GetEntries();
  const found = entries.find(e => e.value === value);
  return found;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return true if matching stored value is found */
async function HasValue(value: any): Promise<boolean> {
  const entries = await GetEntries();
  const found = entries.find(e => e.value === value);
  if (DBG && found) LOG.info('HasValue: found', found.key, 'with value', found.value);
  return found !== undefined;
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

/// UTILITY INFO //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetJSONFilePath(): string {
  return m_jsonfile;
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  InitKeyStore,
  SaveKey,
  HasKey,
  GetKey,
  DeleteKey,
  DeleteAllKeys,
  GetEntryByValue,
  GetEntries,
  HasValue,
  GetKeys,
  //
  GetJSONFilePath
};
