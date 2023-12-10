/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { FILES, PR } from '@ursys/netcreate';
import { fork } from 'node:child_process';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('ADO-LOADR', 'TagCyan');

/// HELPER METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function ForkAddon(addonSelector: string) {
  const { addonName, entryName, entryFile, entryFiles, err } =
    FILES.X_ValidateAddon(addonSelector);
  if (err) {
    LOG(err);
    return;
  }
  // success!
  LOG(`.. found ${entryFiles.length} addon entryFile(s)`);
  entryFiles.forEach(f => LOG(`   . ${addonName}/${f}  `));
  const cwd = FILES.AbsLocalPath(`_ur_addons/${addonName}`);
  const child_pid = fork(entryFile, ARGS, { cwd });
  const { pid } = child_pid;
  LOG(`.. forking '${addonName}${entryName}' (pid ${pid}`);
}

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG('---');
const ARGS = process.argv.slice(2);
LOG('@load-addon.mts called with args:', ARGS);
const [arg_addon_name] = ARGS;
ForkAddon(arg_addon_name);

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
