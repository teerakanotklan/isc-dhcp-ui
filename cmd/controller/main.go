package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
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
	caCertPath = flag.String("ca", "/opt/dhcp-ui/ca.pem", "Path to shared CA certificate for mTLS")
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

	// Embedded React Vite Assets
	distSubFS, err := fs.Sub(web.DistFS, "dist")
	if err != nil {
		log.Fatalf("Failed to sub embed fs: %v", err)
	}
	fileServer := http.FileServer(http.FS(distSubFS))

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

	mux.HandleFunc("GET /api/cluster", srv.auth(srv.handleGetCluster))
	mux.HandleFunc("POST /api/cluster", srv.auth(srv.handleSaveCluster))
	mux.HandleFunc("DELETE /api/cluster", srv.auth(srv.handleDeleteCluster))
	mux.HandleFunc("POST /api/cluster/test", srv.auth(srv.handleTestCluster))

	// Helper to serve index.html for React SPA
	serveIndexHTML := func(w http.ResponseWriter, r *http.Request) {
		f, err := distSubFS.Open("index.html")
		if err != nil {
			http.Error(w, "index.html not found", http.StatusInternalServerError)
			return
		}
		defer f.Close()
		stat, _ := f.Stat()
		http.ServeContent(w, r, "index.html", stat.ModTime(), f.(io.ReadSeeker))
	}

	// SPA Routing & Static Assets
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		cleanPath := strings.TrimSuffix(r.URL.Path, "/")
		if cleanPath == "" {
			cleanPath = "/"
		}

		// Static assets (like /assets/...) served directly
		if strings.HasPrefix(r.URL.Path, "/assets/") {
			fileServer.ServeHTTP(w, r)
			return
		}

		// Public SPA routes
		if cleanPath == "/login" {
			serveIndexHTML(w, r)
			return
		}

		// All other SPA routes require authentication
		if !srv.isAuthenticated(r) {
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}

		serveIndexHTML(w, r)
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

	// Secondary Service Status via Agent (if clustered)
	sStatus := "not_configured"
	if secondaryNode.ManagementIP != "" && secondaryNode.DHCPIP != "" {
		sActive, sStat, err := s.syncer.GetRemoteStatus(
			fmt.Sprintf("http://%s:%d", secondaryNode.ManagementIP, secondaryNode.AgentPort),
			secondaryNode.APIToken,
		)
		if err != nil {
			sStatus = "offline"
			secondaryNode.Status = "offline"
		} else if sActive {
			sStatus = "active"
			secondaryNode.Status = "online"
		} else {
			sStatus = sStat
			secondaryNode.Status = sStat
		}
	} else {
		secondaryNode.Status = "not_configured"
		secondaryNode.Name = "None (Standalone)"
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

	// Check if clustering is active
	isClustered := secondaryNode.ManagementIP != "" && secondaryNode.DHCPIP != ""

	// Step 1: Pre-flight syntax validation for Primary
	validP, outP, err := service.ValidateConfigSyntax(confPrimary)
	if !validP || err != nil {
		s.recordDeployHistory(req.CommitMessage, confPrimary, confSecondary, "failed", "Primary syntax error: "+outP)
		s.jsonResponse(w, http.StatusBadRequest, false, "Primary syntax validation failed", outP)
		return
	}

	if !isClustered {
		// Standalone Mode: Deploy only to primary/local node
		priMsg, err := service.DeployConfig(confPrimary, *confPath)
		if err != nil {
			s.recordDeployHistory(req.CommitMessage, confPrimary, "", "failed", "Deploy error: "+err.Error())
			s.jsonResponse(w, http.StatusInternalServerError, false, "Failed to deploy configuration", err.Error())
			return
		}
		successMsg := fmt.Sprintf("Standalone Config Deployed Successfully!\n%s", priMsg)
		s.recordDeployHistory(req.CommitMessage, confPrimary, "", "success", successMsg)
		s.jsonResponse(w, http.StatusOK, true, successMsg, "")
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

// 7. Clustering Management
func (s *Server) handleGetCluster(w http.ResponseWriter, r *http.Request) {
	primary, secondary, hasSecondary, err := s.db.GetClusterNodes()
	if err != nil {
		s.json(w, http.StatusInternalServerError, false, err.Error(), nil)
		return
	}
	_, failover, _ := parser.ParseLeasesFile(*leasesPath)
	mode := "standalone"
	if hasSecondary {
		mode = "failover"
	}
	info := models.ClusterInfo{
		IsClustered:    hasSecondary,
		ClusterMode:    mode,
		PrimaryNode:    primary,
		SecondaryNode:  secondary,
		FailoverStatus: failover,
	}
	s.json(w, http.StatusOK, true, "Cluster info retrieved", info)
}

func (s *Server) handleSaveCluster(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Primary   models.Node `json:"primary_node"`
		Secondary models.Node `json:"secondary_node"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.json(w, http.StatusBadRequest, false, "Invalid payload", nil)
		return
	}
	req.Primary.Role = "primary"
	if req.Primary.Name == "" {
		req.Primary.Name = "dhcp1"
	}
	if err := s.db.SaveNode(req.Primary); err != nil {
		s.json(w, http.StatusInternalServerError, false, "Failed to save primary node: "+err.Error(), nil)
		return
	}

	req.Secondary.Role = "secondary"
	if req.Secondary.Name == "" {
		req.Secondary.Name = "dhcp2"
	}
	if err := s.db.SaveNode(req.Secondary); err != nil {
		s.json(w, http.StatusInternalServerError, false, "Failed to save secondary node: "+err.Error(), nil)
		return
	}

	s.json(w, http.StatusOK, true, "Cluster configuration saved successfully", nil)
}

func (s *Server) handleDeleteCluster(w http.ResponseWriter, r *http.Request) {
	if err := s.db.DeleteSecondaryNode(); err != nil {
		s.json(w, http.StatusInternalServerError, false, "Failed to disband cluster: "+err.Error(), nil)
		return
	}
	s.json(w, http.StatusOK, true, "Cluster disbanded. System reverted to standalone mode.", nil)
}

func (s *Server) handleTestCluster(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ManagementIP string `json:"management_ip"`
		AgentPort    int    `json:"agent_port"`
		APIToken     string `json:"api_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.json(w, http.StatusBadRequest, false, "Invalid payload", nil)
		return
	}
	if req.AgentPort == 0 {
		req.AgentPort = 9443
	}
	url := fmt.Sprintf("http://%s:%d", req.ManagementIP, req.AgentPort)
	active, status, err := s.syncer.GetRemoteStatus(url, req.APIToken)
	if err != nil {
		s.json(w, http.StatusOK, false, fmt.Sprintf("Agent connection failed: %v", err), map[string]interface{}{
			"reachable": false,
			"error":     err.Error(),
		})
		return
	}
	s.json(w, http.StatusOK, true, fmt.Sprintf("Connection successful! Remote status: %s (Active: %v)", status, active), map[string]interface{}{
		"reachable": true,
		"active":    active,
		"status":    status,
	})
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
