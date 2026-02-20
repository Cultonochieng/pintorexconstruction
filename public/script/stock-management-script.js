// ============================================================================
// PINTOREX STOCK MANAGEMENT SYSTEM
// Smart inventory management for Hardware Store & Club/Bar
// Auto-calculations, low stock alerts, and PDF reports
// ============================================================================

'use strict';

// ============================================================================
// STORAGE KEYS
// ============================================================================
const STOCK_KEY = { hardware: 'pintorex_stock_hardware', club: 'pintorex_stock_club' };
const TX_KEY = { hardware: 'pintorex_transactions_hardware', club: 'pintorex_transactions_club' };
const SESSION_KEY = 'pintorex_session';
const OFFLINE_TOKEN_KEY = 'pintorex_offline_token';

// ============================================================================
// CATEGORIES
// ============================================================================
const CATEGORIES = {
    hardware: [
        'Building Materials', 'Steel & Metal', 'Timber & Wood',
        'Electrical', 'Plumbing', 'Paint & Finishes',
        'Tools & Equipment', 'Hardware & Fasteners',
        'Roofing', 'Tiles & Flooring', 'Other'
    ],
    club: [
        'Beer (Local)', 'Beer (Imported)', 'Spirits & Whiskey',
        'Vodka & Gin', 'Wine', 'Brandy & Liqueur',
        'Soft Drinks', 'Water & Juice',
        'Tobacco & Cigarettes', 'Food & Snacks', 'Other'
    ]
};

const BIZ_LABELS = {
    hardware: 'HARDWARE STORE',
    club: 'CLUB / BAR'
};

// ============================================================================
// STATE
// ============================================================================
let currentBiz = 'hardware';
let currentView = 'dashboard';

// ============================================================================
// UTILS
// ============================================================================
function fmtKES(n) {
    const num = parseFloat(n) || 0;
    return 'KES ' + num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n) { return (parseFloat(n) || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 }); }
function fmtDate(str) {
    if (!str) return '—';
    try { return new Date(str).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return str; }
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

// ============================================================================
// TOAST
// ============================================================================
const Toast = {
    show(msg, type = 'info', duration = 3500) {
        const el = document.getElementById('toast');
        el.textContent = msg;
        el.className = `toast ${type}`;
        void el.offsetWidth;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), duration);
    },
    success: (m) => Toast.show(m, 'success'),
    error: (m) => Toast.show(m, 'error', 5000),
    info: (m) => Toast.show(m, 'info')
};

// ============================================================================
// AUTHENTICATION
// ============================================================================
const Auth = {
    isAuthenticated() {
        try {
            const data = sessionStorage.getItem(SESSION_KEY);
            if (!data) return false;
            const s = JSON.parse(data);
            return s.authenticated && Date.now() < s.expiresAt;
        } catch { return false; }
    },
    createSession() {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            authenticated: true,
            expiresAt: Date.now() + 4 * 60 * 60 * 1000
        }));
    },
    hasOfflineToken() {
        try {
            const token = localStorage.getItem(OFFLINE_TOKEN_KEY);
            if (!token) return false;
            const decoded = JSON.parse(atob(token));
            if (Date.now() > decoded.exp) { localStorage.removeItem(OFFLINE_TOKEN_KEY); return false; }
            return true;
        } catch { return false; }
    },
    storeToken(t) { localStorage.setItem(OFFLINE_TOKEN_KEY, t); },
    logout() {
        sessionStorage.removeItem(SESSION_KEY);
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        window.location.href = 'quotation-generator.html';
    }
};

