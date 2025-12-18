# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status: Conversion Complete

**QuickGrid has been converted from Svelte 5 to Pure JavaScript Web Components.**

The original Svelte files are preserved in the repository for comparison.

### Web Component Files
- `src/base-component.js` - Reactive base class with batched rendering
- `src/utils.js` - HTML templating, helpers
- `src/styles.js` - All CSS styles extracted
- `src/positioning-region.js` - Dropdown positioning utility
- `src/grid-cell-editor.js` - All 7 editor types
- `src/quick-grid.js` - Main grid component
- `src/index.js` - Entry point (registers `<quick-grid>`)

### Build & Run
```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Build minified bundles to dist/
```

### Examples
- `examples/basic.html` - Basic grid with sorting, filtering, pagination
- `examples/editable.html` - All editor types and validation
- `examples/context-menu.html` - Right-click context menu
- `examples/row-toolbar.html` - Floating row action toolbar

### Original Svelte Files (Preserved)
- `QuickGrid.svelte` - Original Svelte 5 component
- `GridCellEditor.svelte` - Original editor component
- `PositioningRegion.svelte` - Original positioning component
- `Icon.svelte` - Original icon loader

## Project Overview

This is a Svelte 5 component library containing a feature-rich data grid (`QuickGrid`) and supporting components. The components use FluentUI web components and design tokens for styling.

## Technology Stack

- **Svelte 5** with runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`)
- **TypeScript** with generics support (`<script lang="ts" generics="T">`)
- **FluentUI Web Components** for menu/context menu functionality
- **FluentUI SVG Icons** loaded dynamically via fetch

## Components

### QuickGrid.svelte
The main data grid component with extensive features:
- **Sorting/Filtering/Pagination**: Built-in data manipulation
- **Inline Editing**: Multiple editor types (text, number, checkbox, select, combobox, autocomplete, date, custom)
- **Edit Triggers**: click, dblclick, button, always, navigate (spreadsheet-like keyboard navigation)
- **Validation**: Both legacy `validate` function and newer `onbeforecommit` callback with transform support
- **Draft Row System**: Tracks user edits separately from original data via `draftRows` Map
- **Row Toolbar**: Floating action toolbar with predefined (add/delete/duplicate/moveUp/moveDown) or custom items
- **Context Menu**: Right-click menu using FluentUI components
- **Snippets**: Uses Svelte 5 snippets for custom cell rendering (`column.snippet`)

### PositioningRegion.svelte
Utility component for positioning overlays (dropdowns, tooltips) relative to an anchor element. Supports:
- Positions: bottom, left, right, top (with automatic fallback)
- Alignment: center, top

### Icon.svelte
FluentUI icon loader that dynamically fetches SVG icons from `@fluentui/svg-icons`. Features:
- Size variants: 16, 20, 24, 28, 32, 48
- Icon variants: regular, filled
- Color presets mapping to FluentUI CSS variables
- Hover effect (switch regular/filled on hover)

## Key Patterns

### Editing Flow
1. `startEdit()` creates a draft row clone if none exists
2. User edits update the draft row (not original data)
3. `commitEdit()` runs validation via `onbeforecommit` or legacy `validate`
4. `onrowchange` callback fires with both `row` (original) and `draftRow` (with changes)
5. Consumer decides whether to apply changes to original data

### Navigate Mode (editTrigger="navigate")
Spreadsheet-like editing with arrow key navigation between editable cells. Tab/Enter commit and move, Escape cancels. Typing printable characters starts editing.

### External Imports
Components reference types from `../types/index.js` (SlotType) and import `GridCellEditor.svelte` as a sibling component.
