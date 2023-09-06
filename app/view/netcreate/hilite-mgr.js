/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  HILITE MANAGER

  hilite-mgr handles UI highlighting events like:
  * mouse over graph node
  * mouse over Node Table row
  * highlighting found nodes via search
  * Others TBD

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import { NewModule, NewDataLink } from 'unisys/client';

/// INITIALIZE MODULE /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var MOD = NewModule(module.id);
var UDATA = NewDataLink(MOD);

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'hilite-mgr: ';

/// UNISYS HANDLERS ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.Hook('INITIALIZE', () => {
  UDATA.HandleMessage('USER_HILITE_NODE', m_UserHighlightNode);
  UDATA.HandleMessage('AUTOSUGGEST_HILITE_NODE', m_AutoSuggestHiliteNode);
  UDATA.HandleMessage('TABLE_HILITE_NODE', m_TableHiliteNode);
}); // end UNISYS_INIT

/// MODULE METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_UserHighlightNode(data) {
  // console.log('mouseover', data.nodeId)
  const HILITE = UDATA.AppState('HILITE');
  HILITE.userHighlightNodeId = data.nodeId;
  UDATA.SetAppState('HILITE', HILITE);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** AUTOSUGGEST_HILITE_NODE shows the current mouse-over node name in a list of
 *  autosuggested/autocompleted node names from AutoComplete.
 */
function m_AutoSuggestHiliteNode(data) {
  const HILITE = UDATA.AppState('HILITE');
  HILITE.autosuggestHiliteNodeId = data.nodeId;
  UDATA.SetAppState('HILITE', HILITE);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** User is hovering over a row in the NodeTable.
 *  The corresponding node in the graph will also highlighted.
 */
function m_TableHiliteNode(data) {
  const HILITE = UDATA.AppState('HILITE');
  HILITE.tableHiliteNodeId = data.nodeId;
  UDATA.SetAppState('HILITE', HILITE);
}

/// EXPORT CLASS DEFINITION ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default MOD;
