/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Generic Dialog

  USE:

    <URDialog
      dialog={CMTSTATUS.dialog}
    />

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React from 'react';
import Draggable from 'react-draggable';
// import './URDialog.css'; // MEME-only

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'URDialog';

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function URDialog({ info }) {
  if (info === undefined) return null;

  const {
    isOpen,
    message = 'Are you sure?',
    okmessage = 'OK',
    cancelmessage = 'Cancel',
    onOK, // function
    onCancel // function
  } = info;

  /// COMPONENT RENDER ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const BTN_OK = <button onClick={onOK}>{okmessage}</button>;
  const BTN_CANCEL = onCancel ? (
    <button onClick={onCancel}>{cancelmessage}</button>
  ) : (
    ''
  );

  return (
    isOpen && (
      <div id="urdialog">
        <div className="screen"></div>
        <Draggable>
          <div className="dialogwindow">
            <div className="dialogmessage">{message}</div>
            <div className="dialogcontrolbar">
              {BTN_CANCEL}
              {`\u00a0`}
              {BTN_OK}
            </div>
          </div>
        </Draggable>
      </div>
    )
  );
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URDialog;
