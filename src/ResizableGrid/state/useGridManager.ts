import { useState, useCallback, useEffect, useMemo } from 'react';
import { GridDataManager } from './GridDataManager';

// Types needed for the hook
export type SortDirection = 'none' | 'asc' | 'dsc';

export interface GridRow {
  id: string;
  cells: string[];
}

export interface GridManagerConfig {
  idField: string;
  columns: string[];
  initialData: Record<string, any>[];
  initialPageSize?: number;
  defaultSortColumn?: string;
  defaultSortDirection?: SortDirection;
}

export interface UseGridManagerReturn {
  // Data
  rows: GridRow[];
  totalRows: number;
  filteredCount: number;
  pageSize: number;
  currentPage: number;

  // Selection
  selectedIds: string[];
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;

  // Sorting
  sortField: string | null;
  sortDirection: SortDirection;
  handleSort: (columnIndex: number) => void;

  // Filtering and Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  addFilter: (column: string, value: any, operator: string) => void;
  removeFilter: (column: string) => void;
  clearFilters: () => void;

  // Pagination
  setPageSize: (size: number) => void;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Data operations
  updateCell: (rowId: string, columnName: string, value: string) => void;
  addRow: (rowData: Record<string, any>) => void;
  deleteRow: (rowId: string) => void;

  // Other
  isLoading: boolean;
  dataManager: GridDataManager;
}

