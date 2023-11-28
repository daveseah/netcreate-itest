/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { FILES } from '@ursys/netcreate';
import { fork } from 'node:child_process';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = console.log;
const ARGS = process.argv.slice(2);
const CHILDREN = [];

/// HELPER METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function ForkAddon(addonSelector: string, opt = {}) {
  const { addonName, entryName, entryFile, err } =
    FILES.X_ValidateAddon(addonSelector);
  if (err) {
    LOG(err);
    return;
  }

  // success!
  LOG('addonName:', addonName);
  LOG('entryName:', entryName);
  LOG('entryFile:', entryFile);
  let child;
  const cwd = FILES.LocalPath(`_ur_addons/${addonName}`);
  child = fork(entryFile, ARGS.slice(1), { cwd });
  CHILDREN.push(child);
}

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG('load-addon.mts called with args:', ARGS);
const [arg_addon_name] = ARGS;
ForkAddon(arg_addon_name);

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
