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
import HDATE from 'system/util/hdate';
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
  const [tabledata, setTableData] = useState([]);
  const [columnWidths, setColumnWidths] = useState([]);
  const [sortColumn, setSortColumn] = useState(0);
  const [sortOrder, setSortOrder] = useState(1);

  const tableRef = useRef(null);
  const resizeRef = useRef(null);

  /// USEEFFECT ///////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Init table data
  useEffect(() => {
    setTableData(data);
  }, [data]);
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Init column widths
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
  }, []);
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Sort table data
  useEffect(() => {
    ExecuteSorter();
  }, [sortColumn, sortOrder]);

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
  function ui_ClickColumn(index) {
    setSortColumn(index);
    setSortOrder(sortOrder * -1);
  }
  function ui_ClickViewComment(event, nodeId) {
    event.preventDefault();
    event.stopPropagation();
    UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [parseInt(nodeId)] });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function ui_ClickComment(cref) {
    const position = CMTMGR.GetCommentThreadPosition(u_GetButtonId(cref));
    CMTMGR.OpenCommentThread(cref, position);
  }

  /// TABLE DEFINITIONS ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const COLUMNDEFS = [
    {
      title: '-', // View/Edit
      data: 'id',
      type: 'number',
      renderer: RenderViewOrEdit
    },
    {
      title: 'Deg.',
      type: 'number',
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
      renderer: RenderCommentBtn,
      sorter: SortCommentsByCount
    }
  ];

  /// RENDERERS ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function RenderViewOrEdit(value) {
    return (
      <button
        className="outline"
        onClick={event => ui_ClickViewComment(event, value)}
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
        cb={e => ui_ClickComment(value.cref)}
      />
    );
  }

  /// CUSTOM SORTERS //////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function SortCommentsByCount() {
    const key = COLUMNDEFS[sortColumn].data;
    const sortedData = [...tabledata].sort((a, b) => {
      if (a[key].count < b[key].count) return sortOrder;
      if (a[key].count > b[key].count) return sortOrder * -1;
      return 0;
    });
    setTableData(sortedData);
  }

  /// BUILT-IN SORTERS ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function SortByText(key) {
    const sortedData = [...tabledata].sort((a, b) => {
      if (a[key] < b[key]) return sortOrder;
      if (a[key] > b[key]) return sortOrder * -1;
      return 0;
    });
    setTableData(sortedData);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function SortByMarkdown(key) {
    const sortedData = [...tabledata].sort((a, b) => {
      // NC's markdown format from NCNodeTable will pass:
      // { html, raw}
      // We will sort by the raw text
      if (a[key].raw < b[key].raw) return sortOrder;
      if (a[key].raw > b[key].raw) return sortOrder * -1;
      return 0;
    });
    setTableData(sortedData);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function SortByNumber(key) {
    const sortedData = [...tabledata].sort((a, b) => {
      const akey = Number(a[key]);
      const bkey = Number(b[key]);
      if (isNaN(akey) && isNaN(bkey)) return 0;
      if (isNaN(akey)) return 1; // Move NaN to the bottom regardless of sort order
      if (isNaN(bkey)) return -1; // Move NaN to the bottom regardless of sort order
      if (akey < bkey) return sortOrder;
      if (akey > bkey) return sortOrder * -1;
      return 0;
    });
    setTableData(sortedData);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function SortByHDate(key) {
    const sortedData = [...tabledata].sort((a, b) => {
      const akey = HDATE.Parse(a[key]); // parseResult
      const bkey = HDATE.Parse(b[key]);
      // if ANY is defined, it's automatically greater than undefined
      if (akey.length > 0 && bkey.length < 1) return sortOrder;
      if (akey.length < 1 && bkey.length > 0) return sortOrder * -1;
      if (akey.length < 1 && bkey.length < 1) return 0;
      // two valid dates, compare them!
      const da = akey[0].start.knownValues;
      const db = bkey[0].start.knownValues;
      let order;
      if (da.year !== db.year) {
        order = da.year - db.year;
      } else if (da.month !== db.month) {
        order = da.month - db.month;
      } else if (da.day !== db.day) {
        order = da.day - db.day;
      } else if (da.hour !== db.hour) {
        order = da.hour - db.hour;
      } else if (da.minute !== db.minute) {
        order = da.minute - db.minute;
      } else if (da.second !== db.second) {
        order = da.second - db.second;
      }
      return order * sortOrder;
    });
    setTableData(sortedData);
  }
  /// BUILT-IN TABLE METHODS //////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // function ExecuteRenderer(renderer, value) {
  //   if (typeof renderer !== 'function') throw new Error('Invalid renderer');
  //   return renderer(value);
  // }
  function ExecuteRenderer(value, col, idx) {
    const customRenderer = col.renderer;
    if (customRenderer) {
      if (typeof customRenderer !== 'function')
        throw new Error('Invalid renderer for', col);
      return customRenderer(value);
    } else {
      // Run built-in renderers
      switch (col.type) {
        case 'markdown':
          return value.html;
        case 'hdate':
        case 'number':
        case 'text':
        default:
          return value;
      }
    }
  }
  function ExecuteSorter() {
    const customSorter = COLUMNDEFS[sortColumn].sorter;
    const key = COLUMNDEFS[sortColumn].data;
    if (customSorter) {
      if (typeof customSorter !== 'function') throw new Error('Invalid sorter');
      customSorter(key);
    } else {
      // Run built-in sorters
      switch (COLUMNDEFS[sortColumn].type) {
        case 'hdate':
          SortByHDate(key);
          break;
        case 'markdown':
          SortByMarkdown(key);
          break;
        case 'date':
        case 'number':
          SortByNumber(key);
          break;
        case 'text':
        default:
          SortByText(key);
      }
    }
  }

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
              <th
                key={idx}
                className={sortColumn === idx ? 'selected' : ''}
                width={`${columnWidths[idx]}`}
                onClick={e => ui_ClickColumn(idx)}
              >
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
          {tabledata.map((tdata, idx) => (
            <tr key={idx}>
              {COLUMNDEFS.map((col, idx) => (
                <td key={idx}>
                  {ExecuteRenderer(tdata[col.data], col, idx)}
                  {/* {col.renderer
                    ? ExecuteRenderer(col.renderer, tdata[col.data])
                    : tdata[col.data]} */}
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
