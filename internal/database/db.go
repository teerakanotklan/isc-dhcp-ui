package database

import (
	"database/sql"
	"fmt"
	"log"

	"dhcp-ui/internal/models"
	_ "github.com/mattn/go-sqlite3"
)

type DB struct {
	conn *sql.DB
}

func InitDB(dbPath string) (*DB, error) {
	conn, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	db := &DB{conn: conn}
	if err := db.createTables(); err != nil {
		return nil, fmt.Errorf("failed to create tables: %w", err)
	}
	if err := db.seedDefaults(); err != nil {
		log.Printf("Notice during seed: %v", err)
	}

	return db, nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}

func (db *DB) createTables() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS global_settings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		domain_name TEXT DEFAULT 'local',
		dns_servers TEXT DEFAULT '192.168.153.2, 8.8.8.8',
		default_lease_time INTEGER DEFAULT 43200,
		max_lease_time INTEGER DEFAULT 86400,
		authoritative BOOLEAN DEFAULT 1,
		custom_options TEXT DEFAULT '',
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS nodes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		role TEXT NOT NULL CHECK(role IN ('primary', 'secondary')),
		management_ip TEXT NOT NULL,
		dhcp_ip TEXT NOT NULL,
		agent_port INTEGER DEFAULT 9443,
		api_token TEXT NOT NULL,
		status TEXT DEFAULT 'unknown',
		last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS subnets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		network_address TEXT NOT NULL,
		netmask TEXT NOT NULL,
		cidr_prefix INTEGER NOT NULL,
		gateway TEXT NOT NULL,
		dns_servers TEXT DEFAULT '',
		domain_name TEXT DEFAULT '',
		lease_time INTEGER DEFAULT 0,
		enable_failover BOOLEAN DEFAULT 1,
		description TEXT DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS pools (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		subnet_id INTEGER NOT NULL REFERENCES subnets(id) ON DELETE CASCADE,
		range_start TEXT NOT NULL,
		range_end TEXT NOT NULL,
		deny_unknown_clients BOOLEAN DEFAULT 0,
		failover_peer_name TEXT DEFAULT 'dhcp-failover'
	);

	CREATE TABLE IF NOT EXISTS static_leases (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		subnet_id INTEGER NOT NULL REFERENCES subnets(id) ON DELETE CASCADE,
		hostname TEXT NOT NULL,
		mac_address TEXT NOT NULL UNIQUE,
		ip_address TEXT NOT NULL UNIQUE,
		description TEXT DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS deployment_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		deployed_by TEXT NOT NULL,
		commit_message TEXT NOT NULL,
		generated_conf_primary TEXT NOT NULL,
		generated_conf_secondary TEXT NOT NULL,
		status TEXT NOT NULL,
		log_detail TEXT DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := db.conn.Exec(schema)
	return err
}

func (db *DB) seedDefaults() error {
	// 1. User admin / admin
	var count int
	_ = db.conn.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if count == 0 {
		_, err := db.conn.Exec("INSERT INTO users (username, password) VALUES (?, ?)", "admin", "admin")
		if err != nil {
			return err
		}
	}

	// 2. Global settings
	count = 0
	_ = db.conn.QueryRow("SELECT COUNT(*) FROM global_settings").Scan(&count)
	if count == 0 {
		_, err := db.conn.Exec(`INSERT INTO global_settings 
			(domain_name, dns_servers, default_lease_time, max_lease_time, authoritative, custom_options) 
			VALUES ('lab.local', '192.168.153.2, 8.8.8.8', 43200, 86400, 1, '')`)
		if err != nil {
			return err
		}
	}

	// 3. Nodes (dhcp1 primary, dhcp2 secondary)
	count = 0
	_ = db.conn.QueryRow("SELECT COUNT(*) FROM nodes").Scan(&count)
	if count == 0 {
		_, _ = db.conn.Exec(`INSERT INTO nodes (name, role, management_ip, dhcp_ip, agent_port, api_token, status)
			VALUES ('dhcp1', 'primary', '192.168.153.159', '192.168.153.159', 9443, 'dhcp-secret-token-2026', 'online')`)
		_, _ = db.conn.Exec(`INSERT INTO nodes (name, role, management_ip, dhcp_ip, agent_port, api_token, status)
			VALUES ('dhcp2', 'secondary', '192.168.153.160', '192.168.153.160', 9443, 'dhcp-secret-token-2026', 'online')`)
	}

	// 4. Default Subnet & Pool (192.168.153.0/24)
	count = 0
	_ = db.conn.QueryRow("SELECT COUNT(*) FROM subnets").Scan(&count)
	if count == 0 {
		res, err := db.conn.Exec(`INSERT INTO subnets 
			(network_address, netmask, cidr_prefix, gateway, dns_servers, domain_name, lease_time, enable_failover, description)
			VALUES ('192.168.153.0', '255.255.255.0', 24, '192.168.153.2', '192.168.153.2, 8.8.8.8', 'lab.local', 43200, 1, 'Default Lab Subnet')`)
		if err == nil {
			subnetID, _ := res.LastInsertId()
			_, _ = db.conn.Exec(`INSERT INTO pools (subnet_id, range_start, range_end, deny_unknown_clients, failover_peer_name)
				VALUES (?, '192.168.153.200', '192.168.153.240', 0, 'dhcp-failover')`, subnetID)
		}
	}

	return nil
}

