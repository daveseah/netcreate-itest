/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  UI MANAGER

  ui-mgr handles the custom definition of a UI

  It maps the template-schema variables to
  the visual display of components.

  What does it take care of?
  * order of display items?
  * visible status?

  Available Field Types
  * string
  * number
  * datetime
  * date
  * time
  * enum
  * color

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import { NewModule, NewDataLink } from 'unisys/client';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'ui-mgr: ';

/// INITIALIZE MODULE /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var MOD = NewModule(module.id);
var UDATA = NewDataLink(MOD);

// /// UNISYS HANDLERS ///////////////////////////////////////////////////////////
// /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// /** lifecycle INITIALIZE handler
//  */
// MOD.Hook("INITIALIZE", () => {
//   UDATA.HandleMessage('USER_HILITE_NODE', m_UserHighlightNode);
//   UDATA.HandleMessage('AUTOSUGGEST_HILITE_NODE', m_AutoSuggestHiliteNode);
//   UDATA.HandleMessage('TABLE_HILITE_NODE', m_TableHiliteNode);
// }); // end UNISYS_INIT

// /// MODULE METHODS ////////////////////////////////////////////////////////////
// /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// function m_UserHighlightNode(data) {
//   // console.log('mouseover', data.nodeId)
//   const HILITE = UDATA.AppState('HILITE');
//   HILITE.userHighlightNodeId = data.nodeId;
//   UDATA.SetAppState('HILITE', HILITE);
// }

/// EXPORT CLASS DEFINITION ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default MOD;
