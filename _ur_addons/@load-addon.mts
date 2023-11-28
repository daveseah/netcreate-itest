/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { FILES } from '@ursys/netcreate';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = console.log;
const ARGS = process.argv.slice(2);

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG('load-addon.mts: loaded with args:', ARGS);
const [arg_addon_name] = ARGS;

const { addonName, entryName, entryFile, err } =
  FILES.X_ValidateAddon(arg_addon_name);
if (err) LOG(err);
else {
  LOG('addonName:', addonName);
  LOG('entryName:', entryName);
  LOG('entryFile:', entryFile);
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
