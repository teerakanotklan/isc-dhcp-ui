package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"dhcp-ui/internal/database"
	"dhcp-ui/internal/generator"
	"dhcp-ui/internal/models"
	"dhcp-ui/internal/parser"
	"dhcp-ui/internal/service"
	"dhcp-ui/internal/syncer"
	"dhcp-ui/web"
)

var (
	port       = flag.Int("port", 8080, "Web controller port")
	dbPath     = flag.String("db", "/opt/dhcp-ui/dhcp.db", "SQLite database path")
	leasesPath = flag.String("leases", "/var/lib/dhcp/dhcpd.leases", "Path to dhcpd.leases")
	confPath   = flag.String("config", "/etc/dhcp/dhcpd.conf", "Path to dhcpd.conf")
)

type Server struct {
	db       *database.DB
	syncer   *syncer.SyncerClient
	sessions map[string]time.Time
	sessMu   sync.RWMutex
}

func main() {
	flag.Parse()

	// Ensure database directory exists
	dbFile := *dbPath
	if idx := strings.LastIndex(dbFile, "/"); idx != -1 {
		_ = os.MkdirAll(dbFile[:idx], 0755)
	}

	db, err := database.InitDB(dbFile)
	if err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}
	defer db.Close()

	srv := &Server{
		db:       db,
		syncer:   syncer.NewSyncerClient(),
		sessions: make(map[string]time.Time),
	}

	mux := http.NewServeMux()

	// Embedded Static Assets
	staticSubFS, err := fs.Sub(web.StaticFS, "static")
	if err != nil {
		log.Fatalf("Failed to sub embed fs: %v", err)
	}
	fileServer := http.FileServer(http.FS(staticSubFS))

	// Auth APIs
	mux.HandleFunc("POST /api/login", srv.handleLogin)
	mux.HandleFunc("POST /api/logout", srv.handleLogout)

	// Protected APIs
	mux.HandleFunc("GET /api/summary", srv.auth(srv.handleSummary))
	mux.HandleFunc("GET /api/subnets", srv.auth(srv.handleGetSubnets))
	mux.HandleFunc("POST /api/subnets", srv.auth(srv.handleSaveSubnet))
	mux.HandleFunc("DELETE /api/subnets", srv.auth(srv.handleDeleteSubnet))

	mux.HandleFunc("POST /api/pools", srv.auth(srv.handleSavePool))
	mux.HandleFunc("DELETE /api/pools", srv.auth(srv.handleDeletePool))

	mux.HandleFunc("GET /api/static", srv.auth(srv.handleGetStatic))
	mux.HandleFunc("POST /api/static", srv.auth(srv.handleSaveStatic))
	mux.HandleFunc("DELETE /api/static", srv.auth(srv.handleDeleteStatic))

	mux.HandleFunc("GET /api/leases", srv.auth(srv.handleGetLeases))
	mux.HandleFunc("GET /api/config/preview", srv.auth(srv.handleConfigPreview))
	mux.HandleFunc("POST /api/config/deploy", srv.auth(srv.handleConfigDeploy))
	mux.HandleFunc("GET /api/deployments", srv.auth(srv.handleGetDeployments))

	mux.HandleFunc("GET /api/settings", srv.auth(srv.handleGetSettings))
	mux.HandleFunc("POST /api/settings", srv.auth(srv.handleSaveSettings))

	// Static routes
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" || r.URL.Path == "/index.html" {
			if !srv.isAuthenticated(r) {
				http.Redirect(w, r, "/login.html", http.StatusFound)
				return
			}
		}
		fileServer.ServeHTTP(w, r)
	})

	addr := fmt.Sprintf("0.0.0.0:%d", *port)
	log.Printf("==================================================")
	log.Printf("DHCP-UI Web Controller running at http://%s", addr)
	log.Printf("==================================================")

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

// Auth Middleware
func (s *Server) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.isAuthenticated(r) {
			s.json(w, http.StatusUnauthorized, false, "Unauthorized", nil)
			return
		}
		next(w, r)
	}
}

func (s *Server) isAuthenticated(r *http.Request) bool {
	cookie, err := r.Cookie("session_token")
	if err != nil {
		return false
	}
	s.sessMu.RLock()
	exp, exists := s.sessions[cookie.Value]
	s.sessMu.RUnlock()
	if !exists || time.Now().After(exp) {
		return false
	}
	return true
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.json(w, http.StatusBadRequest, false, "Invalid payload", nil)
		return
	}

	if !s.db.ValidateUser(req.Username, req.Password) {
		s.json(w, http.StatusUnauthorized, false, "Invalid username or password", nil)
		return
	}

	tokenBytes := make([]byte, 16)
	_, _ = rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	s.sessMu.Lock()
	s.sessions[token] = time.Now().Add(24 * time.Hour)
	s.sessMu.Unlock()

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
	})

	s.json(w, http.StatusOK, true, "Login successful", nil)
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err == nil {
		s.sessMu.Lock()
		delete(s.sessions, cookie.Value)
		s.sessMu.Unlock()
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
	})
	s.json(w, http.StatusOK, true, "Logged out", nil)
}

