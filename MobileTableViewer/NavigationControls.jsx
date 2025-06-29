import React from 'react';
import { ChevronUp, ChevronRight, ChevronDown, ChevronLeft } from 'react-feather';

/**
 * NavigationControls Component
 * 
 * Provides UI for navigating between cells (arrows, hints about adjacent content)
 */
const NavigationControls = ({ 
  onNavigateUp, 
  onNavigateRight, 
  onNavigateDown, 
  onNavigateLeft, 
  adjacentCellsInfo,
  theme
}) => {
  // Helper to truncate content for previews
  const truncateContent = (content, maxLength = 30) => {
    if (!content) return '';
    
    // Convert to string just in case it's a number or boolean
    const string = String(content);
    // Remove markdown links for display
    const plainText = string.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    // Remove parenthetical content for cleaner display in navigation
    const cleanText = plainText.split('(')[0].trim();
    
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength) + '...';
  };

  // Common button style
  const buttonStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem',
    margin: '0.25rem',
    borderRadius: '8px',
    border: `1px solid ${theme?.tableBorderColor || '#ddd'}`,
    backgroundColor: theme?.blogPostContentBackgroundColor || '#fff',
    color: theme?.blogTextColor || '#000',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    height: '70px',
    minWidth: '70px'
  };

  const inactiveButtonStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'default'
  };

  const previewStyle = {
    fontSize: '0.7rem',
    marginTop: '0.25rem',
    opacity: 0.8,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center'
  };

  return (
    <div className="navigation-controls">
      {/* Up navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
        <button
          onClick={onNavigateUp}
          disabled={!adjacentCellsInfo.up}
          style={adjacentCellsInfo.up ? buttonStyle : inactiveButtonStyle}
          aria-label={adjacentCellsInfo.up ? `Navigate to previous row: ${adjacentCellsInfo.up.identifier}` : 'No previous row'}
        >
          <ChevronUp size={20} />
          {adjacentCellsInfo.up && (
            <div style={previewStyle} title={adjacentCellsInfo.up.identifier}>
              {truncateContent(adjacentCellsInfo.up.identifier, 15)}
            </div>
          )}
          {adjacentCellsInfo.upCount > 0 && (
            <div style={{ fontSize: '0.6rem' }}>
              {adjacentCellsInfo.upCount} more rows
            </div>
          )}
        </button>
      </div>

      {/* Left, Right navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <button
          onClick={onNavigateLeft}
          disabled={!adjacentCellsInfo.left}
          style={adjacentCellsInfo.left ? buttonStyle : inactiveButtonStyle}
          aria-label={adjacentCellsInfo.left ? `Navigate to previous column: ${adjacentCellsInfo.left.identifier}` : 'No previous column'}
        >
          <ChevronLeft size={20} />
          {adjacentCellsInfo.left && (
            <div style={previewStyle} title={adjacentCellsInfo.left.identifier}>
              {truncateContent(adjacentCellsInfo.left.identifier, 15)}
            </div>
          )}
          {adjacentCellsInfo.leftCount > 0 && (
            <div style={{ fontSize: '0.6rem' }}>
              {adjacentCellsInfo.leftCount} more columns
            </div>
          )}
        </button>

        <button
          onClick={onNavigateRight}
          disabled={!adjacentCellsInfo.right}
          style={adjacentCellsInfo.right ? buttonStyle : inactiveButtonStyle}
          aria-label={adjacentCellsInfo.right ? `Navigate to next column: ${adjacentCellsInfo.right.identifier}` : 'No next column'}
        >
          <ChevronRight size={20} />
          {adjacentCellsInfo.right && (
            <div style={previewStyle} title={adjacentCellsInfo.right.identifier}>
              {truncateContent(adjacentCellsInfo.right.identifier, 15)}
            </div>
          )}
          {adjacentCellsInfo.rightCount > 0 && (
            <div style={{ fontSize: '0.6rem' }}>
              {adjacentCellsInfo.rightCount} more columns
            </div>
          )}
        </button>
      </div>

      {/* Down navigation */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onNavigateDown}
          disabled={!adjacentCellsInfo.down}
          style={adjacentCellsInfo.down ? buttonStyle : inactiveButtonStyle}
          aria-label={adjacentCellsInfo.down ? `Navigate to next row: ${adjacentCellsInfo.down.identifier}` : 'No next row'}
        >
          <ChevronDown size={20} />
          {adjacentCellsInfo.down && (
            <div style={previewStyle} title={adjacentCellsInfo.down.identifier}>
              {truncateContent(adjacentCellsInfo.down.identifier, 15)}
            </div>
          )}
          {adjacentCellsInfo.downCount > 0 && (
            <div style={{ fontSize: '0.6rem' }}>
              {adjacentCellsInfo.downCount} more rows
            </div>
          )}
        </button>
      </div>

      <style jsx>{`
        .navigation-controls {
          padding: 0.5rem;
          border-radius: 8px;
        }
        
        button:not(:disabled):hover {
          background-color: ${theme?.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
        }
        
        button:not(:disabled):active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
};

export default NavigationControls;
