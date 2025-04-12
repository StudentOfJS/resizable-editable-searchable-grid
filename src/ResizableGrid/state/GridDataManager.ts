// Core data structures and types
type RowId = string;
type RowData = Record<string, any>;
type SortDirection = 'asc' | 'desc' | 'none';
type FilterConfig = {
  column: string;
  value: any;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'starts' | 'ends';
};

// You would define these based on your schema
const DATE_COLUMNS: string[] = ['createdAt', 'updatedAt', 'date'];
const SEARCHABLE_COLUMNS: string[] = [
  'name',
  'description',
  'email',
  'notes',
  'title',
];
const NUMERIC_COLUMNS: string[] = ['id', 'amount', 'price', 'quantity'];

export class GridDataManager {
  // Primary data store - constant time lookups
  private rowMap = new Map<RowId, RowData>();

  // Display order - only this changes during sort
  private displayIndex: RowId[] = [];

  // Filtered view - subset of displayIndex
  private filteredIndex: RowId[] = [];

  // Search optimization
  private searchIndex = new Map<RowId, string>();

  // Sort metadata - pre-computed for each sortable column
  private sortValues = new Map<string, Map<RowId, any>>();

  // Active filters
  private activeFilters: FilterConfig[] = [];

  // Current sort state
  private currentSort: { column: string | null; direction: SortDirection } = {
    column: null,
    direction: 'none',
  };

  // Unique ID field name
  private idField: string;

  constructor(rows: RowData[], uniqueIdField: string) {
    this.idField = uniqueIdField;

    // Initialize data structures
    rows.forEach((row) => {
      const id = String(row[uniqueIdField]);
      this.rowMap.set(id, { ...row });
      this.displayIndex.push(id);

      // Pre-compute search string
      this.searchIndex.set(id, this.buildSearchString(row));

      // Pre-compute sort values for special fields
      this.precomputeSortValues(id, row);
    });

    // Initialize filtered index to show all rows
    this.filteredIndex = [...this.displayIndex];
  }

  // Pre-compute special sort values (like date timestamps)
  private precomputeSortValues(id: RowId, row: RowData) {
    // Pre-compute date values
    DATE_COLUMNS.forEach((colName) => {
      if (!this.sortValues.has(colName)) {
        this.sortValues.set(colName, new Map());
      }

      if (row[colName]) {
        // Store timestamp for efficient date comparison
        const timestamp = new Date(row[colName]).getTime();
        this.sortValues.get(colName)!.set(id, timestamp);
      }
    });

    // Pre-compute numeric values
    NUMERIC_COLUMNS.forEach((colName) => {
      if (!this.sortValues.has(colName)) {
        this.sortValues.set(colName, new Map());
      }

      if (row[colName] !== undefined && row[colName] !== null) {
        // Convert strings to numbers if needed
        const numValue =
          typeof row[colName] === 'number'
            ? row[colName]
            : Number(row[colName]);

        if (!isNaN(numValue)) {
          this.sortValues.get(colName)!.set(id, numValue);
        }
      }
    });
  }

  // Create searchable string from row data
  private buildSearchString(row: RowData): string {
    return SEARCHABLE_COLUMNS.map((col) =>
      String(row[col] || '').toLowerCase()
    ).join(' ');
  }

  // Sort the display index (extremely efficient)
  sortBy(column: string, direction: SortDirection) {
    // Update current sort state
    this.currentSort = { column, direction };

    // If direction is 'none', reset to original order
    if (direction === 'none') {
      // Reset to original order based on ID
      this.displayIndex.sort((idA, idB) => {
        const rowA = this.rowMap.get(idA)!;
        const rowB = this.rowMap.get(idB)!;
        return String(rowA[this.idField]).localeCompare(
          String(rowB[this.idField])
        );
      });
    } else {
      // Sort by specified column
      this.displayIndex.sort((idA, idB) => {
        // Use pre-computed values for special types
        if (this.sortValues.has(column)) {
          const valueA = this.sortValues.get(column)!.get(idA) ?? 0;
          const valueB = this.sortValues.get(column)!.get(idB) ?? 0;
          return direction === 'asc' ? valueA - valueB : valueB - valueA;
        }

        // Regular string/number comparison
        const rowA = this.rowMap.get(idA)!;
        const rowB = this.rowMap.get(idB)!;

        const valueA = rowA[column];
        const valueB = rowB[column];

        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return direction === 'asc' ? valueA - valueB : valueB - valueA;
        }

        // String comparison
        const strA = String(valueA || '');
        const strB = String(valueB || '');
        const result = strA.localeCompare(strB);
        return direction === 'asc' ? result : -result;
      });
    }

    // Update filtered index to maintain filters
    this.applyCurrentFilters();