// 1. Dashboard Summary
func (s *Server) handleSummary(w http.ResponseWriter, r *http.Request) {
	nodes, _ := s.db.GetNodes()
	var primaryNode, secondaryNode models.Node
	for _, n := range nodes {
		if n.Role == "primary" {
			primaryNode = n
		} else if n.Role == "secondary" {
			secondaryNode = n
		}
	}

	// Primary Service Status
	pActive := service.CheckServiceActive()
	pStatus := "inactive"
	if pActive {
		pStatus = "active"
	}

	// Secondary Service Status via Agent
	sActive, sStatus, err := s.syncer.GetRemoteStatus(
		fmt.Sprintf("http://%s:%d", secondaryNode.ManagementIP, secondaryNode.AgentPort),
		secondaryNode.APIToken,
	)
	if err != nil {
		sStatus = "offline"
		secondaryNode.Status = "offline"
	} else if sActive {
		sStatus = "active"
		secondaryNode.Status = "online"
	}

	// Parse local leases & failover status
	leases, failover, _ := parser.ParseLeasesFile(*leasesPath)

	subnets, _ := s.db.GetSubnets()
	staticLeases, _ := s.db.GetStaticLeases()

	totalPools := 0
	for _, sn := range subnets {
		totalPools += len(sn.Pools)
	}

	activeLeaseCount := 0
	for _, l := range leases {
		if l.BindingState == "active" {
			activeLeaseCount++
		}
	}

	summary := models.ClusterSummary{
		PrimaryNode:      primaryNode,
		SecondaryNode:    secondaryNode,
		FailoverStatus:   failover,
		TotalSubnets:     len(subnets),
		TotalPools:       totalPools,
		TotalStatic:      len(staticLeases),
		ActiveLeases:     activeLeaseCount,
		PrimaryService:   pStatus,
		SecondaryService: sStatus,
	}

	s.json(w, http.StatusOK, true, "Summary fetched", summary)
}

