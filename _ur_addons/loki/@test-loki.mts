/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  LokiJS Test Framework
  invoked by the _ur/ur command line module loader

  NOTE: there must be a file called 'team.loki' in:
  _ur/_data_nocommit/lokijs-team-ex directory

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { FILES, PR } from '@ursys/core';
import { PromiseLoadDatabase, ListCollections } from './import-lokidb.mts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('LOKI', 'TagBlue');

/// RUNTIME TESTS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG('run starting...reading database');
const datadir = FILES.AbsLocalPath('_ur_addons/loki/_data_nocommit');
await PromiseLoadDatabase(`${datadir}/netcreate-graph.loki`);
ListCollections();
LOG('run complete');
