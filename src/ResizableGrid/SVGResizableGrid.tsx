import {
  useState,
  useEffect,
  InputHTMLAttributes,
  HTMLInputTypeAttribute,
  FC,
} from 'react';

import GridRows from './GridRows';
import GridHead from './GridHead';

// Checkbox column width in pixels
export const CHECKBOX_COLUMN_WIDTH = 40;
export const DEFAULT_COLUMN_WIDTH = 150;
// Types
export type RowData = {
  id: string;
  cells: string[];
};

export type SortDirectionType = 'none' | 'asc' | 'dsc';

export type ColDef = {
  columnIndex: number;
  field: string;
  isEditable: boolean;
  name: string;
  inputType?: HTMLInputTypeAttribute;
  cellProps?: InputHTMLAttributes<HTMLSelectElement | HTMLInputElement>;
  selectOptions?: Array<{ value: string; label: string }>;
  borderColor?: string;
  headerBgColor?: string;
};

interface GridProps {
  borderColor?: string;
  headerBgColor?: string;
  fontColor?: string;
  headers: Array<ColDef>;
  rows: RowData[];
  toggleSelection: (rowId: string) => void;
  toggleSelectAll: () => void;
  isAllSelected: boolean;
  sortField: string | null;
  sortDirection: SortDirectionType;
  selectedRowIds: Array<string>;
  handleSort: (columnIndex: number) => void;
  caption?: string;
  summary?: string;
  updateCell: (rowId: string, columnName: string, value: string) => void;
}

const SVGResizableGrid: FC<GridProps> = ({
  fontColor,
  borderColor,
  headerBgColor,
  headers,
  rows: initialRows,
  toggleSelection,
  toggleSelectAll,
  isAllSelected,
  sortField,
  sortDirection,
  handleSort,
  caption,
  summary,
  selectedRowIds,
  updateCell,
}) => {
  // Calculate column widths based on divider positions
  const getColumnWidths = (dividerPositions: number[]) => {
    // Calculate derived values
    const totalWidth =
      dividerPositions.length > 0
        ? dividerPositions[dividerPositions.length - 1] + DEFAULT_COLUMN_WIDTH // Add last column width
        : CHECKBOX_COLUMN_WIDTH + DEFAULT_COLUMN_WIDTH; // Default if no dividers
    const widths: number[] = [];

    // First column width (checkbox column)
    widths.push(dividerPositions[0]);

    // Data columns
    for (let i = 1; i < dividerPositions.length; i++) {
      widths.push(dividerPositions[i] - dividerPositions[i - 1]);
    }

    // Last column - use a default width of 150 if there are no dividers
    const lastWidth =
      dividerPositions.length > 0
        ? totalWidth - dividerPositions[dividerPositions.length - 1]
        : 150;

    widths.push(lastWidth);
    return {
      columnWidths: widths,
      totalWidth,
    };
  };
  const [widths, setWidths] = useState<{
    columnWidths: Array<number>;
    totalWidth: number;
  }>(
    getColumnWidths([
      CHECKBOX_COLUMN_WIDTH,
      ...headers
        .slice(0, -1)
        .map((_, index) => CHECKBOX_COLUMN_WIDTH + (index + 1) * 150),
    ])
  );
  const [rows, setRows] = useState<RowData[]>(initialRows);
  // Track focused cell for keyboard navigation
  const [focusPosition, setFocusPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // handle update widths
  function handleWidthUpdates(dividerPositions: number[]) {
    setWidths(getColumnWidths(dividerPositions));
  }
  // Handle keyboard navigation between cells
  const handleCellKeyDown = (
    event: React.KeyboardEvent,
    rowIndex: number,
    colIndex: number
  ) => {
    if (!focusPosition) {
      setFocusPosition({ row: rowIndex, col: colIndex });
    }

    let newRow = rowIndex;
    let newCol = colIndex;

    switch (event.key) {
      case 'ArrowUp':
        newRow = Math.max(0, rowIndex - 1);
        event.preventDefault();
        break;
      case 'ArrowDown':
        newRow = Math.min(rows.length, rowIndex + 1);
        event.preventDefault();
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, colIndex - 1);
        event.preventDefault();
        break;
      case 'ArrowRight':
        newCol = Math.min(headers.length, colIndex + 1); // +1 for checkbox column
        event.preventDefault();
        break;
      case ' ': // Space key
        // Toggle selection if in checkbox column
        if (colIndex === 0 && rowIndex > 0) {
          const rowId = rows[rowIndex - 1].id;
          toggleSelection(rowId);
          event.preventDefault();
        }
        break;
      default:
        return;
    }

    // Focus the new cell if navigation changed position
    if (newRow !== rowIndex || newCol !== colIndex) {
      const tableElement = document.getElementById(`cell-${newRow}-${newCol}`);
      if (tableElement) {
        tableElement.focus();
        setFocusPosition({ row: newRow, col: newCol });
      }
    }
  };

  // Update rows when initial rows change
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  return (
    <div className="grid-table-container">
      {summary && (
        <div id="table-summary" className="sr-only">
          {summary}
        </div>
      )}

      {caption && (
        <div className="text-lg font-bold mb-2" role="caption">
          {caption}
        </div>
      )}

      {/* SVG Header Row with Resizable Columns */}
      <GridHead
        fontColor={fontColor}
        borderColor={borderColor}
        headerBgColor={headerBgColor}
        headers={headers}
        toggleSelectAll={toggleSelectAll}
        isAllSelected={isAllSelected}
        sortField={sortField}
        sortDirection={sortDirection}
        handleSort={handleSort}
        columnWidths={widths.columnWidths}
        totalWidth={widths.totalWidth}
        handleWidthUpdates={handleWidthUpdates}
      />

      {/* Data rows */}
      <GridRows
        caption={caption ?? ''}
        columnWidths={widths.columnWidths}
        headers={headers}
        rows={rows}
        selectedRowIds={selectedRowIds}
        summary={!!summary}
        totalWidth={widths.totalWidth}
        handleCellKeyDown={handleCellKeyDown}
        setFocusPosition={setFocusPosition}
        toggleSelection={toggleSelection}
        updateCell={updateCell}
      />

      <div className="mt-2 text-xs text-gray-500">
        Drag the dividers between column headers to resize or use keyboard (Tab
        to focus, then arrow keys). Click on column headers to sort. Use
        checkboxes to select rows.
      </div>
    </div>
  );
};

export default SVGResizableGrid;
