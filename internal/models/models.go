package models

import "time"

// GlobalSettings เก็บค่าคอนฟิกส่วนกลาง
type GlobalSettings struct {
	ID               int    `json:"id"`
	DomainName       string `json:"domain_name"`
	DNSServers       string `json:"dns_servers"`
	DefaultLeaseTime int    `json:"default_lease_time"`
	MaxLeaseTime     int    `json:"max_lease_time"`
	Authoritative    bool   `json:"authoritative"`
	CustomOptions    string `json:"custom_options"`
	UpdatedAt        string `json:"updated_at"`
}

// Node เก็บข้อมูลโหนดในคลัสเตอร์
type Node struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Role         string    `json:"role"` // primary หรือ secondary
	ManagementIP string    `json:"management_ip"`
	DHCPIP       string    `json:"dhcp_ip"`
	AgentPort    int       `json:"agent_port"`
	APIToken     string    `json:"api_token"`
	Status       string    `json:"status"` // online, offline, error
	LastSeen     time.Time `json:"last_seen"`
}

// Subnet เก็บข้อมูล Subnet
type Subnet struct {
	ID             int       `json:"id"`
	NetworkAddress string    `json:"network_address"`
	Netmask        string    `json:"netmask"`
	CIDRPrefix     int       `json:"cidr_prefix"`
	Gateway        string    `json:"gateway"`
	DNSServers     string    `json:"dns_servers"`
	DomainName     string    `json:"domain_name"`
	NTPServers     string    `json:"ntp_servers"`
	TFTPServer     string    `json:"tftp_server"`
	BootFileName   string    `json:"bootfile_name"`
	LeaseDays      int       `json:"lease_days"`
	LeaseHours     int       `json:"lease_hours"`
	LeaseMinutes   int       `json:"lease_minutes"`
	LeaseTime      int       `json:"lease_time"`
	EnableFailover bool      `json:"enable_failover"`
	Description    string    `json:"description"`
	CustomOptions  string    `json:"custom_options"`
	Pools          []Pool    `json:"pools,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// Pool เก็บช่วง Dynamic IP
type Pool struct {
	ID                  int    `json:"id"`
	SubnetID            int    `json:"subnet_id"`
	RangeStart          string `json:"range_start"`
	RangeEnd            string `json:"range_end"`
	DenyUnknownClients  bool   `json:"deny_unknown_clients"`
	FailoverPeerName    string `json:"failover_peer_name"`
}

// StaticLease เก็บการจอง IP ให้เครื่องลูกข่าย (Fixed IP by MAC)
type StaticLease struct {
	ID          int       `json:"id"`
	SubnetID    int       `json:"subnet_id"`
	Hostname    string    `json:"hostname"`
	MACAddress  string    `json:"mac_address"`
	IPAddress   string    `json:"ip_address"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

// DeploymentHistory เก็บบันทึกประวัติการ Deploy และ Rollback
type DeploymentHistory struct {
	ID                    int       `json:"id"`
	DeployedBy            string    `json:"deployed_by"`
	CommitMessage         string    `json:"commit_message"`
	GeneratedConfPrimary   string    `json:"generated_conf_primary"`
	GeneratedConfSecondary string    `json:"generated_conf_secondary"`
	Status                string    `json:"status"` // success, failed, rolled_back
	LogDetail             string    `json:"log_detail"`
	CreatedAt             time.Time `json:"created_at"`
}

// LeaseRecord เก็บข้อมูล lease ที่ถูก parse จาก dhcpd.leases
type LeaseRecord struct {
	IPAddress     string `json:"ip_address"`
	MACAddress    string `json:"mac_address"`
	Hostname      string `json:"hostname"`
	BindingState  string `json:"binding_state"` // active, free, backup, expired
	Starts        string `json:"starts"`
	Ends          string `json:"ends"`
	Vendor        string `json:"vendor,omitempty"`
	Cltt          string `json:"cltt,omitempty"`
}

// FailoverStatus แสดงสถานะการคุยกันของคู่ failover
type FailoverStatus struct {
	PeerName      string `json:"peer_name"`
	MyState       string `json:"my_state"`
	PartnerState  string `json:"partner_state"`
	LastStateChange string `json:"last_state_change"`
}

// ClusterSummary ภาพรวมของระบบบนหน้า Dashboard
type ClusterSummary struct {
	PrimaryNode     Node            `json:"primary_node"`
	SecondaryNode   Node            `json:"secondary_node"`
	FailoverStatus  FailoverStatus  `json:"failover_status"`
	TotalSubnets    int             `json:"total_subnets"`
	TotalPools      int             `json:"total_pools"`
	TotalStatic     int             `json:"total_static"`
	ActiveLeases    int             `json:"active_leases"`
	PrimaryService  string          `json:"primary_service_status"`
	SecondaryService string         `json:"secondary_service_status"`
}
