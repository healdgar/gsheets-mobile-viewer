import React, { useEffect, useState } from 'react';
import TextWithLinks from '../DataTable/TextWithLinks';

/**
 * FocusedCell Component
 * 
 * Displays the content of the current cell with proper formatting and animations.
 * Enhanced for better mobile display and Safari compatibility.
 */
const FocusedCell = ({ data, animationDirection, theme }) => {
  // State to track if in landscape mode on mobile
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  // State to track content length for dynamic font sizing
  const [contentLength, setContentLength] = useState(0);
  
  // Determine animation class based on direction
  const getAnimationClass = () => {
    if (!animationDirection) return '';
    return `animate-${animationDirection}`;
  };

  // Dynamic font size calculated directly from content length using ratio formula
  const getDynamicFontSize = () => {
    // Calculate content length on first render
    const content = String(data.content || '');
    if (content.length !== contentLength) {
      setContentLength(content.length);
    }
    
    // Base value: 1.9rem at content length 100
    const baseLength = 100;
    const baseSize = 1.9;
    
    // Calculate font size using inverse proportion formula with dampening
    // As content length increases, font size decreases proportionally, but with limits
    let calculatedSize;
    
    if (contentLength <= baseLength) {
      // For content shorter than 100 characters, slightly increase font size
      calculatedSize = baseSize * Math.pow(baseLength / Math.max(contentLength, 20), 0.1);
    } else {
      // For longer content, decrease font size with diminishing returns
      calculatedSize = baseSize * Math.pow(baseLength / contentLength, 0.4);
    }
    
    // Apply upper and lower bounds to prevent extreme sizes
    const maxSize = 2.2;  // Maximum font size
    const minSize = 0.7;  // Minimum font size
    
    calculatedSize = Math.min(Math.max(calculatedSize, minSize), maxSize);
    
    // Round to 2 decimal places for cleaner CSS
    calculatedSize = Math.round(calculatedSize * 100) / 100;
    
    return `${calculatedSize}rem`;
  };

  // Helper function to check if device is mobile and in landscape orientation
  const checkLandscapeMobile = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && 
                     window.innerWidth < 1024;
    const isLandscape = window.innerWidth > window.innerHeight;
    setIsLandscapeMobile(isMobile && isLandscape);
  };

  useEffect(() => {
    // Initial check
    checkLandscapeMobile();
    
    // Set up event listeners
    const handleOrientationChange = () => {
      setTimeout(checkLandscapeMobile, 300);
    };
    
    const handleResize = () => {
      checkLandscapeMobile();
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Check for conditional value-specific styling that might require extra processing
  const processValueSpecificStyling = () => {
    // This could handle any additional logic needed for special formatting
    // Currently handled in MobileTableViewer's getCurrentCellData, but could be expanded here
  };
  
  useEffect(() => {
    processValueSpecificStyling();
  }, [data.content]);
  
  // Don't render if in landscape mode on mobile
  if (isLandscapeMobile) {
    return null;
  }

  // Apply styling from exportRegulations.styling.json combined with standard styling
  const getCellStyles = () => {
    // Base styles that are always applied
    const baseStyles = {
      flex: 1, // Ensure it expands within its flex container
      width: '100%', // Ensure it takes full width of its container
      height: '100%', // Ensure it takes full height of its container
      padding: '1rem',
      margin: '0.25rem',
      borderRadius: '8px',
      border: `2px solid ${theme?.tableBorderColor || '#ddd'}`, // Thicker border for visibility
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      fontSize: getDynamicFontSize(), // Use dynamic font size
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'text', // Allow text selection in the central cell
      touchAction: 'manipulation',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)', // Add subtle shadow for depth
      position: 'relative', // For positioning absolute elements inside if needed
      zIndex: 2, // Higher than default to ensure content is clickable/selectable
      // Ensure the focused cell has a solid background to not show underlying table elements through it.
      // This is important if the main viewer background is semi-transparent.
      backgroundColor: theme?.blogPostContentBackgroundColor || '#fff',
    };
    
    // Add any styling from the styling.json file if available
    if (data.cellStyle) {
      // Merge with base styles, allowing cellStyle to override base styles
      return { ...baseStyles, ...data.cellStyle };
    }
    
    return baseStyles;
  };
  
  // Get content wrapper styles based on cell styling
  const getContentStyles = () => {
    const baseContentStyles = {
      width: '100%',
      overflow: 'hidden',
      wordBreak: 'break-word',
      padding: 0,
      lineHeight: 1.5,
      maxWidth: '100%',
    };
    
    // Apply text alignment from cellStyle if specified
    if (data.cellStyle && data.cellStyle.textAlign) {
      return { ...baseContentStyles, textAlign: data.cellStyle.textAlign };
    }
    
    // Default to center alignment if not specified in cellStyle
    return { ...baseContentStyles, textAlign: 'center' };
  };

  return (
    <div 
      className={`focused-cell ${getAnimationClass()}`}
      style={getCellStyles()}
    >
      <div className="cell-content" style={getContentStyles()}>
        {data.content ? (
          <TextWithLinks content={data.content} />
        ) : (
          <span style={{ opacity: 0.5 }}>Empty cell</span>
        )}
      </div>

      <style jsx>{`
        .animate-up {
          animation: slideFromBelow 0.3s forwards;
        }
        .animate-right {
          animation: slideFromLeft 0.3s forwards;
        }
        .animate-down {
          animation: slideFromAbove 0.3s forwards;
        }
        .animate-left {
          animation: slideFromRight 0.3s forwards;
        }

        @keyframes slideFromBelow {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideFromLeft {
          0% { transform: translateX(-30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideFromAbove {
          0% { transform: translateY(-30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideFromRight {
          0% { transform: translateX(30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }

        .cell-content {
          word-break: break-word;
          width: 100%;
          overflow-wrap: break-word;
          padding: 0;
          line-height: 1.5;
          max-width: 100%;
          display: block;
          /* text-align is now applied through inline styles */
        }
        
        /* Basic styling for paragraphs */
        .cell-content p {
          margin: 0.5em 0;
        }
        
        /* Simple handling for pre-formatted text and code */
        .cell-content pre, .cell-content code {
          white-space: pre-wrap;
          max-width: 100%;
          overflow-x: auto;
        }
        
        /* Handle long URLs and links better */
        .cell-content a {
          word-break: break-all;
          display: inline-block;
          max-width: 100%;
          text-decoration: underline;
          color: inherit;
        }

        /* iOS-specific enhancements */
        @supports (-webkit-overflow-scrolling: touch) {
          .focused-cell {
            /* Add padding for iOS safe areas */
            padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0));
          }
          
          .animate-up, .animate-right, .animate-down, .animate-left {
            -webkit-transform: translate3d(0,0,0);
            transform: translate3d(0,0,0);
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            -webkit-perspective: 1000;
            perspective: 1000;
          }
        }
        
        /* Additional responsive styling */
        @media (orientation: landscape) {
          .focused-cell {
            max-height: 70vh;
          }
        }
        
        @media (min-width: 768px) {
          .focused-cell {
            max-width: 600px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
};

export default FocusedCell;
