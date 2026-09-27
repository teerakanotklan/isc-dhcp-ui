// ==============================================================
// ISC DHCP Web Management - Application Logic (English / Sidebar)
// ==============================================================

let currentTab = 'dashboard';
let cachedSubnets = [];
let cachedLeases = [];

// Title mapping for top navigation bar
const tabTitles = {
    'dashboard': 'Dashboard Overview',
    'subnets': 'DHCP Scopes & Subnet Management',
    'static': 'Static Address Reservations',
    'leases': 'Active Client Leases Explorer',
    'clustering': 'High Availability Cluster Management',
    'deploy': 'Cluster Configuration Deployment & Audit',
    'settings': 'Global Server Options'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSidebarState();
    loadDashboardSummary();
    loadClusterInfo();
    loadSubnets();
    loadStaticLeases();
    loadLeases();
    loadGlobalSettings();
    loadDeployHistory();

    // Auto-refresh real-time monitoring every 10 seconds
    setInterval(() => {
        if (currentTab === 'dashboard') loadDashboardSummary();
        if (currentTab === 'clustering') loadClusterInfo();
        if (currentTab === 'leases') loadLeases();
    }, 10000);
});

// --------------------------------------------------------------
// Theme Management (Instant Light / Dark Mode with LocalStorage)
// --------------------------------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem('dhcp_theme') || 'dark';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('dhcp_theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('dhcp_theme', 'dark');
    }
}

// --------------------------------------------------------------
// Sidebar Collapse & Mobile Drawer
// --------------------------------------------------------------
function initSidebarState() {
    const isCollapsed = localStorage.getItem('dhcp_sidebar_collapsed') === 'true';
    const sidebar = document.getElementById('app-sidebar');
    const viewport = document.getElementById('main-viewport');
    const iconLeft = document.getElementById('icon-collapse-left');
    const iconRight = document.getElementById('icon-collapse-right');

    if (isCollapsed && sidebar && viewport) {
        sidebar.classList.add('collapsed');
        viewport.classList.add('sidebar-collapsed');
        if (iconLeft && iconRight) {
            iconLeft.classList.add('hidden');
            iconRight.classList.remove('hidden');
        }
    }
}

function toggleSidebarCollapse() {
    const sidebar = document.getElementById('app-sidebar');
    const viewport = document.getElementById('main-viewport');
    const iconLeft = document.getElementById('icon-collapse-left');
    const iconRight = document.getElementById('icon-collapse-right');

    if (!sidebar || !viewport) return;

    const isCollapsed = sidebar.classList.toggle('collapsed');
    viewport.classList.toggle('sidebar-collapsed', isCollapsed);

    if (iconLeft && iconRight) {
        if (isCollapsed) {
            iconLeft.classList.add('hidden');
            iconRight.classList.remove('hidden');
        } else {
            iconLeft.classList.remove('hidden');
            iconRight.classList.add('hidden');
        }
    }
    localStorage.setItem('dhcp_sidebar_collapsed', isCollapsed ? 'true' : 'false');
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('mobile-backdrop');
    if (!sidebar || !backdrop) return;

    const isClosed = sidebar.classList.contains('-translate-x-full');
    if (isClosed) {
        sidebar.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
    }
}

