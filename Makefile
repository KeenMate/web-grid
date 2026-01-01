# Web-Grid Workspace - Makefile
# Development and build commands for the web-grid library (workspace version)

# === Configuration ===
# Use cmd.exe on Windows to avoid path mangling issues with npm
ifeq ($(OS),Windows_NT)
SHELL := cmd.exe
.SHELLFLAGS := /c
endif

.PHONY: setup dev build package create-link unlink publish publish-dry clean help

# Default target
help:
	@echo Web-Grid Workspace - Available Commands:
	@echo.
	@echo Development:
	@echo   setup        - Install dependencies for all workspace packages
	@echo   dev          - Start development server (docs with HMR)
	@echo   build        - Build production version (library + docs)
	@echo   package      - Package the library for publishing
	@echo   create-link  - Create global npm link for @keenmate/web-grid
	@echo   unlink       - Remove global npm link for @keenmate/web-grid
	@echo.
	@echo Publishing:
	@echo   publish      - Publish package to npm (asks for confirmation)
	@echo   publish-dry  - Dry run publish (show what would be published)
	@echo.
	@echo Cleanup:
	@echo   clean        - Clean build artifacts

setup:
	@echo Installing workspace dependencies...
	npm install
	@echo.
	@echo Setup complete!

dev:
	@echo Starting development server with HMR...
	npm run dev

build:
	@echo Building library and documentation...
	npm run build -w @keenmate/web-grid
	npm run build -w docs

package:
	@echo.
	@echo Cleaning previous dist folder...
ifeq ($(OS),Windows_NT)
	-rd /s /q packages\web-grid\dist 2>nul
else
	rm -rf packages/web-grid/dist
endif
	@echo Building library package...
	cd packages/web-grid && npm run build
	@echo.
	@echo Package built successfully
	@echo.

create-link: package
	@echo.
	@echo Creating global npm link for @keenmate/web-grid...
	cd packages/web-grid && npm link
	@echo.
	@echo Link created successfully!
	@echo To use in your project, run: npm link @keenmate/web-grid
	@echo.

unlink:
	@echo.
	@echo Removing global npm link for @keenmate/web-grid...
	cd packages/web-grid && npm unlink
	@echo.
	@echo Link removed successfully!
	@echo.

publish: package
	@echo.
	@echo Publishing to npm...
	@echo.
	cd packages/web-grid && npm publish --access public
	@echo.
	@echo Published successfully!

publish-dry: package
	@echo Dry run - showing what would be published...
	cd packages/web-grid && npm publish --dry-run

clean:
	@echo Cleaning build artifacts...
ifeq ($(OS),Windows_NT)
	-rd /s /q packages\web-grid\dist 2>nul
	-rd /s /q packages\web-grid\node_modules\.vite 2>nul
	-rd /s /q docs\build 2>nul
else
	rm -rf packages/web-grid/dist packages/web-grid/node_modules/.vite
	rm -rf docs/build
endif
	@echo Cleaned build artifacts
