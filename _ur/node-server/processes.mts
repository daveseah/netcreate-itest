/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  UR PROCESS UTILITIES

  command line utilities for managing ur processes

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { makeTerminalOut } from '../common/util-prompts.ts';
import process from 'node:process';
import PATH from 'node:path';
const LOG = makeTerminalOut('PROCESS', 'TagGreen');
import * as FILE from './files.mts';

/// SUPPORT METHODS ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** break string of form 'addon' or 'addon/@entry' into parts
 *  addonName and entryName (no extension)
 */
function m_DecodeAddonName(shortPath: string): UR_ResObj {
  let addonName, entryName;
  // required argument
  if (typeof shortPath !== 'string') {
    LOG('error: arg must be a string path not', typeof shortPath);
    return {};
  }
  // handle modname and modname/@entry
  const pathbits = shortPath.split('@');
  if (pathbits.length === 2) {
    addonName = pathbits[0];
    entryName = pathbits[1];
  } else if (pathbits.length === 1) {
    addonName = shortPath;
  } else return { err: `error: '${shortPath}' has too many '@'` };

  // make sure entryJS is a string or undefined
  if (entryName !== undefined && typeof entryName !== 'string')
    return { err: `error: can't parse @entryname` };

  // double-check entry has leading @ if it's a string
  if (entryName) {
    if (entryName.indexOf('.') !== -1)
      return { err: `error: entryName '${entryName}' must not contain '.'` };
  }
  // restore @ sign to entryName
  if (entryName !== undefined) entryName = `@${entryName}`;
  // return found addon
  return { addonName, entryName };
}

/// ADDON METHODS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** decode the addon arguments into useful names
 *  context: called from the addon script forked by launcher, so the
 *  arguments are different from the ones used by ValidateAddon()
 */
function DecodeAddonArgs(argv: string[]): string[] {
  let [
    ,
    a_enp, // abs path to entry script (e.g. launched entrypoint)
    addonName, // passed addon name from launcher script
    ...args // passed parameters from launcher script
  ] = argv || process.argv; // default to process.argv if no args provided
  //
  const addonScript = PATH.basename(a_enp, PATH.extname(a_enp));
  return [
    addonScript, // script name of entry point
    addonName, // passed addon name (e.g. 'net')
    ...args // passed arguments
  ];
}

/// URCLI METHODS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** given an addonName or addonName/@entryName, return an object with
 *  addonName, entryName, and entryFile and reconcile with addon directory
 *  context: called from the urcli launcher script
 */
function ValidateAddon(addon: string): UR_ResObj {
  const ADDONS = PATH.join(FILE.DetectedRootDir(), '_ur_addons');
  if (!FILE.DirExists(ADDONS)) {
    return { err: `directory ${ADDONS} does not exist` };
  }
  // get list of valid addon subdirs
  const f_dir = item => !(item.startsWith('_') || item === 'node_modules');
  const a_dirs = FILE.Subdirs(ADDONS).filter(f_dir);
  // parse the addon name
  let { addonName, entryName, err } = m_DecodeAddonName(addon);
  if (err) return { err };

  if (!a_dirs.includes(addonName))
    return {
      err: `error: addon '${addonName}' not found in ${ADDONS} directory`
    };

  // scan for selected add on entry files
  const addon_dir = PATH.join(ADDONS, addonName);
  const a_files = FILE.Files(addon_dir);
  if (!a_files) {
    return { err: `error: addon '${addonName}' directory has no files` };
  }
  const entryFiles = a_files.filter(item => item.startsWith('@'));
  if (entryFiles.length === 0) {
    return { err: `error: addon '${addonName}' has no @entryfiles` };
  }
  let entryFile;
  // 1. was it just the addon name provided?
  if (!entryName) {
    if (entryFiles.length > 0) {
      entryFile = entryFiles[0];
      entryName = PATH.basename(entryFile, PATH.extname(entryFile));
      return {
        addonName,
        entryName,
        entryFile,
        entryFiles
      };
    }
    return { err: `addon '${addonName}' has no @entry files` };
  }
  // 2. was an entryName provided? Check that it exists
  const regex = new RegExp(`${entryName}\\.[^\\.]+$`, 'i');
  entryFile = entryFiles.find(filename => regex.test(filename));
  if (!entryFile) {
    return { err: `error: entry '${entryName}' not found in '${addonName}' addon` };
  }
  return {
    addonName,
    entryName,
    entryFile,
    entryFiles
  };
}
/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  DecodeAddonArgs, // given process.argv, return useful names
  ValidateAddon // given an addon name, return addonName, entryName, entryFile
};
