// ============================================================================
// PINTOREX EMPLOYEE MANAGEMENT SYSTEM
// Full employee registration, payment tracking, and PDF payslip generation
// ============================================================================

'use strict';

// ============================================================================
// STORAGE KEYS (offline fallback)
// ============================================================================
const EMP_KEY = 'pintorex_employees';
const PAY_KEY = 'pintorex_payments';
const SESSION_KEY = 'pintorex_session';
const OFFLINE_TOKEN_KEY = 'pintorex_offline_token';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================
const SUPABASE_URL = 'https://qjqgfbwirphnrbnvsbar.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcWdmYndpcnBobnJibnZzYmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NzQ0MjYsImV4cCI6MjA4NTM1MDQyNn0.WM2V0PlIpQAVzVSva9twFHPTNnrbgRKK-tQ3bPTPk_0';
let sbClient = null;
try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) { console.warn('Supabase not available:', e); }

function genUUID() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// Safe localStorage setter — guards against QuotaExceededError
function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn('[Storage] Quota exceeded for key:', key);
            setTimeout(() => { if (typeof Toast !== 'undefined') Toast.error('Storage full. Please clear browser storage.'); }, 0);
        }
    }
}

// Sync queue — retry failed Supabase writes when back online
const SyncQueue = {
    KEY: 'pintorex_emp_sync_queue',
    _get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } },
    push(table, op, data) {
        try {
            const q = this._get();
            q.push({ id: genUUID(), table, op, data, at: Date.now() });
            localStorage.setItem(this.KEY, JSON.stringify(q.slice(-100)));
        } catch {}
    },
    remove(id) {
        try { localStorage.setItem(this.KEY, JSON.stringify(this._get().filter(i => i.id !== id))); } catch {}
    },
    async flush(client) {
        if (!client || !navigator.onLine) return;
        const items = this._get();
        if (!items.length) return;
        for (const item of items) {
            try {
                let error;
                if (item.op === 'insert') ({ error } = await client.from(item.table).insert(item.data));
                else if (item.op === 'update') ({ error } = await client.from(item.table).update(item.data).eq('id', item.data.id));
                else if (item.op === 'delete') ({ error } = await client.from(item.table).delete().eq('id', item.data));
                if (!error) this.remove(item.id);
            } catch {}
        }
    }
};

// ============================================================================
// UTILITY HELPERS
// ============================================================================

