import { memo, useState } from 'react';
import { useFocusWithin } from 'react-aria';
import { type ColDef } from './SVGResizableGrid';

// Cell component for virtualized grid
export const GridCell = memo<{
  rowId: string;
  column: ColDef;
  originalValue: string;
  updateCell: (rowId: string, columnName: string, value: string) => void;
}>(({ rowId, column, originalValue, updateCell }) => {
  const [cellState] = useState<Map<string, string>>(
    new Map([
      ['cellValue', originalValue],
    ])
  );
  // const cellValue = useSignal(originalValue);
  // Determine if cell is being edited
  const [isEditing, setIsEditing] = useState(false);

  // Focus management
  const { focusWithinProps } = useFocusWithin({
    onFocusWithin: () => {
      if (column.isEditable) {
        setIsEditing(true);
      }
    },
    onBlurWithin: () => {
      if (cellState.get('cellValue') !== originalValue) {
        updateCell(rowId, column.field, cellState.get('cellValue') ?? '');
      }
      setIsEditing(false);
    },
  });

  // Handle validation and formatting
  const getFormattedValue = () => {
    if (column?.inputType === 'date' && originalValue) {
      return new Date(originalValue).toLocaleDateString('en-AU');
    }
    return originalValue;
  };

  if (!column.isEditable) {
    return <div className="text-nowrap">{originalValue}</div>;
  }

  return (
    <div
      {...focusWithinProps}
      tabIndex={0}
      className={`cell ${isEditing ? 'outline-orange' : ''} ${
        cellState.get('cellValue') !== originalValue ? 'outline-green' : ''
      }`}
    >
      {isEditing && column.inputType === 'select' && (
        <select
          defaultValue={cellState.get('cellValue')}
          onChange={(e) => cellState.set('cellValue', e.target.value)}
          className="w-full h-full border-none bg-transparent"
          {...(column.cellProps as React.InputHTMLAttributes<HTMLSelectElement>)}
        >
          {column.selectOptions?.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
      {isEditing && column.inputType !== 'select' && (
        <input
          type={column.inputType || 'text'}
          autoFocus
          defaultValue={cellState.get('cellValue')}
          onChange={(e) => {
            e.preventDefault();
            cellState.set('cellValue', e.target.value);
          }}
          className="bg-transparent"
          {...column.cellProps}
        />
      )}
      {!isEditing && (
        <div className="flex items-center justify-center gap-8">
          {getFormattedValue()}
          <button
            className="size-4"
            aria-label={`Edit ${column.field} for ${rowId || 'this row'}`}
            onClick={() => setIsEditing(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="pointer-events-none"
            >
              <path d="m18 5-2.414-2.414A2 2 0 0 0 14.172 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" />
              <path d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506zM8 18h1" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
});
