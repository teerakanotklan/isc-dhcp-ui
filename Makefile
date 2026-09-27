.PHONY: all build build-controller build-agent clean test setup help

BINARY_DIR := bin
CONTROLLER_BIN := $(BINARY_DIR)/controller
AGENT_BIN := $(BINARY_DIR)/agent

all: build

help:
	@echo "ISC DHCP UI - Build & Maintenance"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  build             Compile both controller and agent binaries"
	@echo "  build-controller  Compile controller binary"
	@echo "  build-agent       Compile agent binary"
	@echo "  setup             Launch interactive setup wizard (Linux)"
	@echo "  clean             Remove built binaries"
	@echo "  test              Run tests"
	@echo "  run-controller    Run controller locally (port 8080)"
	@echo "  run-agent         Run agent locally (port 9443)"

build: build-controller build-agent

build-controller:
	@echo "==> Building controller..."
	@mkdir -p $(BINARY_DIR)
	CGO_ENABLED=1 go build -trimpath -ldflags="-s -w" -o $(CONTROLLER_BIN) ./cmd/controller

build-agent:
	@echo "==> Building agent..."
	@mkdir -p $(BINARY_DIR)
	go build -trimpath -ldflags="-s -w" -o $(AGENT_BIN) ./cmd/agent

clean:
	@echo "==> Cleaning binaries..."
	@rm -rf $(BINARY_DIR)

test:
	@echo "==> Running tests..."
	go test -v ./...

setup:
	@chmod +x setup.sh
	@sudo ./setup.sh

run-controller: build-controller
	./$(CONTROLLER_BIN) -port 8080 -db ./data/dhcp.db

run-agent: build-agent
	./$(AGENT_BIN) -port 9443 -token test-token-2026