// --------------------------------------------------------------
// Sidebar Tab Navigation
// --------------------------------------------------------------
function switchTab(tab) {
    currentTab = tab;

    // Close mobile drawer if open
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('mobile-backdrop');
    if (sidebar && backdrop && !backdrop.classList.contains('hidden')) {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
    }

    // Update section visibility
    document.querySelectorAll('section[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    const targetSection = document.getElementById(`tab-${tab}`);
    if (targetSection) targetSection.classList.remove('hidden');

    // Update TopNav Title
    const titleEl = document.getElementById('top-title');
    if (titleEl) titleEl.innerText = tabTitles[tab] || 'DHCP Management Console';

    // Update Sidebar Navigation Button Styles
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'bg-indigo-50', 'dark:bg-indigo-950/40');
        btn.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
    });

    const activeBtn = document.getElementById(`nav-btn-${tab}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        activeBtn.classList.add('text-indigo-600', 'dark:text-indigo-400', 'bg-indigo-50', 'dark:bg-indigo-950/40');
    }

    if (tab === 'clustering') {
        loadClusterInfo();
    }
    if (tab === 'deploy') {
        previewConfigs();
        loadDeployHistory();
    }
}

// --------------------------------------------------------------
// 1. Dashboard Summary
// --------------------------------------------------------------
async function loadDashboardSummary() {
    try {
        const res = await fetch('/api/summary');
        if (res.status === 401) {
            window.location.href = '/login.html';
            return;
        }
        const data = await res.json();
        if (!data.success) return;

        const s = data.data;

        // Primary Node (dhcp1)
        document.getElementById('primary-ip').innerText = s.primary_node.dhcp_ip || '192.168.153.159';
        const pActive = s.primary_service_status === 'active';
        const pBadge = document.getElementById('primary-status-badge');
        pBadge.innerText = pActive ? 'Active' : 'Inactive';
        pBadge.className = pActive
            ? 'px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            : 'px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
        document.getElementById('primary-service-text').innerText = s.primary_service_status || 'unknown';

        // Secondary Node (dhcp2 or Standalone)
        const sIP = s.secondary_node.dhcp_ip || '';
        const sBadge = document.getElementById('secondary-status-badge');
        const isClustered = s.secondary_node.status !== 'not_configured' && sIP !== '';

        if (!isClustered) {
            document.getElementById('secondary-ip').innerText = 'Not Configured (Standalone Mode)';
            sBadge.innerText = 'Standalone';
            sBadge.className = 'px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20';
            document.getElementById('secondary-service-text').innerText = 'N/A';
        } else {
            document.getElementById('secondary-ip').innerText = sIP;
            const sActive = s.secondary_service_status === 'active';
            sBadge.innerText = sActive ? 'Active' : (s.secondary_node.status === 'offline' ? 'Offline' : 'Inactive');
            sBadge.className = sActive
                ? 'px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
            document.getElementById('secondary-service-text').innerText = s.secondary_service_status || 'unknown';
        }

        // Failover Peer State
        const fPill = document.getElementById('failover-state-pill');
        const sideBadge = document.getElementById('sidebar-cluster-badge');
        const pulseDot = document.getElementById('sidebar-pulse-dot');

        if (!isClustered) {
            document.getElementById('failover-my-state').innerText = 'standalone';
            document.getElementById('failover-partner-state').innerText = 'none';
            fPill.innerText = 'STANDALONE (SINGLE NODE)';
            fPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
            sideBadge.innerText = 'STANDALONE';
            sideBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
            pulseDot.className = 'w-2.5 h-2.5 rounded-full bg-blue-500';
        } else {
            const fState = s.failover_status.my_state || 'unknown';
            const fPartner = s.failover_status.partner_state || 'unknown';
            document.getElementById('failover-my-state').innerText = fState;
            document.getElementById('failover-partner-state').innerText = fPartner;

            if (fState === 'normal' && fPartner === 'normal') {
                fPill.innerText = 'NORMAL (HEALTHY)';
                fPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
                sideBadge.innerText = 'NORMAL';
                sideBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
                pulseDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
            } else if (fState === 'partner-down' || fPartner === 'partner-down') {
                fPill.innerText = 'PARTNER DOWN (FAILOVER ACTIVE)';
                fPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
                sideBadge.innerText = 'PARTNER DOWN';
                sideBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
                pulseDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse';
            } else {
                fPill.innerText = (fState + ' / ' + fPartner).toUpperCase();
                fPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';
                sideBadge.innerText = fState.toUpperCase();
                sideBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';
            }
        }

        // Statistical Counters
        document.getElementById('stat-subnets').innerText = s.total_subnets;
        document.getElementById('stat-pools').innerText = s.total_pools;
        document.getElementById('stat-static').innerText = s.total_static;
        document.getElementById('stat-leases').innerText = s.active_leases;
    } catch (err) {
        console.error('Error fetching dashboard summary:', err);
    }
}

// --------------------------------------------------------------
// 2. Subnets & Dynamic Pools (Windows Server Scope Style)
// --------------------------------------------------------------
async function loadSubnets() {
    try {
        const res = await fetch('/api/subnets');
        const data = await res.json();
        if (!data.success) return;
        cachedSubnets = data.data || [];

        const container = document.getElementById('subnets-list');
        if (cachedSubnets.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs">No DHCP scopes configured yet. Click "+ New DHCP Scope" to create one.</div>';
            return;
        }

        container.innerHTML = cachedSubnets.map(s => {
            const days = s.lease_days || 0;
            const hours = s.lease_hours !== undefined ? s.lease_hours : 12;
            const mins = s.lease_minutes || 0;
            const leaseDisplay = `${days}d ${hours}h ${mins}m`;

            return `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div class="flex items-start justify-between">
                    <div>
                        <div class="flex items-center space-x-2">
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white font-mono">${s.network_address}/${s.cidr_prefix}</h3>
                            <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${s.enable_failover ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}">
                                ${s.enable_failover ? 'Failover Enabled' : 'Standalone'}
                            </span>
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">${s.description || 'No description'}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="editSubnet(${s.id})" class="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
                            Scope Properties
                        </button>
                        <button onclick="openPoolModal(${s.id})" class="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 transition-colors">
                            + Add Dynamic Range
                        </button>
                        <button onclick="deleteSubnet(${s.id})" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors" title="Delete Scope">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>

                <!-- Scope Parameters Summary (Windows DHCP Scope Options) -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    <div><span class="text-slate-400">Router / GW (003):</span> <span class="font-mono text-slate-800 dark:text-slate-200 font-semibold ml-1">${s.gateway || 'None'}</span></div>
                    <div><span class="text-slate-400">Subnet Mask:</span> <span class="font-mono text-slate-800 dark:text-slate-200 font-semibold ml-1">${s.netmask}</span></div>
                    <div><span class="text-slate-400">DNS Servers (006):</span> <span class="font-mono text-slate-800 dark:text-slate-200 font-semibold ml-1">${s.dns_servers || 'Global'}</span></div>
                    <div><span class="text-slate-400">Lease Duration:</span> <span class="font-mono text-indigo-600 dark:text-indigo-400 font-semibold ml-1">${leaseDisplay}</span></div>
                </div>

                <!-- Optional Advanced Scope Directives -->
                ${(s.ntp_servers || s.tftp_server || s.bootfile_name || s.domain_name) ? `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50 text-slate-500">
                    ${s.domain_name ? `<div>Domain (015): <span class="text-slate-700 dark:text-slate-300 font-medium">${s.domain_name}</span></div>` : ''}
                    ${s.ntp_servers ? `<div>NTP (042): <span class="font-mono text-slate-700 dark:text-slate-300 font-medium">${s.ntp_servers}</span></div>` : ''}
                    ${s.tftp_server ? `<div>Next-Server (066): <span class="font-mono text-slate-700 dark:text-slate-300 font-medium">${s.tftp_server}</span></div>` : ''}
                    ${s.bootfile_name ? `<div>Bootfile (067): <span class="font-mono text-slate-700 dark:text-slate-300 font-medium">${s.bootfile_name}</span></div>` : ''}
                </div>
                ` : ''}

                <!-- Dynamic IP Pools list -->
                <div class="space-y-2">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Address Pools:</span>
                    ${(s.pools && s.pools.length > 0) ? s.pools.map(p => `
                        <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800/50 text-xs">
                            <div class="flex items-center space-x-2">
                                <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                                <span class="font-mono text-slate-800 dark:text-white font-semibold">${p.range_start} - ${p.range_end}</span>
                                <span class="text-slate-400 text-[10px]">(${p.failover_peer_name})</span>
                            </div>
                            <button onclick="deletePool(${p.id})" class="text-slate-400 hover:text-rose-500 p-1 transition-colors" title="Delete Range">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                    `).join('') : '<div class="text-xs text-slate-400 italic">No dynamic IP ranges defined for this scope yet.</div>'}
                </div>
            </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading subnets:', err);
    }
}