function fmtKES(n) {
    const num = parseFloat(n) || 0;
    return 'KES ' + num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(str) {
    if (!str) return '—';
    try {
        return new Date(str).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return str; }
}

function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function currentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

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
// EMPLOYEE DATA MANAGER (Supabase + localStorage fallback)
// ============================================================================
const EmployeeManager = {
    _employees: [],

    getAll() { return this._employees; },

    async load() {
        if (sbClient) {
            try {
                const { data, error } = await sbClient.from('employees').select('*').order('created_at', { ascending: true });
                if (error) throw error;
                this._employees = (data || []).map(r => this._fromDB(r));
                localStorage.setItem(EMP_KEY, JSON.stringify(this._employees));
                return;
            } catch (e) { console.warn('Supabase employee load failed, using localStorage:', e); }
        }
        try { this._employees = JSON.parse(localStorage.getItem(EMP_KEY)) || []; } catch { this._employees = []; }
    },

    nextCode() {
        const nums = this._employees.map(e => parseInt((e.code || '').replace('EMP-', '')) || 0);
        return 'EMP-' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
    },

    add(emp) {
        emp.id = genUUID();
        emp.code = emp.code || this.nextCode();
        emp.createdAt = new Date().toISOString();
        this._employees.push(emp);
        this._syncAdd(emp);
        return emp;
    },

    async _syncAdd(emp) {
        if (!sbClient) return;
        try {
            const { error } = await sbClient.from('employees').insert(this._toDB(emp));
            if (error) throw error;
        } catch (e) {
            console.warn('Employee add sync failed — queued:', e);
            SyncQueue.push('employees', 'insert', this._toDB(emp));
        }
    },

    update(emp) {
        const idx = this._employees.findIndex(e => e.id === emp.id);
        if (idx >= 0) this._employees[idx] = { ...this._employees[idx], ...emp };
        this._syncUpdate(emp);
    },

    async _syncUpdate(emp) {
        if (!sbClient) return;
        try {
            const { error } = await sbClient.from('employees').update(this._toDB(emp)).eq('id', emp.id);
            if (error) throw error;
        } catch (e) {
            console.warn('Employee update sync failed — queued:', e);
            SyncQueue.push('employees', 'update', this._toDB(emp));
        }
    },

    delete(id) {
        this._employees = this._employees.filter(e => e.id !== id);
        // Cascade: remove payments for this employee from cache
        PaymentManager._payments = PaymentManager._payments.filter(p => p.employeeId !== id);
        this._syncDelete(id);
    },

    async _syncDelete(id) {
        if (!sbClient) return;
        try {
            const { error } = await sbClient.from('employees').delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn('Employee delete sync failed — queued:', e);
            SyncQueue.push('employees', 'delete', id);
        }
    },

    getById(id) { return this._employees.find(e => e.id === id); },

    _toDB(emp) {
        return {
            id: emp.id,
            code: emp.code || null,
            name: emp.name,
            role: emp.role || null,
            dept: emp.dept || null,
            phone: emp.phone || null,
            id_no: emp.idNo || null,
            start_date: emp.startDate || null,
            status: emp.status || 'Active',
            pay_period: emp.payPeriod || 'Monthly',
            base_pay: parseFloat(emp.basePay) || 0,
            allowances: emp.allowances || [],
            remarks: emp.remarks || null,
            updated_at: new Date().toISOString()
        };
    },

    _fromDB(row) {
        return {
            id: row.id,
            code: row.code || '',
            name: row.name,
            role: row.role || '',
            dept: row.dept || '',
            phone: row.phone || '',
            idNo: row.id_no || '',
            startDate: row.start_date || '',
            status: row.status || 'Active',
            payPeriod: row.pay_period || 'Monthly',
            basePay: parseFloat(row.base_pay) || 0,
            allowances: row.allowances || [],
            remarks: row.remarks || '',
            createdAt: row.created_at
        };
    }
};

// ============================================================================
// PAYMENT DATA MANAGER (Supabase + localStorage fallback)
// ============================================================================
const PaymentManager = {
    _payments: [],

    getAll() { return this._payments; },

    async load() {
        if (sbClient) {
            try {
                const { data, error } = await sbClient.from('payments').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                this._payments = (data || []).map(r => this._fromDB(r));
                localStorage.setItem(PAY_KEY, JSON.stringify(this._payments));
                return;
            } catch (e) { console.warn('Supabase payment load failed, using localStorage:', e); }
        }
        try { this._payments = JSON.parse(localStorage.getItem(PAY_KEY)) || []; } catch { this._payments = []; }
    },

    add(pay) {
        pay.id = genUUID();
        pay.createdAt = new Date().toISOString();
        this._payments.unshift(pay);
        this._syncAdd(pay);
        return pay;
    },

    async _syncAdd(pay) {
        if (!sbClient) return;
        try {
            const { error } = await sbClient.from('payments').insert(this._toDB(pay));
            if (error) {
                if (error.code === '23503') {
                    // FK not yet synced — retry once after delay, then queue
                    await new Promise(r => setTimeout(r, 2000));
                    const { error: e2 } = await sbClient.from('payments').insert(this._toDB(pay));
                    if (e2) {
                        console.warn('Payment add retry failed — queued:', e2);
                        SyncQueue.push('payments', 'insert', this._toDB(pay));
                    }
                } else {
                    console.warn('Payment add sync failed — queued:', error);
                    SyncQueue.push('payments', 'insert', this._toDB(pay));
                }
            }
        } catch (e) {
            console.warn('Payment add sync error — queued:', e);
            SyncQueue.push('payments', 'insert', this._toDB(pay));
        }
    },

    update(pay) {
        const idx = this._payments.findIndex(p => p.id === pay.id);
        if (idx >= 0) this._payments[idx] = { ...this._payments[idx], ...pay };
        this._syncUpdate(pay);
    },

    async _syncUpdate(pay) {
        if (!sbClient) return;
        try {
            const { error } = await sbClient.from('payments').update(this._toDB(pay)).eq('id', pay.id);
            if (error) throw error;
        } catch (e) {
            console.warn('Payment update sync failed — queued:', e);
            SyncQueue.push('payments', 'update', this._toDB(pay));
        }
    },

    delete(id) {
        this._payments = this._payments.filter(p => p.id !== id);
        this._syncDelete(id);
    },

    async _syncDelete(id) {
        if (!sbClient) return;
        try {
            const { error } = await sbClient.from('payments').delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn('Payment delete sync failed — queued:', e);
            SyncQueue.push('payments', 'delete', id);
        }
    },

    getById(id) { return this._payments.find(p => p.id === id); },
    forEmployee(empId) { return this._payments.filter(p => p.employeeId === empId); },

    _toDB(pay) {
        return {
            id: pay.id,
            employee_id: pay.employeeId,
            from_date: pay.fromDate || null,
            to_date: pay.toDate || null,
            period_label: pay.periodLabel || null,
            units: parseFloat(pay.units) || 1,
            base_rate: parseFloat(pay.baseRate) || 0,
            base_pay: parseFloat(pay.basePay) || 0,
            allowances: pay.allowances || [],
            total_allowances: parseFloat(pay.totalAllowances) || 0,
            deductions: pay.deductions || [],
            total_deductions: parseFloat(pay.totalDeductions) || 0,
            gross_pay: parseFloat(pay.grossPay) || 0,
            net_pay: parseFloat(pay.netPay) || 0,
            method: pay.method || 'Cash',
            status: pay.status || 'Pending',
            date_paid: pay.datePaid || null,
            remarks: pay.remarks || null
        };
    },

    _fromDB(row) {
        return {
            id: row.id,
            employeeId: row.employee_id,
            fromDate: row.from_date || '',
            toDate: row.to_date || '',
            periodLabel: row.period_label || '',
            units: parseFloat(row.units) || 1,
            baseRate: parseFloat(row.base_rate) || 0,
            basePay: parseFloat(row.base_pay) || 0,
            allowances: row.allowances || [],
            totalAllowances: parseFloat(row.total_allowances) || 0,
            deductions: row.deductions || [],
            totalDeductions: parseFloat(row.total_deductions) || 0,
            grossPay: parseFloat(row.gross_pay) || 0,
            netPay: parseFloat(row.net_pay) || 0,
            method: row.method || 'Cash',
            status: row.status || 'Pending',
            datePaid: row.date_paid || null,
            remarks: row.remarks || '',
            createdAt: row.created_at
        };
    }
};

// ============================================================================
// DASHBOARD STATS
// ============================================================================
function refreshDashboard() {
    const employees = EmployeeManager.getAll();
    const payments = PaymentManager.getAll();
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    document.getElementById('statTotalEmp').textContent = employees.length;
    document.getElementById('statActiveEmp').textContent = employees.filter(e => e.status === 'Active').length;

    const pending = payments.filter(p => p.status === 'Pending' || p.status === 'Partial');
    const pendingTotal = pending.reduce((sum, p) => sum + (parseFloat(p.netPay) || 0), 0);
    document.getElementById('statPendingAmt').textContent = fmtKES(pendingTotal);

    const paidThisMonth = payments.filter(p => p.status === 'Paid' && (p.datePaid || '').startsWith(monthKey));
    const paidTotal = paidThisMonth.reduce((sum, p) => sum + (parseFloat(p.netPay) || 0), 0);
    document.getElementById('statPaidMonth').textContent = fmtKES(paidTotal);

    renderRecentPayments(payments.slice(0, 10));
}

function renderRecentPayments(payments) {
    const tbody = document.getElementById('recentPaymentsBody');
    if (!payments.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-400 py-8">No payments yet</td></tr>';
        return;
    }
    tbody.innerHTML = payments.map(p => {
        const emp = EmployeeManager.getById(p.employeeId);
        const badge = statusBadge(p.status);
        return `<tr>
            <td class="font-medium">${esc(emp ? emp.name : '—')}</td>
            <td class="text-gray-500 text-xs">${esc(p.periodLabel || '')}</td>
            <td class="font-semibold">${fmtKES(p.netPay)}</td>
            <td>${badge}</td>
        </tr>`;
    }).join('');
}

function statusBadge(status) {
    const map = { 'Paid': 'badge-green', 'Pending': 'badge-yellow', 'Partial': 'badge-orange' };
    return `<span class="badge ${map[status] || 'badge-gray'}">${esc(status)}</span>`;
}

// ============================================================================
// TABS
// ============================================================================
function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
    if (name === 'dashboard') refreshDashboard();
    if (name === 'employees') renderEmployeesTable();
    if (name === 'payments') renderPaymentsTable();
    if (name === 'reports') renderReportsTab();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ============================================================================
// EMPLOYEES TABLE
// ============================================================================
function renderEmployeesTable() {
    const search = (document.getElementById('empSearch').value || '').toLowerCase();
    const statusFilter = document.getElementById('empStatusFilter').value;
    let employees = EmployeeManager.getAll();

    if (search) employees = employees.filter(e =>
        (e.name || '').toLowerCase().includes(search) ||
        (e.code || '').toLowerCase().includes(search) ||
        (e.role || '').toLowerCase().includes(search) ||
        (e.dept || '').toLowerCase().includes(search)
    );
    if (statusFilter) employees = employees.filter(e => e.status === statusFilter);

    const tbody = document.getElementById('employeesBody');
    const empty = document.getElementById('empEmpty');

    if (!employees.length) {
        tbody.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    const statusMap = { 'Active': 'badge-green', 'Inactive': 'badge-red', 'On Leave': 'badge-yellow' };
    tbody.innerHTML = employees.map(e => `
        <tr>
            <td><span class="badge badge-gray font-mono">${esc(e.code)}</span></td>
            <td class="font-medium">${esc(e.name)}</td>
            <td>${esc(e.role || '—')}</td>
            <td class="text-gray-500">${esc(e.dept || '—')}</td>
            <td><span class="badge badge-blue">${esc(e.payPeriod || 'Monthly')}</span></td>
            <td class="font-semibold">${fmtKES(e.basePay)}<span class="text-xs text-gray-400">/${payPeriodShort(e.payPeriod)}</span></td>
            <td><span class="badge ${statusMap[e.status] || 'badge-gray'}">${esc(e.status)}</span></td>
            <td>
                <div class="flex gap-2">
                    <button onclick="editEmployee('${e.id}')" class="btn btn-outline btn-xs">Edit</button>
                    <button onclick="viewEmployeePayments('${e.id}')" class="btn btn-xs" style="background:#EFF6FF;color:#1E40AF;border:none">Payments</button>
                    <button onclick="confirmDeleteEmployee('${e.id}')" class="btn btn-xs" style="background:#FEE2E2;color:#991B1B;border:none">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function payPeriodShort(period) {
    const map = { 'Daily': 'day', 'Weekly': 'week', 'Monthly': 'month' };
    return map[period] || 'period';
}

// ============================================================================
// PAYMENTS TABLE
// ============================================================================
function renderPaymentsTable() {
    const empFilter = document.getElementById('payEmpFilter').value;
    const statusFilter = document.getElementById('payStatusFilter').value;
    let payments = PaymentManager.getAll();

    if (empFilter) payments = payments.filter(p => p.employeeId === empFilter);
    if (statusFilter) payments = payments.filter(p => p.status === statusFilter);

    const tbody = document.getElementById('paymentsBody');
    const empty = document.getElementById('payEmpty');

    if (!payments.length) {
        tbody.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    const methodBadge = { 'Cash': 'badge-gray', 'M-Pesa': 'badge-green', 'Bank Transfer': 'badge-blue' };
    tbody.innerHTML = payments.map(p => {
        const emp = EmployeeManager.getById(p.employeeId);
        return `<tr>
            <td class="font-medium">${esc(emp ? emp.name : '—')}<br><span class="text-xs text-gray-400">${esc(emp ? emp.code : '')}</span></td>
            <td class="text-xs text-gray-600">${esc(p.periodLabel || '')}<br><span class="text-gray-400">${fmtDate(p.fromDate)} – ${fmtDate(p.toDate)}</span></td>
            <td>${fmtKES(p.grossPay)}</td>
            <td class="text-red-500">${fmtKES(p.totalDeductions)}</td>
            <td class="font-bold text-orange-600">${fmtKES(p.netPay)}</td>
            <td><span class="badge ${methodBadge[p.method] || 'badge-gray'}">${esc(p.method || 'Cash')}</span></td>
            <td>${statusBadge(p.status)}</td>
            <td class="text-xs text-gray-500">${p.datePaid ? fmtDate(p.datePaid) : '—'}</td>
            <td>
                <div class="flex gap-2 flex-wrap">
                    ${p.status !== 'Paid' ? `<button onclick="quickMarkPaid('${p.id}')" class="btn btn-xs btn-success">Mark Paid</button>` : ''}
                    <button onclick="generatePaySlip('${p.id}')" class="btn btn-xs btn-secondary" title="Download Pay Slip">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                        Slip
                    </button>
                    <button onclick="editPayment('${p.id}')" class="btn btn-outline btn-xs">Edit</button>
                    <button onclick="confirmDeletePayment('${p.id}')" class="btn btn-xs" style="background:#FEE2E2;color:#991B1B;border:none">Del</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function quickMarkPaid(payId) {
    const pay = PaymentManager.getById(payId);
    if (!pay) return;
    pay.status = 'Paid';
    pay.datePaid = new Date().toISOString().split('T')[0];
    PaymentManager.update(pay);
    renderPaymentsTable();
    refreshDashboard();
    Toast.success('Payment marked as paid!');
}

// ============================================================================
// EMPLOYEE MODAL
// ============================================================================
let _editingEmpId = null;

function openEmployeeModal(empId = null) {
    _editingEmpId = empId;
    const form = document.getElementById('employeeForm');
    form.reset();
    document.getElementById('allowancesContainer').innerHTML = '';
    document.getElementById('empModalTitle').textContent = empId ? 'EDIT EMPLOYEE' : 'ADD EMPLOYEE';

    if (empId) {
        const emp = EmployeeManager.getById(empId);
        if (!emp) return;
        document.getElementById('empId').value = emp.id;
        document.getElementById('empCode').value = emp.code || '';
        document.getElementById('empName').value = emp.name || '';
        document.getElementById('empRole').value = emp.role || '';
        document.getElementById('empDept').value = emp.dept || '';
        document.getElementById('empPhone').value = emp.phone || '';
        document.getElementById('empIdNo').value = emp.idNo || '';
        document.getElementById('empStartDate').value = emp.startDate || '';
        document.getElementById('empStatus').value = emp.status || 'Active';
        document.getElementById('empPayPeriod').value = emp.payPeriod || 'Monthly';
        document.getElementById('empBasePay').value = emp.basePay || '';
        document.getElementById('empRemarks').value = emp.remarks || '';
        (emp.allowances || []).forEach(a => addAllowanceRow(a.name, a.amount));
    } else {
        document.getElementById('empCode').value = EmployeeManager.nextCode();
        document.getElementById('empStatus').value = 'Active';
        document.getElementById('empPayPeriod').value = 'Monthly';
    }
    updatePayPeriodLabel();
    document.getElementById('employeeModal').classList.add('open');
    document.getElementById('empName').focus();
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').classList.remove('open');
    _editingEmpId = null;
}

function editEmployee(id) { openEmployeeModal(id); }

function updatePayPeriodLabel() {
    const period = document.getElementById('empPayPeriod').value;
    const map = { 'Daily': 'Base Pay per Day (KES)', 'Weekly': 'Base Pay per Week (KES)', 'Monthly': 'Base Pay per Month (KES)' };
    document.getElementById('basePayLabel').textContent = map[period] || 'Base Pay (KES)';
}

function addAllowanceRow(name = '', amount = '') {
    const container = document.getElementById('allowancesContainer');
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML = `
        <input type="text" placeholder="Allowance name (e.g. Transport)" value="${esc(name)}" class="allowance-name">
        <input type="number" placeholder="Amount (KES)" value="${amount}" class="allowance-amount" min="0" step="0.01" oninput="calcPaymentTotal()">
        <button type="button" class="remove-row-btn" onclick="this.closest('.dynamic-row').remove();calcPaymentTotal()">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>`;
    container.appendChild(div);
}

document.getElementById('employeeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('empName').value.trim();
    const role = document.getElementById('empRole').value.trim();
    const basePay = parseFloat(document.getElementById('empBasePay').value) || 0;

    if (!name) { Toast.error('Employee name is required.'); return; }
    if (!role) { Toast.error('Role / Position is required.'); return; }

    const allowances = [...document.querySelectorAll('#allowancesContainer .dynamic-row')].map(row => ({
        name: row.querySelector('.allowance-name').value.trim(),
        amount: parseFloat(row.querySelector('.allowance-amount').value) || 0
    })).filter(a => a.name);

    const emp = {
        id: document.getElementById('empId').value,
        code: document.getElementById('empCode').value,
        name,
        role,
        dept: document.getElementById('empDept').value.trim(),
        phone: document.getElementById('empPhone').value.trim(),
        idNo: document.getElementById('empIdNo').value.trim(),
        startDate: document.getElementById('empStartDate').value,
        status: document.getElementById('empStatus').value,
        payPeriod: document.getElementById('empPayPeriod').value,
        basePay,
        allowances,
        remarks: document.getElementById('empRemarks').value.trim()
    };

    if (emp.id) {
        EmployeeManager.update(emp);
        Toast.success('Employee updated successfully!');
    } else {
        EmployeeManager.add(emp);
        Toast.success('Employee added successfully!');
    }

    closeEmployeeModal();
    refreshAll();
});

// ============================================================================
// PAYMENT MODAL
// ============================================================================
let _editingPayId = null;

function openPaymentModal(payId = null, presetEmpId = null) {
    _editingPayId = payId;
    const form = document.getElementById('paymentForm');
    form.reset();
    document.getElementById('payAllowancesContainer').innerHTML = '';
    document.getElementById('deductionsContainer').innerHTML = '';
    document.getElementById('payModalTitle').textContent = payId ? 'EDIT PAYMENT' : 'RECORD PAYMENT';

    populateEmployeeDropdown('payEmployee');

    if (payId) {
        const pay = PaymentManager.getById(payId);
        if (!pay) return;
        document.getElementById('payId').value = pay.id;
        document.getElementById('payEmployee').value = pay.employeeId;
        document.getElementById('payFrom').value = pay.fromDate || '';
        document.getElementById('payTo').value = pay.toDate || '';
        document.getElementById('payUnits').value = pay.units || '';
        document.getElementById('payBaseRate').value = pay.baseRate || '';
        document.getElementById('payMethod').value = pay.method || 'Cash';
        document.getElementById('payStatus').value = pay.status || 'Pending';
        document.getElementById('payDatePaid').value = pay.datePaid || '';
        document.getElementById('payRemarks').value = pay.remarks || '';
        (pay.allowances || []).forEach(a => addPayAllowanceRow(a.name, a.amount));
        (pay.deductions || []).forEach(d => addDeductionRow(d.name, d.amount));
        updateUnitsLabel(pay.employeeId);
    } else if (presetEmpId) {
        document.getElementById('payEmployee').value = presetEmpId;
        onPaymentEmployeeChange();
    }

    togglePaidDate();
    calcPaymentTotal();
    document.getElementById('paymentModal').classList.add('open');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('open');
    _editingPayId = null;
}

function editPayment(id) { openPaymentModal(id); }

function onPaymentEmployeeChange() {
    const empId = document.getElementById('payEmployee').value;
    if (!empId) return;
    const emp = EmployeeManager.getById(empId);
    if (!emp) return;
    document.getElementById('payBaseRate').value = emp.basePay || '';
    document.getElementById('payAllowancesContainer').innerHTML = '';
    (emp.allowances || []).forEach(a => addPayAllowanceRow(a.name, a.amount));
    updateUnitsLabel(empId);
    calcPaymentTotal();
}

function updateUnitsLabel(empId) {
    const emp = empId ? EmployeeManager.getById(empId) : null;
    const period = emp ? emp.payPeriod : 'Monthly';
    const map = { 'Daily': 'Days Worked', 'Weekly': 'Weeks Worked', 'Monthly': 'Months Worked' };
    document.getElementById('unitsWorkedLabel').textContent = map[period] || 'Units Worked';
    const hint = { 'Daily': 'Leave blank to use 1 day', 'Weekly': 'Leave blank to use 1 week', 'Monthly': 'Leave blank to use 1 month' };
    document.getElementById('unitsHint').textContent = hint[period] || 'Leave blank to use 1 unit';
}

function addPayAllowanceRow(name = '', amount = '') {
    const container = document.getElementById('payAllowancesContainer');
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML = `
        <input type="text" placeholder="Allowance name" value="${esc(name)}" class="pay-allowance-name">
        <input type="number" placeholder="Amount (KES)" value="${amount}" class="pay-allowance-amount" min="0" step="0.01" oninput="calcPaymentTotal()">
        <button type="button" class="remove-row-btn" onclick="this.closest('.dynamic-row').remove();calcPaymentTotal()">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>`;
    container.appendChild(div);
}

function addDeductionRow(name = '', amount = '') {
    const container = document.getElementById('deductionsContainer');
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML = `
        <input type="text" placeholder="Deduction name (e.g. Advance)" value="${esc(name)}" class="deduction-name">
        <input type="number" placeholder="Amount (KES)" value="${amount}" class="deduction-amount" min="0" step="0.01" oninput="calcPaymentTotal()">
        <button type="button" class="remove-row-btn" onclick="this.closest('.dynamic-row').remove();calcPaymentTotal()">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>`;
    container.appendChild(div);
}

function calcPaymentTotal() {
    const baseRate = parseFloat(document.getElementById('payBaseRate').value) || 0;
    const units = parseFloat(document.getElementById('payUnits').value) || 1;
    const basePay = baseRate * units;

    const allowances = [...document.querySelectorAll('.pay-allowance-amount')].reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    const deductions = [...document.querySelectorAll('.deduction-amount')].reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    const gross = basePay + allowances;
    const net = gross - deductions;

    document.getElementById('summaryBase').textContent = fmtKES(basePay);
    document.getElementById('summaryAllowances').textContent = '+ ' + fmtKES(allowances);
    document.getElementById('summaryGross').textContent = fmtKES(gross);
    document.getElementById('summaryDeductions').textContent = '- ' + fmtKES(deductions);
    document.getElementById('summaryNet').textContent = fmtKES(Math.max(0, net));
}

function togglePaidDate() {
    const status = document.getElementById('payStatus').value;
    const group = document.getElementById('paidDateGroup');
    if (status === 'Paid') {
        group.style.opacity = '1';
        if (!document.getElementById('payDatePaid').value) {
            document.getElementById('payDatePaid').value = new Date().toISOString().split('T')[0];
        }
    } else {
        group.style.opacity = '0.5';
    }
}

function markAsPaid(e) {
    e.preventDefault();
    document.getElementById('payStatus').value = 'Paid';
    if (!document.getElementById('payDatePaid').value) {
        document.getElementById('payDatePaid').value = new Date().toISOString().split('T')[0];
    }
    document.getElementById('paymentForm').dispatchEvent(new Event('submit'));
}

function buildPeriodLabel(fromDate, toDate) {
    if (!fromDate && !toDate) return '';
    if (!toDate) return fmtDate(fromDate);
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
        return from.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
    }
    return `${from.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })} – ${to.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}`;
}

document.getElementById('paymentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const empId = document.getElementById('payEmployee').value;
    if (!empId) { Toast.error('Please select an employee.'); return; }

    const baseRate = parseFloat(document.getElementById('payBaseRate').value) || 0;
    const units = parseFloat(document.getElementById('payUnits').value) || 1;
    const basePay = baseRate * units;
    const allowances = [...document.querySelectorAll('.pay-allowance-name')].map((el, i) => ({
        name: el.value.trim(),
        amount: parseFloat(document.querySelectorAll('.pay-allowance-amount')[i].value) || 0
    })).filter(a => a.name);
    const deductions = [...document.querySelectorAll('.deduction-name')].map((el, i) => ({
        name: el.value.trim(),
        amount: parseFloat(document.querySelectorAll('.deduction-amount')[i].value) || 0
    })).filter(d => d.name);
    const totalAllowances = allowances.reduce((s, a) => s + a.amount, 0);
    const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
    const grossPay = basePay + totalAllowances;
    const netPay = Math.max(0, grossPay - totalDeductions);

    const fromDate = document.getElementById('payFrom').value;
    const toDate = document.getElementById('payTo').value;

    const pay = {
        id: document.getElementById('payId').value,
        employeeId: empId,
        fromDate,
        toDate,
        periodLabel: buildPeriodLabel(fromDate, toDate),
        units,
        baseRate,
        basePay,
        allowances,
        totalAllowances,
        deductions,
        totalDeductions,
        grossPay,
        netPay,
        method: document.getElementById('payMethod').value,
        status: document.getElementById('payStatus').value,
        datePaid: document.getElementById('payDatePaid').value || null,
        remarks: document.getElementById('payRemarks').value.trim()
    };

    if (pay.id) {
        PaymentManager.update(pay);
        Toast.success('Payment updated successfully!');
    } else {
        PaymentManager.add(pay);
        Toast.success('Payment recorded successfully!');
    }
    closePaymentModal();
    refreshAll();
});

// ============================================================================
// VIEW EMPLOYEE PAYMENTS (quick switch to payments tab filtered)
// ============================================================================
function viewEmployeePayments(empId) {
    switchTab('payments');
    document.getElementById('payEmpFilter').value = empId;
    renderPaymentsTable();
}

// ============================================================================
// DELETE CONFIRMATION
// ============================================================================
let _pendingDelete = null;

function confirmDeleteEmployee(id) {
    const emp = EmployeeManager.getById(id);
    if (!emp) return;
    document.getElementById('deleteModalMsg').textContent = `Delete employee "${emp.name}" and all their payment records? This cannot be undone.`;
    _pendingDelete = { type: 'employee', id };
    document.getElementById('deleteModal').classList.add('open');
}

function confirmDeletePayment(id) {
    document.getElementById('deleteModalMsg').textContent = 'Delete this payment record? This cannot be undone.';
    _pendingDelete = { type: 'payment', id };
    document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('open');
    _pendingDelete = null;
}

document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
    if (!_pendingDelete) return;
    if (_pendingDelete.type === 'employee') {
        EmployeeManager.delete(_pendingDelete.id); // cascades payments in cache + Supabase FK cascade
        Toast.success('Employee deleted.');
    } else if (_pendingDelete.type === 'payment') {
        PaymentManager.delete(_pendingDelete.id);
        Toast.success('Payment deleted.');
    }
    closeDeleteModal();
    refreshAll();
});

