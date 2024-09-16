/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

UR Table

Implements a table with resizable columns.
Emulates the API of Handsontable.


\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// LIBRARIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import React, { useState, useEffect, useRef } from 'react';
import HDATE from 'system/util/hdate';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;

/// FUNCTIONAL COMPONENT DECLARATION //////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function URTable({ isOpen, data, columns }) {
  const [tabledata, setTableData] = useState([]);
  const [columndefs, setColumnDefs] = useState([]);
  const [columnWidths, setColumnWidths] = useState([]);
  const [sortColumnIdx, setSortColumnIdx] = useState(0);
  const [sortOrder, setSortOrder] = useState(1);

  const tableRef = useRef(null);
  const resizeRef = useRef(null);

  /// USE EFFECT //////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Init table data
  useEffect(() => {
    setTableData(data);
  }, []);
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Calculate Initial Column Widths
  useEffect(() => {
    // ...AFTER the table is opened otherwise the table width is 0 at the first render
    if (isOpen) {
      // Only calculate widths if the table is open
      u_CalculateColumnWidths();
    }
  }, [isOpen]);
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Update column definitions
  useEffect(() => {
    // Set columns independently of the table data so that data can be updated
    // without affecting columns
    setColumnDefs(columns);
    u_CalculateColumnWidths();
  }, [columns]);
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Update table data
  useEffect(() => {
    m_ExecuteSorter(data);
  }, [data]);
  // Handle column sort selection
  useEffect(() => {
    // Sort table data
    m_ExecuteSorter(data);
  }, [sortColumnIdx, sortOrder]);

  /// UTILITIES ///////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const u_CalculateColumnWidths = () => {

    // if table is not drawn yet, skip
    if (tableRef.current.clientWidth < 1) return;

    // if it's already set, don't recalculate
    if (columnWidths.length > 0 && tableRef.current.clientWidth > 0) {
      return;
    }

    const definedColWidths = columns.filter(col => col.width).map(col => col.width);
    const definedColWidthSum = definedColWidths.reduce((a, b) => a + b, 0);
    const remainingWidth = tableRef.current.clientWidth - definedColWidthSum;
    const colWidths = columns.map(
      col => col.width || remainingWidth / (columns.length - definedColWidths.length)
    );
    setColumnWidths(colWidths);
  };

  /// RESIZE COLUMN HANDLERS //////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const ui_MouseDown = (event, index) => {
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      index,
      startX: event.clientX,
      startWidth: columnWidths[index],
      nextStartWidth: columnWidths[index + 1],
      maxCombinedWidth: columnWidths[index] + columnWidths[index + 1] - 50
    };
  };
  const ui_MouseMove = event => {
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
  const ui_MouseUp = () => {
    resizeRef.current = null; // Reset on mouse up
  };

  /// CLICK HANDLERS //////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function ui_ClickSorter(event, index) {
    event.preventDefault();
    event.stopPropagation();
    setSortColumnIdx(index);
    setSortOrder(sortOrder * -1);
  }

  /// BUILT-IN SORTERS ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function m_SortByText(key, tdata, order) {
    const sortedData = [...tdata].sort((a, b) => {
      if (DBG) console.log('sort by text', a[key], b[key]);
      if (!a[key] && !b[key]) return 0;
      if (!a[key]) return 1; // Move undefined or '' to the bottom regardless of sort order
      if (!b[key]) return -1; // Move undefined or '' the bottom regardless of sort order
      if (a[key] < b[key]) return order;
      if (a[key] > b[key]) return order * -1;
      return 0;
    });
    return sortedData;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function m_SortByMarkdown(key, tdata, order) {
    const sortedData = [...tdata].sort((a, b) => {
      // NC's markdown format from NCNodeTable will pass:
      // { html, raw}
      // We will sort by the raw text
      if (a[key].raw < b[key].raw) return order;
      if (a[key].raw > b[key].raw) return order * -1;
      return 0;
    });
    return sortedData;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function m_SortByNumber(key, tdata, order) {
    const sortedData = [...tdata].sort((a, b) => {
      const akey = Number(a[key]);
      const bkey = Number(b[key]);
      if (isNaN(akey) && isNaN(bkey)) return 0;
      if (isNaN(akey)) return 1; // Move NaN to the bottom regardless of sort order
      if (isNaN(bkey)) return -1; // Move NaN to the bottom regardless of sort order
      if (akey < bkey) return order;
      if (akey > bkey) return order * -1;
      return 0;
    });
    return sortedData;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function m_SortByHDate(key, tdata, order) {
    const sortedData = [...tdata].sort((a, b) => {
      const akey = HDATE.Parse(a[key]); // parseResult
      const bkey = HDATE.Parse(b[key]);
      // if ANY is defined, it's automatically greater than undefined
      if (akey.length > 0 && bkey.length < 1) return order;
      if (akey.length < 1 && bkey.length > 0) return order * -1;
      if (akey.length < 1 && bkey.length < 1) return 0;
      // two valid dates, compare them!
      const da = akey[0].start.knownValues;
      const db = bkey[0].start.knownValues;
      let dateorder;
      if (da.year !== db.year) {
        dateorder = da.year - db.year;
      } else if (da.month !== db.month) {
        dateorder = da.month - db.month;
      } else if (da.day !== db.day) {
        dateorder = da.day - db.day;
      } else if (da.hour !== db.hour) {
        dateorder = da.hour - db.hour;
      } else if (da.minute !== db.minute) {
        dateorder = da.minute - db.minute;
      } else if (da.second !== db.second) {
        dateorder = da.second - db.second;
      }
      return dateorder * order;
    });
    return sortedData;
  }
  /// BUILT-IN TABLE METHODS //////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   *
   * @param {*} value
   * @param {*} col
   * @param {*} idx
   * @returns The final value to be rendered in the table cell
   */
  function m_ExecuteRenderer(value, col, idx) {
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
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Sorts then sets the table data
  function m_ExecuteSorter(tdata) {
    if (columndefs.length < 1) return [];

    const customSorter = columndefs[sortColumnIdx].sorter;
    const key = columndefs[sortColumnIdx].data;
    let sortedData = [];
    if (customSorter) {
      if (typeof customSorter !== 'function') throw new Error('Invalid sorter');
      sortedData = customSorter(key, tdata, sortOrder);
    } else {
      // Run built-in sorters
      switch (columndefs[sortColumnIdx].type) {
        case 'hdate':
          sortedData = m_SortByHDate(key, tdata, sortOrder);
          break;
        case 'markdown':
          sortedData = m_SortByMarkdown(key, tdata, sortOrder);
          break;
        case 'date':
        case 'number':
          sortedData = m_SortByNumber(key, tdata, sortOrder);
          break;
        case 'text':
        default:
          sortedData = m_SortByText(key, tdata, sortOrder);
      }
    }
    setTableData(sortedData);
  }
  /// RENDER //////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  return (
    <div
      className="URTable"
      ref={tableRef}
      onMouseMove={ui_MouseMove}
      onMouseUp={ui_MouseUp}
    >
      <table>
        <thead>
          <tr>
            {columndefs.map((col, idx) => (
              <th
                key={idx}
                className={sortColumnIdx === idx ? 'selected' : ''}
                width={`${columnWidths[idx]}`}
              >
                <div onClick={e => ui_ClickSorter(e, idx)}>{col.title}</div>
                <div
                  className="resize-handle"
                  onMouseDown={e => ui_MouseDown(e, idx)}
                  hidden={idx === columndefs.length - 1} // hide last resize handle
                ></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabledata.map((tdata, idx) => (
            <tr key={idx} style={{ opacity: tdata.meta.filteredTransparency }}>
              {columndefs.map((col, idx) => (
                <td key={idx}>{m_ExecuteRenderer(tdata[col.data], col, idx)}</td>
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