function updateLeaseDurationPreview() {
    const days = parseInt(document.getElementById('subnet-lease-days').value) || 0;
    const hours = parseInt(document.getElementById('subnet-lease-hours').value) || 0;
    const mins = parseInt(document.getElementById('subnet-lease-mins').value) || 0;
    const totalSec = (days * 86400) + (hours * 3600) + (mins * 60);
    const previewEl = document.getElementById('lease-duration-preview');
    if (previewEl) {
        previewEl.innerText = `Total: ${days}d ${hours}h ${mins}m (${totalSec.toLocaleString()} seconds)`;
    }
}

function openSubnetModal() {
    document.getElementById('form-subnet').reset();
    document.getElementById('subnet-id').value = '0';
    document.getElementById('modal-subnet-title').innerText = 'New DHCP Scope Wizard';
    document.getElementById('subnet-lease-days').value = '8';
    document.getElementById('subnet-lease-hours').value = '0';
    document.getElementById('subnet-lease-mins').value = '0';
    document.getElementById('subnet-failover').checked = true;
    updateLeaseDurationPreview();
    document.getElementById('modal-subnet').classList.remove('hidden');
}

function editSubnet(id) {
    const s = cachedSubnets.find(item => item.id === id);
    if (!s) return;

    document.getElementById('subnet-id').value = s.id;
    document.getElementById('modal-subnet-title').innerText = 'Scope Properties - ' + s.network_address;
    document.getElementById('subnet-desc').value = s.description || '';
    document.getElementById('subnet-net').value = s.network_address;
    document.getElementById('subnet-mask').value = s.netmask;
    document.getElementById('subnet-cidr').value = s.cidr_prefix || 24;
    document.getElementById('subnet-gw').value = s.gateway || '';
    document.getElementById('subnet-dns').value = s.dns_servers || '';
    document.getElementById('subnet-domain').value = s.domain_name || '';
    document.getElementById('subnet-ntp').value = s.ntp_servers || '';
    document.getElementById('subnet-tftp').value = s.tftp_server || '';
    document.getElementById('subnet-bootfile').value = s.bootfile_name || '';
    document.getElementById('subnet-custom-opt').value = s.custom_options || '';
    document.getElementById('subnet-lease-days').value = s.lease_days || 0;
    document.getElementById('subnet-lease-hours').value = s.lease_hours !== undefined ? s.lease_hours : 12;
    document.getElementById('subnet-lease-mins').value = s.lease_minutes || 0;
    document.getElementById('subnet-failover').checked = s.enable_failover !== false;

    updateLeaseDurationPreview();
    document.getElementById('modal-subnet').classList.remove('hidden');
}