// Close modals on overlay click
['employeeModal', 'paymentModal', 'deleteModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', function(e) {
        if (e.target === this) {
            if (id === 'employeeModal') closeEmployeeModal();
            if (id === 'paymentModal') closePaymentModal();
            if (id === 'deleteModal') closeDeleteModal();
        }
    });
});

// Escape key closes modals
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeEmployeeModal(); closePaymentModal(); closeDeleteModal();
    }
});

// ============================================================================
// POPULATE EMPLOYEE DROPDOWNS
// ============================================================================
function populateEmployeeDropdown(selectId) {
    const select = document.getElementById(selectId);
    const current = select.value;
    const employees = EmployeeManager.getAll().filter(e => e.status === 'Active' || e.status === 'On Leave');
    select.innerHTML = '<option value="">Select employee...</option>' +
        employees.map(e => `<option value="${e.id}">${esc(e.name)} (${esc(e.code)})</option>`).join('');
    if (current) select.value = current;
}

function populateAllEmployeeDropdowns() {
    const all = EmployeeManager.getAll();
    ['payEmpFilter', 'reportPayEmp'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">All Employees</option>' +
            all.map(e => `<option value="${e.id}">${esc(e.name)} (${esc(e.code)})</option>`).join('');
        if (cur) sel.value = cur;
    });
}

