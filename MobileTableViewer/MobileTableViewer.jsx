import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import FocusedCell from './FocusedCell';
import { useSwipeable } from 'react-swipeable';
import { ArrowLeft, ArrowUp, ArrowRight, ArrowDown, X } from 'react-feather';

/**
 * MobileTableViewer Component
 * 
 * Provides a mobile-friendly view of table data, focusing on one cell at a time
 * with contextual information about adjacent cells and integrated navigation controls.
 */
const MobileTableViewer = ({ 
  tableData, 
  columns, 
  initialFocus = { rowIndex: 0, colIndex: 0 }, 
  onClose,
  theme 
}) => {
  // All Hooks are called at the top level and in the same order.
  const [currentFocus, setCurrentFocus] = useState(initialFocus);
  const [animationDirection, setAnimationDirection] = useState(null);
  const [isLandscape, setIsLandscape] = useState(false);

  const visibleColumns = useMemo(() => {
    if (!columns || !Array.isArray(columns)) return [];
    return columns.filter(col => col.visible === undefined || col.visible === true);
  }, [columns]);

  const checkOrientation = useCallback(() => {
    const landscape = window.innerWidth > window.innerHeight;
    setIsLandscape(landscape);
    
    // Auto-close the viewer if device is in landscape mode and is a mobile device
    if (landscape && isMobileDevice()) {
      onClose && onClose();
    }
  }, [onClose]);

  // Helper function to detect if the current device is a mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && 
           window.innerWidth < 1024; // Consider devices with width less than 1024px as mobile
  };
  
  const handleOrientationChange = useCallback(() => {
    setTimeout(checkOrientation, 300);
  }, [checkOrientation]);
  
  const handleResize = useCallback(() => {
    checkOrientation();
  }, [checkOrientation]);
  
  useEffect(() => {
    checkOrientation();
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [checkOrientation, handleOrientationChange, handleResize]);
  
  const stripParenthetical = (text) => {
    if (!text) return '';
    return String(text).split('(')[0].trim();
  };
  
  const rowIdentifiers = useMemo(() => {
    if (!tableData || !Array.isArray(tableData)) return []; // Ensure tableData is an array
    return tableData.map(row => {
      const idColumns = ['id', 'name', 'title', 'key'];
      const idColumn = idColumns.find(id => row[id] !== undefined);
      const firstVisibleColumnKey = visibleColumns.length > 0 ? visibleColumns[0]?.key : undefined;
      const identifier = idColumn ? row[idColumn] : (firstVisibleColumnKey && row[firstVisibleColumnKey] !== undefined ? row[firstVisibleColumnKey] : '');
      return stripParenthetical(identifier);
    });
  }, [tableData, visibleColumns]);

  const getCurrentCellData = useCallback(() => {
    if (!tableData || currentFocus.rowIndex >= tableData.length || !visibleColumns || currentFocus.colIndex >= visibleColumns.length) {
      return { content: 'No data', column: 'Unknown', row: 'Unknown', rowIndex: currentFocus.rowIndex, colIndex: currentFocus.colIndex };
    }
    const row = tableData[currentFocus.rowIndex];
    if (!row) return { content: 'No data', column: 'Unknown', row: 'Unknown', rowIndex: currentFocus.rowIndex, colIndex: currentFocus.colIndex };
    const columnKey = visibleColumns[currentFocus.colIndex]?.key;
    if (!columnKey) return { content: 'No data', column: 'Unknown', row: 'Unknown', rowIndex: currentFocus.rowIndex, colIndex: currentFocus.colIndex };
    
    const content = row[columnKey];
    
    // Find column styling info if available
    const column = visibleColumns[currentFocus.colIndex];
    const styling = column?.shading ? column.shading : null;
    
    // Apply value-specific styling if defined in the styling.json
    let valueSpecificStyle = {};
    if (styling?.valueSpecificStyles) {
      // Find matching style based on cell value
      const matchingStyle = styling.valueSpecificStyles.find(style => {
        if (style.condition.valueContains && String(content).includes(style.condition.valueContains)) {
          return true;
        }
        if (style.condition.isNullOrEmpty && (content === null || content === undefined || content === '')) {
          return true;
        }
        return false;
      });
      
      if (matchingStyle) {
        valueSpecificStyle = matchingStyle.style;
      }
    }
    
    return {
      content: content,
      column: visibleColumns[currentFocus.colIndex]?.label || columnKey,
      row: rowIdentifiers[currentFocus.rowIndex] || `Row ${currentFocus.rowIndex + 1}`,
      rowIndex: currentFocus.rowIndex,
      colIndex: currentFocus.colIndex,
      columnKey: columnKey,
      cellStyle: {
        ...(styling?.cellStyle || {}),
        ...valueSpecificStyle
      }
    };
  }, [currentFocus.rowIndex, currentFocus.colIndex, tableData, visibleColumns, rowIdentifiers]);

  const getAdjacentCellsInfo = useCallback(() => {
    const info = { up: null, right: null, down: null, left: null };
    if (visibleColumns.length === 0 || !tableData || !Array.isArray(tableData)) return info;

    if (currentFocus.rowIndex > 0 && tableData[currentFocus.rowIndex - 1]) {
      const row = tableData[currentFocus.rowIndex - 1];
      const columnKey = visibleColumns[currentFocus.colIndex]?.key;
      if (columnKey !== undefined) {
        info.up = {
          content: row[columnKey],
          identifier: stripParenthetical(rowIdentifiers[currentFocus.rowIndex - 1]) || `Row ${currentFocus.rowIndex}`
        };
      }
    }
    if (currentFocus.colIndex < visibleColumns.length - 1 && tableData[currentFocus.rowIndex]) {
      const row = tableData[currentFocus.rowIndex];
      const nextColIndex = currentFocus.colIndex + 1;
      const columnKey = visibleColumns[nextColIndex]?.key;
      if (columnKey !== undefined) {
        info.right = {
          content: row[columnKey],
          identifier: stripParenthetical(visibleColumns[nextColIndex]?.label) || columnKey
        };
      }
    }
    if (currentFocus.rowIndex < tableData.length - 1 && tableData[currentFocus.rowIndex + 1]) {
      const row = tableData[currentFocus.rowIndex + 1];
      const columnKey = visibleColumns[currentFocus.colIndex]?.key;
      if (columnKey !== undefined) {
        info.down = {
          content: row[columnKey],
          identifier: stripParenthetical(rowIdentifiers[currentFocus.rowIndex + 1]) || `Row ${currentFocus.rowIndex + 2}`
        };
      }
    }
    if (currentFocus.colIndex > 0 && tableData[currentFocus.rowIndex]) {
      const row = tableData[currentFocus.rowIndex];
      const prevColIndex = currentFocus.colIndex - 1;
      const columnKey = visibleColumns[prevColIndex]?.key;
      if (columnKey !== undefined) {
        info.left = {
          content: row[columnKey],
          identifier: stripParenthetical(visibleColumns[prevColIndex]?.label) || columnKey
        };
      }
    }
    return info;
  }, [currentFocus.rowIndex, currentFocus.colIndex, tableData, visibleColumns, rowIdentifiers]);

  const navigateUp = useCallback(() => {
    if (currentFocus.rowIndex > 0) {
      setAnimationDirection('up');
      setCurrentFocus(prev => ({ ...prev, rowIndex: prev.rowIndex - 1 }));
    }
  }, [currentFocus.rowIndex]);

  const navigateRight = useCallback(() => {
    if (currentFocus.colIndex < visibleColumns.length - 1) {
      setAnimationDirection('right');
      setCurrentFocus(prev => ({ ...prev, colIndex: prev.colIndex + 1 }));
    }
  }, [currentFocus.colIndex, visibleColumns.length]);

  const navigateDown = useCallback(() => {
    if (tableData && currentFocus.rowIndex < tableData.length - 1) { // Added tableData check
      setAnimationDirection('down');
      setCurrentFocus(prev => ({ ...prev, rowIndex: prev.rowIndex + 1 }));
    }
  }, [currentFocus.rowIndex, tableData]); // Added tableData to dependencies

  const navigateLeft = useCallback(() => {
    if (currentFocus.colIndex > 0) {
      setAnimationDirection('left');
      setCurrentFocus(prev => ({ ...prev, colIndex: prev.colIndex - 1 }));
    }
  }, [currentFocus.colIndex]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationDirection(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [currentFocus]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp': navigateUp(); e.preventDefault(); break;
        case 'ArrowRight': navigateRight(); e.preventDefault(); break;
        case 'ArrowDown': navigateDown(); e.preventDefault(); break;
        case 'ArrowLeft': navigateLeft(); e.preventDefault(); break;
        case 'Escape': onClose(); e.preventDefault(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateUp, navigateRight, navigateDown, navigateLeft, onClose]);

  const swipeHandlers = useSwipeable({
    onSwipedUp: () => navigateDown(),
    onSwipedRight: () => navigateLeft(),
    onSwipedDown: () => navigateUp(),
    onSwipedLeft: () => navigateRight(),
    preventDefaultTouchmoveEvent: true,
    trackMouse: false,
    trackTouch: true,
    delta: 10,
    swipeDuration: 500,
    touchEventOptions: { passive: false }
  });

  // Conditional rendering logic is now after all hooks.
  if (!tableData || !Array.isArray(tableData) || !columns || !Array.isArray(columns)) {
    console.error('MobileTableViewer: `tableData` and `columns` props are required and must be arrays.');
    return null;
  }
  
  // Don't render at all if in landscape mode on a mobile device
  if (isLandscape && isMobileDevice()) {
    return null;
  }
  
  if (visibleColumns.length === 0 && tableData.length > 0) {
    console.error('MobileTableViewer: No visible columns to display, but tableData is not empty.');
    return <div style={{ padding: '20px', textAlign: 'center', color: theme?.textColor || '#333' }}>No data to display. Columns might be hidden or not defined.</div>;
  }
  
  // If, after all hooks, tableData is still not ready for some reason (e.g. empty after filtering, or initial state)
  // or if initialFocus is out of bounds for the processed data.
  if (tableData.length === 0 || visibleColumns.length === 0) {
     return <div style={{ padding: '20px', textAlign: 'center', color: theme?.textColor || '#333' }}>Loading table data or no data available...</div>;
  }


  const currentCellData = getCurrentCellData();
  const adjacentCellsInfo = getAdjacentCellsInfo();

  // Navigation button styles
  const navButtonStyle = (isActive) => ({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0.35rem', // Reduced padding
    backgroundColor: theme?.blogPostContentBackgroundColor || '#fff',
    border: `1px solid ${theme?.tableBorderColor || '#ddd'}`,
    borderRadius: '8px',
    opacity: isActive ? 0.85 : 0.55, // Changed active opacity to 0.85, inactive to 0.55
    color: theme?.blogTextColor || '#000',    
    // height: '100%', // Removed: Let content define height. Buttons will be centered by align-self or parent's align-items.
    overflow: 'hidden',
    cursor: isActive ? 'pointer' : 'default',
    userSelect: 'none',
    transition: 'all 0.2s',
    position: 'relative' // For positioning arrow indicators
  });

  // Helper to truncate text
  const truncateText = (text, maxLength = 45) => { // Increased default maxLength from 25 to 35
    if (!text) return '';
    const plainText = stripParenthetical(text);
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  };

  return (
    <div 
      className={`mobile-table-viewer ${isLandscape ? 'landscape-mode' : 'portrait-mode'}`}
      {...swipeHandlers}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%', // Ensure full viewport width
        height: '100%', // Ensure full viewport height
        backgroundColor: theme?.mode === 'dark' ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', // Reduced alpha from 0.95 to 0.9
        color: theme?.blogTextColor || '#000000',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        // Consolidate padding to be primarily handled by CSS rules for robustness
        padding: '0.5rem', // Basic fallback padding
        // paddingTop, paddingLeft, paddingRight will be enhanced by CSS @supports rule
        // paddingBottom will be primarily handled by CSS @supports rule for safe area and consistent spacing
        WebkitOverflowScrolling: 'touch',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'none', // Changed from 'manipulation' to 'none' to prevent background scroll
        overflow: 'hidden' // Changed from 'auto' to 'hidden'
      }}
    >
      {/* Header with back button and cell position info - more compact */}
      <div className="mobile-viewer-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.25rem',
        borderBottom: `1px solid ${theme?.tableBorderColor || '#ccc'}`,
        minHeight: '40px',
        maxHeight: '40px',
        opacity: 0.85, // Semi-transparent
        backgroundColor: theme?.blogPostContentBackgroundColor || '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button 
          onClick={onClose}
          aria-label="Back to table view"
          style={{
            background: 'none',
            border: 'none',
            color: theme?.blogTextColor || '#000000',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '0.25rem'
          }}
        >
          <ArrowLeft size={16} style={{ marginRight: '0.25rem' }} />
          <span style={{ fontSize: '0.9rem' }}>Back</span>
        </button>
        
        <div style={{ fontSize: '0.75rem', color: theme?.blogTextColor || '#000', opacity: 0.7 }}>
          Row {currentFocus.rowIndex + 1}/{tableData.length}, 
          Col {currentFocus.colIndex + 1}/{visibleColumns.length}
        </div>
      </div>

      {/* Main content area with central cell and navigation rectangles */}
      <div className="mobile-viewer-content" style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: isLandscape ? 'row' : 'column',
        flexWrap: isLandscape ? 'wrap' : 'nowrap',
        justifyContent: 'space-between', 
        alignItems: isLandscape ? 'flex-start' : 'stretch',
        padding: '0.25rem', // Reduced padding
        // paddingBottom: '3rem' // Removed: Parent container's padding-bottom should handle this
      }}>
        {/* Column name at the very top */}
        <div className="mobile-column-header" style={{
          textAlign: 'center',
          padding: '0.25rem', // Reduced padding
          fontWeight: 'bold', 
          marginBottom: '0.1rem', // Reduced margin
          borderRadius: '8px',
          border: `1px solid ${theme?.tableBorderColor || '#ddd'}`,
          backgroundColor: theme?.blogPostContentBackgroundColor || '#fff',
          opacity: 0.85, // Semi-transparent
          width: isLandscape ? '100%' : 'auto',
          order: isLandscape ? 0 : 0
        }}>
          {truncateText(currentCellData.column)} {/* Uses default maxLength 35 */}
        </div>
        
        {/* Top navigation (up) with arrow indicators */}
        <div 
          className="mobile-nav-top"
          onClick={adjacentCellsInfo.up ? navigateUp : null}
          style={{
            ...navButtonStyle(!!adjacentCellsInfo.up),
            marginBottom: '0.25rem', // Reduced margin
            minHeight: '40px', // Reduced minHeight
            maxHeight: '45px', // Reduced maxHeight
            width: isLandscape ? '25%' : 'auto',
            marginRight: isLandscape ? '0.5rem' : '0',
            order: isLandscape ? 1 : 0,
          }}
        >
          {/* Small arrow indicators at corners and edges */}
          {adjacentCellsInfo.up && (
            <>
              <div className="corner-arrow" style={{ position: 'absolute', top: '4px', left: '4px' }}>
                <ArrowUp size={20} />
              </div>
              <div className="corner-arrow" style={{ position: 'absolute', top: '4px', right: '4px' }}>
                <ArrowUp size={20} />
              </div>
            </>
          )}
          
          {adjacentCellsInfo.up ? (
            <>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {truncateText(adjacentCellsInfo.up.identifier)}
              </div>
      
            </>
          ) : (
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>No previous row</div>
          )}
        </div>

        {/* Middle row with left, center, right */}
        <div className={`mobile-center-row ${isLandscape ? 'landscape' : ''}`} style={{
          display: 'flex',
          flex: isLandscape ? '0 0 auto' : 1,
          width: isLandscape ? '70%' : 'auto',
          marginBottom: '0.25rem', // Reduced margin
          gap: '0.25rem', // Reduced gap
          ...(isLandscape ? { height: 'auto' } : {}), // Removed explicit height: '100%' for portrait
          order: isLandscape ? 3 : 0,
          overflow: 'hidden' // Added overflow: hidden
        }}>
          {/* Row Info (MOVED HERE - to the left of left-nav) */}
          <div className="mobile-row-info" style={{
            textAlign: 'center',
            padding: '0.25rem', // Reduced padding
            backgroundColor: theme?.blogPostContentBackgroundColor || '#fff',
            border: `1px solid ${theme?.tableBorderColor || '#ddd'}`,
            borderRadius: '8px',
            opacity: 0.85,
            alignSelf: 'center', // Vertically center it
            writingMode: 'vertical-rl', // Added for vertical text
            transform: 'rotate(180deg)', // Rotate to correct orientation
            textOrientation: 'mixed', // Ensure text is upright
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            minWidth: '40px', // Adjusted minWidth for vertical text
            // Allow content to expand as needed without a strict maximum
            overflow: 'hidden', // Prevent text from overflowing
            maxHeight: '250px', // Limit the height for very long row names
          }}>
            <span style={{ fontWeight: 'bold' }}>{truncateText(currentCellData.row, 45)}</span> {/* Increased maxLength to 45 for vertical row indicator */} 
          </div>

          {/* Left navigation */}
          <div 
            className="mobile-nav-left"
            onClick={adjacentCellsInfo.left ? navigateLeft : null}
            style={{
              ...navButtonStyle(!!adjacentCellsInfo.left),
              flexDirection: 'row', // For vertical stacking of items in vertical writing mode
              width: '40px', 
              minWidth: '40px', 
              writingMode: 'vertical-rl', // Makes text vertical
              transform: 'rotate(180deg)', // Rotates the button
              textOrientation: 'mixed', // Keeps text characters upright
              alignSelf: 'center',
            }}
          >
            {adjacentCellsInfo.left ? (
              <>
                {/* Text first, then Arrow. Arrow icon itself is rotated to point correctly. */}
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}> {/* Margin for spacing */}
                  {truncateText(adjacentCellsInfo.left.identifier)}
                </div>
                <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} /> {/* Rotated to point left */}
              </>
            ) : (
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>No previous column</div>
            )}
          </div>

          {/* Central focused cell */}
          <div className="mobile-center-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' /* Added overflow:hidden */ }}>
            {/* Current focused cell - wrapped for scrolling */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: '0' }}>
              <FocusedCell 
                data={currentCellData} 
                animationDirection={animationDirection}
                theme={theme}
              />
            </div>
          </div>

          {/* Right navigation */}
          <div 
            className="mobile-nav-right"
            onClick={adjacentCellsInfo.right ? navigateRight : null}
            style={{
              ...navButtonStyle(!!adjacentCellsInfo.right),
              flexDirection: 'row', // For vertical stacking of items in vertical writing mode
              width: '40px', 
              minWidth: '40px', 
              writingMode: 'vertical-rl', // Makes text vertical
              textOrientation: 'mixed', // Keeps text characters upright
              position: 'relative', 
              alignSelf: 'center',
            }}
          >
            {adjacentCellsInfo.right ? (
              <>
                {/* Arrow first, then Text. Arrow has margin for spacing. */}
                <ArrowRight size={20} style={{ marginBottom: '0.25rem' }} /> 
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {truncateText(adjacentCellsInfo.right.identifier)}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>No next column</div>
            )}
          </div>
        </div>

        {/* Bottom navigation (down) with higher z-index and arrow indicators */}
        <div 
          className="mobile-nav-bottom"
          onClick={adjacentCellsInfo.down ? navigateDown : null}
          style={{
            ...navButtonStyle(!!adjacentCellsInfo.down),
            minHeight: '40px', // Reduced minHeight
            maxHeight: '45px', // Reduced maxHeight
            // marginBottom: isLandscape ? '0.5rem' : '150px', // Removed: Rely on parent padding
            position: 'relative',
            zIndex: 5,
            boxShadow: adjacentCellsInfo.down ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
            backgroundColor: theme?.blogPostContentBackgroundColor || '#fff',
            width: isLandscape ? '25%' : 'auto', // Keep landscape-specific width
            order: isLandscape ? 2 : 0, // Keep landscape-specific order
            marginTop: isLandscape ? 0 : '0.25rem' // Reduced margin in portrait
          }}
        >
          {/* Arrow indicators at edges and corners */}
          {adjacentCellsInfo.down && (
            <>
              <div className="corner-arrow" style={{ position: 'absolute', bottom: '4px', left: '4px' }}>
                <ArrowDown size={20} />
              </div>
              <div className="corner-arrow" style={{ position: 'absolute', bottom: '4px', right: '4px' }}>
                <ArrowDown size={20} />
              </div>
            </>
          )}
          
          {adjacentCellsInfo.down ? (
            <>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                {truncateText(adjacentCellsInfo.down.identifier)}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>No next row</div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Handle iOS safe area insets */
        @supports (padding: max(0px)) {
          .mobile-table-viewer {
            padding-top: max(0.5rem, env(safe-area-inset-top));
            /* Adjusted bottom padding for better fit */
            padding-bottom: max(2rem, calc(env(safe-area-inset-bottom, 0px) + 1rem)); 
            padding-left: max(0.5rem, env(safe-area-inset-left));
            padding-right: max(0.5rem, env(safe-area-inset-right));
          }
        }
        
        /* Landscape orientation styles */
        .landscape-mode .mobile-viewer-content {
          flex-direction: row;
          flex-wrap: wrap;
          align-items: flex-start;
        }
        
        .landscape-mode .mobile-column-header {
          width: 100%;
          margin-bottom: 0.5rem;
          order: 0;
        }
        
        .landscape-mode .mobile-nav-top {
          width: 25%;
          order: 1;
          margin-right: 0.5rem;
        }
        
        .landscape-mode .mobile-center-row {
          width: 70%;
          order: 3;
          margin: 0;
          align-self: stretch;
          flex: 1 1 auto;
        }
        
        .landscape-mode .mobile-nav-bottom {
          width: 25%;
          order: 2;
          margin-bottom: 0.5rem !important; /* Keep for landscape layout consistency if needed, or remove if gap preferred */
        }
        
        /* Fix for specific mobile browsers issues */
        @supports (-webkit-touch-callout: none) {
          /* iOS specific fix */
          .mobile-table-viewer {
            height: -webkit-fill-available; /* This is good for iOS to fill screen */
            /* overflow-y: auto; */ /* Removed: Ensure scrollability is handled by inner content */
          }
          
          /* .mobile-nav-bottom {
            margin-bottom: 150px !important; // Removed this problematic override
          } */
        }
        
        /* Desktop/tablet styles */
        @media (min-width: 768px) {
          .mobile-table-viewer {
            max-width: 500px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            /* Adjust padding-bottom for desktop if different from mobile's new base */
            padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 1.5rem)); 
            height: 80vh; /* Fixed height for larger screens */
            max-height: 700px;
          }
          
          .mobile-nav-bottom {
            /* Ensure desktop margin is sensible, !important might not be needed if other rules are cleaner */
            margin-bottom: 1rem; 
          }
        }
        
        /* Set min-height to ensure enough scrolling space */
        .mobile-table-viewer {
          min-height: 100%; /* Fallback */
          /* For browsers supporting -webkit-fill-available, it's handled in the @supports block */
        }
        
        /* Corner arrow animations for better visibility */
        .corner-arrow { 
          animation: pulse 2s infinite;
        }
        
        /* Pulse animation for main navigation arrows if desired, but might be too much. Keeping the keyframes for now. */
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        
        /* Handle hover and active states for better touch feedback */
        .mobile-nav-top:active, 
        .mobile-nav-left:active,
        .mobile-nav-right:active,
        .mobile-nav-bottom:active {
          opacity: 0.9 !important;
          transform: scale(0.98);
        }

        /* On iOS Safari specifically */
        @supports (-webkit-touch-callout: none) and (not (translate: none)) {
          .mobile-table-viewer {
            min-height: -webkit-fill-available; /* Reinforce for iOS */
          }
        }
      `}</style>
    </div>
  );
};

export default MobileTableViewer;