function closeSubnetModal() {
    document.getElementById('modal-subnet').classList.add('hidden');
}

document.getElementById('form-subnet').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('subnet-id').value) || 0;
    const days = parseInt(document.getElementById('subnet-lease-days').value) || 0;
    const hours = parseInt(document.getElementById('subnet-lease-hours').value) || 0;
    const mins = parseInt(document.getElementById('subnet-lease-mins').value) || 0;
    const totalSeconds = (days * 86400) + (hours * 3600) + (mins * 60);

    const payload = {
        id: id,
        network_address: document.getElementById('subnet-net').value.trim(),
        netmask: document.getElementById('subnet-mask').value.trim(),
        cidr_prefix: parseInt(document.getElementById('subnet-cidr').value) || 24,
        gateway: document.getElementById('subnet-gw').value.trim(),
        dns_servers: document.getElementById('subnet-dns').value.trim(),
        domain_name: document.getElementById('subnet-domain').value.trim(),
        ntp_servers: document.getElementById('subnet-ntp').value.trim(),
        tftp_server: document.getElementById('subnet-tftp').value.trim(),
        bootfile_name: document.getElementById('subnet-bootfile').value.trim(),
        lease_days: days,
        lease_hours: hours,
        lease_minutes: mins,
        lease_time: totalSeconds > 0 ? totalSeconds : 43200,
        enable_failover: document.getElementById('subnet-failover').checked,
        description: document.getElementById('subnet-desc').value.trim(),
        custom_options: document.getElementById('subnet-custom-opt').value.trim()
    };

    const res = await fetch('/api/subnets', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
        closeSubnetModal();
        loadSubnets();
        loadDashboardSummary();
    } else {
        alert('Failed to save scope: ' + data.message);
    }
});

async function deleteSubnet(id) {
    if (!confirm('Are you sure you want to delete this scope and all its dynamic ranges?')) return;
    await fetch(`/api/subnets?id=${id}`, { method: 'DELETE' });
    loadSubnets();
    loadDashboardSummary();
}

