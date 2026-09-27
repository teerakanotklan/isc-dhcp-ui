package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"dhcp-ui/internal/parser"
	"dhcp-ui/internal/service"
)

var (
	port       = flag.Int("port", 9443, "Agent listen port")
	token      = flag.String("token", "dhcp-secret-token-2026", "Security token for authentication")
	leasesPath = flag.String("leases", "/var/lib/dhcp/dhcpd.leases", "Path to dhcpd.leases")
	configPath = flag.String("config", "/etc/dhcp/dhcpd.conf", "Path to dhcpd.conf")
)

type DeployRequest struct {
	ConfigContent string `json:"config_content"`
}

type JSONResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Output  string      `json:"output,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		expected := "Bearer " + *token
		if authHeader != expected {
			http.Error(w, `{"success":false,"message":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func main() {
	flag.Parse()

	// Environment variable overrides
	if envToken := os.Getenv("AGENT_TOKEN"); envToken != "" {
		*token = envToken
	}

	mux := http.NewServeMux()

	// 1. Dry-run syntax validation
	mux.HandleFunc("POST /api/validate", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		var req DeployRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondJSON(w, http.StatusBadRequest, false, "Invalid JSON payload", "", nil)
			return
		}

		valid, out, err := service.ValidateConfigSyntax(req.ConfigContent)
		if err != nil {
			respondJSON(w, http.StatusInternalServerError, false, err.Error(), out, nil)
			return
		}
		if !valid {
			respondJSON(w, http.StatusBadRequest, false, "Syntax validation error", out, nil)
			return
		}

		respondJSON(w, http.StatusOK, true, "Configuration syntax is valid", out, nil)
	}))

	// 2. Deploy & Reload
	mux.HandleFunc("POST /api/deploy", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		var req DeployRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondJSON(w, http.StatusBadRequest, false, "Invalid JSON payload", "", nil)
			return
		}

		msg, err := service.DeployConfig(req.ConfigContent, *configPath)
		if err != nil {
			respondJSON(w, http.StatusInternalServerError, false, err.Error(), msg, nil)
			return
		}

		respondJSON(w, http.StatusOK, true, msg, "", nil)
	}))

	// 3. Service Status
	mux.HandleFunc("GET /api/status", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		active := service.CheckServiceActive()
		detail := service.GetServiceStatus()
		data := map[string]interface{}{
			"service_active": active,
			"service_detail": detail,
		}
		respondJSON(w, http.StatusOK, true, "Status retrieved", "", data)
	}))

	// 4. Leases and Failover State
	mux.HandleFunc("GET /api/leases", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		leases, failover, err := parser.ParseLeasesFile(*leasesPath)
		if err != nil && !os.IsNotExist(err) {
			respondJSON(w, http.StatusInternalServerError, false, err.Error(), "", nil)
			return
		}
		data := map[string]interface{}{
			"leases":   leases,
			"failover": failover,
		}
		respondJSON(w, http.StatusOK, true, "Leases retrieved", "", data)
	}))

	// Health check (No auth required)
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	addr := fmt.Sprintf("0.0.0.0:%d", *port)
	log.Printf("DHCP Agent listening on %s...", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func respondJSON(w http.ResponseWriter, status int, success bool, msg string, out string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(JSONResponse{
		Success: success,
		Message: strings.TrimSpace(msg),
		Output:  strings.TrimSpace(out),
		Data:    data,
	})
}
