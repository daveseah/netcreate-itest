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
import PROMPT from '../common/util-prompts.js';
import { ShortPath } from '@ursys/core';
import * as url from 'url';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return the directory name of the current module */
function m_Dirname() {
  if (import.meta) return url.fileURLToPath(new URL('.', import.meta.url));
  return __dirname;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** scan for parent directory that contains a file that uniquely appears in the
 *  root directory of the project. It defaults to `.nvmrc`
 */
function DetectedRootDir(rootfile: string = '.nvmrc'): string {
  if (typeof DETECTED_DIR === 'string') return DETECTED_DIR;
  let currentDir = m_Dirname();
  const check_dir = dir => FSE.existsSync(PATH.join(dir, rootfile));
  // walk through parent directories until root is reached
  while (currentDir !== PATH.parse(currentDir).root) {
    if (check_dir(currentDir)) {
      DETECTED_DIR = currentDir;
      return DETECTED_DIR;
    }
    currentDir = PATH.resolve(currentDir, '..');
  }
  // If reached root and file not found by loop
  return undefined;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PROMPT.makeTerminalOut(' FILE', 'TagGreen');
let DETECTED_DIR; // cached value of DetectedRootDir
const ERR_UR = 444;
const DBG = false;

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
/** Make a string relative to the project root, returning a normalized path */
function AbsLocalPath(subdir: string): string {
  const root = DetectedRootDir();
  if (!root) throw Error('AbsLocalPath: could not find project root');
  return PATH.normalize(PATH.join(root, subdir));
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Make a string that removes the DetectedRootDir() portion of the path */
function RelLocalPath(subdir: string): string {
  const root = DetectedRootDir();
  if (!root) throw Error('AbsLocalPath: could not find project root');
  const path = PATH.normalize(PATH.join(root, subdir));
  return path.slice(root.length);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return the short path name with project root removed */
function ShortPath(path: string): string {
  const root = DetectedRootDir();
  if (!root) throw Error('ShortPath: could not find project root');
  return path.slice(root.length);
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
function ReadFile(filepath, opt?) {
  opt = opt || {};
  opt.encoding = opt.encoding || 'utf8';
  return FSE.readFileSync(filepath, opt);
}

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
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function UnlinkFile(filepath) {
  try {
    FSE.unlinkSync(filepath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    console.log(err.code);
  }
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
  AbsLocalPath,
  RelLocalPath,
  ShortPath,
  Files,
  Subdirs,
  //
  ReadFile,
  AsyncReadFile,
  UnsafeWriteFile,
  AsyncReadJSON,
  AsyncWriteJSON,
  //
  UnlinkFile,
  //
  Test
};