function openPoolModal(subnetId) {
    document.getElementById('form-pool').reset();
    document.getElementById('pool-subnet-id').value = subnetId;
    document.getElementById('modal-pool').classList.remove('hidden');
}

function closePoolModal() {
    document.getElementById('modal-pool').classList.add('hidden');
}

document.getElementById('form-pool').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        subnet_id: parseInt(document.getElementById('pool-subnet-id').value),
        range_start: document.getElementById('pool-start').value.trim(),
        range_end: document.getElementById('pool-end').value.trim(),
        failover_peer_name: 'dhcp-failover'
    };
    await fetch('/api/pools', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    closePoolModal();
    loadSubnets();
    loadDashboardSummary();
});

async function deletePool(id) {
    if (!confirm('Are you sure you want to delete this address pool range?')) return;
    await fetch(`/api/pools?id=${id}`, { method: 'DELETE' });
    loadSubnets();
    loadDashboardSummary();
}

// --------------------------------------------------------------
// 3. Static IP Reservations
// --------------------------------------------------------------
async function loadStaticLeases() {
    try {
        const res = await fetch('/api/static');
        const data = await res.json();
        if (!data.success) return;

        const list = data.data || [];
        const tbody = document.getElementById('static-table-body');
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-slate-400">No static address reservations configured.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(item => `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td class="py-3 px-4 font-semibold text-slate-800 dark:text-white">${item.hostname}</td>
                <td class="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-medium">${item.mac_address}</td>
                <td class="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">${item.ip_address}</td>
                <td class="py-3 px-4 text-slate-500 dark:text-slate-400">${item.description || '-'}</td>
                <td class="py-3 px-4 text-right">
                    <button onclick="deleteStatic(${item.id})" class="text-rose-500 hover:text-rose-600 p-1 font-semibold transition-colors">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading static reservations:', err);
    }
}

function openStaticModal(defaultMac = '', defaultIp = '', defaultHost = '') {
    document.getElementById('form-static').reset();
    document.getElementById('static-id').value = '0';
    if (defaultMac) document.getElementById('static-mac').value = defaultMac;
    if (defaultIp) document.getElementById('static-ip').value = defaultIp;
    if (defaultHost) document.getElementById('static-hostname').value = defaultHost;
    document.getElementById('modal-static').classList.remove('hidden');
}

function closeStaticModal() {
    document.getElementById('modal-static').classList.add('hidden');
}

document.getElementById('form-static').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        subnet_id: cachedSubnets.length > 0 ? cachedSubnets[0].id : 1,
        hostname: document.getElementById('static-hostname').value.trim(),
        mac_address: document.getElementById('static-mac').value.trim(),
        ip_address: document.getElementById('static-ip').value.trim(),
        description: document.getElementById('static-desc').value.trim()
    };
    await fetch('/api/static', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    closeStaticModal();
    loadStaticLeases();
    loadDashboardSummary();
});

async function deleteStatic(id) {
    if (!confirm('Are you sure you want to delete this static reservation?')) return;
    await fetch(`/api/static?id=${id}`, { method: 'DELETE' });
    loadStaticLeases();
    loadDashboardSummary();
}

// --------------------------------------------------------------
// 4. Active Leases Explorer
// --------------------------------------------------------------
async function loadLeases() {
    try {
        const res = await fetch('/api/leases');
        const data = await res.json();
        if (!data.success) return;
        cachedLeases = data.data || [];
        renderLeases(cachedLeases);
    } catch (err) {
        console.error('Error loading leases:', err);
    }
}