// ============================================================================
// DATA MANAGERS
// ============================================================================
const StockDB = {
    getAll(biz = currentBiz) {
        try { return JSON.parse(localStorage.getItem(STOCK_KEY[biz])) || []; } catch { return []; }
    },
    save(items, biz = currentBiz) { localStorage.setItem(STOCK_KEY[biz], JSON.stringify(items)); },
    nextSku(biz = currentBiz) {
        const prefix = biz === 'hardware' ? 'HW' : 'CB';
        const all = this.getAll(biz);
        const nums = all.map(i => parseInt((i.sku || '').replace(prefix + '-', '')) || 0);
        return `${prefix}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;
    },
    add(item, biz = currentBiz) {
        const all = this.getAll(biz);
        item.id = genId();
        item.sku = item.sku || this.nextSku(biz);
        item.createdAt = new Date().toISOString();
        item.updatedAt = item.createdAt;
        all.push(item);
        this.save(all, biz);
        return item;
    },
    update(item, biz = currentBiz) {
        const all = this.getAll(biz);
        const idx = all.findIndex(i => i.id === item.id);
        if (idx >= 0) { all[idx] = { ...all[idx], ...item, updatedAt: new Date().toISOString() }; this.save(all, biz); }
    },
    delete(id, biz = currentBiz) { this.save(this.getAll(biz).filter(i => i.id !== id), biz); },
    getById(id, biz = currentBiz) { return this.getAll(biz).find(i => i.id === id); }
};

const TxDB = {
    getAll(biz = currentBiz) {
        try { return JSON.parse(localStorage.getItem(TX_KEY[biz])) || []; } catch { return []; }
    },
    save(txs, biz = currentBiz) { localStorage.setItem(TX_KEY[biz], JSON.stringify(txs)); },
    add(tx, biz = currentBiz) {
        const all = this.getAll(biz);
        tx.id = genId();
        tx.createdAt = new Date().toISOString();
        all.unshift(tx);
        this.save(all, biz);
        return tx;
    },
    delete(id, biz = currentBiz) { this.save(this.getAll(biz).filter(t => t.id !== id), biz); }
};

// ============================================================================
// SMART CALCULATIONS
// ============================================================================
function calcMargin(cost, sell) {
    const c = parseFloat(cost) || 0;
    const s = parseFloat(sell) || 0;
    if (c <= 0) return 0;
    return ((s - c) / c) * 100;
}
function calcStockValue(qty, cost) {
    return (parseFloat(qty) || 0) * (parseFloat(cost) || 0);
}
function calcRevenuePotential(qty, sell) {
    return (parseFloat(qty) || 0) * (parseFloat(sell) || 0);
}
function calcSuggestedRestock(item) {
    const need = (parseFloat(item.minQty) || 0) * 2 - (parseFloat(item.qty) || 0);
    return Math.max(0, Math.ceil(need));
}
function getStockStatus(item) {
    const qty = parseFloat(item.qty) || 0;
    const min = parseFloat(item.minQty) || 0;
    if (qty <= 0) return 'out';
    if (qty <= min) return 'low';
    return 'ok';
}

// ============================================================================
// BUSINESS SWITCH
// ============================================================================
function switchBusiness(biz) {
    currentBiz = biz;
    document.getElementById('bizHardware').classList.toggle('active', biz === 'hardware');
    document.getElementById('bizClub').classList.toggle('active', biz === 'club');
    document.getElementById('bizLabel').textContent = BIZ_LABELS[biz];
    populateCategoryDropdowns();
    refreshAll();
}

// ============================================================================
// VIEW SWITCH
// ============================================================================
function switchView(view) {
    currentView = view;
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    document.querySelectorAll('.view-panel').forEach(el => el.classList.toggle('active', el.id === 'view-' + view));

    if (view === 'dashboard') renderDashboard();
    if (view === 'inventory') renderInventoryTable();
    if (view === 'transactions') renderTransactionsTable();
    if (view === 'reports') renderReportsView();
}

// ============================================================================
// POPULATE CATEGORY DROPDOWNS
// ============================================================================
function populateCategoryDropdowns() {
    const cats = CATEGORIES[currentBiz];

    // Item modal
    const catSel = document.getElementById('itemCategory');
    if (catSel) {
        const cur = catSel.value;
        catSel.innerHTML = cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
        if (cur) catSel.value = cur;
    }

    // Inventory filter
    const filterCat = document.getElementById('filterCategory');
    if (filterCat) {
        filterCat.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    }

    // Reports filter
    const rptCat = document.getElementById('rptCatFilter');
    if (rptCat) {
        rptCat.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    }
}

// ============================================================================
// DASHBOARD
// ============================================================================
function renderDashboard() {
    const biz = currentBiz;
    const label = BIZ_LABELS[biz];
    document.getElementById('dashBizTitle').textContent = `${label} DASHBOARD`;
    document.getElementById('dashSubtitle').textContent = `Real-time ${label.toLowerCase()} inventory overview`;

    const items = StockDB.getAll(biz);
    const txs = TxDB.getAll(biz);

    const totalItems = items.length;
    const lowItems = items.filter(i => getStockStatus(i) !== 'ok');
    const totalCost = items.reduce((s, i) => s + calcStockValue(i.qty, i.cost), 0);
    const totalRevenue = items.reduce((s, i) => s + calcRevenuePotential(i.qty, i.sell), 0);
    const overallMargin = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

    document.getElementById('dashTotal').textContent = totalItems;
    document.getElementById('dashLow').textContent = lowItems.length;
    document.getElementById('dashCostValue').textContent = fmtKES(totalCost);
    document.getElementById('dashRevenueValue').textContent = fmtKES(totalRevenue);
    document.getElementById('dashProfitPct').textContent = overallMargin.toFixed(1) + '%';

    renderLowStockAlerts(lowItems);
    renderCategoryChart(items);
    renderDashRecentTx(txs.slice(0, 8), items);
}

function renderLowStockAlerts(lowItems) {
    const container = document.getElementById('lowStockAlerts');
    if (!lowItems.length) { container.innerHTML = ''; return; }

    const outItems = lowItems.filter(i => getStockStatus(i) === 'out');
    const lowOnly = lowItems.filter(i => getStockStatus(i) === 'low');

    let html = '';
    if (outItems.length) {
        html += `<div class="alert-banner alert-critical">
            <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/></svg>
            <div class="alert-banner-text">
                <strong>${outItems.length} item(s) OUT OF STOCK:</strong> ${outItems.map(i => `<span style="font-weight:600">${esc(i.name)}</span>`).slice(0, 5).join(', ')}${outItems.length > 5 ? ' …' : ''}
                <button onclick="switchView('inventory');document.getElementById('filterLowStock').value='low';renderInventoryTable()" class="ml-2 underline text-red-700">View all →</button>
            </div>
        </div>`;
    }
    if (lowOnly.length) {
        html += `<div class="alert-banner">
            <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/></svg>
            <div class="alert-banner-text">
                <strong>${lowOnly.length} item(s) running LOW:</strong> ${lowOnly.map(i => `${esc(i.name)} (${fmtNum(i.qty)} ${esc(i.unit)})`).slice(0, 4).join(', ')}${lowOnly.length > 4 ? ' …' : ''}
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

function renderCategoryChart(items) {
    const chartEl = document.getElementById('categoryChart');
    const legendEl = document.getElementById('categoryLegend');
    if (!items.length) { chartEl.innerHTML = '<div class="text-gray-400 text-sm w-full text-center">No data</div>'; legendEl.innerHTML = ''; return; }

    // Group by category
    const catMap = {};
    items.forEach(i => {
        const cat = i.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + calcStockValue(i.qty, i.cost);
    });
    const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxVal = Math.max(...entries.map(e => e[1]), 1);

    const colors = ['#F97316','#3B82F6','#10B981','#8B5CF6','#EF4444','#F59E0B','#06B6D4','#EC4899'];

    chartEl.innerHTML = entries.map((e, i) => {
        const pct = Math.max(4, (e[1] / maxVal) * 96);
        return `<div class="chart-bar-wrap">
            <div class="chart-bar" style="height:${pct}%;background:${colors[i % colors.length]};" title="${esc(e[0])}: ${fmtKES(e[1])}"></div>
            <div class="chart-label">${esc(e[0].split(' ')[0])}</div>
        </div>`;
    }).join('');

    legendEl.innerHTML = entries.map((e, i) => `
        <div class="flex items-center gap-1">
            <div style="width:10px;height:10px;border-radius:2px;background:${colors[i % colors.length]};flex-shrink:0"></div>
            <span class="text-xs text-gray-600">${esc(e[0])}</span>
        </div>`).join('');
}

function renderDashRecentTx(txs, items) {
    const tbody = document.getElementById('dashRecentTx');
    if (!txs.length) { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-400 py-6">No transactions yet</td></tr>'; return; }
    const typeBadge = { Restock: 'badge-in', Sale: 'badge-sale', Damage: 'badge-dmg', Adjustment: 'badge-adj' };
    tbody.innerHTML = txs.map(tx => {
        const item = items.find(i => i.id === tx.itemId);
        const sign = (tx.type === 'Restock' || (tx.type === 'Adjustment' && tx.qtyChange > 0)) ? '+' : '-';
        return `<tr>
            <td class="font-medium text-xs">${esc(item ? item.name : '—')}</td>
            <td><span class="badge ${typeBadge[tx.type] || 'badge-adj'}">${esc(tx.type)}</span></td>
            <td class="font-semibold ${tx.type === 'Restock' ? 'text-blue-600' : 'text-red-500'}">${sign}${fmtNum(Math.abs(tx.qtyChange))}</td>
            <td class="text-xs text-gray-400">${fmtDate(tx.date || tx.createdAt)}</td>
        </tr>`;
    }).join('');
}

// ============================================================================
// INVENTORY TABLE
// ============================================================================
function renderInventoryTable() {
    const search = (document.getElementById('invSearch').value || '').toLowerCase();
    const catFilter = document.getElementById('filterCategory').value;
    const lowFilter = document.getElementById('filterLowStock').value;
    let items = StockDB.getAll();

    if (search) items = items.filter(i => (i.name || '').toLowerCase().includes(search) || (i.sku || '').toLowerCase().includes(search) || (i.category || '').toLowerCase().includes(search));
    if (catFilter) items = items.filter(i => i.category === catFilter);
    if (lowFilter === 'low') items = items.filter(i => getStockStatus(i) !== 'ok');

    document.getElementById('invTitle').textContent = `${BIZ_LABELS[currentBiz]} INVENTORY`;
    const tbody = document.getElementById('inventoryBody');
    const empty = document.getElementById('invEmpty');

    if (!items.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    tbody.innerHTML = items.map(item => {
        const status = getStockStatus(item);
        const margin = calcMargin(item.cost, item.sell);
        const stockVal = calcStockValue(item.qty, item.cost);
        const qty = parseFloat(item.qty) || 0;
        const min = parseFloat(item.minQty) || 0;
        const pct = min > 0 ? Math.min(100, (qty / (min * 2)) * 100) : (qty > 0 ? 100 : 0);
        const barColor = status === 'out' ? '#EF4444' : status === 'low' ? '#F59E0B' : '#10B981';
        const statusBadge = status === 'ok'
            ? '<span class="badge badge-ok">✓ OK</span>'
            : status === 'low'
            ? '<span class="badge badge-low">⚠ Low</span>'
            : '<span class="badge badge-out">✗ Out</span>';
        const marginClass = margin >= 30 ? 'margin-high' : margin >= 10 ? 'margin-med' : 'margin-low';
        const rowClass = status === 'out' ? 'row-out' : status === 'low' ? 'row-low' : '';

        return `<tr class="${rowClass}">
            <td><span class="badge badge-cat font-mono text-xs">${esc(item.sku)}</span></td>
            <td>
                <div class="font-medium">${esc(item.name)}</div>
                ${item.supplier ? `<div class="text-xs text-gray-400">📦 ${esc(item.supplier)}</div>` : ''}
            </td>
            <td><span class="badge badge-cat">${esc(item.category || '—')}</span></td>
            <td class="text-gray-500">${esc(item.unit || '—')}</td>
            <td>
                <div class="font-bold ${status === 'out' ? 'text-red-600' : status === 'low' ? 'text-yellow-600' : 'text-green-700'}">${fmtNum(item.qty)}</div>
                <div class="stock-bar"><div class="stock-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
            </td>
            <td class="text-gray-500">${fmtNum(item.minQty)}</td>
            <td>${fmtKES(item.cost)}</td>
            <td>${fmtKES(item.sell)}</td>
            <td><span class="margin-pill ${marginClass}">${margin.toFixed(1)}%</span></td>
            <td class="font-semibold">${fmtKES(stockVal)}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="flex gap-1 flex-wrap">
                    <button onclick="openTransactionModal('${item.id}')" class="btn btn-xs btn-primary" title="Record Transaction">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>
                        Move
                    </button>
                    <button onclick="editItem('${item.id}')" class="btn btn-outline btn-xs">Edit</button>
                    <button onclick="confirmDeleteItem('${item.id}')" class="btn btn-xs" style="background:#FEE2E2;color:#991B1B;border:none">Del</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ============================================================================
// TRANSACTIONS TABLE
// ============================================================================
function renderTransactionsTable() {
    const typeFilter = document.getElementById('txTypeFilter').value;
    const dateFrom = document.getElementById('txDateFrom').value;
    const dateTo = document.getElementById('txDateTo').value;
    let txs = TxDB.getAll();

    if (typeFilter) txs = txs.filter(t => t.type === typeFilter);
    if (dateFrom) txs = txs.filter(t => (t.date || t.createdAt || '') >= dateFrom);
    if (dateTo) txs = txs.filter(t => (t.date || t.createdAt || '').substring(0, 10) <= dateTo);

    document.getElementById('txTitle').textContent = `${BIZ_LABELS[currentBiz]} TRANSACTION LOG`;
    const tbody = document.getElementById('transactionsBody');
    const empty = document.getElementById('txEmpty');
    if (!txs.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    const typeBadge = { Restock: 'badge-in', Sale: 'badge-sale', Damage: 'badge-dmg', Adjustment: 'badge-adj' };
    tbody.innerHTML = txs.map(tx => {
        const item = StockDB.getById(tx.itemId);
        const isIn = tx.type === 'Restock' || (tx.type === 'Adjustment' && tx.qtyChange > 0);
        const sign = isIn ? '+' : '-';
        const colorClass = isIn ? 'text-blue-600' : 'text-red-500';
        return `<tr>
            <td class="text-xs text-gray-500">${fmtDate(tx.date || tx.createdAt)}</td>
            <td>
                <div class="font-medium">${esc(item ? item.name : '—')}</div>
                <div class="text-xs text-gray-400">${esc(item ? item.sku : '')}</div>
            </td>
            <td><span class="badge ${typeBadge[tx.type] || 'badge-adj'}">${esc(tx.type)}</span></td>
            <td class="font-bold ${colorClass}">${sign}${fmtNum(Math.abs(tx.qtyChange))} ${esc(item ? item.unit : '')}</td>
            <td>${tx.unitPrice ? fmtKES(tx.unitPrice) : '—'}</td>
            <td>${tx.totalValue ? fmtKES(tx.totalValue) : '—'}</td>
            <td class="font-semibold">${fmtNum(tx.balanceAfter)} ${esc(item ? item.unit : '')}</td>
            <td class="text-xs text-gray-500">${esc(tx.ref || '—')}</td>
            <td>
                <button onclick="confirmDeleteTx('${tx.id}')" class="btn btn-xs" style="background:#FEE2E2;color:#991B1B;border:none">Del</button>
            </td>
        </tr>`;
    }).join('');
}

// ============================================================================
// REPORTS VIEW
// ============================================================================
function renderReportsView() {
    document.getElementById('reportsTitle').textContent = `${BIZ_LABELS[currentBiz]} REPORTS`;
    populateCategoryDropdowns();
    renderProfitAnalysisTable();
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 8) + '01';
    if (!document.getElementById('rptTxFrom').value) document.getElementById('rptTxFrom').value = monthStart;
    if (!document.getElementById('rptTxTo').value) document.getElementById('rptTxTo').value = today;
}

function renderProfitAnalysisTable() {
    const items = StockDB.getAll();
    const cats = CATEGORIES[currentBiz];
    const tbody = document.getElementById('profitAnalysisBody');

    const catData = cats.map(cat => {
        const catItems = items.filter(i => i.category === cat);
        const costVal = catItems.reduce((s, i) => s + calcStockValue(i.qty, i.cost), 0);
        const revVal = catItems.reduce((s, i) => s + calcRevenuePotential(i.qty, i.sell), 0);
        const profit = revVal - costVal;
        const margin = costVal > 0 ? (profit / costVal) * 100 : 0;
        return { cat, count: catItems.length, costVal, revVal, profit, margin };
    }).filter(d => d.count > 0);

    if (!catData.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-8">No data yet</td></tr>'; return; }

    const totals = catData.reduce((s, d) => ({
        count: s.count + d.count,
        costVal: s.costVal + d.costVal,
        revVal: s.revVal + d.revVal,
        profit: s.profit + d.profit
    }), { count: 0, costVal: 0, revVal: 0, profit: 0 });
    const totalMargin = totals.costVal > 0 ? (totals.profit / totals.costVal) * 100 : 0;

    tbody.innerHTML = catData.map(d => {
        const mc = d.margin >= 30 ? 'text-green-600' : d.margin >= 10 ? 'text-yellow-600' : 'text-red-600';
        return `<tr>
            <td class="font-medium">${esc(d.cat)}</td>
            <td class="text-gray-500">${d.count}</td>
            <td>${fmtKES(d.costVal)}</td>
            <td>${fmtKES(d.revVal)}</td>
            <td class="font-semibold text-green-700">${fmtKES(d.profit)}</td>
            <td class="font-bold ${mc}">${d.margin.toFixed(1)}%</td>
        </tr>`;
    }).join('') + `<tr style="background:#F9FAFB;font-weight:700">
        <td>TOTAL</td><td>${totals.count}</td>
        <td>${fmtKES(totals.costVal)}</td><td>${fmtKES(totals.revVal)}</td>
        <td class="text-green-700">${fmtKES(totals.profit)}</td>
        <td class="text-orange-600">${totalMargin.toFixed(1)}%</td>
    </tr>`;
}

// ============================================================================
// ITEM MODAL
// ============================================================================
function openItemModal(itemId = null) {
    document.getElementById('itemForm').reset();
    document.getElementById('itemModalTitle').textContent = itemId ? 'EDIT STOCK ITEM' : 'ADD STOCK ITEM';
    document.getElementById('itemId').value = '';
    populateCategoryDropdowns();

    if (itemId) {
        const item = StockDB.getById(itemId);
        if (!item) return;
        document.getElementById('itemId').value = item.id;
        document.getElementById('itemName').value = item.name || '';
        document.getElementById('itemCategory').value = item.category || '';
        document.getElementById('itemSku').value = item.sku || '';
        document.getElementById('itemUnit').value = item.unit || 'pcs';
        document.getElementById('itemQty').value = item.qty || '';
        document.getElementById('itemMinQty').value = item.minQty || '';
        document.getElementById('itemCost').value = item.cost || '';
        document.getElementById('itemSell').value = item.sell || '';
        document.getElementById('itemSupplier').value = item.supplier || '';
        document.getElementById('itemSupplierPhone').value = item.supplierPhone || '';
        document.getElementById('itemNotes').value = item.notes || '';
        calcItemMargin();
    } else {
        document.getElementById('itemSku').value = StockDB.nextSku();
    }

    document.getElementById('itemModal').classList.add('open');
    document.getElementById('itemName').focus();
}

function closeItemModal() { document.getElementById('itemModal').classList.remove('open'); }
function editItem(id) { openItemModal(id); }

function calcItemMargin() {
    const cost = parseFloat(document.getElementById('itemCost').value) || 0;
    const sell = parseFloat(document.getElementById('itemSell').value) || 0;
    const qty = parseFloat(document.getElementById('itemQty').value) || 0;
    const margin = calcMargin(cost, sell);
    const stockVal = calcStockValue(qty, cost);
    document.getElementById('itemMarginDisplay').value = cost > 0
        ? `${margin.toFixed(1)}% (profit: ${fmtKES(sell - cost)} per unit)`
        : '—';
    document.getElementById('itemValueDisplay').value = stockVal > 0 ? fmtKES(stockVal) : '—';
}

document.getElementById('itemForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('itemName').value.trim();
    const cat = document.getElementById('itemCategory').value;
    const cost = parseFloat(document.getElementById('itemCost').value) || 0;
    const sell = parseFloat(document.getElementById('itemSell').value) || 0;
    const qty = parseFloat(document.getElementById('itemQty').value);
    const minQty = parseFloat(document.getElementById('itemMinQty').value);

    if (!name) { Toast.error('Item name is required.'); return; }
    if (!cat) { Toast.error('Category is required.'); return; }
    if (isNaN(qty)) { Toast.error('Current quantity is required.'); return; }
    if (cost <= 0) { Toast.error('Cost price is required.'); return; }
    if (sell <= 0) { Toast.error('Selling price is required.'); return; }

    const item = {
        id: document.getElementById('itemId').value,
        name,
        category: cat,
        sku: document.getElementById('itemSku').value,
        unit: document.getElementById('itemUnit').value,
        qty,
        minQty: isNaN(minQty) ? 0 : minQty,
        cost,
        sell,
        margin: calcMargin(cost, sell),
        supplier: document.getElementById('itemSupplier').value.trim(),
        supplierPhone: document.getElementById('itemSupplierPhone').value.trim(),
        notes: document.getElementById('itemNotes').value.trim()
    };

    if (item.id) {
        StockDB.update(item);
        Toast.success('Item updated!');
    } else {
        StockDB.add(item);
        Toast.success(`${name} added to inventory!`);
    }
    closeItemModal();
    refreshAll();
});

// ============================================================================
// TRANSACTION MODAL
// ============================================================================
function openTransactionModal(presetItemId = null) {
    document.getElementById('transactionForm').reset();
    document.querySelector('input[name="txType"][value="Restock"]').checked = true;
    onTxTypeChange();

    // Populate item dropdown
    const items = StockDB.getAll().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const itemSel = document.getElementById('txItem');
    itemSel.innerHTML = '<option value="">Choose an item...</option>' +
        items.map(i => {
            const status = getStockStatus(i);
            const flag = status === 'out' ? ' ❌' : status === 'low' ? ' ⚠️' : '';
            return `<option value="${i.id}">${esc(i.name)} (${fmtNum(i.qty)} ${esc(i.unit)})${flag}</option>`;
        }).join('');

    if (presetItemId) {
        itemSel.value = presetItemId;
        onTxItemChange();
    }

    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('transactionModal').classList.add('open');
}

function closeTransactionModal() { document.getElementById('transactionModal').classList.remove('open'); }

function onTxTypeChange() {
    const type = document.querySelector('input[name="txType"]:checked')?.value || 'Restock';
    const qtyLabel = document.getElementById('txQtyLabel');
    const priceLabel = document.getElementById('txPriceLabel');
    if (type === 'Adjustment') {
        qtyLabel.textContent = 'New Quantity (set exact level)';
        priceLabel.textContent = 'Unit Cost (KES)';
    } else {
        qtyLabel.textContent = 'Quantity';
        priceLabel.textContent = type === 'Sale' ? 'Selling Price (KES)' : 'Unit Cost (KES)';
    }
    onTxItemChange();
}

function onTxItemChange() {
    const itemId = document.getElementById('txItem').value;
    const type = document.querySelector('input[name="txType"]:checked')?.value || 'Restock';
    const stockDiv = document.getElementById('txCurrentStock');
    if (!itemId) { stockDiv.textContent = ''; return; }
    const item = StockDB.getById(itemId);
    if (!item) { stockDiv.textContent = ''; return; }
    stockDiv.textContent = `Current stock: ${fmtNum(item.qty)} ${item.unit}  |  Min level: ${fmtNum(item.minQty)} ${item.unit}`;
    document.getElementById('txPrice').value = type === 'Sale' ? (item.sell || '') : (item.cost || '');
    calcTxTotal();
}

function calcTxTotal() {
    const qty = parseFloat(document.getElementById('txQty').value) || 0;
    const price = parseFloat(document.getElementById('txPrice').value) || 0;
    const total = qty * price;
    document.getElementById('txTotal').value = total > 0 ? fmtKES(total) : '—';
}

document.getElementById('transactionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const type = document.querySelector('input[name="txType"]:checked')?.value;
    const itemId = document.getElementById('txItem').value;
    const qtyInput = parseFloat(document.getElementById('txQty').value) || 0;
    const unitPrice = parseFloat(document.getElementById('txPrice').value) || 0;

    if (!itemId) { Toast.error('Please select an item.'); return; }
    if (qtyInput <= 0) { Toast.error('Quantity must be greater than 0.'); return; }

    const item = StockDB.getById(itemId);
    if (!item) { Toast.error('Item not found.'); return; }

    let qtyChange;
    let newQty;

    if (type === 'Adjustment') {
        newQty = qtyInput;
        qtyChange = newQty - (parseFloat(item.qty) || 0);
    } else if (type === 'Restock') {
        qtyChange = qtyInput;
        newQty = (parseFloat(item.qty) || 0) + qtyInput;
    } else {
        // Sale or Damage — reduce stock
        qtyChange = -qtyInput;
        newQty = (parseFloat(item.qty) || 0) - qtyInput;
        if (newQty < 0) {
            Toast.error(`Insufficient stock. Available: ${fmtNum(item.qty)} ${item.unit}`);
            return;
        }
    }

    const totalValue = Math.abs(qtyChange) * unitPrice;
    const date = document.getElementById('txDate').value;
    const ref = document.getElementById('txRef').value.trim();

    // Update stock
    StockDB.update({ ...item, qty: newQty });

    // Save transaction
    TxDB.add({
        itemId,
        type,
        qtyChange,
        unitPrice,
        totalValue,
        balanceAfter: newQty,
        date: date || new Date().toISOString().split('T')[0],
        ref
    });

    // Alert if now low/out
    const newStatus = getStockStatus({ ...item, qty: newQty });
    if (newStatus === 'out') Toast.info(`⚠️ ${item.name} is now OUT OF STOCK!`);
    else if (newStatus === 'low') Toast.info(`⚠️ ${item.name} is now running LOW!`);
    else Toast.success(`Transaction recorded for ${item.name}`);

    closeTransactionModal();
    refreshAll();
});

// ============================================================================
// DELETE CONFIRMATION
// ============================================================================
let _pendingDelete = null;

function confirmDeleteItem(id) {
    const item = StockDB.getById(id);
    if (!item) return;
    document.getElementById('deleteModalMsg').textContent = `Delete "${item.name}" from inventory? All transaction records for this item will also be removed.`;
    _pendingDelete = { type: 'item', id };
    document.getElementById('deleteModal').classList.add('open');
}

function confirmDeleteTx(id) {
    document.getElementById('deleteModalMsg').textContent = 'Delete this transaction record? Note: This will NOT reverse the stock change.';
    _pendingDelete = { type: 'tx', id };
    document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('open');
    _pendingDelete = null;
}

document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
    if (!_pendingDelete) return;
    if (_pendingDelete.type === 'item') {
        StockDB.delete(_pendingDelete.id);
        TxDB.save(TxDB.getAll().filter(t => t.itemId !== _pendingDelete.id));
        Toast.success('Item deleted.');
    } else {
        TxDB.delete(_pendingDelete.id);
        Toast.success('Transaction deleted.');
    }
    closeDeleteModal();
    refreshAll();
});

// Close on overlay click
['itemModal', 'transactionModal', 'deleteModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', function(e) {
        if (e.target === this) {
            if (id === 'itemModal') closeItemModal();
            if (id === 'transactionModal') closeTransactionModal();
            if (id === 'deleteModal') closeDeleteModal();
        }
    });
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeItemModal(); closeTransactionModal(); closeDeleteModal(); }
});

// ============================================================================
// PDF GENERATION
// ============================================================================
function pdfHeader(doc, title, subtitle, isLandscape = true) {
    const w = isLandscape ? 297 : 210;
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, w, 40, 'F');
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, 6, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PINTOREX CONSTRUCTION LIMITED', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text(`${BIZ_LABELS[currentBiz]} | ${subtitle}`, 14, 23);
    doc.setFontSize(12);
    doc.setTextColor(249, 115, 22);
    doc.text(title, 14, 33);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}`, w - 14, 33, { align: 'right' });
}

function pdfFooter(doc, isLandscape = true) {
    const pages = doc.internal.getNumberOfPages();
    const w = isLandscape ? 297 : 210;
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        const pageH = doc.internal.pageSize.height;
        doc.setFillColor(31, 41, 55);
        doc.rect(0, pageH - 10, w, 10, 'F');
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(7);
        doc.text('Pintorex Construction Limited | Confidential', 14, pageH - 4);
        doc.text(`Page ${i} of ${pages}`, w - 14, pageH - 4, { align: 'right' });
    }
}

function pdfSummaryBox(doc, startY, items) {
    const totalItems = items.length;
    const totalCost = items.reduce((s, i) => s + calcStockValue(i.qty, i.cost), 0);
    const totalRevenue = items.reduce((s, i) => s + calcRevenuePotential(i.qty, i.sell), 0);
    const margin = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(209, 213, 219);
    doc.roundedRect(14, startY, 269, 22, 3, 3, 'FD');
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Items: ${totalItems}`, 22, startY + 8);
    doc.text(`|  Stock Cost Value: ${fmtKES(totalCost)}`, 60, startY + 8);
    doc.text(`|  Revenue Potential: ${fmtKES(totalRevenue)}`, 130, startY + 8);
    doc.text(`|  Est. Profit: ${fmtKES(totalRevenue - totalCost)} (${margin.toFixed(1)}%)`, 200, startY + 8);
    return startY + 26;
}

function generateInventoryPDF() {
    const catFilter = document.getElementById('rptCatFilter').value;
    let items = StockDB.getAll();
    if (catFilter) items = items.filter(i => i.category === catFilter);
    if (!items.length) { Toast.error('No items to export.'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    pdfHeader(doc, 'INVENTORY REPORT', catFilter || 'All Categories');
    const y = pdfSummaryBox(doc, 44, items);

    doc.autoTable({
        startY: y,
        head: [['SKU', 'Item Name', 'Category', 'Unit', 'Qty', 'Min Level', 'Cost (KES)', 'Selling (KES)', 'Margin%', 'Stock Value', 'Status']],
        body: items.map(i => {
            const status = getStockStatus(i);
            const margin = calcMargin(i.cost, i.sell);
            return [
                i.sku, i.name, i.category || '—', i.unit || '—',
                fmtNum(i.qty), fmtNum(i.minQty),
                fmtKES(i.cost), fmtKES(i.sell),
                margin.toFixed(1) + '%',
                fmtKES(calcStockValue(i.qty, i.cost)),
                status === 'ok' ? 'OK' : status === 'low' ? 'LOW' : 'OUT OF STOCK'
            ];
        }),
        styles: { fontSize: 7.5, cellPadding: 3.5 },
        headStyles: { fillColor: [31, 41, 55], textColor: [255,255,255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        didParseCell: (data) => {
            if (data.section === 'body') {
                const status = data.row.raw[10];
                if (status === 'OUT OF STOCK') data.cell.styles.textColor = [220, 38, 38];
                else if (status === 'LOW') data.cell.styles.textColor = [217, 119, 6];
            }
        },
        columnStyles: { 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
    });
    pdfFooter(doc);
    doc.save(`Pintorex-${currentBiz}-Inventory-${new Date().toISOString().split('T')[0]}.pdf`);
    Toast.success('Inventory report downloaded!');
}

function generateLowStockPDF() {
    const items = StockDB.getAll().filter(i => getStockStatus(i) !== 'ok');
    if (!items.length) { Toast.info('No low stock items to report!'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    pdfHeader(doc, 'LOW STOCK REPORT', `${items.length} item(s) need attention`);

    doc.autoTable({
        startY: 46,
        head: [['SKU', 'Item Name', 'Category', 'Unit', 'Current Qty', 'Min Level', 'Suggested Restock', 'Supplier', 'Status']],
        body: items.map(i => [
            i.sku, i.name, i.category || '—', i.unit || '—',
            fmtNum(i.qty), fmtNum(i.minQty),
            fmtNum(calcSuggestedRestock(i)),
            i.supplier || '—',
            getStockStatus(i) === 'out' ? 'OUT OF STOCK' : 'LOW'
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [239, 68, 68], textColor: [255,255,255], fontStyle: 'bold' },
        didParseCell: (data) => {
            if (data.section === 'body') {
                const status = data.row.raw[8];
                if (status === 'OUT OF STOCK') { data.cell.styles.fillColor = [254, 226, 226]; data.cell.styles.textColor = [153, 27, 27]; }
                else if (status === 'LOW') { data.cell.styles.fillColor = [254, 243, 199]; data.cell.styles.textColor = [146, 64, 14]; }
            }
        },
        columnStyles: { 4: { halign: 'center', fontStyle: 'bold' }, 6: { halign: 'center', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
    });
    pdfFooter(doc);
    doc.save(`Pintorex-${currentBiz}-LowStock-${new Date().toISOString().split('T')[0]}.pdf`);
    Toast.success('Low stock report downloaded!');
}

function generateTransactionPDF() {
    const from = document.getElementById('rptTxFrom').value;
    const to = document.getElementById('rptTxTo').value;
    const typeFilter = document.getElementById('rptTxType').value;
    let txs = TxDB.getAll();
    if (from) txs = txs.filter(t => (t.date || t.createdAt || '') >= from);
    if (to) txs = txs.filter(t => (t.date || t.createdAt || '').substring(0, 10) <= to);
    if (typeFilter) txs = txs.filter(t => t.type === typeFilter);
    if (!txs.length) { Toast.error('No transactions match the filters.'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const subtitle = from || to ? `${from || '—'} to ${to || '—'}` : 'All Time';
    pdfHeader(doc, 'TRANSACTION REPORT', subtitle);

    const totalSales = txs.filter(t => t.type === 'Sale').reduce((s, t) => s + (parseFloat(t.totalValue) || 0), 0);
    const totalRestock = txs.filter(t => t.type === 'Restock').reduce((s, t) => s + (parseFloat(t.totalValue) || 0), 0);

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(209, 213, 219);
    doc.roundedRect(14, 44, 269, 20, 3, 3, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text(`Transactions: ${txs.length}  |  Total Sales Value: ${fmtKES(totalSales)}  |  Total Restock Value: ${fmtKES(totalRestock)}`, 22, 56);

    doc.autoTable({
        startY: 68,
        head: [['Date', 'Item', 'Type', 'Qty Change', 'Unit Price', 'Total Value', 'Balance After', 'Reference']],
        body: txs.map(tx => {
            const item = StockDB.getById(tx.itemId);
            const sign = tx.qtyChange > 0 ? '+' : '';
            return [
                fmtDate(tx.date || tx.createdAt),
                (item ? item.name : '—'),
                tx.type,
                `${sign}${fmtNum(tx.qtyChange)} ${item ? item.unit : ''}`,
                tx.unitPrice ? fmtKES(tx.unitPrice) : '—',
                tx.totalValue ? fmtKES(tx.totalValue) : '—',
                `${fmtNum(tx.balanceAfter)} ${item ? item.unit : ''}`,
                tx.ref || '—'
            ];
        }),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [31, 41, 55], textColor: [255,255,255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
                const v = data.row.raw[3];
                data.cell.styles.textColor = v.startsWith('+') ? [5, 150, 105] : [220, 38, 38];
                data.cell.styles.fontStyle = 'bold';
            }
        },
        margin: { left: 14, right: 14 }
    });
    pdfFooter(doc);
    doc.save(`Pintorex-${currentBiz}-Transactions-${new Date().toISOString().split('T')[0]}.pdf`);
    Toast.success('Transaction report downloaded!');
}

function generateProfitPDF() {
    const items = StockDB.getAll();
    if (!items.length) { Toast.error('No stock data to analyze.'); return; }

    const cats = CATEGORIES[currentBiz];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdfHeader(doc, 'PROFIT ANALYSIS REPORT', `${items.length} items`, false);

    const catData = cats.map(cat => {
        const catItems = items.filter(i => i.category === cat);
        const costVal = catItems.reduce((s, i) => s + calcStockValue(i.qty, i.cost), 0);
        const revVal = catItems.reduce((s, i) => s + calcRevenuePotential(i.qty, i.sell), 0);
        const profit = revVal - costVal;
        const margin = costVal > 0 ? (profit / costVal) * 100 : 0;
        return { cat, count: catItems.length, costVal, revVal, profit, margin };
    }).filter(d => d.count > 0);

    const totals = catData.reduce((s, d) => ({
        count: s.count + d.count,
        costVal: s.costVal + d.costVal,
        revVal: s.revVal + d.revVal,
        profit: s.profit + d.profit
    }), { count: 0, costVal: 0, revVal: 0, profit: 0 });

    doc.autoTable({
        startY: 46,
        head: [['Category', 'Items', 'Cost Value', 'Revenue Potential', 'Potential Profit', 'Margin %']],
        body: catData.map(d => [d.cat, d.count, fmtKES(d.costVal), fmtKES(d.revVal), fmtKES(d.profit), d.margin.toFixed(1) + '%']),
        foot: [['TOTAL', totals.count, fmtKES(totals.costVal), fmtKES(totals.revVal), fmtKES(totals.profit),
            totals.costVal > 0 ? ((totals.profit / totals.costVal) * 100).toFixed(1) + '%' : '0%']],
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [31, 41, 55], textColor: [255,255,255], fontStyle: 'bold' },
        footStyles: { fillColor: [249, 115, 22], textColor: [255,255,255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
                const m = parseFloat(data.row.raw[5]);
                data.cell.styles.textColor = m >= 30 ? [5, 150, 105] : m >= 10 ? [217, 119, 6] : [220, 38, 38];
                data.cell.styles.fontStyle = 'bold';
            }
        },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' }, 5: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
    });
    pdfFooter(doc, false);
    doc.save(`Pintorex-${currentBiz}-ProfitAnalysis-${new Date().toISOString().split('T')[0]}.pdf`);
    Toast.success('Profit analysis downloaded!');
}

// ============================================================================
// REFRESH ALL
// ============================================================================
function refreshAll() {
    if (currentView === 'dashboard') renderDashboard();
    if (currentView === 'inventory') renderInventoryTable();
    if (currentView === 'transactions') renderTransactionsTable();
    if (currentView === 'reports') renderReportsView();
    // Always refresh dashboard stats
    if (currentView !== 'dashboard') renderDashboard();
}

// ============================================================================
// AUTHENTICATION INIT
// ============================================================================
function initAuth() {
    const loginGate = document.getElementById('loginGate');
    const mainApp = document.getElementById('mainApp');

    const showApp = () => {
        loginGate.classList.add('hidden');
        mainApp.classList.remove('hidden');
        document.getElementById('sessionDot').style.background = '#10B981';
        document.getElementById('sessionLabel').textContent = 'Session active';
        populateCategoryDropdowns();
        renderDashboard();
    };

    const showLogin = () => {
        loginGate.classList.remove('hidden');
        mainApp.classList.add('hidden');
        document.getElementById('sessionDot').style.background = '#EF4444';
        document.getElementById('sessionLabel').textContent = 'Not authenticated';
    };

    if (Auth.isAuthenticated()) {
        showApp();
    } else if (Auth.hasOfflineToken()) {
        Auth.createSession();
        showApp();
        if (!navigator.onLine) Toast.info('Working offline with cached credentials');
    } else {
        showLogin();
    }

    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const pwd = document.getElementById('loginPassword').value;
        const loginBtn = document.getElementById('loginBtn');
        const loginText = document.getElementById('loginText');
        const loginSpinner = document.getElementById('loginSpinner');
        const loginError = document.getElementById('loginError');
        if (!pwd) { loginError.textContent = 'Please enter your password.'; loginError.classList.remove('hidden'); return; }

        loginBtn.disabled = true;
        loginText.classList.add('hidden');
        loginSpinner.classList.remove('hidden');
        loginError.classList.add('hidden');

        try {
            const res = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                Auth.createSession();
                if (data.offlineToken) Auth.storeToken(data.offlineToken);
                showApp();
                Toast.success('Login successful!');
            } else {
                loginError.textContent = data.error || 'Invalid password';
                loginError.classList.remove('hidden');
                document.getElementById('loginPassword').value = '';
                document.getElementById('loginPassword').focus();
            }
        } catch {
            if (Auth.hasOfflineToken()) {
                Auth.createSession();
                showApp();
                Toast.info('Logged in offline (cached session)');
            } else {
                loginError.textContent = navigator.onLine ? 'Network error. Please try again.' : 'You are offline. Please log in online first.';
                loginError.classList.remove('hidden');
            }
        } finally {
            loginBtn.disabled = false;
            loginText.classList.remove('hidden');
            loginSpinner.classList.add('hidden');
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());
}

// ============================================================================
// BOOT
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
});