    return this.getCurrentState();
  }

  // Update cell when edited
  updateCell(id: RowId, column: string, value: any) {
    const row = this.rowMap.get(id);
    console.log('updating');
    if (!row) return null;
    console.log('updating row: ', row);
    // Update the actual data
    row[column] = value;

    // Update search index if this is a searchable column
    if (SEARCHABLE_COLUMNS.includes(column)) {
      this.searchIndex.set(id, this.buildSearchString(row));
    }

    // Update sort value if this is a special column
    if (this.sortValues.has(column)) {
      if (DATE_COLUMNS.includes(column) && value) {
        const timestamp = new Date(value).getTime();
        this.sortValues.get(column)!.set(id, timestamp);
      } else if (
        NUMERIC_COLUMNS.includes(column) &&
        value !== null &&
        value !== undefined
      ) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          this.sortValues.get(column)!.set(id, numValue);
        }
      }
    }

    // Re-sort if the current sort column was changed
    if (
      this.currentSort.column === column &&
      this.currentSort.direction !== 'none'
    ) {
      this.sortBy(this.currentSort.column, this.currentSort.direction);
    }

    // Reapply filters in case this edit affects filtering
    this.applyCurrentFilters();

    return this.getCurrentState();
  }

  // Add a new row
  addRow(row: RowData) {
    const id = String(row[this.idField]);

    // Don't add if ID already exists
    if (this.rowMap.has(id)) {
      return null;
    }

    // Add to data store
    this.rowMap.set(id, { ...row });
    this.displayIndex.push(id);

    // Update indexes
    this.searchIndex.set(id, this.buildSearchString(row));
    this.precomputeSortValues(id, row);

    // Apply current sort
    if (this.currentSort.column && this.currentSort.direction !== 'none') {
      this.sortBy(this.currentSort.column, this.currentSort.direction);
    }

    // Apply filters
    this.applyCurrentFilters();

    return this.getCurrentState();
  }

  // Delete a row
  deleteRow(id: RowId) {
    if (!this.rowMap.has(id)) {
      return null;
    }

    // Remove from all data structures
    this.rowMap.delete(id);
    this.displayIndex = this.displayIndex.filter((rowId) => rowId !== id);
    this.filteredIndex = this.filteredIndex.filter((rowId) => rowId !== id);
    this.searchIndex.delete(id);

    // Remove from sort values
    for (const [_, valueMap] of this.sortValues.entries()) {
      if (valueMap.has(id)) {
        valueMap.delete(id);
      }
    }

    return this.getCurrentState();
  }

  // Filter rows by text search (very efficient)
  filterBySearch(query: string) {
    if (!query) {
      // Apply only non-search filters
      this.applyCurrentFilters(true);
      return this.getCurrentState();
    }

    const lowerQuery = query.toLowerCase();

    // Apply text search and then any other filters
    this.filteredIndex = this.displayIndex.filter((id) =>
      this.searchIndex.get(id)?.includes(lowerQuery)
    );

    return this.getCurrentState();
  }

  // Add a column filter
  addFilter(filter: FilterConfig) {
    // Remove any existing filter on the same column
    this.activeFilters = this.activeFilters.filter(
      (f) => f.column !== filter.column
    );

    // Add the new filter
    this.activeFilters.push(filter);

    // Apply all filters
    this.applyCurrentFilters();

    return this.getCurrentState();
  }

  // Remove a column filter
  removeFilter(column: string) {
    this.activeFilters = this.activeFilters.filter((f) => f.column !== column);
    this.applyCurrentFilters();

    return this.getCurrentState();
  }

  // Clear all filters
  clearFilters() {
    this.activeFilters = [];
    this.filteredIndex = [...this.displayIndex];

    return this.getCurrentState();
  }

  // Apply current filters to the display index
  private applyCurrentFilters(skipSearch = false) {
    // Start with all rows
    this.filteredIndex = [...this.displayIndex];

    // Apply non-search filters
    for (const filter of this.activeFilters) {
      this.filteredIndex = this.filteredIndex.filter((id) => {
        const row = this.rowMap.get(id)!;
        const value = row[filter.column];

        switch (filter.operator) {
          case 'eq':
            return value === filter.value;
          case 'neq':
            return value !== filter.value;
          case 'gt':
            return value > filter.value;
          case 'lt':
            return value < filter.value;
          case 'contains':
            return String(value)
              .toLowerCase()
              .includes(String(filter.value).toLowerCase());
          case 'starts':
            return String(value)
              .toLowerCase()
              .startsWith(String(filter.value).toLowerCase());
          case 'ends':
            return String(value)
              .toLowerCase()
              .endsWith(String(filter.value).toLowerCase());
          default:
            return true;
        }
      });
    }
  }

  // Get all rows
  getAllRows(): RowData[] {
    return Array.from(this.rowMap.values());
  }

  // Get visible rows for current page
  getVisibleRows(startIndex: number, pageSize: number): RowData[] {
    return this.filteredIndex
      .slice(startIndex, startIndex + pageSize)
      .map((id) => this.rowMap.get(id)!)
      .filter(Boolean);
  }

  // Get the current state needed for the UI
  getCurrentState() {
    return {
      // Data for current view
      filteredRows: this.filteredIndex.map((id) => this.rowMap.get(id)!),

      // Total counts
      totalRows: this.rowMap.size,
      filteredCount: this.filteredIndex.length,

      // Current sort state
      currentSort: this.currentSort,

      // Current filters
      activeFilters: [...this.activeFilters],
    };
  }

  // Get a specific row by ID
  getRowById(id: RowId): RowData | undefined {
    return this.rowMap.get(id);
  }

  // Get multiple rows by IDs
  getRowsByIds(ids: RowId[]): RowData[] {
    return ids.map((id) => this.rowMap.get(id)).filter(Boolean) as RowData[];
  }

  // Check if a row exists
  hasRow(id: RowId): boolean {
    return this.rowMap.has(id);
  }

  // Get filtered row IDs
  getFilteredIds(): RowId[] {
    return [...this.filteredIndex];
  }
}