function renderLeases(list) {
    const tbody = document.getElementById('leases-table-body');
    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400">No active client leases found in dhcpd.leases.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(l => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <td class="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">${l.ip_address}</td>
            <td class="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-medium">${l.mac_address || '-'}</td>
            <td class="py-3 px-4 text-slate-800 dark:text-white font-medium">${l.hostname || '-'}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${l.binding_state === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}">
                    ${l.binding_state}
                </span>
            </td>
            <td class="py-3 px-4 font-mono text-[11px] text-slate-500">${l.starts || '-'}</td>
            <td class="py-3 px-4 font-mono text-[11px] text-slate-500">${l.ends || '-'}</td>
            <td class="py-3 px-4 text-right">
                <button onclick="openStaticModal('${l.mac_address}', '${l.ip_address}', '${l.hostname || ''}')" class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-300 hover:text-white text-[11px] font-semibold transition-colors">
                    Make Static
                </button>
            </td>
        </tr>
    `).join('');
}

function filterLeases() {
    const q = document.getElementById('lease-search').value.toLowerCase();
    const filtered = cachedLeases.filter(l => 
        (l.ip_address && l.ip_address.toLowerCase().includes(q)) ||
        (l.mac_address && l.mac_address.toLowerCase().includes(q)) ||
        (l.hostname && l.hostname.toLowerCase().includes(q))
    );
    renderLeases(filtered);
}

function refreshLeases() {
    loadLeases();
}

// --------------------------------------------------------------
// 5. Cluster Deploy Center & History
// --------------------------------------------------------------
async function previewConfigs() {
    try {
        const res = await fetch('/api/config/preview');
        const data = await res.json();
        if (!data.success) return;
        document.getElementById('conf-preview-primary').value = data.data.primary_config;
        document.getElementById('conf-preview-secondary').value = data.data.secondary_config;
    } catch (err) {
        console.error('Error previewing configs:', err);
    }
}

async function executeDeploy() {
    const btn = document.getElementById('btn-deploy-cluster');
    const resultBox = document.getElementById('deploy-result-box');
    btn.disabled = true;
    btn.innerText = 'Validating & Deploying...';
    resultBox.classList.add('hidden');

    try {
        const res = await fetch('/api/config/deploy', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ commit_message: 'Production Sync from Web Console' })
        });
        const data = await res.json();

        resultBox.classList.remove('hidden');
        if (data.success) {
            resultBox.className = 'mt-6 p-4 rounded-xl text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
            resultBox.innerText = 'SUCCESS:\n' + data.message + (data.output ? '\n' + data.output : '');
        } else {
            resultBox.className = 'mt-6 p-4 rounded-xl text-xs font-mono bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400';
            resultBox.innerText = 'DEPLOYMENT FAILED:\n' + data.message + (data.output ? '\n' + data.output : '');
        }
        loadDeployHistory();
        loadDashboardSummary();
    } catch (err) {
        resultBox.classList.remove('hidden');
        resultBox.className = 'mt-6 p-4 rounded-xl text-xs font-mono bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400';
        resultBox.innerText = 'Network communication error: ' + err.message;
    } finally {
        btn.disabled = false;
        btn.innerText = '🚀 Validate & Deploy to Cluster';
    }
}

async function loadDeployHistory() {
    try {
        const res = await fetch('/api/deployments');
        const data = await res.json();
        if (!data.success) return;
        const list = data.data || [];
        const tbody = document.getElementById('deploy-history-body');
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-slate-400">No deployments recorded yet.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(h => `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td class="py-3 px-4 font-mono text-slate-500">${h.created_at}</td>
                <td class="py-3 px-4 font-semibold text-slate-800 dark:text-white">${h.deployed_by}</td>
                <td class="py-3 px-4 text-slate-600 dark:text-slate-300">${h.commit_message}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${h.status === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}">
                        ${h.status.toUpperCase()}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading history:', err);
    }
}

// --------------------------------------------------------------
// 6. Global Server Options
// --------------------------------------------------------------
async function loadGlobalSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (!data.success) return;
        const g = data.data;
        document.getElementById('setting-domain').value = g.domain_name || '';
        document.getElementById('setting-dns').value = g.dns_servers || '';
        document.getElementById('setting-default-lease').value = g.default_lease_time || 43200;
        document.getElementById('setting-max-lease').value = g.max_lease_time || 86400;
        document.getElementById('setting-custom').value = g.custom_options || '';
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

async function saveGlobalSettings() {
    const payload = {
        domain_name: document.getElementById('setting-domain').value.trim(),
        dns_servers: document.getElementById('setting-dns').value.trim(),
        default_lease_time: parseInt(document.getElementById('setting-default-lease').value) || 43200,
        max_lease_time: parseInt(document.getElementById('setting-max-lease').value) || 86400,
        authoritative: true,
        custom_options: document.getElementById('setting-custom').value.trim()
    };
    const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
        alert('Server Options saved successfully! Go to Deploy Center to apply changes.');
    } else {
        alert('Failed to save settings: ' + data.message);
    }
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
}

