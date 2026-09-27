.PHONY: all build build-frontend build-controller build-agent clean test setup dev help

BINARY_DIR    := bin
CONTROLLER_BIN := $(BINARY_DIR)/controller
AGENT_BIN      := $(BINARY_DIR)/agent
FRONTEND_DIR   := frontend

all: build

help:
	@echo "ISC DHCP UI - Build & Maintenance"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  build             Build frontend then compile both binaries"
	@echo "  build-frontend    Run 'npm run build' inside frontend/"
	@echo "  build-controller  Compile controller binary (requires web/dist/)"
	@echo "  build-agent       Compile agent binary"
	@echo "  dev               Start frontend Vite dev server (hot-reload)"
	@echo "  setup             Launch interactive setup wizard (Linux)"
	@echo "  clean             Remove built binaries and web/dist/"
	@echo "  test              Run Go tests"
	@echo "  run-controller    Run controller locally (port 8080)"
	@echo "  run-agent         Run agent locally (port 9443)"

build: build-frontend build-controller build-agent

build-frontend:
	@echo "==> Building React frontend..."
	npm --prefix $(FRONTEND_DIR) run build

build-controller: build-frontend
	@echo "==> Building controller..."
	@mkdir -p $(BINARY_DIR)
	CGO_ENABLED=1 go build -trimpath -ldflags="-s -w" -o $(CONTROLLER_BIN) ./cmd/controller

build-agent:
	@echo "==> Building agent..."
	@mkdir -p $(BINARY_DIR)
	go build -trimpath -ldflags="-s -w" -o $(AGENT_BIN) ./cmd/agent

dev:
	@echo "==> Starting Vite dev server..."
	npm --prefix $(FRONTEND_DIR) run dev

clean:
	@echo "==> Cleaning build artifacts..."
	@rm -rf $(BINARY_DIR) web/dist

test:
	@echo "==> Running Go tests..."
	go test -v ./...

setup:
	@chmod +x setup.sh
	@sudo ./setup.sh

run-controller: build-controller
	./$(CONTROLLER_BIN) -port 8080 -db ./data/dhcp.db

run-agent: build-agent
	./$(AGENT_BIN) -port 9443 -token test-token-2026
