/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\


UR Table

Implements a table with resizable and sortable columns.
Emulates the API of Handsontable.
Used also on https://github.com/netcreateorg/netcreate-itest/

# API - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

## Renderers
  This emulates Handsontable's renderer concept.
  * A renderer is a function that takes a value and returns a JSX element
  * If a column has a renderer, it will be used to render the value in the cell

## Sorters
  This emulates Handsontable's sorter concept.
  * A sorter is a function that takes a key, the table data, and the sort order
  * If a column has a sorter, it will be used to sort the table data

## Column Widths
  * Column widths can be set in the column definition
  * Columns without a width will be evenly distributed


# User Interaction - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

## Resizing Columns
  * Columns can be resized by dragging the right edge of the column header
    The column to the right of the dragged edge will expand or contract
  * Max resize -- Resizing is done between two columns: the current column,
  and the column to the right. (We assume the table width is fixed or 100%).
  To give you simple, but finer control over resizing columns, you can expand or
  contract the current column and the next column up/down to a minimum size.
  Once you hit the max size, you need to resize other columns to adjust.
  (We don't allow you to resize neighboring columns once you've hit the
  max/min just to simplify the math).

## Sort Order
  By default the table is unsorted.
  * Clicking on a column header will sort the table by that column in ascending order
  * Subsequent clicks will toggle to descending to unsorted and back to ascending
  * The next sort order is highlighted on hover with a transparent arrow
  * The column remembers the previous sort order when another column is selected
    so re-selecting the column will restore the previous sort order
  * A column can be designated unsortable by setting `sortDisabled` to `true`


# PROPS - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  `tableData`: array
      The data to be displayed in the table.

      [
        { id: 1, label: 'Constantinople', founding: '100 ce' },
        { id: 2, label: 'Athens', founding: '1000 bce' },
        { id: 3, label: 'Cairo', founding: '3000 bce' },
      ]

  `isOpen`: boolean
      To optimize performance, the column widths are only calculated
      when it's open.

  `columns`: array
      Specifications for how each column is to be rendered and sorted.

      Column Definition
        title: string
        data: string
        type: 'text' | 'text-case-insensitive' | 'number' | 'timestamp' | 'markdown' | 'hdate'
        width: number in px
        renderer: (value: any) => JSX.Element
        sorter: (key: string, tdata: any[], order: number) => any[]
        sortDisabled: boolean

  Example usage:

    const COLUMNDEFS = [
      {
        title: 'TITLE',
        data: 'title',
        type: 'text',
        width: 300, // in px
        renderer: this.RendererTitle,
        sorter: (key, tdata, order) => {
          const sortedData = [...tdata].sort((a, b) => {
            // note `title` is stuffed into `tdata`
            if (a[key].title < b[key].title) return order;
            if (a[key].title > b[key].title) return order * -1;
            return 0;
          });
          return sortedData;
        }
      },
      {
        title: 'UPDATED',
        data: 'dateModified',
        type: 'text',
        width: 300 // in px
      },
    ]

    const TABLEDATA = modelsWithGroupLabels.map(model => {
      return {
        id: model.id,
        title: model.title,
        groupLabel: model.groupLabel,
        dateModified: HumanDate(model.dateModified),
        dateCreated: HumanDate(model.dateCreated)
      };
    });

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// LIBRARIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import React, { useState, useEffect, useRef } from 'react';
import HDATE from 'system/util/hdate';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;

const SORTORDER = new Map();
SORTORDER.set(0, '▲▼');
SORTORDER.set(1, '▲');
SORTORDER.set(-1, '▼');

