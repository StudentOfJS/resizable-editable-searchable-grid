import { Fragment, memo } from 'react';

import type { ColDef, RowData } from './SVGResizableGrid';
import GridRow from './GridRow';

const GridRows = memo<{
  caption: string;
  columnWidths: number[];
  headers: ColDef[];
  rows: RowData[];
  selectedRowIds: Array<string>;
  summary: boolean;
  totalWidth: number;
  handleCellKeyDown: (
    event: React.KeyboardEvent,
    rowIndex: number,
    colIndex: number
  ) => void;
  setFocusPosition: (
    value: React.SetStateAction<{
      row: number;
      col: number;
    } | null>
  ) => void;
  toggleSelection: (rowId: string) => void;
  updateCell: (rowId: string, columnName: string, value: string) => void;
}>(
  ({
    caption,
    columnWidths,
    headers,
    rows,
    selectedRowIds,
    summary,
    totalWidth,
    handleCellKeyDown,
    setFocusPosition,
    toggleSelection,
    updateCell,
  }) => {
    // Check if a specific row is selected
    const isRowSelected = (rowId: string) => selectedRowIds.includes(rowId);
    // Generate styles for grid columns based on calculated widths
    const gridTemplateColumns = columnWidths
      .map((width) => `${width}px`)
      .join(' ');
    return (
      <div
        role="table"
        aria-rowcount={rows.length + 1} // +1 for header row
        aria-label={caption}
        aria-describedby={summary ? 'table-summary' : undefined}
        className="grid"
        style={{
          gridTemplateColumns,
          width: `${totalWidth}px`,
        }}
      >
        {/* Data rows with checkbox column */}
        {rows.map((row, rowIndex) => {
          const isSelected = isRowSelected(row.id);
          return (
            <Fragment key={row.id}>
              {/* Checkbox cell */}
              <div
                id={`cell-${rowIndex + 1}-0`}
                key={`checkbox-${rowIndex}`}
                role="cell"
                aria-colindex={1}
                aria-rowindex={rowIndex + 2} // +2 because 1-indexed and header is row 1
                className={`p-2 border border-gray-300 overflow-hidden flex items-center justify-center ${
                  isSelected ? 'bg-yellow-50' : ''
                }`}
                tabIndex={0}
                onKeyDown={(e) => handleCellKeyDown(e, rowIndex + 1, 0)}
                onFocus={() => {
                  setFocusPosition({ row: rowIndex + 1, col: 0 });
                }}
                style={{ width: `${columnWidths[0]}px` }}
                onClick={() => toggleSelection(row.id)}
              >
                <div
                  role="checkbox"
                  aria-checked={isSelected}
                  className="w-5 h-5 relative pointer-events-none"
                >
                  <input
                    type="checkbox"
                    className="opacity-0 absolute"
                    checked={isSelected}
                    onChange={() => toggleSelection(row.id)}
                    aria-label={`Select row ${rowIndex + 1}`}
                  />
                  <div className="w-5 h-5 border rounded border-gray-400 bg-white">
                    {isSelected && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5 text-blue-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
              {/* Data cells */}
              <GridRow
                columnWidths={columnWidths}
                headers={headers}
                row={row}
                rowIndex={rowIndex}
                isSelected={isSelected}
                handleCellKeyDown={handleCellKeyDown}
                setFocusPosition={setFocusPosition}
                updateCell={updateCell}
              />
            </Fragment>
          );
        })}
      </div>
    );
  }
);

export default GridRows;
