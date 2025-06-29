import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import { ArrowLeft, ArrowUp, ArrowRight, ArrowDown, X } from 'react-feather';

const MobileTableViewer = ({ 
  tableData, 
  columns, 
  initialFocus = { rowIndex: 0, colIndex: 0 }, 
  onClose,
  theme 
}) => {
  const [currentFocus, setCurrentFocus] = useState(initialFocus);
  const [animationDirection, setAnimationDirection] = useState(null);

  const visibleColumns = useMemo(() => {
    if (!columns || !Array.isArray(columns)) return [];
    return columns.filter(col => col.visible === undefined || col.visible === true);
  }, [columns]);

  const stripParenthetical = (text) => {
    if (!text) return '';
    return String(text).split('(')[0].trim();
  };
  
  const rowIdentifiers = useMemo(() => {
    if (!tableData || !Array.isArray(tableData)) return [];
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
    
    return {
      content: content,
      column: visibleColumns[currentFocus.colIndex]?.label || columnKey,
      row: rowIdentifiers[currentFocus.rowIndex] || `Row ${currentFocus.rowIndex + 1}`,
      rowIndex: currentFocus.rowIndex,
      colIndex: currentFocus.colIndex,
      columnKey: columnKey
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
    if (tableData && currentFocus.rowIndex < tableData.length - 1) {
      setAnimationDirection('down');
      setCurrentFocus(prev => ({ ...prev, rowIndex: prev.rowIndex + 1 }));
    }
  }, [currentFocus.rowIndex, tableData]);

  const navigateLeft = useCallback(() => {
    if (currentFocus.colIndex > 0) {
      setAnimationDirection('left');
      setCurrentFocus(prev => ({ ...prev, colIndex: prev.colIndex - 1 }));
    }
  }, [currentFocus.colIndex]);

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateUp();
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigateRight();
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateDown();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigateLeft();
        break;
      case 'Escape':
        e.preventDefault();
        onClose && onClose();
        break;
    }
  }, [navigateUp, navigateRight, navigateDown, navigateLeft, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: navigateRight,
    onSwipedRight: navigateLeft,
    onSwipedUp: navigateDown,
    onSwipedDown: navigateUp,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  const currentCellData = getCurrentCellData();
  const adjacentCells = getAdjacentCellsInfo();

  const truncateText = (text, maxLength = 45) => {
    if (!text) return '';
    const str = String(text);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  };

  const viewerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    color: 'white',
    fontFamily: 'Arial, sans-serif'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white'
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const contentStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    overflow: 'hidden'
  };

  const cellDisplayStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    margin: '10px 0',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  };

  const cellContentStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
    wordBreak: 'break-word',
    maxWidth: '100%'
  };

  const cellMetaStyle = {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '5px'
  };

  const navigationStyle = {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTop: '1px solid rgba(255, 255, 255, 0.2)'
  };

  const navButtonStyle = (isActive) => ({
    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: 'white',
    padding: '12px',
    borderRadius: '8px',
    cursor: isActive ? 'pointer' : 'not-allowed',
    opacity: isActive ? 1 : 0.5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '60px',
    fontSize: '12px'
  });

  const contextStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)'
  };

  const adjacentCellStyle = {
    textAlign: 'center',
    flex: 1,
    padding: '5px'
  };

  return (
    <div style={viewerStyle} {...swipeHandlers}>
      <div style={headerStyle}>
        <div style={titleStyle}>Mobile Table Viewer</div>
        <button style={closeButtonStyle} onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      <div style={contentStyle}>
        <div style={contextStyle}>
          <div style={adjacentCellStyle}>
            {adjacentCells.left && (
              <>
                <div>← {adjacentCells.left.identifier}</div>
                <div>{truncateText(adjacentCells.left.content, 20)}</div>
              </>
            )}
          </div>
          <div style={adjacentCellStyle}>
            {adjacentCells.up && (
              <>
                <div>↑ {adjacentCells.up.identifier}</div>
                <div>{truncateText(adjacentCells.up.content, 20)}</div>
              </>
            )}
          </div>
          <div style={adjacentCellStyle}>
            {adjacentCells.right && (
              <>
                <div>{adjacentCells.right.identifier} →</div>
                <div>{truncateText(adjacentCells.right.content, 20)}</div>
              </>
            )}
          </div>
        </div>

        <div style={cellDisplayStyle}>
          <div style={cellMetaStyle}>
            {currentCellData.column} | {currentCellData.row}
          </div>
          <div style={cellContentStyle}>
            {currentCellData.content || 'Empty'}
          </div>
          <div style={cellMetaStyle}>
            Row {currentCellData.rowIndex + 1} of {tableData?.length || 0} | 
            Column {currentCellData.colIndex + 1} of {visibleColumns.length}
          </div>
        </div>

        <div style={contextStyle}>
          <div style={adjacentCellStyle}>
            {adjacentCells.down && (
              <>
                <div>↓ {adjacentCells.down.identifier}</div>
                <div>{truncateText(adjacentCells.down.content, 20)}</div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={navigationStyle}>
        <button 
          style={navButtonStyle(currentFocus.colIndex > 0)}
          onClick={navigateLeft}
          disabled={currentFocus.colIndex === 0}
        >
          <ArrowLeft size={16} />
          <span>Left</span>
        </button>
        
        <button 
          style={navButtonStyle(currentFocus.rowIndex > 0)}
          onClick={navigateUp}
          disabled={currentFocus.rowIndex === 0}
        >
          <ArrowUp size={16} />
          <span>Up</span>
        </button>
        
        <button 
          style={navButtonStyle(currentFocus.rowIndex < (tableData?.length || 0) - 1)}
          onClick={navigateDown}
          disabled={currentFocus.rowIndex >= (tableData?.length || 0) - 1}
        >
          <ArrowDown size={16} />
          <span>Down</span>
        </button>
        
        <button 
          style={navButtonStyle(currentFocus.colIndex < visibleColumns.length - 1)}
          onClick={navigateRight}
          disabled={currentFocus.colIndex >= visibleColumns.length - 1}
        >
          <ArrowRight size={16} />
          <span>Right</span>
        </button>
      </div>
    </div>
  );
};

export default MobileTableViewer; 