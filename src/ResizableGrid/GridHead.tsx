import { memo, useEffect, useRef, useState } from 'react';
import A11yGridHead from './A11yGridHead';
import {
  CHECKBOX_COLUMN_WIDTH,
  ColDef,
  DEFAULT_COLUMN_WIDTH,
  SortDirectionType,
} from './SVGResizableGrid';

type GridHeadProps = {
  columnWidths: Array<number>;
  headers: ColDef[];
  sortDirection: SortDirectionType;
  sortField: string | null;
  totalWidth: number;
  isAllSelected: boolean;
  borderColor?: string;
  headerBgColor?: string;
  fontColor?: string;
  handleSort: (columnIndex: number) => void;
  handleWidthUpdates: (dividerPositions: number[]) => void;
  toggleSelectAll: () => void;
};
const GridHead = memo<GridHeadProps>(
  ({
    columnWidths,
    headers,
    headerBgColor = '#f3f4f6',
    borderColor = '#d1d5db',
    fontColor = '#374151',
    sortField,
    sortDirection,
    toggleSelectAll,
    totalWidth,
    isAllSelected,
    handleSort,
    handleWidthUpdates,
  }) => {
    // State for active divider
    const [activeDivider, setActiveDivider] = useState<number | null>(null);
    // Refs for the SVG and header container
    const svgRef = useRef<SVGSVGElement>(null);
    const headerContainerRef = useRef<HTMLDivElement>(null);
    // State for column positions (the divider positions)
    const [dividerPositions, setDividerPositions] = useState<number[]>(() => {
      // First divider position now includes checkbox column width
      return [
        CHECKBOX_COLUMN_WIDTH,
        ...headers
          .slice(0, -1)
          .map(
            (_, index) =>
              CHECKBOX_COLUMN_WIDTH + (index + 1) * DEFAULT_COLUMN_WIDTH
          ),
      ];
    });

    useEffect(() => {
      handleWidthUpdates(dividerPositions);
    }, [dividerPositions]);

    // Handle start dragging a divider
    const handleDividerMouseDown = (index: number, event: React.MouseEvent) => {
      if (!svgRef.current) return;

      event.preventDefault();
      setActiveDivider(index);

      // Get SVG bounding rect for coordinate conversion
      const svgRect = svgRef.current.getBoundingClientRect();

      // Setup mouse move handler
      const handleMouseMove = (e: MouseEvent) => {
        const mouseX = e.clientX - svgRect.left;

        // Calculate min and max positions for this divider
        // First divider (between checkbox and first column) has special handling
        const minPosition = index === 0 ? 30 : dividerPositions[index - 1] + 50;
        const maxPosition =
          index < dividerPositions.length - 1
            ? dividerPositions[index + 1] - 50
            : totalWidth - 50;

        // Update position within constraints
        setDividerPositions((prev) => {
          const newPositions = [...prev];
          newPositions[index] = Math.max(
            minPosition,
            Math.min(maxPosition, mouseX)
          );
          return newPositions;
        });
      };

      // Setup mouse up handler
      const handleMouseUp = () => {
        setActiveDivider(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      // Add event listeners
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    // Handle keyboard controls for dividers
    const handleDividerKeyDown = (
      index: number,
      event: React.KeyboardEvent
    ) => {
      const STEP = 10; // Pixels to move per keypress

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();

        setDividerPositions((prev) => {
          const newPositions = [...prev];
          const currentPos = newPositions[index];

          // Calculate new position
          const delta = event.key === 'ArrowLeft' ? -STEP : STEP;

          // Calculate min and max positions for this divider
          const minPosition = index === 0 ? 30 : newPositions[index - 1] + 50;
          const maxPosition =
            index < newPositions.length - 1
              ? newPositions[index + 1] - 50
              : totalWidth - 50;

          // Update position within constraints
          newPositions[index] = Math.max(
            minPosition,
            Math.min(maxPosition, currentPos + delta)
          );
          return newPositions;
        });
      }
    };
    // Keyboard handler for header checkbox
    const handleHeaderCheckboxKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        toggleSelectAll();
      }
    };
    // Render sort icon based on current state
    const renderSortIcon = (columnIndex: number) => {
      // Adjust columnIndex to account for checkbox column
      const dataColumnIndex = columnIndex - 1;

      // Don't render sort icon for checkbox column
      if (columnIndex === 0) return null;

      const field = headers[dataColumnIndex].field;
      if (sortField !== field || sortDirection === 'none') {
        return (
          <path
            fillRule="evenodd"
            d="M2.24 6.8a.75.75 0 001.06-.04l1.95-2.1v8.59a.75.75 0 001.5 0V4.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L2.2 5.74a.75.75 0 00.04 1.06zm8 6.4a.75.75 0 00-.04 1.06l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75a.75.75 0 00-1.5 0v8.59l-1.95-2.1a.75.75 0 00-1.06-.04z"
            clipRule="evenodd"
          />
        );
      } else if (sortDirection === 'asc') {
        return (
          <path
            fillRule="evenodd"
            d="M10 15a.75.75 0 01-.75-.75V7.612L7.29 9.77a.75.75 0 01-1.08-1.04l3.25-3.5a.75.75 0 011.08 0l3.25 3.5a.75.75 0 11-1.08 1.04l-1.96-2.158v6.638A.75.75 0 0110 15z"
            clipRule="evenodd"
          />
        );
      } else {
        return (
          <path
            fillRule="evenodd"
            d="M10 5a.75.75 0 01.75.75v6.638l1.96-2.158a.75.75 0 111.08 1.04l-3.25 3.5a.75.75 0 01-1.08 0l-3.25-3.5a.75.75 0 111.08-1.04l1.96 2.158V5.75A.75.75 0 0110 5z"
            clipRule="evenodd"
          />
        );
      }
    };

    // Render checkbox in SVG
    const renderCheckbox = (isChecked: boolean, x: number, y: number) => (
      <g transform={`translate(${x}, ${y})`}>
        <rect
          x="0"
          y="0"
          width="16"
          height="16"
          rx="2"
          fill="white"
          stroke="#9ca3af"
          strokeWidth="1.5"
        />
        {isChecked && (
          <path
            d="M3 8l3 3 7-7"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </g>
    );

    // Update header container width when total width changes
    useEffect(() => {
      if (headerContainerRef.current) {
        headerContainerRef.current.style.width = `${totalWidth}px`;
      }
    }, [totalWidth]);

    return (
      <div
        ref={headerContainerRef}
        className="relative overflow-hidden"
        style={{ height: '40px' }}
      >
        <svg
          ref={svgRef}
          width={totalWidth}
          height={40}
          className="absolute top-0 left-0"
          aria-hidden="true"
        >
          {/* Background for header cells - Including checkbox column */}
          <rect
            key="header-bg-checkbox"
            x={0}
            y={0}
            width={columnWidths[0]}
            height={40}
            fill="#f3f4f6"
            stroke="#d1d5db"
            strokeWidth={1}
          />

          {/* Data column backgrounds */}
          {headers.map((_, index) => {
            const startX = dividerPositions[index];
            const width = columnWidths[index + 1];

            return (
              <rect
                key={`header-bg-${index}`}
                x={startX}
                y={0}
                width={width}
                height={40}
                fill={headerBgColor}
                stroke={borderColor}
                strokeWidth={1}
              />
            );
          })}

          {/* Checkbox in header (select all) */}
          <g
            style={{ cursor: 'pointer' }}
            onClick={toggleSelectAll}
            role="checkbox"
            aria-checked={isAllSelected}
            tabIndex={0}
            onKeyDown={handleHeaderCheckboxKeyDown}
          >
            {renderCheckbox(isAllSelected, columnWidths[0] / 2 - 8, 12)}
          </g>

          {/* Header text for data columns */}
          {headers.map((header, index) => {
            const startX = dividerPositions[index];
            const width = columnWidths[index + 1];

            return (
              <g key={`header-text-group-${index}`}>
                <text
                  key={`header-text-${index}`}
                  x={startX + 8}
                  y={25}
                  fontSize={14}
                  fontWeight="bold"
                  fill={fontColor}
                  textAnchor="start"
                  dominantBaseline="middle"
                >
                  {header.name}
                </text>

                {/* Sort button */}
                <g
                  transform={`translate(${startX + width - 25}, 15)`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSort(index + 1)} // +1 to account for checkbox column
                >
                  <rect width={20} height={20} fill="transparent" />
                  <svg
                    x={0}
                    y={0}
                    width={15}
                    height={15}
                    viewBox="0 0 20 20"
                    fill={fontColor}
                  >
                    {renderSortIcon(index + 1)}
                  </svg>
                </g>
              </g>
            );
          })}

          {/* Dividers (resizing handles) */}
          {dividerPositions.map((position, index) => (
            <g key={`divider-${index}`}>
              {/* Invisible hit area for better interaction */}
              <rect
                x={position - 5}
                y={0}
                width={10}
                height={40}
                fill="transparent"
                style={{ cursor: 'col-resize' }}
                onMouseDown={(e) => handleDividerMouseDown(index, e)}
                tabIndex={0}
                aria-label={`Resize column ${index}`}
                aria-valuemin={index === 0 ? 30 : 50}
                aria-valuemax={500}
                aria-valuenow={
                  index === 0 ? columnWidths[0] : columnWidths[index + 1]
                }
                role="slider"
                onKeyDown={(e) => handleDividerKeyDown(index, e)}
                onFocus={() => setActiveDivider(index)}
                onBlur={() => setActiveDivider(null)}
              />

              {/* Visible divider line */}
              <line
                x1={position}
                y1={8}
                x2={position}
                y2={32}
                stroke={activeDivider === index ? '#3b82f6' : '#9ca3af'}
                strokeWidth={activeDivider === index ? 3 : 2}
                strokeLinecap="round"
              />
            </g>
          ))}
        </svg>

        {/* Accessible header row (visually hidden but accessible to screen readers) */}
        <A11yGridHead
          headers={headers}
          sortField={sortField}
          sortDirection={sortDirection}
        />
      </div>
    );
  }
);

export default GridHead;
