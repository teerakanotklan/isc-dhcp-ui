import { ApiResponse } from '../types';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // send session_token cookie
  });

  if (res.status === 401) {
    // If not on login page, redirect to login
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError('Unauthorized', 401);
  }

  const data: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    message: 'Invalid response from server',
    data: null as any,
  }));

  if (!res.ok || !data.success) {
    throw new ApiError(data.message || `Request failed with status ${res.status}`, res.status);
  }

  return data.data;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ token?: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  logout: () =>
    request('/api/logout', {
      method: 'POST',
    }),

  // Summary & Cluster
  getSummary: () => request<import('../types').DashboardSummary>('/api/summary'),
  getCluster: () => request<import('../types').ClusterInfo>('/api/cluster'),
  saveCluster: (payload: { secondary_ip: string; agent_port: number; api_token: string }) =>
    request('/api/cluster', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteCluster: () =>
    request('/api/cluster', {
      method: 'DELETE',
    }),
  testCluster: (payload: { secondary_ip: string; agent_port: number; api_token: string }) =>
    request<{ latency_ms?: number }>('/api/cluster/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Subnets & Pools
  getSubnets: () => request<import('../types').Subnet[]>('/api/subnets'),
  saveSubnet: (subnet: Partial<import('../types').Subnet>) =>
    request<import('../types').Subnet>('/api/subnets', {
      method: 'POST',
      body: JSON.stringify(subnet),
    }),
  deleteSubnet: (id: number) =>
    request(`/api/subnets?id=${id}`, {
      method: 'DELETE',
    }),
  savePool: (pool: Partial<import('../types').Pool>) =>
    request('/api/pools', {
      method: 'POST',
      body: JSON.stringify(pool),
    }),
  deletePool: (id: number) =>
    request(`/api/pools?id=${id}`, {
      method: 'DELETE',
    }),

  // Static Leases
  getStaticLeases: () => request<import('../types').StaticLease[]>('/api/static'),
  saveStaticLease: (lease: Partial<import('../types').StaticLease>) =>
    request('/api/static', {
      method: 'POST',
      body: JSON.stringify(lease),
    }),
  deleteStaticLease: (id: number) =>
    request(`/api/static?id=${id}`, {
      method: 'DELETE',
    }),

  // Active Leases
  getActiveLeases: () => request<import('../types').ActiveLease[]>('/api/leases'),

  // Deployments & Config Preview
  getConfigPreview: () => request<import('../types').ConfigPreview>('/api/config/preview'),
  deployConfig: (commitMessage: string) =>
    request('/api/config/deploy', {
      method: 'POST',
      body: JSON.stringify({ commit_message: commitMessage }),
    }),
  getDeployments: () => request<import('../types').DeploymentHistory[]>('/api/deployments'),

  // Settings
  getSettings: () => request<import('../types').GlobalSettings>('/api/settings'),
  saveSettings: (settings: import('../types').GlobalSettings) =>
    request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),
};