// Global Settings CRUD
func (db *DB) GetGlobalSettings() (models.GlobalSettings, error) {
	var g models.GlobalSettings
	err := db.conn.QueryRow(`SELECT id, domain_name, dns_servers, default_lease_time, max_lease_time, authoritative, custom_options, updated_at 
		FROM global_settings LIMIT 1`).Scan(
		&g.ID, &g.DomainName, &g.DNSServers, &g.DefaultLeaseTime, &g.MaxLeaseTime, &g.Authoritative, &g.CustomOptions, &g.UpdatedAt,
	)
	return g, err
}

func (db *DB) UpdateGlobalSettings(g models.GlobalSettings) error {
	_, err := db.conn.Exec(`UPDATE global_settings SET 
		domain_name=?, dns_servers=?, default_lease_time=?, max_lease_time=?, authoritative=?, custom_options=?, updated_at=CURRENT_TIMESTAMP 
		WHERE id=?`,
		g.DomainName, g.DNSServers, g.DefaultLeaseTime, g.MaxLeaseTime, g.Authoritative, g.CustomOptions, g.ID,
	)
	return err
}

// Nodes
func (db *DB) GetNodes() ([]models.Node, error) {
	rows, err := db.conn.Query(`SELECT id, name, role, management_ip, dhcp_ip, agent_port, api_token, status, last_seen FROM nodes ORDER BY role ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes []models.Node
	for rows.Next() {
		var n models.Node
		if err := rows.Scan(&n.ID, &n.Name, &n.Role, &n.ManagementIP, &n.DHCPIP, &n.AgentPort, &n.APIToken, &n.Status, &n.LastSeen); err != nil {
			return nil, err
		}
		nodes = append(nodes, n)
	}
	return nodes, nil
}

// Subnets & Pools
func (db *DB) GetSubnets() ([]models.Subnet, error) {
	rows, err := db.conn.Query(`SELECT id, network_address, netmask, cidr_prefix, gateway, dns_servers, domain_name, lease_time, enable_failover, description, created_at FROM subnets ORDER BY network_address ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subnets []models.Subnet
	for rows.Next() {
		var s models.Subnet
		if err := rows.Scan(&s.ID, &s.NetworkAddress, &s.Netmask, &s.CIDRPrefix, &s.Gateway, &s.DNSServers, &s.DomainName, &s.LeaseTime, &s.EnableFailover, &s.Description, &s.CreatedAt); err != nil {
			return nil, err
		}

		// ดึง pools ของ subnet นี้
		pRows, pErr := db.conn.Query(`SELECT id, subnet_id, range_start, range_end, deny_unknown_clients, failover_peer_name FROM pools WHERE subnet_id=?`, s.ID)
		if pErr == nil {
			for pRows.Next() {
				var p models.Pool
				_ = pRows.Scan(&p.ID, &p.SubnetID, &p.RangeStart, &p.RangeEnd, &p.DenyUnknownClients, &p.FailoverPeerName)
				s.Pools = append(s.Pools, p)
			}
			pRows.Close()
		}

		subnets = append(subnets, s)
	}
	return subnets, nil
}

func (db *DB) SaveSubnet(s models.Subnet) (int, error) {
	if s.ID == 0 {
		res, err := db.conn.Exec(`INSERT INTO subnets (network_address, netmask, cidr_prefix, gateway, dns_servers, domain_name, lease_time, enable_failover, description)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			s.NetworkAddress, s.Netmask, s.CIDRPrefix, s.Gateway, s.DNSServers, s.DomainName, s.LeaseTime, s.EnableFailover, s.Description)
		if err != nil {
			return 0, err
		}
		id, _ := res.LastInsertId()
		return int(id), nil
	}
	_, err := db.conn.Exec(`UPDATE subnets SET network_address=?, netmask=?, cidr_prefix=?, gateway=?, dns_servers=?, domain_name=?, lease_time=?, enable_failover=?, description=? WHERE id=?`,
		s.NetworkAddress, s.Netmask, s.CIDRPrefix, s.Gateway, s.DNSServers, s.DomainName, s.LeaseTime, s.EnableFailover, s.Description, s.ID)
	return s.ID, err
}

func (db *DB) DeleteSubnet(id int) error {
	_, err := db.conn.Exec(`DELETE FROM subnets WHERE id=?`, id)
	return err
}

func (db *DB) SavePool(p models.Pool) error {
	if p.ID == 0 {
		_, err := db.conn.Exec(`INSERT INTO pools (subnet_id, range_start, range_end, deny_unknown_clients, failover_peer_name)
			VALUES (?, ?, ?, ?, ?)`, p.SubnetID, p.RangeStart, p.RangeEnd, p.DenyUnknownClients, p.FailoverPeerName)
		return err
	}
	_, err := db.conn.Exec(`UPDATE pools SET subnet_id=?, range_start=?, range_end=?, deny_unknown_clients=?, failover_peer_name=? WHERE id=?`,
		p.SubnetID, p.RangeStart, p.RangeEnd, p.DenyUnknownClients, p.FailoverPeerName, p.ID)
	return err
}

func (db *DB) DeletePool(id int) error {
	_, err := db.conn.Exec(`DELETE FROM pools WHERE id=?`, id)
	return err
}

// Static Leases
func (db *DB) GetStaticLeases() ([]models.StaticLease, error) {
	rows, err := db.conn.Query(`SELECT id, subnet_id, hostname, mac_address, ip_address, description, created_at FROM static_leases ORDER BY ip_address ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var leases []models.StaticLease
	for rows.Next() {
		var l models.StaticLease
		if err := rows.Scan(&l.ID, &l.SubnetID, &l.Hostname, &l.MACAddress, &l.IPAddress, &l.Description, &l.CreatedAt); err != nil {
			return nil, err
		}
		leases = append(leases, l)
	}
	return leases, nil
}

func (db *DB) SaveStaticLease(l models.StaticLease) error {
	if l.ID == 0 {
		_, err := db.conn.Exec(`INSERT INTO static_leases (subnet_id, hostname, mac_address, ip_address, description) VALUES (?, ?, ?, ?, ?)`,
			l.SubnetID, l.Hostname, l.MACAddress, l.IPAddress, l.Description)
		return err
	}
	_, err := db.conn.Exec(`UPDATE static_leases SET subnet_id=?, hostname=?, mac_address=?, ip_address=?, description=? WHERE id=?`,
		l.SubnetID, l.Hostname, l.MACAddress, l.IPAddress, l.Description, l.ID)
	return err
}

func (db *DB) DeleteStaticLease(id int) error {
	_, err := db.conn.Exec(`DELETE FROM static_leases WHERE id=?`, id)
	return err
}

// Deployments History
func (db *DB) RecordDeployment(d models.DeploymentHistory) error {
	_, err := db.conn.Exec(`INSERT INTO deployment_history (deployed_by, commit_message, generated_conf_primary, generated_conf_secondary, status, log_detail)
		VALUES (?, ?, ?, ?, ?, ?)`,
		d.DeployedBy, d.CommitMessage, d.GeneratedConfPrimary, d.GeneratedConfSecondary, d.Status, d.LogDetail)
	return err
}

func (db *DB) GetDeployments() ([]models.DeploymentHistory, error) {
	rows, err := db.conn.Query(`SELECT id, deployed_by, commit_message, generated_conf_primary, generated_conf_secondary, status, log_detail, created_at FROM deployment_history ORDER BY id DESC LIMIT 20`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []models.DeploymentHistory
	for rows.Next() {
		var d models.DeploymentHistory
		_ = rows.Scan(&d.ID, &d.DeployedBy, &d.CommitMessage, &d.GeneratedConfPrimary, &d.GeneratedConfSecondary, &d.Status, &d.LogDetail, &d.CreatedAt)
		history = append(history, d)
	}
	return history, nil
}

// Validate User Login
func (db *DB) ValidateUser(username, password string) bool {
	var count int
	_ = db.conn.QueryRow(`SELECT COUNT(*) FROM users WHERE username=? AND password=?`, username, password).Scan(&count)
	return count > 0
}
