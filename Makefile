.PHONY: setup dev build package publish-dry publish clean

setup:
	npm install

dev:
	npm run dev

build:
	npm run build

package: build
	npm pack

publish-dry: build
	npm publish --dry-run

publish: build
	npm publish --access public