// --------------------------------------------------------------
// 7. High Availability Clustering Management
// --------------------------------------------------------------
let cachedClusterInfo = null;

async function loadClusterInfo() {
    try {
        const res = await fetch('/api/cluster');
        const data = await res.json();
        if (!data.success) return;

        cachedClusterInfo = data.data;
        renderClusterView(cachedClusterInfo);
    } catch (err) {
        console.error('Error fetching cluster info:', err);
    }
}

function renderClusterView(info) {
    const standaloneView = document.getElementById('view-cluster-standalone');
    const activeView = document.getElementById('view-cluster-active');
    const setupBtn = document.getElementById('btn-cluster-setup');
    const actionGroup = document.getElementById('cluster-action-group');
    const subtitle = document.getElementById('sidebar-subtitle');

    if (!info.is_clustered) {
        if (standaloneView) standaloneView.classList.remove('hidden');
        if (activeView) activeView.classList.add('hidden');
        if (setupBtn) setupBtn.classList.remove('hidden');
        if (actionGroup) actionGroup.classList.add('hidden');
        if (subtitle) subtitle.innerText = 'Standalone Mode';

        const pName = info.primary_node.name || 'dhcp1';
        const stNameEl = document.getElementById('standalone-node-name');
        if (stNameEl) stNameEl.innerText = pName;
    } else {
        if (standaloneView) standaloneView.classList.add('hidden');
        if (activeView) activeView.classList.remove('hidden');
        if (setupBtn) setupBtn.classList.add('hidden');
        if (actionGroup) actionGroup.classList.remove('hidden');
        if (subtitle) subtitle.innerText = 'Failover HA Cluster';

        // Fill Primary Node
        document.getElementById('topo-primary-name').innerText = `${info.primary_node.name || 'dhcp1'} (Primary)`;
        document.getElementById('topo-primary-mgmt').innerText = info.primary_node.management_ip || '192.168.153.159';
        document.getElementById('topo-primary-dhcp').innerText = info.primary_node.dhcp_ip || '192.168.153.159';

        // Fill Secondary Node
        document.getElementById('topo-secondary-name').innerText = `${info.secondary_node.name || 'dhcp2'} (Secondary)`;
        document.getElementById('topo-secondary-mgmt').innerText = info.secondary_node.management_ip || '192.168.153.160';
        document.getElementById('topo-secondary-agent').innerText = `${info.secondary_node.agent_port || 9443}/HTTP`;

        const sBadge = document.getElementById('topo-secondary-badge');
        const sOnline = info.secondary_node.status === 'online' || info.secondary_node.status === 'active';
        sBadge.innerText = sOnline ? 'Online' : (info.secondary_node.status || 'Offline');
        sBadge.className = sOnline
            ? 'px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            : 'px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';

        // Fill Failover State
        const fState = info.failover_status.my_state || 'normal';
        document.getElementById('topo-failover-state').innerHTML = `State: <span class="text-emerald-600 dark:text-emerald-400 font-bold uppercase">${fState}</span>`;
    }
}

function openClusterModal(isEdit) {
    const modal = document.getElementById('modal-cluster');
    const title = document.getElementById('modal-cluster-title');
    const testBox = document.getElementById('cluster-test-box');
    testBox.className = 'hidden';
    testBox.innerText = '';

    if (isEdit && cachedClusterInfo && cachedClusterInfo.is_clustered) {
        title.innerText = 'Edit Failover Cluster Configuration';
        document.getElementById('cluster-p-name').value = cachedClusterInfo.primary_node.name || 'dhcp1';
        document.getElementById('cluster-p-ip').value = cachedClusterInfo.primary_node.dhcp_ip || '192.168.153.159';
        document.getElementById('cluster-s-name').value = cachedClusterInfo.secondary_node.name || 'dhcp2';
        document.getElementById('cluster-s-ip').value = cachedClusterInfo.secondary_node.dhcp_ip || '192.168.153.160';
        document.getElementById('cluster-s-port').value = cachedClusterInfo.secondary_node.agent_port || 9443;
        document.getElementById('cluster-s-token').value = cachedClusterInfo.secondary_node.api_token || 'dhcp-secret-token-2026';
    } else {
        title.innerText = 'Setup DHCP Failover Cluster';
        document.getElementById('cluster-p-name').value = 'dhcp1';
        document.getElementById('cluster-p-ip').value = '192.168.153.159';
        document.getElementById('cluster-s-name').value = 'dhcp2';
        document.getElementById('cluster-s-ip').value = '192.168.153.160';
        document.getElementById('cluster-s-port').value = 9443;
        document.getElementById('cluster-s-token').value = 'dhcp-secret-token-2026';
    }

    modal.classList.remove('hidden');
}

