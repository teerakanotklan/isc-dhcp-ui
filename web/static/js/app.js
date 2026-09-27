// Global State
let currentTab = 'dashboard';
let cachedSubnets = [];
let cachedLeases = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardSummary();
    loadSubnets();
    loadStaticLeases();
    loadLeases();
    loadGlobalSettings();
    loadDeployHistory();

    // Auto refresh every 10 seconds for real-time monitoring
    setInterval(() => {
        if (currentTab === 'dashboard') loadDashboardSummary();
        if (currentTab === 'leases') loadLeases();
    }, 10000);
});

// Tab Switching
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('section[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('text-indigo-400', 'border-indigo-500');
        btn.classList.add('text-slate-400', 'border-transparent');
    });

    const activeBtn = document.getElementById(`tab-btn-${tab}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-400', 'border-transparent');
        activeBtn.classList.add('text-indigo-400', 'border-indigo-500');
    }

    if (tab === 'deploy') {
        previewConfigs();
        loadDeployHistory();
    }
}

// 1. Dashboard Summary
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
            ? 'px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20';
        document.getElementById('primary-service-text').innerText = s.primary_service_status || 'unknown';

        // Secondary Node (dhcp2)
        document.getElementById('secondary-ip').innerText = s.secondary_node.dhcp_ip || '192.168.153.160';
        const sActive = s.secondary_service_status === 'active';
        const sBadge = document.getElementById('secondary-status-badge');
        sBadge.innerText = sActive ? 'Active' : (s.secondary_node.status === 'offline' ? 'Offline' : 'Inactive');
        sBadge.className = sActive
            ? 'px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20';
        document.getElementById('secondary-service-text').innerText = s.secondary_service_status || 'unknown';

        // Failover State
        const fState = s.failover_status.my_state || 'unknown';
        const fPartner = s.failover_status.partner_state || 'unknown';
        document.getElementById('failover-my-state').innerText = fState;
        document.getElementById('failover-partner-state').innerText = fPartner;

        const fPill = document.getElementById('failover-state-pill');
        const hBadge = document.getElementById('header-cluster-badge');
        if (fState === 'normal' && fPartner === 'normal') {
            fPill.innerText = 'NORMAL (HEALTHY)';
            fPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
            hBadge.innerText = 'Cluster: Healthy';
            hBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        } else if (fState === 'partner-down' || fPartner === 'partner-down') {
            fPill.innerText = 'PARTNER DOWN (FAILOVER ACTIVE)';
            fPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20';
            hBadge.innerText = 'Cluster: Failover Active';
            hBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20';
        } else {
            fPill.innerText = (fState + ' / ' + fPartner).toUpperCase();
            fPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
            hBadge.innerText = 'Cluster: ' + fState;
        }

        // Stats
        document.getElementById('stat-subnets').innerText = s.total_subnets;
        document.getElementById('stat-pools').innerText = s.total_pools;
        document.getElementById('stat-static').innerText = s.total_static;
        document.getElementById('stat-leases').innerText = s.active_leases;
    } catch (err) {
        console.error('Error fetching summary:', err);
    }
}

// 2. Subnets & Pools
async function loadSubnets() {
    try {
        const res = await fetch('/api/subnets');
        const data = await res.json();
        if (!data.success) return;
        cachedSubnets = data.data || [];

        const container = document.getElementById('subnets-list');
        if (cachedSubnets.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl text-xs">No subnets configured yet. Click "+ Add Subnet" to create one.</div>';
            return;
        }

        container.innerHTML = cachedSubnets.map(s => `
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div class="flex items-start justify-between">
                    <div>
                        <div class="flex items-center space-x-2">
                            <h3 class="text-sm font-bold text-white font-mono">${s.network_address}/${s.cidr_prefix}</h3>
                            <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${s.enable_failover ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'}">
                                ${s.enable_failover ? 'Failover Enabled' : 'Standalone'}
                            </span>
                        </div>
                        <p class="text-xs text-slate-400 mt-0.5">${s.description || 'No description'}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="openPoolModal(${s.id})" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700">
                            + Add Dynamic Pool
                        </button>
                        <button onclick="deleteSubnet(${s.id})" class="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10" title="Delete Subnet">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div><span class="text-slate-500">Gateway:</span> <span class="font-mono text-slate-200">${s.gateway}</span></div>
                    <div><span class="text-slate-500">Netmask:</span> <span class="font-mono text-slate-200">${s.netmask}</span></div>
                    <div><span class="text-slate-500">DNS:</span> <span class="font-mono text-slate-200">${s.dns_servers || 'Global'}</span></div>
                    <div><span class="text-slate-500">Domain:</span> <span class="text-slate-200">${s.domain_name || 'Global'}</span></div>
                </div>

                <!-- Pools -->
                <div class="space-y-2">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">IP Ranges / Pools:</span>
                    ${(s.pools && s.pools.length > 0) ? s.pools.map(p => `
                        <div class="flex items-center justify-between bg-slate-950/40 px-3 py-2 rounded-lg border border-slate-800/50 text-xs">
                            <div class="flex items-center space-x-2">
                                <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                                <span class="font-mono text-white">${p.range_start} - ${p.range_end}</span>
                                <span class="text-slate-500 text-[10px]">(${p.failover_peer_name})</span>
                            </div>
                            <button onclick="deletePool(${p.id})" class="text-slate-500 hover:text-rose-400 p-1">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                    `).join('') : '<div class="text-xs text-slate-500 italic">No IP pools defined for this subnet yet.</div>'}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading subnets:', err);
    }
}

