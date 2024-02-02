/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { FILES, PR, PROC } from '@ursys/core';
import { fork } from 'node:child_process';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('ADO-LOADR', 'TagCyan');
const DBG = false;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ARGS = process.argv.slice(2);

/// HELPER METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function ForkAddon(addonSelector: string) {
  const { addonName, entryName, entryFile, entryFiles, err } =
    PROC.ValidateAddon(addonSelector);
  if (err) {
    LOG(err);
    return;
  }
  // success!
  if (DBG) LOG(`.. found ${entryFiles.length} addon entryFile(s)`);
  if (DBG) entryFiles.forEach(f => LOG(`   . ${addonName}/${f}  `));
  const cwd = FILES.AbsLocalPath(`_ur_addons/${addonName}`);
  const child_pid = fork(entryFile, ARGS, { cwd });
  const { pid } = child_pid;
  if (DBG) LOG(`.. forking '${addonName}${entryName}' (pid ${pid}`);
}

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
if (DBG) LOG('---');
if (DBG) LOG('@load-addon.mts called with args:', ARGS);
const [arg_addon_name] = ARGS;
ForkAddon(arg_addon_name);

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