// ============================================================================
// REPORTS TAB
// ============================================================================
function renderReportsTab() {
    populateAllEmployeeDropdowns();
    const year = new Date().getFullYear();
    const yearSel = document.getElementById('reportYear');
    yearSel.innerHTML = '';
    for (let y = year; y >= year - 4; y--) {
        yearSel.innerHTML += `<option value="${y}">${y}</option>`;
    }
    renderMonthlySummary();
    // Set default date range: current year
    const reportFrom = document.getElementById('reportFrom');
    const reportTo = document.getElementById('reportTo');
    if (!reportFrom.value) reportFrom.value = `${year}-01`;
    if (!reportTo.value) reportTo.value = `${year}-12`;
}

function renderMonthlySummary() {
    const year = parseInt(document.getElementById('reportYear').value) || new Date().getFullYear();
    const payments = PaymentManager.getAll();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const tbody = document.getElementById('monthlySummaryBody');

    tbody.innerHTML = months.map((mon, idx) => {
        const monthKey = `${year}-${String(idx + 1).padStart(2, '0')}`;
        const monthPays = payments.filter(p => {
            const date = p.datePaid || p.fromDate || p.createdAt || '';
            return date.startsWith(monthKey);
        });
        const paid = monthPays.filter(p => p.status === 'Paid');
        const pending = monthPays.filter(p => p.status !== 'Paid');
        const grossTotal = paid.reduce((s, p) => s + (parseFloat(p.grossPay) || 0), 0);
        const dedTotal = paid.reduce((s, p) => s + (parseFloat(p.totalDeductions) || 0), 0);
        const netTotal = paid.reduce((s, p) => s + (parseFloat(p.netPay) || 0), 0);
        const pendingTotal = pending.reduce((s, p) => s + (parseFloat(p.netPay) || 0), 0);

        return `<tr>
            <td class="font-medium">${mon} ${year}</td>
            <td>${paid.length}</td>
            <td>${fmtKES(grossTotal)}</td>
            <td class="text-red-500">${fmtKES(dedTotal)}</td>
            <td class="font-semibold text-orange-600">${fmtKES(netTotal)}</td>
            <td class="${pending.length ? 'text-yellow-600 font-medium' : 'text-gray-400'}">${fmtKES(pendingTotal)}</td>
        </tr>`;
    }).join('');
}

