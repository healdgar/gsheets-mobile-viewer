# Mobile Table Viewer for Wall At Law Website

This component provides a mobile-friendly way to view tables on the Wall At Law website. It allows users to focus on one cell at a time, with easy navigation between rows and columns.

## Features

- **Cell-by-cell navigation**: View a single cell at a time, with context about which row and column you're viewing
- **Swipe navigation**: Swipe left/right/up/down to navigate between cells
- **Keyboard navigation**: Use arrow keys to navigate between cells
- **Context hints**: See previews of adjacent cells to understand what you'll see next
- **Responsive design**: Works well on all mobile devices
- **Automatic integration**: Works with both DataTable components and markdown tables

## Usage

### In DataTable Component

The mobile viewer is already integrated with the DataTable component. When viewing a DataTable on a mobile device (screen width < 768px), a "View Table in Mobile Mode" button will appear above the table. Clicking this button will activate the mobile viewer.

You can also click on any cell in the table to open the mobile viewer focused on that cell.

### For Markdown Tables

The mobile viewer is also automatically integrated with markdown tables on blog posts. When viewing a blog post on a mobile device, the `MarkdownTableViewer` component will add "Mobile View" buttons next to each table. Clicking this button will activate the mobile viewer for that table.

### Testing

You can test the mobile viewer by visiting:

```
http://localhost:3000/test/mobile-table-viewer
```

This page shows a demo of the mobile table viewer with sample data.

## Component Structure

- `MobileTableViewer`: Main component that orchestrates the mobile viewing experience
- `FocusedCell`: Displays the content of the current cell
- `NavigationControls`: Provides UI for navigating between cells
- `CellContextInfo`: Displays contextual information about the current cell (row/column headers)

## Implementation Details

The mobile viewer uses:

- React Hooks for state management
- react-swipeable for touch gestures
- CSS animations for smooth transitions between cells
- Responsive design principles
- Accessibility features like keyboard navigation

## Customization

The mobile viewer inherits styling from the website's theme context, ensuring a consistent look and feel with the rest of the site.