function openSubnetModal() {
    document.getElementById('form-subnet').reset();
    document.getElementById('subnet-id').value = '0';
    document.getElementById('modal-subnet').classList.remove('hidden');
}

function closeSubnetModal() {
    document.getElementById('modal-subnet').classList.add('hidden');
}

document.getElementById('form-subnet').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        network_address: document.getElementById('subnet-net').value,
        netmask: document.getElementById('subnet-mask').value,
        cidr_prefix: 24,
        gateway: document.getElementById('subnet-gw').value,
        dns_servers: document.getElementById('subnet-dns').value,
        description: document.getElementById('subnet-desc').value,
        enable_failover: document.getElementById('subnet-failover').checked
    };
    await fetch('/api/subnets', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    closeSubnetModal();
    loadSubnets();
    loadDashboardSummary();
});

async function deleteSubnet(id) {
    if (!confirm('Are you sure you want to delete this subnet and all its pools?')) return;
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
        range_start: document.getElementById('pool-start').value,
        range_end: document.getElementById('pool-end').value,
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
    if (!confirm('Are you sure you want to delete this pool?')) return;
    await fetch(`/api/pools?id=${id}`, { method: 'DELETE' });
    loadSubnets();
    loadDashboardSummary();
}

// 3. Static Reservations
async function loadStaticLeases() {
    try {
        const res = await fetch('/api/static');
        const data = await res.json();
        if (!data.success) return;

        const list = data.data || [];
        const tbody = document.getElementById('static-table-body');
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-slate-500">No static IP reservations configured.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(item => `
            <tr class="hover:bg-slate-800/40 transition-colors">
                <td class="py-3 px-4 font-semibold text-white">${item.hostname}</td>
                <td class="py-3 px-4 font-mono text-indigo-400">${item.mac_address}</td>
                <td class="py-3 px-4 font-mono text-emerald-400">${item.ip_address}</td>
                <td class="py-3 px-4 text-slate-400">${item.description || '-'}</td>
                <td class="py-3 px-4 text-right">
                    <button onclick="deleteStatic(${item.id})" class="p-1 rounded text-rose-400 hover:bg-rose-500/10">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading static:', err);
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
        hostname: document.getElementById('static-hostname').value,
        mac_address: document.getElementById('static-mac').value,
        ip_address: document.getElementById('static-ip').value,
        description: document.getElementById('static-desc').value
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

// 4. Leases Explorer
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
        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-500">No active client leases found in dhcpd.leases.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(l => `
        <tr class="hover:bg-slate-800/40 transition-colors">
            <td class="py-3 px-4 font-mono text-emerald-400 font-semibold">${l.ip_address}</td>
            <td class="py-3 px-4 font-mono text-indigo-400">${l.mac_address || '-'}</td>
            <td class="py-3 px-4 text-white">${l.hostname || '-'}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${l.binding_state === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}">
                    ${l.binding_state}
                </span>
            </td>
            <td class="py-3 px-4 font-mono text-[11px] text-slate-400">${l.starts || '-'}</td>
            <td class="py-3 px-4 font-mono text-[11px] text-slate-400">${l.ends || '-'}</td>
            <td class="py-3 px-4 text-right">
                <button onclick="openStaticModal('${l.mac_address}', '${l.ip_address}', '${l.hostname || ''}')" class="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold transition-colors">
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

// 5. Deploy Center
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
            body: JSON.stringify({ commit_message: 'Web UI Manual Deployment' })
        });
        const data = await res.json();

        resultBox.classList.remove('hidden');
        if (data.success) {
            resultBox.className = 'mt-6 p-4 rounded-xl text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
            resultBox.innerText = 'SUCCESS:\n' + data.message + (data.output ? '\n' + data.output : '');
        } else {
            resultBox.className = 'mt-6 p-4 rounded-xl text-xs font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400';
            resultBox.innerText = 'DEPLOYMENT FAILED:\n' + data.message + (data.output ? '\n' + data.output : '');
        }
        loadDeployHistory();
        loadDashboardSummary();
    } catch (err) {
        resultBox.classList.remove('hidden');
        resultBox.className = 'mt-6 p-4 rounded-xl text-xs font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400';
        resultBox.innerText = 'Network error: ' + err.message;
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
            tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-slate-500">No deployments recorded yet.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(h => `
            <tr class="hover:bg-slate-800/40">
                <td class="py-3 px-4 font-mono text-slate-400">${h.created_at}</td>
                <td class="py-3 px-4 text-white">${h.deployed_by}</td>
                <td class="py-3 px-4 text-slate-300">${h.commit_message}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${h.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
                        ${h.status}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading history:', err);
    }
}

// 6. Settings
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
        domain_name: document.getElementById('setting-domain').value,
        dns_servers: document.getElementById('setting-dns').value,
        default_lease_time: parseInt(document.getElementById('setting-default-lease').value),
        max_lease_time: parseInt(document.getElementById('setting-max-lease').value),
        authoritative: true,
        custom_options: document.getElementById('setting-custom').value
    };
    const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
        alert('Settings saved successfully! Go to Deploy Center to apply changes.');
    } else {
        alert('Failed to save settings: ' + data.message);
    }
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
}