/// FUNCTIONAL COMPONENT DECLARATION //////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function URTable({ isOpen, data, columns }) {
  const [_tabledata, setTableData] = useState([]);
  const [_columndefs, setColumnDefs] = useState([]);
  const [_columnWidths, setColumnWidths] = useState([]);
  const [_sortColumnIdx, setSortColumnIdx] = useState(0);
  const [_sortOrder, setSortOrder] = useState(0);
  const [_previousColSortOrder, setPreviousColSortOrder] = useState({});

  const ref_Table = useRef(null);
  const ref_Resize = useRef(null);

  /// USE EFFECT //////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Init table data
  useEffect(() => {
    setTableData(data);
    // default to ascending when a column is first clicked
    const defaultSortOrders = {};
    columns.forEach((item, idx) => (defaultSortOrders[idx] = -1));
    setPreviousColSortOrder(defaultSortOrders);
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
  }, [_sortColumnIdx, _sortOrder, _previousColSortOrder]);

  /// UTILITIES ///////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// e.g. Jan 7 10:05:29 AM
  function u_HumanDate(timestamp) {
    if (timestamp === undefined || timestamp === '') return '<no date>';
    const date = new Date(timestamp);
    const timestring = date.toLocaleTimeString('en-Us', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const datestring = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return `${datestring} ${timestring}`;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// e.g. 1/7/25 10:05a
  function u_HumanDateShort(timestamp) {
    if (timestamp === undefined || timestamp === '') return '<no date>';
    const date = new Date(timestamp);
    const timestring = date.toLocaleTimeString('en-Us', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const datestring = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    });
    return `${datestring} ${timestring}`;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const u_CalculateColumnWidths = () => {
    // if table is not drawn yet, skip
    if (ref_Table.current.clientWidth < 1) return;

    // if it's already set, don't recalculate
    if (_columnWidths.length > 0 && ref_Table.current.clientWidth > 0) {
      return;
    }

    const definedColWidths = columns.filter(col => col.width).map(col => col.width);
    const definedColWidthSum = definedColWidths.reduce((a, b) => a + b, 0);
    const remainingWidth = ref_Table.current.clientWidth - definedColWidthSum;
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
    ref_Resize.current = {
      index,
      startX: event.clientX,
      startWidth: _columnWidths[index],
      nextStartWidth: _columnWidths[index + 1],
      maxCombinedWidth: _columnWidths[index] + _columnWidths[index + 1] - 50
    };
  };
  const ui_MouseMove = event => {
    if (ref_Resize.current !== null) {
      const { index, startX, startWidth, nextStartWidth, maxCombinedWidth } =
        ref_Resize.current;
      const delta = event.clientX - startX;
      const newWidths = [..._columnWidths];
      newWidths[index] = Math.min(Math.max(50, startWidth + delta), maxCombinedWidth); // Minimum width set to 50px
      newWidths[index + 1] = Math.min(
        Math.max(50, nextStartWidth - delta),
        maxCombinedWidth
      );
      setColumnWidths(newWidths);
    }
  };
  const ui_MouseUp = () => {
    ref_Resize.current = null; // Reset on mouse up
  };

  /// CLICK HANDLERS //////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function ui_SetSelectedColumn(event, index) {
    event.preventDefault();
    event.stopPropagation();
    if (_columndefs[index].sortDisabled) return; // If sort is disabled, do nothing

    if (_sortColumnIdx === index) {
      // if already selected, toggle the sort order
      let newSortOrder;
      if (_sortOrder === 0) newSortOrder = -1;
      else if (_sortOrder > 0) newSortOrder = 0;
      else newSortOrder = 1;
      setSortOrder(newSortOrder);
    } else {
      // otherwise default to the previous order
      setSortOrder(_previousColSortOrder[index]);
    }

    // update the previous sort order
    setPreviousColSortOrder({
      ..._previousColSortOrder,
      [_sortColumnIdx]: _sortOrder
    });

    setSortColumnIdx(index);
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
  function m_SortCaseInsensitive(key, tdata, order) {
    const sortedData = [...tdata].sort((a, b) => {
      if (!a[key] && !b[key]) return 0;
      if (!a[key]) return 1; // Move undefined or '' to the bottom regardless of sort order
      if (!b[key]) return -1; // Move undefined or '' the bottom regardless of sort order
      if (a[key].toLowerCase() < b[key].toLowerCase()) return order;
      if (a[key].toLowerCase() > b[key].toLowerCase()) return order * -1;
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
      if (!a[key].raw) return 1; // Move undefined or '' to the bottom regardless of sort order
      if (!b[key].raw) return -1; // Move undefined or '' the bottom regardless of sort order
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
   * Executes the renderer for a given column
   * @param {string} key tdata object key
   * @param {Object} tdata full table data object so you can access other keys
   * @param {Object} coldef column definition
   * @returns The final value to be rendered in the table cell
   */
  function m_ExecuteRenderer(key, tdata, coldef) {
    let result = '';
    const customRenderer = coldef.renderer;
    if (customRenderer) {
      if (typeof customRenderer !== 'function')
        throw new Error('Invalid renderer for', coldef);
      result = customRenderer(key, tdata, coldef);
    } else {
      // Run built-in renderers
      const value = tdata[key];
      switch (coldef.type) {
        case 'markdown': // Net.Create
          result = value.html;
          break;
        case 'hdate': // Net.Create
        case 'timestamp':
          result = u_HumanDate(value);
          break;
        case 'hdate-short': // Net.Create
        case 'timestamp-short':
          result = u_HumanDateShort(value);
          break;
        case 'number':
        case 'text':
        case 'text-case-insensitive':
        default:
          result = value;
      }
    }
    return (
      <div className="tabletip">
        {result}
        <span className="tabletiptext">{result}</span>
      </div>
    );
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Sorts then sets the table data
  function m_ExecuteSorter(tdata) {
    if (_columndefs.length < 1) return [];

    const customSorter = _columndefs[_sortColumnIdx].sorter;
    const key = _columndefs[_sortColumnIdx].data;
    let sortedData = [];
    if (customSorter) {
      if (typeof customSorter !== 'function') throw new Error('Invalid sorter');
      sortedData = customSorter(key, tdata, _sortOrder);
    } else {
      // Run built-in sorters
      switch (_columndefs[_sortColumnIdx].type) {
        case 'hdate':
          sortedData = m_SortByHDate(key, tdata, _sortOrder);
          break;
        case 'markdown':
          sortedData = m_SortByMarkdown(key, tdata, _sortOrder);
          break;
        case 'number':
          sortedData = m_SortByNumber(key, tdata, _sortOrder);
          break;
        case 'text-case-insensitive':
          sortedData = m_SortCaseInsensitive(key, tdata, _sortOrder);
          break;
        case 'timestamp': // timestamp is a string
        case 'text':
        default:
          sortedData = m_SortByText(key, tdata, _sortOrder);
      }
    }
    setTableData(sortedData);
  }
  /// RENDER //////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /**
   * jsx_SortBtn tracks two states:
   * if sort is disabled:
   *  - do not show sort button in header
   *  - the header is not clickable (no cursor pointer)
   * if sort is enabled:
   *  - show sort erder: '▲' or '▼' or '▲▼'
   *  - show cursor pointer
   */
  function jsx_SortBtn(columndef, idx) {
    const isSelected = _sortColumnIdx === idx;
    if (columndef.sortDisabled) {
      return <span className="sortDisabled">-</span>;
    } else if (isSelected) {
      console.log('selected sort order', _sortOrder);
      return <span className="sortEnabled">{SORTORDER.get(_sortOrder)}</span>;
    } else {
      // not selected, so sort order is the previous sort order
      return (
        <span className="sortEnabled">
          {SORTORDER.get(_previousColSortOrder[idx])}
        </span>
      );
    }
  }

  // show cursor pointer if not sortDisabled
  // needs to be set at `th` not at `th span`

  return (
    <div
      className="URTable"
      ref={ref_Table}
      onMouseMove={ui_MouseMove}
      onMouseUp={ui_MouseUp}
    >
      <table>
        <thead>
          <tr>
            {_columndefs.map((coldef, idx) => (
              <th
                key={idx}
                className={_sortColumnIdx === idx ? 'selected' : ''}
                width={`${_columnWidths[idx]}`}
              >
                <div onClick={e => ui_SetSelectedColumn(e, idx)}>
                  {coldef.title}&nbsp;
                  {jsx_SortBtn(coldef, idx)}
                </div>
                <div
                  className="resize-handle"
                  onMouseDown={e => ui_MouseDown(e, idx)}
                  hidden={idx === _columndefs.length - 1} // hide last resize handle
                ></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {_tabledata.map((tdata, idx) => (
            /* Net.Create Special Handling: Show filter transparency */
            <tr key={idx} style={{ opacity: tdata.meta.filteredTransparency }}>
              {_columndefs.map((coldef, idx) => (
                <td key={idx}>{m_ExecuteRenderer(coldef.data, tdata, coldef)}</td>
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
