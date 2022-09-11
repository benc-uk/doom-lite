# Things you don't want to change
REPO_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
# Tools
BS_PATH := $(REPO_DIR)/bin/node_modules/.bin/browser-sync # Remove if local server not needed

.PHONY: help install-tools local-server lint lint-fix
.DEFAULT_GOAL := help

help: ## 💬 This help message :)
	@figlet $@ || true
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install-tools: ## 🔮 Install dev tools into project bin directory
	@figlet $@ || true
	@$(BS_PATH) -v > /dev/null 2>&1 || npm install --prefix ./bin browser-sync

lint: ## 🌟 Lint & format, will not fix but sets exit code on error
	@figlet $@ || true
	@$(GOLINT_PATH) > /dev/null || curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh
	cd $(SRC_DIR); $(GOLINT_PATH) run --modules-download-mode=mod *.go
	cd $(SRC_DIR); npm run lint

lint-fix: ## 🔍 Lint & format, will try to fix errors and modify code
	@figlet $@ || true
	cd $(SPA_DIR); npm run lint-fix

local-server: ## 🌐 Start a local HTTP server for development
	@figlet $@ || true
	@$(BS_PATH) start --config etc/bs-config.js