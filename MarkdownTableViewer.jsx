import React, { useState, useEffect } from 'react';
import MobileTableViewer from '@/components/MobileTableViewer/MobileTableViewer';
import { extractTableDataFromHtml, processMdTablesOnPage } from '@/utils/tableUtils';

/**
 * MarkdownTableViewer Component
 * 
 * This component provides a mobile-friendly viewer for markdown tables.
 * It attaches mobile view buttons to all markdown-generated tables on a page.
 */
const MarkdownTableViewer = ({ theme }) => {
  const [viewerState, setViewerState] = useState({
    isActive: false,
    tableData: [],
    columns: [],
    initialFocus: { rowIndex: 0, colIndex: 0 }
  });

  // Function to activate the mobile viewer for a markdown table
  const activateMobileViewer = (tableData, columns, initialFocus = { rowIndex: 0, colIndex: 0 }) => {
    setViewerState({
      isActive: true,
      tableData,
      columns,
      initialFocus
    });
  };

  // Function to close the mobile viewer
  const closeMobileViewer = () => {
    setViewerState(prev => ({
      ...prev,
      isActive: false
    }));
  };

  // Process all markdown tables on the page
  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip on server-side rendering
    
    // Only run on mobile devices
    if (window.innerWidth >= 768) return;
    
    // Process markdown tables after component mounts
    processMdTablesOnPage((tableData, columns) => {
      activateMobileViewer(tableData, columns);
    }, theme);
    
    // Re-process tables when window size changes
    const handleResize = () => {
      if (window.innerWidth < 768) {
        processMdTablesOnPage((tableData, columns) => {
          activateMobileViewer(tableData, columns);
        }, theme);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [theme]);

  // If the viewer is not active, render nothing
  if (!viewerState.isActive) return null;

  // Render the mobile table viewer
  return (
    <MobileTableViewer
      tableData={viewerState.tableData}
      columns={viewerState.columns}
      initialFocus={viewerState.initialFocus}
      onClose={closeMobileViewer}
      theme={theme}
    />
  );
};

export default MarkdownTableViewer;
