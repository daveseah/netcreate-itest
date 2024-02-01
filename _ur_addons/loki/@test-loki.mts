/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  LokiJS Test Framework
  invoked by the _ur/ur command line module loader

  NOTE: there must be a file called 'team.loki' in:
  _ur/_data_nocommit/lokijs-team-ex directory

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { FILES, PR } from '@ursys/netcreate';
import { PromiseLoadDatabase, ListCollections } from './import-lokidb.mts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('LOKI', 'TagBlue');

/// RUNTIME TESTS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG('run starting...reading database');
const datadir = FILES.AbsLocalPath('_ur/_data_nocommit/lokijs-team-ex');
await PromiseLoadDatabase(`${datadir}/team.loki`);
ListCollections();
LOG('run complete');
