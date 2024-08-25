/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

UR Table

Implements a table with resizable columns.
Emulates the API of Handsontable.


\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// LIBRARIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom'; // React 16
// import { createRoot } from 'react-dom/client'; // requires React 18
import UNISYS from 'unisys/client';

const CMTMGR = require('../comment-mgr');
import URCommentVBtn from './URCommentVBtn';
const { ICON_PENCIL, ICON_VIEW } = require('system/util/constant');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Initialize UNISYS DATA LINK for functional react component
const UDATAOwner = { name: 'URCommentThread' };
const UDATA = UNISYS.NewDataLink(UDATAOwner);

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function URTable({ data, attributeColumndefs }) {
  const [columnWidths, setColumnWidths] = useState([]);

  const tableRef = useRef(null);
  const resizeRef = useRef(null);

  /// USEEFFECT ///////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  useEffect(() => {
    const colWidths = [
      50, // View/Edit
      50, // Degrees
      300 // Label
    ];
    let remainingWidth =
      tableRef.current.clientWidth - colWidths.reduce((a, b) => a + b, 0) - 5;
    for (let i = 0; i < attributeColumndefs.length; i++) {
      colWidths.push(remainingWidth / attributeColumndefs.length);
    }
    colWidths.push(50); // Comments
    setColumnWidths(colWidths);
    console.log('columnWidths', colWidths);
  }, []);

  /// UTILITY METHODS /////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function u_GetButtonId(cref) {
    return `comment-button-${cref}`;
  }

  /// RESIZE COLUMN HANDLERS //////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const ui_mouseDown = (event, index) => {
    resizeRef.current = {
      index,
      startX: event.clientX,
      startWidth: columnWidths[index],
      nextStartWidth: columnWidths[index + 1],
      maxCombinedWidth: columnWidths[index] + columnWidths[index + 1] - 50
    };
  };
  const ui_mouseMove = event => {
    if (resizeRef.current !== null) {
      const { index, startX, startWidth, nextStartWidth, maxCombinedWidth } =
        resizeRef.current;
      const delta = event.clientX - startX;
      const newWidths = [...columnWidths];
      newWidths[index] = Math.min(Math.max(50, startWidth + delta), maxCombinedWidth); // Minimum width set to 50px
      newWidths[index + 1] = Math.min(
        Math.max(50, nextStartWidth - delta),
        maxCombinedWidth
      );
      setColumnWidths(newWidths);
    }
  };
  const ui_mouseUp = () => {
    resizeRef.current = null; // Reset on mouse up
  };

  /// CLICK HANDLERS //////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function evt_ClickViewComment(event, nodeId) {
    event.preventDefault();
    event.stopPropagation();
    UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [parseInt(nodeId)] });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function evt_ClickComment(cref) {
    const position = CMTMGR.GetCommentThreadPosition(u_GetButtonId(cref));
    CMTMGR.OpenCommentThread(cref, position);
  }

  /// TABLE DEFINITIONS ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const COLUMNDEFS = [
    {
      title: '-', // View/Edit
      data: 'id',
      type: 'text',
      renderer: RenderViewOrEdit
    },
    {
      title: 'Deg.',
      type: 'text',
      data: 'degrees'
    },
    {
      title: 'Label',
      type: 'text',
      data: 'label'
    },
    ...attributeColumndefs,
    {
      title: 'Comments',
      data: 'commentVBtnDef',
      type: 'text',
      renderer: RenderCommentBtn
    }
  ];

  /// RENDERERS ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function RenderViewOrEdit(value) {
    return (
      <button
        className="outline"
        onClick={event => evt_ClickViewComment(event, value)}
      >
        {ICON_VIEW}
      </button>
    );
  }

  function RenderCommentBtn(value) {
    return (
      <URCommentVBtn
        id={u_GetButtonId(value.cref)}
        count={value.count}
        hasUnreadComments={value.hasUnreadComments}
        selected={value.selected}
        cb={e => evt_ClickComment(value.cref)}
      />
    );
  }

  /// BUILT-IN TABLE METHODS //////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function ExecuteRenderer(renderer, value) {
    if (typeof renderer !== 'function') throw new Error('Invalid renderer');
    return renderer(value);
  }

  const TABLEDATA = data;

  /// RENDER //////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  return (
    <div
      className="URTable"
      ref={tableRef}
      onMouseMove={ui_mouseMove}
      onMouseUp={ui_mouseUp}
    >
      <table>
        <thead>
          <tr>
            {COLUMNDEFS.map((col, idx) => (
              <th key={idx} width={`${columnWidths[idx]}`}>
                {col.title}
                <div
                  className="resize-handle"
                  onMouseDown={e => ui_mouseDown(e, idx)}
                  hidden={idx === COLUMNDEFS.length - 1} // hide last resize handle
                ></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TABLEDATA.map((tdata, idx) => (
            <tr key={idx}>
              {COLUMNDEFS.map((col, idx) => (
                <td key={idx}>
                  {col.renderer
                    ? ExecuteRenderer(col.renderer, tdata[col.data])
                    : tdata[col.data]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URTable;
