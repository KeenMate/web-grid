# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Monorepo Structure** - Restructured project to use npm workspaces
  - Library moved to `packages/web-grid/` with its own package.json, tsconfig, and vite config
  - Documentation/examples moved to `docs/` as a separate Vite app
  - Root package.json now defines workspaces: `["packages/*", "docs"]`
  - Examples now import from `@keenmate/web-grid` instead of relative paths
  - Vite alias in docs enables HMR during development

- **Makefile** - Updated for workspace commands
  - `make setup` - Install all workspace dependencies
  - `make dev` - Start docs dev server with HMR
  - `make build` - Build library and docs
  - `make package` - Build library for publishing
  - `make create-link` / `make unlink` - npm link management
  - `make publish` / `make publish-dry` - Publishing to npm
  - `make clean` - Clean build artifacts

- **CLAUDE.md** - Updated to reflect new monorepo structure and commands

## [0.1.0] - 2024-12-XX

### Added
- Initial TypeScript implementation of WebGrid component
- Core features: sorting, filtering, editing, keyboard navigation
- Editor types: text, number, date, select, combobox, autocomplete
- Virtual scrolling for large datasets
- Row toolbar with predefined and custom actions
- Context menu support
- Custom cell/row styling via callbacks
- CSS variable theming with `--base-*` integration
