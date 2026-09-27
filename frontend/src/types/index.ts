export interface Subnet {
  id: number;
  network: string;
  netmask: string;
  routers: string;
  domain_name_servers: string;
  domain_name: string;
  default_lease_time: number;
  max_lease_time: number;
  lease_hours: number;
  lease_minutes: number;
  custom_options?: string;
  pools?: Pool[];
}

export interface Pool {
  id: number;
  subnet_id: number;
  range_start: string;
  range_end: string;
  deny_unknown_clients: boolean;
  failover_peer_name: string;
}

export interface StaticLease {
  id: number;
  subnet_id: number;
  hostname: string;
  mac_address: string;
  ip_address: string;
  description: string;
  created_at?: string;
}

export interface ActiveLease {
  ip: string;
  mac: string;
  client_hostname: string;
  starts: string;
  ends: string;
  binding_state: string;
}

export interface Node {
  id: number;
  name: string;
  role: 'primary' | 'secondary';
  management_ip: string;
  dhcp_ip: string;
  agent_port: number;
  api_token: string;
  status: string;
  last_seen: string;
}

export interface FailoverStatus {
  my_state: string;
  partner_state: string;
}

export interface DashboardSummary {
  primary_node: Node;
  secondary_node: Node;
  primary_service_status: string;
  secondary_service_status: string;
  failover_status: FailoverStatus;
  total_subnets: number;
  total_pools: number;
  total_static: number;
  active_leases: number;
}

export interface ClusterInfo {
  is_clustered: boolean;
  primary_node: Node;
  secondary_node?: Node;
  secondary_service_status?: string;
  failover_status: FailoverStatus;
}

export interface GlobalSettings {
  id: number;
  domain_name: string;
  dns_servers: string;
  default_lease_time: number;
  max_lease_time: number;
  authoritative: boolean;
  custom_options: string;
}

export interface ConfigPreview {
  primary_conf: string;
  secondary_conf: string;
  primary_diff: string;
  secondary_diff: string;
  is_clustered: boolean;
}

export interface DeploymentHistory {
  id: number;
  deployed_by: string;
  commit_message: string;
  generated_conf_primary: string;
  generated_conf_secondary: string;
  status: string;
  log_detail: string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}