export function useGridManager({
  idField,
  columns,
  initialData,
  initialPageSize = 10,
  defaultSortColumn,
  defaultSortDirection = 'none',
}: GridManagerConfig): UseGridManagerReturn {
  // Create data manager
  const dataManager = useMemo(() => {
    return new GridDataManager(initialData, idField);
  }, [initialData, idField]);

  // State for UI
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortField, setSortField] = useState<string | null>(
    defaultSortColumn || null
  );
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(defaultSortDirection);
  const [isLoading, setIsLoading] = useState(false);
  const [gridState, setGridState] = useState(() =>
    dataManager.getCurrentState()
  );

  // Initial sort if needed
  useEffect(() => {
    if (defaultSortColumn && defaultSortDirection !== 'none') {
      const result = dataManager.sortBy(
        defaultSortColumn,
        defaultSortDirection === 'dsc' ? 'desc' : 'asc'
      );
      setGridState(result);
    }
  }, [dataManager, defaultSortColumn, defaultSortDirection]);

  // Handle search
  useEffect(() => {
    const result = dataManager.filterBySearch(searchQuery);
    setGridState(result);
    // Reset to first page when search changes
    setCurrentPage(0);
  }, [dataManager, searchQuery]);

  // Transform rows for the SVGResizableGrid format
  const rows: GridRow[] = useMemo(() => {
    const start = currentPage * pageSize;
    return gridState.filteredRows.slice(start, start + pageSize).map((row) => ({
      id: String(row[idField]),
      cells: columns.map((col) => String(row[col] || '')),
    }));
  }, [gridState.filteredRows, currentPage, pageSize, columns, idField]);

  // Selection handling
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((rowId) => rowId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === gridState.filteredRows.length) {
      // Deselect all
      setSelectedIds([]);
    } else {
      // Select all visible/filtered rows
      setSelectedIds(gridState.filteredRows.map((row) => String(row[idField])));
    }
  }, [selectedIds, gridState.filteredRows, idField]);

  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.includes(id);
    },
    [selectedIds]
  );

  const isAllSelected =
    selectedIds.length > 0 &&
    selectedIds.length === gridState.filteredRows.length;

  // Sorting handling
  const handleSort = useCallback(
    (columnIndex: number) => {
      // Convert column index to column name (accounting for zero-indexed columns array)
      const column = columns[columnIndex - 1]; // -1 because columnIndex includes checkbox
      let newDirection: SortDirection = 'asc';

      // Toggle sort direction
      if (sortField === column) {
        if (sortDirection === 'none') newDirection = 'asc';
        else if (sortDirection === 'asc') newDirection = 'dsc';
        else newDirection = 'none';
      }

      setSortField(column);
      setSortDirection(newDirection);

      // Convert to data manager direction format
      const dmDirection = newDirection === 'dsc' ? 'desc' : newDirection;

      // Apply sort in data manager
      setIsLoading(true);
      const result = dataManager.sortBy(column, dmDirection);
      setGridState(result);
      setIsLoading(false);

      // Reset to first page when sort changes
      setCurrentPage(0);
    },
    [dataManager, columns, sortField, sortDirection]
  );

  // Filter handling
  const addFilter = useCallback(
    (column: string, value: any, operator: string) => {
      const validOperator = [
        'eq',
        'neq',
        'gt',
        'lt',
        'contains',
        'starts',
        'ends',
      ].includes(operator)
        ? operator
        : 'eq';

      setIsLoading(true);
      const result = dataManager.addFilter({
        column,
        value,
        operator: validOperator as any,
      });
      setGridState(result);
      setIsLoading(false);

      // Reset to first page when filters change
      setCurrentPage(0);
    },
    [dataManager]
  );

  const removeFilter = useCallback(
    (column: string) => {
      setIsLoading(true);
      const result = dataManager.removeFilter(column);
      setGridState(result);
      setIsLoading(false);
    },
    [dataManager]
  );

  const clearFilters = useCallback(() => {
    setIsLoading(true);
    const result = dataManager.clearFilters();
    setGridState(result);
    setSearchQuery('');
    setIsLoading(false);

    // Reset to first page
    setCurrentPage(0);
  }, [dataManager]);

  // Pagination
  const goToPage = useCallback(
    (page: number) => {
      const maxPage = Math.ceil(gridState.filteredCount / pageSize) - 1;
      const validPage = Math.max(0, Math.min(page, maxPage));
      setCurrentPage(validPage);
    },
    [gridState.filteredCount, pageSize]
  );

  const nextPage = useCallback(() => {
    const maxPage = Math.ceil(gridState.filteredCount / pageSize) - 1;
    setCurrentPage((prev) => Math.min(prev + 1, maxPage));
  }, [gridState.filteredCount, pageSize]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  }, []);

  // Update page size with bounds checking for current page
  const handleSetPageSize = useCallback(
    (size: number) => {
      setPageSize(size);
      // Adjust current page if needed
      const maxPage = Math.ceil(gridState.filteredCount / size) - 1;
      if (currentPage > maxPage) {
        setCurrentPage(Math.max(0, maxPage));
      }
    },
    [gridState.filteredCount, currentPage]
  );

  // Cell operations
  const updateCell = useCallback(
    (rowId: string, columnName: string, value: string) => {
      if (!columnName) return;
      setIsLoading(true);
      const result = dataManager.updateCell(rowId, columnName, value);
      if (result) {
        setGridState(result);
      }
      setIsLoading(false);
    },
    [dataManager, columns]
  );

  // Row operations
  const addRow = useCallback(
    (rowData: Record<string, any>) => {
      setIsLoading(true);
      const result = dataManager.addRow(rowData);
      if (result) {
        setGridState(result);
      }
      setIsLoading(false);
    },
    [dataManager]
  );

  const deleteRow = useCallback(
    (rowId: string) => {
      setIsLoading(true);
      const result = dataManager.deleteRow(rowId);
      if (result) {
        // Remove from selection if selected
        if (selectedIds.includes(rowId)) {
          setSelectedIds((prev) => prev.filter((id) => id !== rowId));
        }
        setGridState(result);
      }
      setIsLoading(false);
    },
    [dataManager, selectedIds]
  );

  // Return all needed values and functions
  return {
    // Data
    rows,
    totalRows: gridState.totalRows,
    filteredCount: gridState.filteredCount,
    pageSize,
    currentPage,

    // Selection
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    isSelected,
    isAllSelected,

    // Sorting
    sortField,
    sortDirection,
    handleSort,

    // Filtering and Search
    searchQuery,
    setSearchQuery,
    addFilter,
    removeFilter,
    clearFilters,

    // Pagination
    setPageSize: handleSetPageSize,
    goToPage,
    nextPage,
    prevPage,

    // Data operations
    updateCell,
    addRow,
    deleteRow,

    // Other
    isLoading,
    dataManager,
  };
}