// ============================================================================
// PDF GENERATION — PAY SLIP
// ============================================================================
function generatePaySlip(payId) {
    const pay = PaymentManager.getById(payId);
    if (!pay) { Toast.error('Payment not found.'); return; }
    const emp = EmployeeManager.getById(pay.employeeId);
    if (!emp) { Toast.error('Employee not found.'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const primary = [249, 115, 22];
    const secondary = [31, 41, 55];
    const subtle = [249, 250, 251];

    // Header background
    doc.setFillColor(...secondary);
    doc.rect(0, 0, 210, 40, 'F');

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PINTOREX CONSTRUCTION LIMITED', 14, 17);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text('Building Excellence, Crafting Dreams | Migori Town, Kenya', 14, 24);
    doc.text('+254 769 157174 | pintorexkenya@gmail.com', 14, 30);

    // PAY SLIP label box
    doc.setFillColor(...primary);
    doc.roundedRect(140, 8, 58, 24, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PAY SLIP', 169, 18, { align: 'center' });
    const slipNum = `PS-${pay.createdAt ? new Date(pay.createdAt).getFullYear() : new Date().getFullYear()}-${pay.id.substr(-4).toUpperCase()}`;
    doc.setFontSize(8);
    doc.text(slipNum, 169, 26, { align: 'center' });

    // Divider
    doc.setDrawColor(...primary);
    doc.setLineWidth(1);
    doc.line(0, 40, 210, 40);

    // Employee info box
    doc.setFillColor(...subtle);
    doc.rect(0, 41, 210, 36, 'F');

    doc.setTextColor(...secondary);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${emp.name}`, 14, 52);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`${emp.role || ''}${emp.dept ? ' | ' + emp.dept : ''}`, 14, 59);
    doc.text(`Employee ID: ${emp.code}`, 14, 66);
    if (emp.idNo) doc.text(`National ID: ${emp.idNo}`, 14, 72);

    doc.setTextColor(...secondary);
    doc.setFont('helvetica', 'bold');
    doc.text('Pay Period:', 130, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(pay.periodLabel || `${fmtDate(pay.fromDate)} – ${fmtDate(pay.toDate)}`, 130, 59);
    doc.text(`Pay Type: ${emp.payPeriod || 'Monthly'}`, 130, 66);
    doc.text(`Payment Method: ${pay.method || 'Cash'}`, 130, 72);

    let y = 82;

    // Earnings table
    const earningsRows = [
        [`Base Pay (${emp.payPeriod || 'Monthly'} × ${pay.units || 1})`, fmtKES(pay.basePay)],
        ...(pay.allowances || []).map(a => [a.name, fmtKES(a.amount)])
    ];
    doc.autoTable({
        startY: y,
        head: [['EARNINGS', 'AMOUNT']],
        body: earningsRows,
        foot: [['Gross Pay', fmtKES(pay.grossPay)]],
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: secondary, textColor: [255,255,255], fontStyle: 'bold' },
        footStyles: { fillColor: [237,237,237], textColor: secondary, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 130 }, 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
    });

    y = doc.lastAutoTable.finalY + 6;

    // Deductions table
    if (pay.deductions && pay.deductions.length > 0) {
        doc.autoTable({
            startY: y,
            head: [['DEDUCTIONS', 'AMOUNT']],
            body: pay.deductions.map(d => [d.name, fmtKES(d.amount)]),
            foot: [['Total Deductions', fmtKES(pay.totalDeductions)]],
            styles: { fontSize: 9, cellPadding: 5 },
            headStyles: { fillColor: [239, 68, 68], textColor: [255,255,255], fontStyle: 'bold' },
            footStyles: { fillColor: [254, 226, 226], textColor: [153, 27, 27], fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 130 }, 1: { halign: 'right', fontStyle: 'bold' } },
            margin: { left: 14, right: 14 }
        });
        y = doc.lastAutoTable.finalY + 6;
    }

    // NET PAY box
    doc.setFillColor(...primary);
    doc.roundedRect(14, y, 182, 22, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('NET PAY', 22, y + 8);
    doc.setFontSize(14);
    doc.text(fmtKES(pay.netPay), 192, y + 9, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const statusLabel = pay.status === 'Paid' ? `PAID on ${fmtDate(pay.datePaid)}` : pay.status.toUpperCase();
    doc.text(statusLabel, 192, y + 16, { align: 'right' });
    y += 30;

    // Remarks
    if (pay.remarks) {
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(8);
        doc.text(`Note: ${pay.remarks}`, 14, y);
        y += 8;
    }

    // Signatures
    y = Math.max(y + 10, 230);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 80, y);
    doc.line(130, y, 196, y);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.text('Employer Signature', 14, y + 5);
    doc.text('Employee Signature', 130, y + 5);

    // Footer
    const pageH = doc.internal.pageSize.height;
    doc.setFillColor(...secondary);
    doc.rect(0, pageH - 12, 210, 12, 'F');
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleString('en-KE')} | Pintorex Construction Limited | Confidential`, 105, pageH - 5, { align: 'center' });

    doc.save(`PaySlip-${emp.name.replace(/\s/g, '_')}-${pay.periodLabel || pay.id}.pdf`);
    Toast.success('Pay slip downloaded!');
}

// ============================================================================
// PDF — EMPLOYEE LIST REPORT
// ============================================================================
function generateEmployeeReportPDF() {
    const statusFilter = document.getElementById('reportEmpStatus').value;
    let employees = EmployeeManager.getAll();
    if (statusFilter) employees = employees.filter(e => e.status === statusFilter);

    if (!employees.length) { Toast.error('No employees to export.'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    pdfHeader(doc, 'EMPLOYEE REGISTER', statusFilter ? `Status: ${statusFilter}` : 'All Employees');

    doc.autoTable({
        startY: 48,
        head: [['ID', 'Full Name', 'Role', 'Department', 'Phone', 'Pay Period', 'Base Pay', 'Status', 'Start Date']],
        body: employees.map(e => [
            e.code, e.name, e.role || '—', e.dept || '—', e.phone || '—',
            e.payPeriod || 'Monthly', fmtKES(e.basePay), e.status, fmtDate(e.startDate)
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [31, 41, 55], textColor: [255,255,255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 6: { halign: 'right' } },
        margin: { left: 14, right: 14 }
    });

    pdfFooter(doc);
    doc.save(`Pintorex-Employee-Register-${new Date().toISOString().split('T')[0]}.pdf`);
    Toast.success('Employee report downloaded!');
}

// ============================================================================
// PDF — PAYMENT HISTORY REPORT
// ============================================================================
function generatePaymentReportPDF() {
    const empId = document.getElementById('reportPayEmp').value;
    const fromMonth = document.getElementById('reportFrom').value;
    const toMonth = document.getElementById('reportTo').value;

    let payments = PaymentManager.getAll();
    if (empId) payments = payments.filter(p => p.employeeId === empId);
    if (fromMonth) payments = payments.filter(p => {
        const d = p.fromDate || p.datePaid || p.createdAt || '';
        return d >= fromMonth;
    });
    if (toMonth) payments = payments.filter(p => {
        const d = p.fromDate || p.datePaid || p.createdAt || '';
        return d <= toMonth + '-31';
    });

    if (!payments.length) { Toast.error('No payments match the selected filters.'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const emp = empId ? EmployeeManager.getById(empId) : null;
    const subtitle = emp ? `Employee: ${emp.name} (${emp.code})` : 'All Employees';

    pdfHeader(doc, 'PAYMENT HISTORY REPORT', subtitle);

    const totalGross = payments.reduce((s, p) => s + (parseFloat(p.grossPay) || 0), 0);
    const totalDed = payments.reduce((s, p) => s + (parseFloat(p.totalDeductions) || 0), 0);
    const totalNet = payments.reduce((s, p) => s + (parseFloat(p.netPay) || 0), 0);

    doc.autoTable({
        startY: 48,
        head: [['Employee', 'Period', 'Gross Pay', 'Deductions', 'Net Pay', 'Method', 'Status', 'Date Paid']],
        body: payments.map(p => {
            const e = EmployeeManager.getById(p.employeeId);
            return [
                e ? `${e.name}\n${e.code}` : '—',
                p.periodLabel || '',
                fmtKES(p.grossPay),
                fmtKES(p.totalDeductions),
                fmtKES(p.netPay),
                p.method || 'Cash',
                p.status,
                p.datePaid ? fmtDate(p.datePaid) : '—'
            ];
        }),
        foot: [['', 'TOTALS', fmtKES(totalGross), fmtKES(totalDed), fmtKES(totalNet), '', '', '']],
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [31, 41, 55], textColor: [255,255,255], fontStyle: 'bold' },
        footStyles: { fillColor: [249, 115, 22], textColor: [255,255,255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
    });

    pdfFooter(doc);
    doc.save(`Pintorex-Payment-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    Toast.success('Payment report downloaded!');
}

// PDF shared helpers
function pdfHeader(doc, title, subtitle) {
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, 297, 40, 'F');
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, 6, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PINTOREX CONSTRUCTION LIMITED', 14, 16);
    doc.setFontSize(13);
    doc.setTextColor(249, 115, 22);
    doc.text(title, 14, 27);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text(subtitle, 14, 34);
    doc.text(`Date: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}`, 280, 27, { align: 'right' });
}

function pdfFooter(doc) {
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        const pageH = doc.internal.pageSize.height;
        doc.setFillColor(31, 41, 55);
        doc.rect(0, pageH - 10, 297, 10, 'F');
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(7);
        doc.text('Pintorex Construction Limited | Confidential Internal Document', 14, pageH - 4);
        doc.text(`Page ${i} of ${pages} | Generated ${new Date().toLocaleString('en-KE')}`, 283, pageH - 4, { align: 'right' });
    }
}

// ============================================================================
// REFRESH ALL UI
// ============================================================================
function refreshAll() {
    refreshDashboard();
    renderEmployeesTable();
    renderPaymentsTable();
    populateAllEmployeeDropdowns();
}

// ============================================================================
// AUTHENTICATION INIT
// ============================================================================
function initAuth() {
    const loginGate = document.getElementById('loginGate');
    const mainApp = document.getElementById('mainApp');

    const showApp = async () => {
        loginGate.classList.add('hidden');
        mainApp.classList.remove('hidden');
        document.getElementById('sessionDot').style.background = '#F59E0B';
        document.getElementById('sessionLabel').textContent = 'Loading data…';
        await Promise.all([EmployeeManager.load(), PaymentManager.load()]);
        document.getElementById('sessionDot').style.background = '#10B981';
        document.getElementById('sessionLabel').textContent = 'Session active';
        refreshAll();
        populateAllEmployeeDropdowns();
        // Flush any writes that failed while offline
        SyncQueue.flush(sbClient).catch(() => {});
    };

    // Retry pending sync queue whenever the device comes back online
    window.addEventListener('online', () => { SyncQueue.flush(sbClient).catch(() => {}); });

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

    // Login form
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
                loginError.textContent = navigator.onLine ? 'Network error. Please try again.' : 'You are offline. Please log in online first to enable offline access.';
                loginError.classList.remove('hidden');
            }
        } finally {
            loginBtn.disabled = false;
            loginText.classList.remove('hidden');
            loginSpinner.classList.add('hidden');
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());
}

// ============================================================================
// BOOT
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
});
