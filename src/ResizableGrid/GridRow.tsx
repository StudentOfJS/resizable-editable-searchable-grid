import { memo } from 'react';
import { GridCell } from './GridCell ';
import type { ColDef, RowData } from './SVGResizableGrid';

const GridRow = memo<{
  columnWidths: number[];
  headers: ColDef[];
  row: RowData;
  rowIndex: number;
  isSelected: boolean;
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
  updateCell: (rowId: string, columnName: string, value: string) => void;
}>(
  ({
    columnWidths,
    headers,
    row,
    rowIndex,
    isSelected,
    handleCellKeyDown,
    setFocusPosition,
    updateCell,
  }) => {
    return (
      <>
        {row.cells.map((cell, colIndex) => (
          <div
            id={`cell-${rowIndex + 1}-${colIndex + 1}`}
            key={`cell-${rowIndex}-${colIndex}`}
            role="cell"
            aria-colindex={colIndex + 2} // +2 for checkbox col and 1-indexing
            aria-rowindex={rowIndex + 2} // +2 because 1-indexed and header is row 1
            className={`p-2 border border-gray-300 overflow-hidden ${
              isSelected ? 'bg-yellow-50' : ''
            }`}
            tabIndex={0}
            onKeyDown={(e) => handleCellKeyDown(e, rowIndex + 1, colIndex + 1)}
            onFocus={() => {
              setFocusPosition({ row: rowIndex + 1, col: colIndex + 1 });
            }}
            style={{ width: `${columnWidths[colIndex + 1]}px` }}
          >
            <GridCell
              rowId={row.id}
              column={headers[colIndex]}
              originalValue={cell}
              updateCell={updateCell}
            />
          </div>
        ))}
      </>
    );
  }
);

export default GridRow;