function closeClusterModal() {
    document.getElementById('modal-cluster').classList.add('hidden');
}

async function testModalAgentConnection() {
    const testBox = document.getElementById('cluster-test-box');
    const mgmtIP = document.getElementById('cluster-s-ip').value.trim();
    const port = parseInt(document.getElementById('cluster-s-port').value) || 9443;
    const token = document.getElementById('cluster-s-token').value.trim();

    if (!mgmtIP || !token) {
        testBox.className = 'block p-3 rounded-xl text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
        testBox.innerText = 'Please enter partner IP and API token before testing.';
        return;
    }

    testBox.className = 'block p-3 rounded-xl text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';
    testBox.innerText = `Pinging agent at http://${mgmtIP}:${port}...`;

    try {
        const res = await fetch('/api/cluster/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                management_ip: mgmtIP,
                agent_port: port,
                api_token: token
            })
        });
        const data = await res.json();
        if (data.success) {
            testBox.className = 'block p-3 rounded-xl text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
            testBox.innerText = `✓ ${data.message}`;
        } else {
            testBox.className = 'block p-3 rounded-xl text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
            testBox.innerText = `✕ ${data.message}`;
        }
    } catch (err) {
        testBox.className = 'block p-3 rounded-xl text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
        testBox.innerText = `✕ Network error: ${err.message}`;
    }
}

async function testClusterConnectivity() {
    if (!cachedClusterInfo || !cachedClusterInfo.is_clustered) return;
    const sec = cachedClusterInfo.secondary_node;
    try {
        const res = await fetch('/api/cluster/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                management_ip: sec.management_ip,
                agent_port: sec.agent_port,
                api_token: sec.api_token
            })
        });
        const data = await res.json();
        alert(data.message);
        loadClusterInfo();
        loadDashboardSummary();
    } catch (err) {
        alert('Test failed: ' + err.message);
    }
}

document.getElementById('form-cluster')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        primary_node: {
            name: document.getElementById('cluster-p-name').value.trim(),
            role: 'primary',
            management_ip: document.getElementById('cluster-p-ip').value.trim(),
            dhcp_ip: document.getElementById('cluster-p-ip').value.trim(),
            agent_port: 9443,
            api_token: 'dhcp-secret-token-2026',
            status: 'online'
        },
        secondary_node: {
            name: document.getElementById('cluster-s-name').value.trim(),
            role: 'secondary',
            management_ip: document.getElementById('cluster-s-ip').value.trim(),
            dhcp_ip: document.getElementById('cluster-s-ip').value.trim(),
            agent_port: parseInt(document.getElementById('cluster-s-port').value) || 9443,
            api_token: document.getElementById('cluster-s-token').value.trim(),
            status: 'online'
        }
    };

    try {
        const res = await fetch('/api/cluster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            closeClusterModal();
            loadClusterInfo();
            loadDashboardSummary();
            alert('Cluster configured successfully! Go to Deploy to synchronize both nodes.');
        } else {
            alert('Failed to save cluster: ' + data.message);
        }
    } catch (err) {
        alert('Error saving cluster: ' + err.message);
    }
});

async function disbandCluster() {
    if (!confirm('Are you sure you want to disband this failover cluster?\n\nThis will remove the secondary node and revert the system to standalone mode. Subsequent deployments will apply only to this local server.')) {
        return;
    }

    try {
        const res = await fetch('/api/cluster', { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadClusterInfo();
            loadDashboardSummary();
            alert('Cluster disbanded. System reverted to standalone mode.');
        } else {
            alert('Failed to disband cluster: ' + data.message);
        }
    } catch (err) {
        alert('Error disbanding cluster: ' + err.message);
    }
}