// 2. Subnets & Pools
func (s *Server) handleGetSubnets(w http.ResponseWriter, r *http.Request) {
	subnets, err := s.db.GetSubnets()
	if err != nil {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Subnets retrieved", subnets)
}

func (s *Server) handleSaveSubnet(w http.ResponseWriter, r *http.Request) {
	var sn models.Subnet
	if err := json.NewDecoder(r.Body).Decode(&sn); err != nil {
		s.json(w, http.StatusBadRequest, false, "Invalid payload", nil)
		return
	}
	id, err := s.db.SaveSubnet(sn)
	if err != nil {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Subnet saved", map[string]int{"id": id})
}

func (s *Server) handleDeleteSubnet(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, _ := strconv.Atoi(idStr)
	if err := s.db.DeleteSubnet(id); err != nil {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Subnet deleted", nil)
}

func (s *Server) handleSavePool(w http.ResponseWriter, r *http.Request) {
	var p models.Pool
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		s.json(w, http.StatusBadRequest, false, "Invalid payload", nil)
		return
	}
	if err := s.db.SavePool(p); err != nil {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Pool saved", nil)
}

func (s *Server) handleDeletePool(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, _ := strconv.Atoi(idStr)
	if err := s.db.DeletePool(id); err != nil {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Pool deleted", nil)
}

// 3. Static Leases
func (s *Server) handleGetStatic(w http.ResponseWriter, r *http.Request) {
	leases, err := s.db.GetStaticLeases()
	if err != nil {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Static leases retrieved", leases)
}

func (s *Server) handleSaveStatic(w http.ResponseWriter, r *http.Request) {
	var l models.StaticLease
	if err := json.NewDecoder(r.Body).Decode(&l); err != nil {
		s.json(w, http.StatusBadRequest, false, "Invalid payload", nil)
		return
	}
	if err := s.db.SaveStaticLease(l); err != nil {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Static reservation saved", nil)
}

func (s *Server) handleDeleteStatic(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, _ := strconv.Atoi(idStr)
	if err := s.db.DeleteStaticLease(id); err != nil {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Static reservation deleted", nil)
}

// 4. Leases Explorer
func (s *Server) handleGetLeases(w http.ResponseWriter, r *http.Request) {
	leases, _, err := parser.ParseLeasesFile(*leasesPath)
	if err != nil && !os.IsNotExist(err) {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Leases retrieved", leases)
}

// 5. Config Preview & Deploy
func (s *Server) handleConfigPreview(w http.ResponseWriter, r *http.Request) {
	nodes, _ := s.db.GetNodes()
	var primaryNode, secondaryNode models.Node
	for _, n := range nodes {
		if n.Role == "primary" {
			primaryNode = n
		} else if n.Role == "secondary" {
			secondaryNode = n
		}
	}

	global, _ := s.db.GetGlobalSettings()
	subnets, _ := s.db.GetSubnets()
	staticLeases, _ := s.db.GetStaticLeases()

	primaryConf := generator.GenerateDHCPConfig("primary", primaryNode, secondaryNode, global, subnets, staticLeases)
	secondaryConf := generator.GenerateDHCPConfig("secondary", primaryNode, secondaryNode, global, subnets, staticLeases)

	s.json(w, http.StatusOK, true, "Preview generated", map[string]string{
		"primary_config":   primaryConf,
		"secondary_config": secondaryConf,
	})
}

func (s *Server) handleConfigDeploy(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CommitMessage string `json:"commit_message"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.CommitMessage == "" {
		req.CommitMessage = "Manual Web UI Deployment"
	}

	nodes, _ := s.db.GetNodes()
	var primaryNode, secondaryNode models.Node
	for _, n := range nodes {
		if n.Role == "primary" {
			primaryNode = n
		} else if n.Role == "secondary" {
			secondaryNode = n
		}
	}

	global, _ := s.db.GetGlobalSettings()
	subnets, _ := s.db.GetSubnets()
	staticLeases, _ := s.db.GetStaticLeases()

	confPrimary := generator.GenerateDHCPConfig("primary", primaryNode, secondaryNode, global, subnets, staticLeases)
	confSecondary := generator.GenerateDHCPConfig("secondary", primaryNode, secondaryNode, global, subnets, staticLeases)

	// Step 1: Pre-flight syntax validation for Primary
	validP, outP, err := service.ValidateConfigSyntax(confPrimary)
	if !validP || err != nil {
		s.recordDeployHistory(req.CommitMessage, confPrimary, confSecondary, "failed", "Primary syntax error: "+outP)
		s.jsonResponse(w, http.StatusBadRequest, false, "Primary syntax validation failed", outP)
		return
	}

	// Step 2: Pre-flight syntax validation for Secondary via Agent
	secondaryURL := fmt.Sprintf("http://%s:%d", secondaryNode.ManagementIP, secondaryNode.AgentPort)
	validS, outS, err := s.syncer.ValidateRemote(secondaryURL, secondaryNode.APIToken, confSecondary)
	if !validS || err != nil {
		detail := "Secondary syntax error: "
		if err != nil {
			detail += err.Error() + "\n"
		}
		detail += outS
		s.recordDeployHistory(req.CommitMessage, confPrimary, confSecondary, "failed", detail)
		s.jsonResponse(w, http.StatusBadRequest, false, "Secondary node validation failed", detail)
		return
	}

	// Step 3: Deploy to Secondary first
	secMsg, err := s.syncer.DeployRemote(secondaryURL, secondaryNode.APIToken, confSecondary)
	if err != nil {
		s.recordDeployHistory(req.CommitMessage, confPrimary, confSecondary, "failed", "Secondary deploy error: "+err.Error())
		s.jsonResponse(w, http.StatusInternalServerError, false, "Failed to deploy to secondary node", err.Error())
		return
	}

	// Step 4: Deploy to Primary
	priMsg, err := service.DeployConfig(confPrimary, *confPath)
	if err != nil {
		s.recordDeployHistory(req.CommitMessage, confPrimary, confSecondary, "failed", "Primary deploy error: "+err.Error())
		s.jsonResponse(w, http.StatusInternalServerError, false, "Failed to deploy to primary node", err.Error())
		return
	}

	successMsg := fmt.Sprintf("Cluster Deployed Successfully!\nPrimary: %s\nSecondary: %s", priMsg, secMsg)
	s.recordDeployHistory(req.CommitMessage, confPrimary, confSecondary, "success", successMsg)
	s.jsonResponse(w, http.StatusOK, true, successMsg, "")
}

func (s *Server) recordDeployHistory(msg, cP, cS, status, detail string) {
	_ = s.db.RecordDeployment(models.DeploymentHistory{
		DeployedBy:            "admin",
		CommitMessage:         msg,
		GeneratedConfPrimary:   cP,
		GeneratedConfSecondary: cS,
		Status:                status,
		LogDetail:             detail,
	})
}

func (s *Server) handleGetDeployments(w http.ResponseWriter, r *http.Request) {
	history, err := s.db.GetDeployments()
	if err != nil {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Deployments retrieved", history)
}

// 6. Settings
func (s *Server) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	g, err := s.db.GetGlobalSettings()
	if err != nil {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Settings retrieved", g)
}

func (s *Server) handleSaveSettings(w http.ResponseWriter, r *http.Request) {
	var g models.GlobalSettings
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		s.json(w, http.StatusBadRequest, false, "Invalid payload", nil)
		return
	}
	g.ID = 1
	if err := s.db.UpdateGlobalSettings(g); err != nil {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Settings saved", nil)
}

func (s *Server) json(w http.ResponseWriter, status int, success bool, msg string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": success,
		"message": msg,
		"data":    data,
	})
}

func (s *Server) jsonResponse(w http.ResponseWriter, status int, success bool, msg string, output string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": success,
		"message": msg,
		"output":  output,
	})
}
