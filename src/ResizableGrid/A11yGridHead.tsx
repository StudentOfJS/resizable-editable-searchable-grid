import { memo } from 'react';
import type { ColDef, SortDirectionType } from './SVGResizableGrid';

const A11yGridHead = memo<{
  headers: ColDef[];
  sortField: string | null;
  sortDirection: SortDirectionType;
}>(({ headers, sortField, sortDirection }) => {
  return (
    <div className="sr-only" role="row" aria-rowindex={1}>
      <span role="columnheader" aria-colindex={1}>
        Select all rows
      </span>
      {headers.map((header, index) => (
        <span
          key={`a11y-header-${index}`}
          role="columnheader"
          aria-colindex={index + 2}
        >
          {header.name}{' '}
          {sortField === header.field
            ? sortDirection === 'asc'
              ? '(sorted ascending)'
              : '(sorted descending)'
            : ''}
        </span>
      ))}
    </div>
  );
});

export default A11yGridHead;
