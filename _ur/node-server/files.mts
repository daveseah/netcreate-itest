/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Base File System Helpers

  note: this has not been extensively bullet-proofed

  TODO: ensure that most routines are synchronous, and label async functions
  as such

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

/* added for pull request #81 so 'npm run lint' test appears clean */
/* eslint-disable no-unused-vars */

/// SYSTEM LIBRARIES //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import NDIR from 'node-dir';
import FSE from 'fs-extra';
import PATH from 'node:path';
import PROMPT from '../common/prompts.js';
import * as url from 'url';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_DetectDirname() {
  if (import.meta) return url.fileURLToPath(new URL('.', import.meta.url));
  return __dirname;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PROMPT.makeTerminalOut(' FILES', 'TagGreen');
const ERR_UR = 444;
const DBG = false;

/// ADDON MODULE SUPPORT //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** given a root directory, return an object that has
 *  - path: return a normalized path relative to base path with no trailing /
 *  - short: return path without the root directory portion
 */
function NormalPathUtility(UROOT: string) {
  const dirname = m_DetectDirname();
  if (UROOT === undefined) UROOT = PATH.normalize(PATH.join(dirname, '..'));
  const u_path = path => {
    if (path.length === 0) return UROOT;
    path = PATH.normalize(PATH.join(UROOT, path));
    if (path.endsWith('/')) path = path.slice(0, -1);
    return path;
  };
  const u_short = path => {
    if (path.startsWith(UROOT)) return path.slice(UROOT.length);
    return path;
  };
  return {
    path: u_path,
    short: u_short
  };
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** break string of form 'addon' or 'addon/@entry' into parts
 *  addonName and entryName (no extension)
 */
function ParseAddonName(shortPath: string) {
  let addonName, entryName;
  // required argument
  if (typeof shortPath !== 'string') {
    LOG('error: arg must be a string path not', typeof shortPath);
    return {};
  }
  // handle modname and modname/@entry
  const pathbits = shortPath.split('/');
  if (pathbits.length === 2) {
    addonName = pathbits[0];
    entryName = pathbits[1];
  } else if (pathbits.length === 1) {
    addonName = shortPath;
  } else throw Error('error: arg has too many slashes');
  // make sure entryJS is a string or undefined
  if (entryName !== undefined && typeof entryName !== 'string')
    throw Error('error: bad entryName');
  // double-check entry has leading @ if it's a string
  if (entryName) {
    if (!entryName.startsWith('@'))
      throw Error(`error: entryName '${entryName}' must begin with @`);
    if (entryName.indexOf('.') !== -1)
      throw Error(`error: entryName '${entryName}' must not contain '.'`);
  }
  // return found add
  return { addonName, entryName };
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - /
/** given an addonName or addonName/@entryName, return an object with
 *  addonName, entryName, and entryFile and reconcile with addon directory
 */
function ValidateAddon(addon: string) {
  const ADDONS = PATH.join(DetectedRootDir(), '_ur_addons');
  if (!DirExists(ADDONS)) {
    return { err: `directory ${ADDONS} does not exist` };
  }
  const a_dirs = Subdirs(ADDONS).filter(item => !item.startsWith('_'));
  let { addonName, entryName } = ParseAddonName(addon);
  let entryFile;
  //
  if (!a_dirs.includes(addonName))
    return {
      err: `addon ${addonName} not found in ${ADDONS} directory`
    };
  // confirmed that the directory exists, now read entry points
  const addon_dir = PATH.join(ADDONS, addonName);
  const a_files = Files(addon_dir);
  if (!a_files) {
    return { err: `addon ${addonName} has no files` };
  }
  const entry_files = a_files.filter(item => item.startsWith('@'));
  // 1. was it just the addon name provided?
  if (!entryName) {
    if (entry_files.length > 0) {
      entryFile = entry_files[0];
      entryName = PATH.basename(entryFile, PATH.extname(entryFile));
      return {
        addonName,
        entryName,
        entryFile
      };
    }
    return { err: `addon ${addonName} has no entry files` };
  }
  // 2. was an entryName provided? Check that it exists
  const regex = new RegExp(`${entryName}\\.[^\\.]+$`, 'i');
  entryFile = entry_files.find(filename => regex.test(filename));
  if (!entryFile) {
    LOG(`entry ${entryName} not found in ${addonName} directory`);
    return {};
  }
  return {
    addonName,
    entryName,
    entryFile
  };
}

/// SYNCHRONOUS FILE METHODS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function FileExists(filepath): boolean {
  try {
    // accessSync only throws an error; doesn't return a value
    FSE.accessSync(filepath);
    return true;
  } catch (e) {
    return false;
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function DirExists(dirpath): boolean {
  try {
    const stat = FSE.statSync(dirpath);
    if (stat.isFile()) {
      LOG(`DirExists: ${dirpath} is a file, not a directory`);
      return false;
    }
    return stat.isDirectory();
  } catch {
    return false;
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function IsDir(dirpath): boolean {
  try {
    const stat = FSE.statSync(dirpath);
    if (stat.isDirectory()) return true;
    return false;
  } catch (e) {
    LOG(`IsDir: ${dirpath} does not exist`);
    return false;
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function IsFile(filepath): boolean {
  try {
    const stat = FSE.statSync(filepath);
    if (stat.isFile()) return true;
    return false;
  } catch (e) {
    LOG(`IsFile: ${filepath} does not exist`);
    return false;
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function EnsureDir(dirpath) {
  try {
    FSE.ensureDirSync(dirpath);
    return true;
  } catch (err) {
    LOG(`EnsureDir: <${dirpath}> failed w/ error ${err}`);
    throw new Error(err);
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RemoveDir(dirpath): boolean {
  try {
    if (IsDir(dirpath)) FSE.removeSync(dirpath);
    return true;
  } catch (err) {
    LOG(`EnsureDir: <${dirpath}> failed w/ error ${err}`);
    throw new Error(err);
  }
}
//
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** scan for parent directory that contains a file that uniquely appears in the
 *  root directory of the project. It defaults to `.nvmrc`
 */
function DetectedRootDir(rootfile: string = '.nvmrc'): string {
  let currentDir = m_DetectDirname();
  const check_dir = dir => FSE.existsSync(PATH.join(dir, rootfile));
  while (currentDir !== PATH.parse(currentDir).root) {
    if (check_dir(currentDir)) return currentDir;
    currentDir = PATH.resolve(currentDir, '..');
  }
  // If reached root and file not found
  return undefined;
}

/// ASYNC DIRECTORY METHODS ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return array of filenames */
function GetDirContent(dirpath) {
  if (!DirExists(dirpath)) {
    const err = `${dirpath} is not a directory`;
    console.warn(err);
    return undefined;
  }
  const filenames = FSE.readdirSync(dirpath);
  const files = [];
  const dirs = [];
  for (let name of filenames) {
    let path = PATH.join(dirpath, name);
    const stat = FSE.lstatSync(path);
    // eslint-disable-next-line no-continue
    if (stat.isDirectory()) dirs.push(name);
    else files.push(name);
  }
  return { files, dirs };
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** given a dirpath, return all files. optional match extension */
function Files(dirpath, opt = {}): string[] {
  const result = GetDirContent(dirpath);
  if (!result) return undefined;
  const basenames = result.files.map(p => PATH.basename(p));
  if (DBG) LOG(`found ${basenames.length} files in ${dirpath}`);
  return basenames;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Subdirs(dirpath): string[] {
  const result = GetDirContent(dirpath);
  if (!result) return undefined;
  return result.dirs;
}

/// FILE READING //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function AsyncReadFile(filepath, opt?) {
  opt = opt || {};
  opt.encoding = opt.encoding || 'utf8';
  try {
    return await FSE.readFile(filepath, opt);
  } catch (err) {
    LOG(`AsyncReadFile: <${filepath}> failed w/ error ${err}`);
    throw new Error(err);
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function UnsafeWriteFile(filepath, rawdata) {
  let file = FSE.createWriteStream(filepath, { emitClose: true });
  file.write(rawdata);
  file.on('error', () => LOG('error on write'));
  file.end(); // if this is missing, close event will never fire.
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function AsyncReadJSON(filepath) {
  const rawdata = (await AsyncReadFile(filepath)) as any;
  return JSON.parse(rawdata);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function AsyncWriteJSON(filepath, obj) {
  if (typeof obj !== 'string') obj = JSON.stringify(obj, null, 2);
  await UnsafeWriteFile(filepath, obj);
}

/// SYNCHRONOUS TESTS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Test() {
  const files = Files(__dirname);
  if (files.length && files.length > 0) LOG('FM.Files: success');
  else LOG('Files: fail');
  LOG(`found ${files.length} files`);
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  FileExists,
  DirExists,
  IsDir,
  IsFile,
  EnsureDir,
  RemoveDir,
  DetectedRootDir,
  Files,
  Subdirs,
  //
  AsyncReadFile,
  UnsafeWriteFile,
  AsyncReadJSON,
  AsyncWriteJSON,
  // temporary addon module stuff
  NormalPathUtility as X_NormalPathUtility,
  ValidateAddon as X_ValidateAddon,
  //
  Test
};
