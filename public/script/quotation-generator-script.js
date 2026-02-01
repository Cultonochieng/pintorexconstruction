// ============================================================================
// PINTOREX QUOTATION GENERATOR
// Comprehensive document generation system with professional PDF output
// ============================================================================

// ============================================================================
// CENTRALIZED COLOR SCHEME (Matching website branding)
// ============================================================================

const Colors = {
    primary: [249, 115, 22],      // #F97316 - Orange
    primaryDark: [234, 88, 12],   // #EA580C - Darker orange
    secondary: [31, 41, 55],      // #1F2937 - Dark slate
    secondaryLight: [55, 65, 81], // #374151 - Lighter slate
    text: [17, 24, 39],           // #111827 - Near black
    textMuted: [107, 114, 128],   // #6B7280 - Gray
    subtle: [249, 250, 251],      // #F9FAFB - Light gray
    white: [255, 255, 255],
    success: [16, 185, 129],      // #10B981
    error: [239, 68, 68],         // #EF4444
    border: [209, 213, 219]       // #D1D5DB
};

// ============================================================================
// SUPABASE CLIENT CONFIGURATION (Document Verification)
// ============================================================================

const SUPABASE_URL = 'https://qjqgfbwirphnrbnvsbar.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcWdmYndpcnBobnJibnZzYmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NzQ0MjYsImV4cCI6MjA4NTM1MDQyNn0.WM2V0PlIpQAVzVSva9twFHPTNnrbgRKK-tQ3bPTPk_0';

let supabaseClient = null;
try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY && typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.warn('Supabase client not available:', e);
}

async function storeDocumentRecord(docId, docType, docNumber, clientName, amount) {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('document_records')
            .insert({
                document_id: docId,
                doc_type: docType,
                doc_number: docNumber,
                client_name: clientName,
                amount: amount,
                date_generated: new Date().toISOString(),
                gps_coordinates: await getGPSCoordinates(),
                content_hash: generateContentHash(docType, docNumber, clientName, amount)
            })
            .select();
        if (error) { console.warn('Document record store failed:', error); return null; }
        return data?.[0] || null;
    } catch (e) {
        console.warn('Supabase insert failed (possibly offline):', e);
        return null;
    }
}

async function getGPSCoordinates() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
            () => resolve(null),
            { timeout: 3000, maximumAge: 60000 }
        );
    });
}

function generateContentHash(docType, docNumber, clientName, amount) {
    const input = `${docType}|${docNumber}|${clientName}|${amount}|PINTOREX`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36).toUpperCase().padStart(8, '0');
}

// ============================================================================
// SAVE FOLDER MANAGER
// Lets the user pick a parent location (e.g. Desktop) once. A "pintorex_docs"
// sub-folder is created there automatically. The directory handle is stored in
// IndexedDB so it persists across sessions. On each new session the browser
// asks the user to re-grant write permission (a security requirement).
// ============================================================================

const SaveFolderManager = {
    DB_NAME: 'pintorex_fs',
    STORE_NAME: 'handles',
    HANDLE_KEY: 'save_folder',
    FOLDER_NAME: 'pintorex_docs',
    _db: null,

    isSupported() {
        return typeof window.showDirectoryPicker === 'function';
    },

    async _openDB() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);
            request.onupgradeneeded = (e) => {
                e.target.result.createObjectStore(this.STORE_NAME);
            };
            request.onsuccess = (e) => { this._db = e.target.result; resolve(this._db); };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async _storeHandle(handle) {
        const db = await this._openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readwrite');
            tx.objectStore(this.STORE_NAME).put(handle, this.HANDLE_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    },

    async getHandle() {
        try {
            const db = await this._openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORE_NAME, 'readonly');
                const request = tx.objectStore(this.STORE_NAME).get(this.HANDLE_KEY);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            return null;
        }
    },

    async clearHandle() {
        const db = await this._openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readwrite');
            tx.objectStore(this.STORE_NAME).delete(this.HANDLE_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    },

    async pickFolder() {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await this._storeHandle(handle);
        return handle;
    },

    async _verifyPermission(handle) {
        const opts = { mode: 'readwrite' };
        if (await handle.queryPermission(opts) === 'granted') return true;
        if (await handle.requestPermission(opts) === 'granted') return true;
        return false;
    },

    // Returns the pintorex_docs sub-directory handle (creates it if needed)
    async _getDocsDir(parentHandle) {
        return await parentHandle.getDirectoryHandle(this.FOLDER_NAME, { create: true });
    },

    async saveFile(blob, filename) {
        const handle = await this.getHandle();
        if (!handle) return false;
        if (!await this._verifyPermission(handle)) return false;

        const docsDir = await this._getDocsDir(handle);
        const fileHandle = await docsDir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
    },

    async saveMultipleFiles(files) {
        const handle = await this.getHandle();
        if (!handle) return false;
        if (!await this._verifyPermission(handle)) return false;

        const docsDir = await this._getDocsDir(handle);
        for (const { blob, filename } of files) {
            const fileHandle = await docsDir.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
        }
        return true;
    },

    async getDisplayName() {
        const handle = await this.getHandle();
        return handle ? (handle.name + '/' + this.FOLDER_NAME) : null;
    }
};

// ============================================================================
// PDF BATCH COLLECTOR
// When "Generate All" is used, documents are collected into a batch instead
// of being saved one-by-one. After generation completes, the batch is either
// written to the pintorex_docs folder or bundled into a single ZIP download.
// ============================================================================

const PdfBatch = {
    active: false,
    files: [],

    start() {
        this.active = true;
        this.files = [];
    },

    add(blob, filename) {
        this.files.push({ blob, filename });
    },

    async finish() {
        this.active = false;
        const files = [...this.files];
        this.files = [];

        if (files.length === 0) return;

        // 1. Try writing all files to the pintorex_docs folder
        if (SaveFolderManager.isSupported()) {
            try {
                if (await SaveFolderManager.saveMultipleFiles(files)) {
                    return;
                }
            } catch (e) {
                // Permission denied or stale handle – fall through
            }
        }

        // 2. Bundle into a single ZIP (no multiple-download prompts)
        if (typeof JSZip !== 'undefined') {
            const zip = new JSZip();
            const folder = zip.folder('pintorex_docs');
            for (const file of files) {
                folder.file(file.filename, file.blob);
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const dateStr = new Date().toISOString().slice(0, 10);
            const zipName = 'Pintorex-Documents-' + dateStr + '.zip';

            // Use <a download> for the single ZIP file
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = zipName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            return;
        }

        // 3. Last resort: download files individually with delays
        for (const file of files) {
            const url = URL.createObjectURL(file.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            await new Promise(r => setTimeout(r, 500));
        }
    }
};

// ============================================================================
// PDF SAVE HELPER
// Single-document save: writes to pintorex_docs folder if configured,
// otherwise uses the standard browser download. During a batch (Generate All)
// the blob is collected instead of saved immediately.
// ============================================================================

async function savePDFDocument(doc, filename) {
    const blob = doc.output('blob');

    // If a batch is in progress, collect instead of saving
    if (PdfBatch.active) {
        PdfBatch.add(blob, filename);
        return;
    }

    // Try the pintorex_docs folder
    if (SaveFolderManager.isSupported()) {
        try {
            if (await SaveFolderManager.saveFile(blob, filename)) {
                return;
            }
        } catch (e) {
            // Fall through to standard download
        }
    }

    // Standard browser download
    doc.save(filename);
}

// ============================================================================
// LOGO DATA (Base64 encoded for PDF embedding)
// ============================================================================

let logoDataUrl = null;
let logoAspectRatio = 1;

async function loadLogoForPDF() {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            logoDataUrl = canvas.toDataURL('image/png');
            logoAspectRatio = img.width / img.height;
            resolve(logoDataUrl);
        };
        img.onerror = function() {
            console.warn('Could not load logo for PDF');
            resolve(null);
        };
        img.src = 'images/logo_pint.png';
    });
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

const SessionManager = {
    SESSION_KEY: 'pintorex_session',
    SESSION_DURATION: 4 * 60 * 60 * 1000, // 4 hours

    createSession() {
        const session = {
            authenticated: true,
            timestamp: Date.now(),
            expiresAt: Date.now() + this.SESSION_DURATION
        };
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        return session;
    },

    getSession() {
        const data = sessionStorage.getItem(this.SESSION_KEY);
        if (!data) return null;

        const session = JSON.parse(data);
        if (Date.now() > session.expiresAt) {
            this.clearSession();
            return null;
        }
        return session;
    },

    isAuthenticated() {
        return this.getSession() !== null;
    },

    clearSession() {
        sessionStorage.removeItem(this.SESSION_KEY);
    },

    extendSession() {
        const session = this.getSession();
        if (session) {
            session.expiresAt = Date.now() + this.SESSION_DURATION;
            sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        }
    }
};

// ============================================================================
// OFFLINE AUTHENTICATION (PWA Support - Option A: Cached Session)
// ============================================================================

const OfflineAuth = {
    TOKEN_KEY: 'pintorex_offline_token',

    /**
     * Store the offline token received from server after successful login.
     * Token is stored in localStorage (persists across browser sessions).
     */
    storeToken(token) {
        try {
            localStorage.setItem(this.TOKEN_KEY, token);
        } catch (e) {
            console.warn('Could not store offline token:', e);
        }
    },

    /**
     * Check if a valid (non-expired) offline token exists.
     * This enables offline access without server verification.
     */
    hasValidToken() {
        try {
            const token = localStorage.getItem(this.TOKEN_KEY);
            if (!token) return false;

            const decoded = JSON.parse(atob(token));
            if (!decoded.exp || !decoded.sig) return false;

            // Check expiry
            if (Date.now() > decoded.exp) {
                this.clearToken();
                return false;
            }
            return true;
        } catch (e) {
            this.clearToken();
            return false;
        }
    },

    /**
     * Clear the offline token (on explicit logout).
     */
    clearToken() {
        localStorage.removeItem(this.TOKEN_KEY);
    },

    /**
     * Check if we're currently offline.
     */
    isOffline() {
        return !navigator.onLine;
    },

    /**
     * Attempt offline authentication.
     * Returns true if offline + valid token exists.
     */
    tryOfflineAuth() {
        return this.isOffline() && this.hasValidToken();
    }
};

// ============================================================================
// FORM DATA PERSISTENCE
// ============================================================================

const FormPersistence = {
    FORM_KEY: 'pintorex_form_data',

    saveFormData(data) {
        localStorage.setItem(this.FORM_KEY, JSON.stringify({
            ...data,
            savedAt: Date.now()
        }));
    },

    loadFormData() {
        const data = localStorage.getItem(this.FORM_KEY);
        if (!data) return null;

        const parsed = JSON.parse(data);
        // Only restore if saved within last 24 hours
        if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
            this.clearFormData();
            return null;
        }
        return parsed;
    },

    clearFormData() {
        localStorage.removeItem(this.FORM_KEY);
    }
};

// ============================================================================
// CLIENT HISTORY MANAGEMENT
// ============================================================================

const ClientHistory = {
    HISTORY_KEY: 'pintorex_client_history',
    MAX_CLIENTS: 50,

    getHistory() {
        const data = localStorage.getItem(this.HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    },

    addClient(clientName, projectType) {
        if (!clientName) return;

        let history = this.getHistory();

        // Check if client already exists
        const existingIndex = history.findIndex(c =>
            c.name.toLowerCase() === clientName.toLowerCase()
        );

        if (existingIndex >= 0) {
            // Update existing client
            history[existingIndex].projectType = projectType;
            history[existingIndex].lastUsed = Date.now();
            // Move to front
            const client = history.splice(existingIndex, 1)[0];
            history.unshift(client);
        } else {
            // Add new client
            history.unshift({
                name: clientName,
                projectType: projectType,
                lastUsed: Date.now()
            });
        }

        // Limit history size
        if (history.length > this.MAX_CLIENTS) {
            history = history.slice(0, this.MAX_CLIENTS);
        }

        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    },

    searchClients(query) {
        if (!query || query.length < 2) return [];

        const history = this.getHistory();
        const lowerQuery = query.toLowerCase();

        return history.filter(c =>
            c.name.toLowerCase().includes(lowerQuery)
        ).slice(0, 5);
    }
};

// ============================================================================
// DOCUMENT REGISTRY & NUMBERING SYSTEM
// ============================================================================

const DocumentRegistry = {
    init() {
        if (!localStorage.getItem('pintorex_registry')) {
            localStorage.setItem('pintorex_registry', JSON.stringify({
                documents: [],
                counters: {}
            }));
        }
    },

    generateNumber(type) {
        const registry = JSON.parse(localStorage.getItem('pintorex_registry'));
        const date = new Date();
        const yearMonth = date.getFullYear().toString().slice(-2) +
                         (date.getMonth() + 1).toString().padStart(2, '0');

        const key = `${type}_${yearMonth}`;
        if (!registry.counters[key]) {
            registry.counters[key] = Math.floor(Math.random() * 100) + 100;
        } else {
            registry.counters[key]++;
        }

        const prefixes = {
            'quotation': 'QT',
            'acceptance': 'CA',
            'payment': 'PR',
            'invoice': 'IV',
            'delivery': 'DN',
            'contract': 'CT',
            'recommendation': 'RL',
            'receipt': 'RC',
            'lpo': 'LP'
        };

        const number = `${prefixes[type]}${yearMonth}-${registry.counters[key]}`;

        registry.documents.push({
            number: number,
            type: type,
            date: date.toISOString(),
            timestamp: Date.now()
        });

        localStorage.setItem('pintorex_registry', JSON.stringify(registry));
        return number;
    },

    getLastDocument(type) {
        const registry = JSON.parse(localStorage.getItem('pintorex_registry'));
        const docs = registry.documents.filter(doc => doc.type === type);
        return docs.length > 0 ? docs[docs.length - 1] : null;
    },

    getAllDocuments() {
        const registry = JSON.parse(localStorage.getItem('pintorex_registry'));
        return registry.documents;
    }
};

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

const SettingsManager = {
    init() {
        if (!localStorage.getItem('pintorex_settings')) {
            localStorage.setItem('pintorex_settings', JSON.stringify({
                bankDetails: {
                    bankName: '',
                    accountName: 'Pintorex Construction Limited',
                    accountNumber: '',
                    branch: ''
                },
                suppliers: []
            }));
        }
    },

    getSettings() {
        return JSON.parse(localStorage.getItem('pintorex_settings'));
    },

    saveSettings(settings) {
        localStorage.setItem('pintorex_settings', JSON.stringify(settings));
    },

    getBankDetails() {
        return this.getSettings().bankDetails;
    },

    saveBankDetails(details) {
        const settings = this.getSettings();
        settings.bankDetails = details;
        this.saveSettings(settings);
    }
};

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

const Toast = {
    show(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => { toast.classList.remove('show'); }, duration);
    },
    success(message) { this.show(message, 'success'); },
    error(message) { this.show(message, 'error', 5000); },
    info(message) { this.show(message, 'info'); }
};

// ============================================================================
// PROGRESS OVERLAY
// ============================================================================

const ProgressOverlay = {
    overlay: null,

    show(title = 'Generating Documents', total = 1) {
        this.total = total;
        this.current = 0;

        this.overlay = document.createElement('div');
        this.overlay.className = 'progress-overlay';
        this.overlay.innerHTML = `
            <div class="progress-content">
                <div class="progress-title">${title}</div>
                <div class="progress-text" id="progressText">Preparing...</div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                </div>
                <div class="progress-count" id="progressCount">0 / ${total}</div>
            </div>
        `;
        document.body.appendChild(this.overlay);
    },

    update(current, text) {
        this.current = current;
        const percentage = Math.round((current / this.total) * 100);

        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressCount = document.getElementById('progressCount');

        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = text;
        if (progressCount) progressCount.textContent = `${current} / ${this.total}`;
    },

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
};

// ============================================================================
// MODAL UI SYSTEM
// ============================================================================

const ModalUI = {
    createModal(title, subtitle, content, buttonConfigs) {
        // buttonConfigs is an array of {label, type, action} objects
        const buttonsHTML = buttonConfigs.map((btn, index) =>
            `<button type="button" class="btn ${btn.type}" data-modal-action="${btn.action}" id="modalBtn${index}">${btn.label}</button>`
        ).join('');

        const modalHTML = `
            <div id="pintorexModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modalTitle" class="modal-title">${title}</h2>
                        ${subtitle ? `<p class="modal-subtitle">${subtitle}</p>` : ''}
                    </div>
                    <div class="modal-body" id="modalContent">${content}</div>
                    <div class="modal-footer" id="modalButtons">${buttonsHTML}</div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('pintorexModal');

        // Attach event listeners to buttons
        buttonConfigs.forEach((btn, index) => {
            const button = document.getElementById(`modalBtn${index}`);
            if (button) {
                button.addEventListener('click', () => {
                    modal.dispatchEvent(new CustomEvent(btn.action));
                });
            }
        });

        // Focus trap
        const focusableElements = modal.querySelectorAll('input, button, select, textarea');
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        return modal;
    },

    removeModal() {
        const modal = document.getElementById('pintorexModal');
        if (modal) modal.remove();
    },

    async promptLPODetails() {
        return new Promise((resolve) => {
            const content = `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label class="form-label required-field" for="supplierName">Supplier Name</label>
                        <input type="text" id="supplierName" class="form-input" required>
                    </div>
                    <div>
                        <label class="form-label" for="supplierAddress">Supplier Address</label>
                        <input type="text" id="supplierAddress" class="form-input">
                    </div>
                    <div>
                        <label class="form-label" for="supplierContact">Supplier Contact</label>
                        <input type="text" id="supplierContact" class="form-input">
                    </div>
                </div>
            `;

            const buttons = [
                { label: 'Cancel', type: 'btn-outline', action: 'cancel' },
                { label: 'Continue', type: 'btn-primary', action: 'submit' }
            ];

            const modal = this.createModal('LPO Supplier Details', 'Enter the supplier information for this purchase order', content, buttons);

            modal.addEventListener('submit', () => {
                const supplierName = document.getElementById('supplierName').value;
                if (!supplierName) {
                    Toast.error('Supplier name is required');
                    return;
                }

                const details = {
                    supplierName: supplierName,
                    supplierAddress: document.getElementById('supplierAddress').value,
                    supplierContact: document.getElementById('supplierContact').value
                };

                this.removeModal();
                resolve(details);
            });

            modal.addEventListener('cancel', () => {
                this.removeModal();
                resolve(null);
            });
        });
    },

    async promptPaymentDetails() {
        const settings = SettingsManager.getBankDetails();

        return new Promise((resolve) => {
            const content = `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label class="form-label required-field" for="bankName">Bank Name</label>
                        <input type="text" id="bankName" value="${settings.bankName}" class="form-input" required>
                    </div>
                    <div>
                        <label class="form-label required-field" for="accountNumber">Account Number</label>
                        <input type="text" id="accountNumber" value="${settings.accountNumber}" class="form-input" required>
                    </div>
                    <div>
                        <label class="form-label" for="branch">Branch</label>
                        <input type="text" id="branch" value="${settings.branch}" class="form-input">
                    </div>
                    <div style="margin-top: 8px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="saveDetails" checked style="width: 18px; height: 18px;">
                            <span style="font-size: 0.875rem; color: #374151;">Save these details for future use</span>
                        </label>
                    </div>
                </div>
            `;

            const buttons = [
                { label: 'Cancel', type: 'btn-outline', action: 'cancel' },
                { label: 'Continue', type: 'btn-primary', action: 'submit' }
            ];

            const modal = this.createModal('Bank Payment Details', 'Enter the bank details for payment', content, buttons);

            modal.addEventListener('submit', () => {
                const bankName = document.getElementById('bankName').value;
                const accountNumber = document.getElementById('accountNumber').value;

                if (!bankName || !accountNumber) {
                    Toast.error('Bank name and account number are required');
                    return;
                }

                const details = {
                    bankName: bankName,
                    accountNumber: accountNumber,
                    branch: document.getElementById('branch').value,
                    accountName: 'Pintorex Construction Limited'
                };

                if (document.getElementById('saveDetails').checked) {
                    SettingsManager.saveBankDetails(details);
                }

                this.removeModal();
                resolve(details);
            });

            modal.addEventListener('cancel', () => {
                this.removeModal();
                resolve(null);
            });
        });
    },

    async promptInvoiceDetails() {
        const lastDelivery = DocumentRegistry.getLastDocument('delivery');

        return new Promise((resolve) => {
            const content = `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label class="form-label required-field" for="orderNumber">Order Number</label>
                        <input type="text" id="orderNumber" class="form-input" required>
                    </div>
                    <div>
                        <label class="form-label" for="deliveryNumber">Delivery Note Number</label>
                        <input type="text" id="deliveryNumber" value="${lastDelivery ? lastDelivery.number : ''}" class="form-input">
                        <p style="font-size: 0.75rem; color: #6B7280; margin-top: 4px;">
                            ${lastDelivery ? 'Auto-filled from last delivery note' : 'Optional - leave blank if not applicable'}
                        </p>
                    </div>
                </div>
            `;

            const buttons = [
                { label: 'Cancel', type: 'btn-outline', action: 'cancel' },
                { label: 'Continue', type: 'btn-primary', action: 'submit' }
            ];

            const modal = this.createModal('Invoice Details', 'Enter the invoice reference information', content, buttons);

            modal.addEventListener('submit', () => {
                const orderNumber = document.getElementById('orderNumber').value;

                if (!orderNumber) {
                    Toast.error('Order number is required');
                    return;
                }

                const details = {
                    orderNumber: orderNumber,
                    deliveryNumber: document.getElementById('deliveryNumber').value
                };

                this.removeModal();
                resolve(details);
            });

            modal.addEventListener('cancel', () => {
                this.removeModal();
                resolve(null);
            });
        });
    },

    async promptReceiptDetails() {
        return new Promise((resolve) => {
            const content = `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label class="form-label required-field" for="paymentMethod">Payment Method</label>
                        <select id="paymentMethod" class="form-input" required>
                            <option value="">Select payment method</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="M-Pesa">M-Pesa</option>
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Credit Card">Credit Card</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label" for="referenceNumber">Reference/Transaction Number</label>
                        <input type="text" id="referenceNumber" class="form-input" placeholder="e.g., Transaction ID, Cheque No.">
                    </div>
                    <div>
                        <label class="form-label" for="amountPaid">Amount Paid (Leave blank for full amount)</label>
                        <input type="number" id="amountPaid" class="form-input" min="0" step="0.01" placeholder="Full amount if blank">
                    </div>
                </div>
            `;

            const buttons = [
                { label: 'Cancel', type: 'btn-outline', action: 'cancel' },
                { label: 'Generate Receipt', type: 'btn-primary', action: 'submit' }
            ];

            const modal = this.createModal('Receipt Details', 'Enter the payment information for this receipt', content, buttons);

            modal.addEventListener('submit', () => {
                const paymentMethod = document.getElementById('paymentMethod').value;

                if (!paymentMethod) {
                    Toast.error('Please select a payment method');
                    return;
                }

                const details = {
                    paymentMethod: paymentMethod,
                    referenceNumber: document.getElementById('referenceNumber').value,
                    amountPaid: document.getElementById('amountPaid').value
                };

                this.removeModal();
                resolve(details);
            });

            modal.addEventListener('cancel', () => {
                this.removeModal();
                resolve(null);
            });
        });
    },

    async showSettings() {
        const settings = SettingsManager.getSettings();
        const documents = DocumentRegistry.getAllDocuments().slice(-10).reverse();

        // Build save-folder section only when the API is available
        let saveFolderSection = '';
        if (SaveFolderManager.isSupported()) {
            const displayName = await SaveFolderManager.getDisplayName();
            saveFolderSection = `
                <div>
                    <h3 style="font-size: 1rem; font-weight: 600; color: #1F2937; margin-bottom: 12px;">
                        <svg xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px;display:inline;vertical-align:text-bottom;margin-right:6px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                        </svg>
                        Save Folder
                    </h3>
                    <p style="font-size: 0.8rem; color: #6B7280; margin-bottom: 10px;">
                        Pick a location (e.g. Desktop) and a <strong>pintorex_docs</strong> folder will be created there. All documents — single or batch — are saved into it automatically with no download prompts.
                    </p>
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <div id="saveFolderStatus" style="flex: 1; min-width: 0; padding: 10px 14px; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 0.875rem; color: ${displayName ? '#059669' : '#6B7280'}; background: ${displayName ? '#ECFDF5' : '#F9FAFB'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${displayName ? '<strong>' + displayName + '</strong>' : 'No folder selected'}
                        </div>
                        <button type="button" id="pickSaveFolder" class="btn btn-primary btn-sm" style="flex-shrink:0;">
                            ${displayName ? 'Change' : 'Choose Folder'}
                        </button>
                        ${displayName ? '<button type="button" id="clearSaveFolder" class="btn btn-outline btn-sm" style="flex-shrink:0; color:#EF4444; border-color:#EF4444;">Remove</button>' : ''}
                    </div>
                </div>
            `;
        }

        const content = `
            <div style="display: flex; flex-direction: column; gap: 24px;">
                ${saveFolderSection}
                <div>
                    <h3 style="font-size: 1rem; font-weight: 600; color: #1F2937; margin-bottom: 12px;">Bank Details</h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <label class="form-label" for="settingsBankName">Bank Name</label>
                            <input type="text" id="settingsBankName" value="${settings.bankDetails.bankName}" class="form-input">
                        </div>
                        <div>
                            <label class="form-label" for="settingsAccountNumber">Account Number</label>
                            <input type="text" id="settingsAccountNumber" value="${settings.bankDetails.accountNumber}" class="form-input">
                        </div>
                        <div>
                            <label class="form-label" for="settingsBranch">Branch</label>
                            <input type="text" id="settingsBranch" value="${settings.bankDetails.branch}" class="form-input">
                        </div>
                    </div>
                </div>

                <div>
                    <h3 style="font-size: 1rem; font-weight: 600; color: #1F2937; margin-bottom: 12px;">Recent Documents</h3>
                    <div style="max-height: 200px; overflow-y: auto; border: 1px solid #D1D5DB; border-radius: 8px; padding: 12px;">
                        ${documents.length > 0 ? documents.map(doc => `
                            <div style="padding: 8px 0; border-bottom: 1px solid #F3F4F6; font-size: 0.875rem;">
                                <strong style="color: #F97316;">${doc.number}</strong>
                                <span style="color: #6B7280;"> - ${doc.type} - ${new Date(doc.date).toLocaleDateString('en-GB')}</span>
                            </div>
                        `).join('') : '<div style="color: #9CA3AF; text-align: center; padding: 20px;">No documents generated yet</div>'}
                    </div>
                </div>
            </div>
        `;

        const buttons = [
            { label: 'Close', type: 'btn-outline', action: 'close' },
            { label: 'Save Settings', type: 'btn-primary', action: 'save' }
        ];

        const modal = this.createModal('Settings & Document Registry', 'Manage your preferences and view recent documents', content, buttons);

        // Wire up save-folder buttons
        const pickBtn = document.getElementById('pickSaveFolder');
        const clearBtn = document.getElementById('clearSaveFolder');
        const statusEl = document.getElementById('saveFolderStatus');

        if (pickBtn) {
            pickBtn.addEventListener('click', async () => {
                try {
                    const handle = await SaveFolderManager.pickFolder();
                    const display = handle.name + '/' + SaveFolderManager.FOLDER_NAME;
                    statusEl.innerHTML = '<strong>' + display + '</strong>';
                    statusEl.style.color = '#059669';
                    statusEl.style.background = '#ECFDF5';
                    pickBtn.textContent = 'Change';
                    // Add remove button if it wasn't there
                    if (!document.getElementById('clearSaveFolder')) {
                        const removeBtn = document.createElement('button');
                        removeBtn.id = 'clearSaveFolder';
                        removeBtn.className = 'btn btn-outline btn-sm';
                        removeBtn.style.cssText = 'flex-shrink:0; color:#EF4444; border-color:#EF4444;';
                        removeBtn.textContent = 'Remove';
                        pickBtn.parentNode.appendChild(removeBtn);
                        removeBtn.addEventListener('click', handleClear);
                    }
                    Toast.success('Documents will save to: ' + display);
                } catch (e) {
                    // User cancelled the picker
                }
            });
        }

        const handleClear = async () => {
            await SaveFolderManager.clearHandle();
            statusEl.innerHTML = 'No folder selected';
            statusEl.style.color = '#6B7280';
            statusEl.style.background = '#F9FAFB';
            pickBtn.textContent = 'Choose Folder';
            const removeBtn = document.getElementById('clearSaveFolder');
            if (removeBtn) removeBtn.remove();
            Toast.info('Save folder removed');
        };
        if (clearBtn) clearBtn.addEventListener('click', handleClear);

        modal.addEventListener('save', () => {
            const bankDetails = {
                bankName: document.getElementById('settingsBankName').value,
                accountNumber: document.getElementById('settingsAccountNumber').value,
                branch: document.getElementById('settingsBranch').value,
                accountName: 'Pintorex Construction Limited'
            };

            SettingsManager.saveBankDetails(bankDetails);
            Toast.success('Settings saved successfully');
            this.removeModal();
        });

        modal.addEventListener('close', () => {
            this.removeModal();
        });
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function numberWithCommas(x) {
    return x.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function calculateTotals(data) {
    const materials = JSON.parse(data.materials || '[]');
    const materialsTotal = materials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);

    let labor = 0;
    if (data.laborType === 'custom') {
        labor = parseFloat(data.laborCost) || 0;
    } else {
        labor = materialsTotal * (parseFloat(data.laborType) / 100);
    }

    const subtotal = materialsTotal + labor;
    const vatPercentage = parseFloat(data.vatPercentage) || 0;
    const vat = subtotal * (vatPercentage / 100);
    const contingencyPercentage = parseFloat(data.contingencyPercentage) || 0;
    const contingency = subtotal * (contingencyPercentage / 100);
    const grossTotal = subtotal + vat + contingency;

    // Tax deductions (calculated on gross total)
    const withholdingTaxPercentage = parseFloat(data.withholdingTax) || 0;
    const withholdingTax = grossTotal * (withholdingTaxPercentage / 100);
    const subcontractorWHTPercentage = parseFloat(data.subcontractorWHT) || 0;
    const subcontractorWHT = grossTotal * (subcontractorWHTPercentage / 100);
    const retentionPercentage = parseFloat(data.retentionPercentage) || 0;
    const retention = grossTotal * (retentionPercentage / 100);

    // Total deductions
    const totalDeductions = withholdingTax + subcontractorWHT + retention;

    // Net payable (gross minus deductions)
    const netPayable = grossTotal - totalDeductions;

    return {
        materialsTotal,
        labor,
        subtotal,
        vat,
        contingency,
        total: grossTotal, // Keep 'total' for backward compatibility
        grossTotal,
        vatPercentage,
        contingencyPercentage,
        withholdingTax,
        withholdingTaxPercentage,
        subcontractorWHT,
        subcontractorWHTPercentage,
        retention,
        retentionPercentage,
        totalDeductions,
        netPayable
    };
}

// ============================================================================
// MATERIAL ROW FUNCTIONS
// ============================================================================

let materialRowId = 0;

function createMaterialRow() {
    const rowId = ++materialRowId;
    const row = document.createElement('div');
    row.className = 'material-row';
    row.id = `material-row-${rowId}`;
    row.innerHTML = `
        <div class="material-name" style="grid-column: span 2;">
            <label for="materialName-${rowId}" class="sr-only">Material name</label>
            <input type="text" id="materialName-${rowId}" name="materialName[]" placeholder="Material name"
                   class="material-input w-full" required aria-label="Material name">
            <div class="duplicate-warning hidden" id="duplicateWarning-${rowId}">Possible duplicate material</div>
        </div>
        <div class="unit-wrapper">
            <label for="materialUnit-${rowId}" class="sr-only">Unit</label>
            <select id="materialUnit-${rowId}" name="materialUnit[]" class="material-input w-full" aria-label="Unit of measurement">
                <optgroup label="Common Units">
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="units">Units</option>
                    <option value="sets">Sets</option>
                    <option value="pairs">Pairs</option>
                </optgroup>
                <optgroup label="Length">
                    <option value="m">Meters (m)</option>
                    <option value="cm">Centimeters (cm)</option>
                    <option value="mm">Millimeters (mm)</option>
                    <option value="ft">Feet (ft)</option>
                    <option value="inch">Inches (in)</option>
                    <option value="yards">Yards</option>
                    <option value="km">Kilometers (km)</option>
                </optgroup>
                <optgroup label="Area">
                    <option value="sqm">Square Meters (sq.m)</option>
                    <option value="sqft">Square Feet (sq.ft)</option>
                    <option value="acres">Acres</option>
                    <option value="hectares">Hectares</option>
                </optgroup>
                <optgroup label="Volume">
                    <option value="cu.m">Cubic Meters (cu.m)</option>
                    <option value="cu.ft">Cubic Feet (cu.ft)</option>
                    <option value="ltrs">Liters (ltrs)</option>
                    <option value="gallons">Gallons</option>
                    <option value="barrels">Barrels</option>
                </optgroup>
                <optgroup label="Weight/Mass">
                    <option value="kgs">Kilograms (kgs)</option>
                    <option value="grams">Grams (g)</option>
                    <option value="tonnes">Tonnes</option>
                    <option value="lbs">Pounds (lbs)</option>
                </optgroup>
                <optgroup label="Construction Specific">
                    <option value="bags">Bags</option>
                    <option value="rolls">Rolls</option>
                    <option value="sheets">Sheets</option>
                    <option value="boxes">Boxes</option>
                    <option value="bundles">Bundles</option>
                    <option value="pallets">Pallets</option>
                    <option value="loads">Loads</option>
                    <option value="trips">Trips</option>
                    <option value="rods">Rods</option>
                    <option value="bars">Bars</option>
                    <option value="lengths">Lengths</option>
                    <option value="coils">Coils</option>
                    <option value="drums">Drums</option>
                    <option value="tins">Tins</option>
                    <option value="buckets">Buckets</option>
                </optgroup>
                <optgroup label="Labour/Services">
                    <option value="LS">Lump Sum (LS)</option>
                    <option value="days">Days</option>
                    <option value="hours">Hours</option>
                    <option value="man-days">Man-Days</option>
                    <option value="man-hours">Man-Hours</option>
                </optgroup>
                <optgroup label="Other">
                    <option value="Other">Other (Specify)</option>
                </optgroup>
            </select>
            <input type="text" id="customUnit-${rowId}" name="customUnit[]" placeholder="Enter unit"
                   class="material-input w-full hidden custom-unit-input" aria-label="Custom unit">
        </div>
        <div>
            <label for="materialQty-${rowId}" class="sr-only">Quantity</label>
            <input type="number" id="materialQty-${rowId}" name="materialQuantity[]" placeholder="Qty"
                   class="material-input w-full" required min="0" step="0.01" aria-label="Quantity">
        </div>
        <div>
            <label for="materialPrice-${rowId}" class="sr-only">Unit Price</label>
            <input type="number" id="materialPrice-${rowId}" name="materialUnitPrice[]" placeholder="Unit Price"
                   class="material-input w-full" required min="0" step="0.01" aria-label="Unit price in KES">
        </div>
        <button type="button" class="remove-btn" data-row-id="${rowId}" aria-label="Remove this material">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
        </button>
    `;

    // Add duplicate detection
    const nameInput = row.querySelector(`#materialName-${rowId}`);
    nameInput.addEventListener('input', () => checkDuplicateMaterial(rowId));

    // Add remove button event listener
    const removeBtn = row.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => removeMaterialRow(rowId));

    // Add unit change handler for "Other" option
    const unitSelect = row.querySelector(`#materialUnit-${rowId}`);
    const customUnitInput = row.querySelector(`#customUnit-${rowId}`);
    unitSelect.addEventListener('change', function() {
        if (this.value === 'Other') {
            customUnitInput.classList.remove('hidden');
            customUnitInput.required = true;
        } else {
            customUnitInput.classList.add('hidden');
            customUnitInput.required = false;
            customUnitInput.value = '';
        }
    });

    return row;
}

function checkDuplicateMaterial(rowId) {
    const nameInput = document.getElementById(`materialName-${rowId}`);
    const warningDiv = document.getElementById(`duplicateWarning-${rowId}`);

    if (!nameInput || !warningDiv) return;

    const currentName = nameInput.value.toLowerCase().trim();
    if (!currentName) {
        warningDiv.classList.add('hidden');
        return;
    }

    const allNames = document.querySelectorAll('[name="materialName[]"]');
    let duplicateFound = false;

    allNames.forEach(input => {
        if (input.id !== `materialName-${rowId}`) {
            const otherName = input.value.toLowerCase().trim();
            if (otherName && otherName === currentName) {
                duplicateFound = true;
            }
        }
    });

    if (duplicateFound) {
        warningDiv.classList.remove('hidden');
    } else {
        warningDiv.classList.add('hidden');
    }
}

function addMaterialRow() {
    const materialsContainer = document.getElementById('materialsContainer');
    const emptyState = document.getElementById('materialsEmpty');
    const addBtn = document.getElementById('addMaterialBtn');

    // Hide empty state and show add button
    if (emptyState) emptyState.style.display = 'none';
    if (addBtn) addBtn.classList.remove('hidden');

    const newRow = createMaterialRow();
    materialsContainer.appendChild(newRow);

    // Focus the new row's name input
    const nameInput = newRow.querySelector('input[name="materialName[]"]');
    if (nameInput) nameInput.focus();

    updateMaterialsCount();
    saveFormDataDebounced();
}

function removeMaterialRow(rowId) {
    const row = document.getElementById(`material-row-${rowId}`);
    if (row) {
        row.remove();
        updateMaterialsCount();
        saveFormDataDebounced();

        // Show empty state if no materials
        const rows = document.querySelectorAll('.material-row');
        if (rows.length === 0) {
            const emptyState = document.getElementById('materialsEmpty');
            const addBtn = document.getElementById('addMaterialBtn');
            if (emptyState) emptyState.style.display = 'block';
            if (addBtn) addBtn.classList.add('hidden');
        }
    }
}

function updateMaterialsCount() {
    const count = document.querySelectorAll('.material-row').length;
    const countEl = document.getElementById('materialsCount');
    if (countEl) {
        countEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;
    }
}

function gatherMaterialsData() {
    const materials = [];
    const rows = document.querySelectorAll('.material-row');

    rows.forEach(row => {
        const nameInput = row.querySelector('[name="materialName[]"]');
        const unitInput = row.querySelector('[name="materialUnit[]"]');
        const customUnitInput = row.querySelector('[name="customUnit[]"]');
        const qtyInput = row.querySelector('[name="materialQuantity[]"]');
        const priceInput = row.querySelector('[name="materialUnitPrice[]"]');

        const name = nameInput ? nameInput.value : '';
        let unit = unitInput ? unitInput.value : '';
        // Use custom unit if "Other" is selected
        if (unit === 'Other' && customUnitInput && customUnitInput.value) {
            unit = customUnitInput.value;
        }
        const quantity = qtyInput ? parseFloat(qtyInput.value) : 0;
        const unitPrice = priceInput ? parseFloat(priceInput.value) : 0;

        if (name && !isNaN(quantity) && !isNaN(unitPrice)) {
            materials.push({ name, unit, quantity, unitPrice });
        }
    });

    return materials;
}

// ============================================================================
// FORM PERSISTENCE (DEBOUNCED)
// ============================================================================

let saveTimeout = null;

function saveFormDataDebounced() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const form = document.getElementById('quotationForm');
        if (!form) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.materials = JSON.stringify(gatherMaterialsData());

        FormPersistence.saveFormData(data);
    }, 500);
}

function restoreFormData() {
    const savedData = FormPersistence.loadFormData();
    if (!savedData) return;

    // Restore basic fields
    const fields = ['clientName', 'projectType', 'projectDescription', 'laborType', 'laborCost', 'vatPercentage', 'contingencyPercentage', 'customProjectType', 'withholdingTax', 'subcontractorWHT', 'retentionPercentage'];
    fields.forEach(field => {
        const input = document.getElementById(field);
        if (input && savedData[field]) {
            input.value = savedData[field];
        }
    });

    // Show custom project type div if "Other" was selected
    if (savedData.projectType === 'Other') {
        const customProjectTypeDiv = document.getElementById('customProjectTypeDiv');
        const customProjectTypeInput = document.getElementById('customProjectType');
        if (customProjectTypeDiv) customProjectTypeDiv.classList.remove('hidden');
        if (customProjectTypeInput) customProjectTypeInput.required = true;
    }

    // Restore materials
    if (savedData.materials) {
        const materials = JSON.parse(savedData.materials);
        if (materials.length > 0) {
            const emptyState = document.getElementById('materialsEmpty');
            const addBtn = document.getElementById('addMaterialBtn');
            if (emptyState) emptyState.style.display = 'none';
            if (addBtn) addBtn.classList.remove('hidden');

            materials.forEach(m => {
                const row = createMaterialRow();
                document.getElementById('materialsContainer').appendChild(row);

                const nameInput = row.querySelector('[name="materialName[]"]');
                const unitInput = row.querySelector('[name="materialUnit[]"]');
                const qtyInput = row.querySelector('[name="materialQuantity[]"]');
                const priceInput = row.querySelector('[name="materialUnitPrice[]"]');

                if (nameInput) nameInput.value = m.name;
                if (unitInput) unitInput.value = m.unit;
                if (qtyInput) qtyInput.value = m.quantity;
                if (priceInput) priceInput.value = m.unitPrice;
            });

            updateMaterialsCount();
        }
    }

    // Update character count
    updateCharCount();

    // Update labor visibility
    handleLaborTypeChange();

    Toast.info('Previous form data restored');
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateFormData(data, showMessages = true) {
    const errors = [];

    if (!data.clientName || !data.clientName.trim()) {
        errors.push('Client name is required');
    }

    if (!data.projectType) {
        errors.push('Project type is required');
    }

    const materials = JSON.parse(data.materials || '[]');
    if (materials.length === 0) {
        errors.push('Please add at least one material');
    }

    if (showMessages && errors.length > 0) {
        showValidationErrors(errors);
    }

    return errors.length === 0;
}

function showValidationErrors(errors) {
    const container = document.getElementById('validationMessages');
    if (!container) return;

    container.innerHTML = errors.map(error => `
        <div class="validation-message error">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>${error}</span>
        </div>
    `).join('');

    // Scroll to top
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearValidationErrors() {
    const container = document.getElementById('validationMessages');
    if (container) container.innerHTML = '';
}

// ============================================================================
// SMART SPACING ENGINE FOR PDFs
// Centralized layout system that intelligently distributes content across pages.
// Measures all content upfront, computes optimal gaps and page breaks, then
// renders with adaptive spacing. Ensures no excessive whitespace, no content
// collisions, and professional appearance across all document types.
// ============================================================================

const SmartSpacing = {
    HEADER_END_Y: 45,
    FOOTER_RESERVE: 35,

    getContentBounds(doc) {
        const pageHeight = doc.internal.pageSize.height;
        const endY = pageHeight - this.FOOTER_RESERVE;
        return { startY: this.HEADER_END_Y, endY, height: endY - this.HEADER_END_Y };
    },

    estimateTableHeight(rowCount, options = {}) {
        const cellPadding = options.cellPadding || 4;
        const fontSize = options.fontSize || 9;
        const headerH = (cellPadding * 2) + (fontSize * 0.35) + 6;
        const rowH = (cellPadding * 2) + (fontSize * 0.35) + 2;
        return headerH + (rowCount * rowH);
    },

    /**
     * Core layout engine. Computes optimal gaps and page breaks for blocks.
     * @param {jsPDF} doc
     * @param {number} currentY - Where content starts
     * @param {Array} blocks - [{height, minGap, preferredGap, keepWithNext}]
     * @returns {{gaps: number[], pageBreaks: number[]}}
     */
    distribute(doc, currentY, blocks) {
        if (!blocks || blocks.length === 0) return { gaps: [], pageBreaks: [] };
        const bounds = this.getContentBounds(doc);
        const available = bounds.endY - currentY;
        const norm = blocks.map(b => ({
            height: b.height || 0,
            minGap: b.minGap != null ? b.minGap : 0,
            preferredGap: b.preferredGap != null ? b.preferredGap : (b.minGap || 0),
            keepWithNext: !!b.keepWithNext
        }));
        const totalMin = norm.reduce((sum, b) => sum + b.height + b.minGap, 0);
        if (totalMin <= available) {
            return this._expandGaps(norm, available);
        }
        return this._multiPage(norm, available, bounds.height);
    },

    _expandGaps(blocks, available) {
        const totalContent = blocks.reduce((sum, b) => sum + b.height, 0);
        const gapBudget = available - totalContent;
        if (gapBudget <= 0) return { gaps: blocks.map(b => b.minGap), pageBreaks: [] };

        const totalMin = blocks.reduce((sum, b) => sum + b.minGap, 0);
        const totalPref = blocks.reduce((sum, b) => sum + b.preferredGap, 0);
        const expandRange = totalPref - totalMin;
        let gaps;

        if (expandRange > 0 && gapBudget > totalMin) {
            const extra = gapBudget - totalMin;
            gaps = blocks.map(b => {
                const room = b.preferredGap - b.minGap;
                const bonus = (room / expandRange) * extra;
                return Math.min(b.minGap + bonus, b.preferredGap * 2.5);
            });
            const usedTotal = gaps.reduce((s, g) => s + g, 0) + totalContent;
            const leftover = available - usedTotal;
            if (leftover > 2) {
                const canExpand = gaps.map((g, i) => g < blocks[i].preferredGap * 2.5 ? 1 : 0);
                const count = canExpand.reduce((s, v) => s + v, 0) || gaps.length;
                const perGap = leftover / count;
                gaps = gaps.map((g, i) => (canExpand[i] || count === gaps.length) ? g + perGap : g);
            }
        } else if (gapBudget >= totalMin) {
            gaps = blocks.map(b => totalMin > 0 ? (b.minGap / totalMin) * gapBudget : gapBudget / blocks.length);
        } else {
            const scale = totalMin > 0 ? gapBudget / totalMin : 0;
            gaps = blocks.map(b => b.minGap * scale);
        }
        return { gaps, pageBreaks: [] };
    },

    _multiPage(blocks, firstAvail, fullHeight) {
        const groups = [];
        let cur = [];
        for (let i = 0; i < blocks.length; i++) {
            cur.push({ ...blocks[i], idx: i });
            if (!blocks[i].keepWithNext || i === blocks.length - 1) {
                groups.push(cur); cur = [];
            }
        }
        const gHeights = groups.map(g => g.reduce((s, b) => s + b.height + b.minGap, 0));
        const pages = [];
        let avail = firstAvail;
        let page = { gis: [], used: 0, avail };
        for (let gi = 0; gi < groups.length; gi++) {
            if (page.used + gHeights[gi] <= avail || page.gis.length === 0) {
                page.gis.push(gi);
                page.used += gHeights[gi];
            } else {
                pages.push({ ...page });
                avail = fullHeight;
                page = { gis: [gi], used: gHeights[gi], avail };
            }
        }
        if (page.gis.length > 0) pages.push({ ...page });

        const allGaps = new Array(blocks.length).fill(0);
        const pageBreaks = [];
        for (let p = 0; p < pages.length; p++) {
            const pg = pages[p];
            const flat = pg.gis.flatMap(gi => groups[gi]);
            const r = this._expandGaps(flat, pg.avail);
            flat.forEach((b, i) => { allGaps[b.idx] = r.gaps[i]; });
            if (p < pages.length - 1) {
                pageBreaks.push(flat[flat.length - 1].idx);
            }
        }
        return { gaps: allGaps, pageBreaks };
    },

    /**
     * Advance yPos after rendering a section. Handles page breaks.
     * @returns {number} New yPos
     */
    advance(yPos, contentHeight, layout, blockIndex, doc, onNewPage) {
        yPos += contentHeight;
        if (layout.pageBreaks.includes(blockIndex)) {
            doc.addPage();
            if (onNewPage) onNewPage();
            return this.HEADER_END_Y;
        }
        return yPos + layout.gaps[blockIndex];
    },

    checkAndAddPage(doc, currentY, requiredHeight, onNewPage) {
        const bounds = this.getContentBounds(doc);
        if (currentY + requiredHeight > bounds.endY) {
            doc.addPage();
            if (onNewPage) onNewPage();
            return bounds.startY;
        }
        return currentY;
    }
};

// ============================================================================
// PROFESSIONAL LETTERHEAD HEADER & FOOTER
// ============================================================================

function addProfessionalHeader(doc, documentType = '') {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const headerStartX = margin; // Flush left with document margin

    // Elegant header bar
    doc.setFillColor(...Colors.secondary);
    doc.rect(0, 0, pageWidth, 32, 'F');

    // Orange accent line
    doc.setFillColor(...Colors.primary);
    doc.rect(0, 32, pageWidth, 2, 'F');

    // Add logo if available - maintain aspect ratio
    let logoWidth = 0;
    if (logoDataUrl) {
        try {
            const logoHeight = 20;
            logoWidth = logoHeight * logoAspectRatio;
            doc.addImage(logoDataUrl, 'PNG', headerStartX, 6, logoWidth, logoHeight);
        } catch (e) {
            console.warn('Could not add logo to PDF');
            logoWidth = 0;
        }
    }

    // Company name - positioned close to logo
    const textStartX = headerStartX + (logoWidth > 0 ? logoWidth + 3 : 0);
    doc.setTextColor(...Colors.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PINTOREX", textStartX, 13);

    // Tagline
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("CONSTRUCTION LIMITED", textStartX, 19);
    doc.setFontSize(6);
    doc.text("Building Excellence, Crafting Dreams", textStartX, 24);

    // Contact info on right
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const contactInfo = [
        "Tel: +254 769 157174",
        "Email: pintorexkenya@gmail.com",
        "Migori Town, Kenya"
    ];
    let contactY = 10;
    contactInfo.forEach(info => {
        doc.text(info, pageWidth - margin, contactY, { align: "right" });
        contactY += 5;
    });

    // Document type badge - positioned at bottom right of header
    if (documentType) {
        doc.setFillColor(...Colors.primary);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        const badgeWidth = doc.getTextWidth(documentType) + 16;
        doc.roundedRect(pageWidth - margin - badgeWidth, 24, badgeWidth, 8, 2, 2, 'F');
        doc.setTextColor(...Colors.white);
        doc.text(documentType, pageWidth - margin - badgeWidth/2, 29, { align: "center" });
    }
}

function addProfessionalFooter(doc, pageNumber = null, verificationCode = null) {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    // Footer bar
    const footerY = pageHeight - 18;
    doc.setFillColor(...Colors.secondary);
    doc.rect(0, footerY, pageWidth, 18, 'F');

    // Orange accent line above footer
    doc.setFillColor(...Colors.primary);
    doc.rect(0, footerY - 1, pageWidth, 1, 'F');

    // Footer text
    doc.setTextColor(...Colors.white);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    doc.text("Pintorex Construction Limited | Building Excellence, Crafting Dreams", pageWidth / 2, footerY + 6, { align: "center" });
    doc.text("+254 769 157174 | pintorexkenya@gmail.com | Migori Town, Kenya", pageWidth / 2, footerY + 11, { align: "center" });

    // Page number on right
    if (pageNumber !== null) {
        doc.setFontSize(7);
        doc.text(`Page ${pageNumber}`, pageWidth - margin, footerY + 9, { align: "right" });
    }

    // Verification code on left (subtle document identifier)
    if (verificationCode) {
        doc.setFontSize(5);
        doc.setTextColor(180, 180, 180);
        doc.text(`Ref: ${verificationCode}`, margin, footerY + 15);
    }
}

// Generate unique verification code for document authenticity
function generateVerificationCode(docType, docNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PCL-${docType.substring(0, 3).toUpperCase()}-${timestamp}-${random}`;
}

// ============================================================================
// PROFESSIONAL CIRCULAR COMPANY SEAL WITH ENCODED VERIFICATION
// ============================================================================

function drawCompanySeal(doc, x, y, radius, verificationData) {
    const dateStr = verificationData.date || new Date().toLocaleDateString('en-GB');
    const hashInput = `PINTOREX|${verificationData.docType}|${verificationData.docNumber}|${dateStr}`;

    // Generate verification hash
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
        const char = hashInput.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const hashStr = Math.abs(hash).toString(36).toUpperCase().padStart(8, '0').substring(0, 8);
    const hashNum = Math.abs(hash);

    // --- Watermark mode: semi-transparent for dense pages ---
    const isWatermark = verificationData.watermark === true;
    let gStateApplied = false;
    if (isWatermark) {
        try {
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.15, 'stroke-opacity': 0.15 }));
            gStateApplied = true;
        } catch (e) {
            // GState not supported — seal draws normally
        }
    }

    // ===== HELPER: Draw text along a circular arc =====
    // Clock-angle convention: 0° = 12 o'clock (top), 90° = 3 o'clock (right)
    // faceInward: letter tops point toward center (standard for bottom arc text)
    function drawArcText(text, cx, cy, arcR, startDeg, endDeg, faceInward) {
        const chars = text.split('');
        const n = chars.length;
        if (n === 0) return;
        const step = n > 1 ? (endDeg - startDeg) / (n - 1) : 0;
        for (let i = 0; i < n; i++) {
            const deg = n > 1 ? startDeg + step * i : (startDeg + endDeg) / 2;
            const rad = (deg * Math.PI) / 180;
            const px = cx + arcR * Math.sin(rad);
            const py = cy - arcR * Math.cos(rad);
            const rot = faceInward ? (180 - deg) : -deg;
            doc.text(chars[i], px, py, { angle: rot, align: 'center' });
        }
    }

    // ===== HELPER: Draw five-pointed star =====
    function drawStar(cx, cy, outerSR, innerSR, color) {
        doc.setFillColor(...color);
        for (let i = 0; i < 5; i++) {
            const oa = (i * 72 - 90) * Math.PI / 180;
            const la = oa - 36 * Math.PI / 180;
            const ra = oa + 36 * Math.PI / 180;
            doc.triangle(
                cx + outerSR * Math.cos(oa), cy + outerSR * Math.sin(oa),
                cx + innerSR * Math.cos(la), cy + innerSR * Math.sin(la),
                cx + innerSR * Math.cos(ra), cy + innerSR * Math.sin(ra), 'F'
            );
        }
    }

    // === Layout radii ===
    const outerR = radius;
    const borderR = radius - 2;
    const textR = radius - 4.5;
    const dotRingR = radius * 0.635;
    const innerR = radius * 0.57;

    // ===== 1. WHITE BACKGROUND =====
    doc.setFillColor(255, 255, 255);
    doc.circle(x, y, outerR, 'F');

    // ===== 2. OUTER DOUBLE BORDER (dark slate) =====
    doc.setDrawColor(...Colors.secondary);
    doc.setLineWidth(1.8);
    doc.circle(x, y, outerR, 'S');
    doc.setLineWidth(0.4);
    doc.circle(x, y, borderR, 'S');

    // ===== 3. ENCODED DOT RING (Document Verification Pattern) =====
    // 36 dots encode the hash as a unique binary fingerprint per document.
    // Large dot = 1 bit, small dot = 0 bit — serves as a visual authenticity marker.
    const numDots = 36;
    for (let i = 0; i < numDots; i++) {
        const bit = (hashNum >> (i % 32)) & 1;
        const dotDeg = (i / numDots) * 360;
        const dotRad = (dotDeg * Math.PI) / 180;
        const dx = x + dotRingR * Math.sin(dotRad);
        const dy = y - dotRingR * Math.cos(dotRad);
        doc.setFillColor(...Colors.primary);
        doc.circle(dx, dy, bit ? 0.42 : 0.16, 'F');
    }

    // ===== 4. TOP ARC TEXT =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.2);
    doc.setTextColor(...Colors.secondary);
    drawArcText("PINTOREX  CONSTRUCTION  LTD", x, y, textR, -72, 72, false);

    // ===== 5. STAR SEPARATORS (3 o'clock & 9 o'clock) =====
    drawStar(x + textR, y, 1.3, 0.5, Colors.primary);
    drawStar(x - textR, y, 1.3, 0.5, Colors.primary);

    // ===== 6. BOTTOM ARC TEXT =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(3.8);
    doc.setTextColor(...Colors.secondary);
    drawArcText("MIGORI,  KENYA", x, y, textR, 218, 142, true);

    // ===== 7. INNER ACCENT RING (orange) =====
    doc.setDrawColor(...Colors.primary);
    doc.setLineWidth(0.7);
    doc.circle(x, y, innerR, 'S');
    doc.setLineWidth(0.25);
    doc.circle(x, y, innerR - 0.9, 'S');

    // ===== 8. CENTER QR CODE =====
    // Render verification QR code elegantly centered inside the seal
    try {
        const docId = verificationData.documentId || generateDocumentUUID(verificationData.docType || 'DOC', verificationData.docNumber || '000');
        const verificationUrl = `https://pintorexconstruction.onrender.com/verify/${docId}`;
        const qr = qrcode(0, 'M');
        qr.addData(verificationUrl);
        qr.make();
        const qrDataUrl = qr.createDataURL(4, 0);
        const qrSize = innerR * 1.25;
        doc.addImage(qrDataUrl, 'GIF', x - qrSize / 2, y - qrSize / 2, qrSize, qrSize);
    } catch (e) {
        // QR generation failed — show minimal fallback
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(...Colors.primary);
        doc.text("VERIFIED", x, y + 1, { align: "center" });
    }

    // --- Restore graphics state if watermark mode ---
    if (gStateApplied) {
        try { doc.restoreGraphicsState(); } catch (e) { /* ignore */ }
    }
}

// ============================================================================
// SMART SEAL + QR PLACEMENT ENGINE
// ============================================================================

function generateDocumentUUID(docType, docNumber) {
    const input = `${docType}-${docNumber}-${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const rand = Math.random().toString(16).substring(2, 10);
    return `${hex}-${rand.substring(0, 4)}-${rand.substring(4, 8)}-${docNumber.replace(/[^A-Za-z0-9]/g, '')}`.toLowerCase();
}

function placeSealAndQR(doc, contentEndY, sealData, options) {
    options = options || {};
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const sealRadius = 18;
    const footerTopY = pageHeight - 19;
    const maxAllowedBottom = footerTopY - 3;

    // Explicit watermark mode (e.g., Invoice)
    if (sealData.watermark === true) {
        drawCompanySeal(doc, pageWidth / 2, pageHeight / 2 + 20, sealRadius, sealData);
        return;
    }

    // Calculate seal center position
    var sealCenterX = pageWidth - margin - sealRadius - 2;
    var sealCenterY;

    if (options.placement === 'centered-below') {
        sealCenterX = pageWidth / 2;
        sealCenterY = contentEndY + sealRadius + 5;
    } else if (options.signatureBlockY !== undefined) {
        sealCenterY = options.signatureBlockY + sealRadius;
    } else {
        sealCenterY = contentEndY + sealRadius + 5;
    }

    // Safety: would seal extend below footer?
    var sealBottomY = sealCenterY + sealRadius;
    if (sealBottomY > maxAllowedBottom) {
        // Fall back to watermark mode
        drawCompanySeal(doc, pageWidth / 2, pageHeight / 2, sealRadius, {
            ...sealData,
            watermark: true
        });
        return;
    }

    // Draw seal (QR is rendered inside the seal center)
    drawCompanySeal(doc, sealCenterX, sealCenterY, sealRadius, sealData);
}

// ============================================================================
// BUTTON LOADING STATE
// ============================================================================

function setButtonLoading(buttonId, loading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    const textEl = btn.querySelector('.btn-text');
    const loadingEl = btn.querySelector('.btn-loading');

    if (loading) {
        btn.disabled = true;
        if (textEl) textEl.classList.add('hidden');
        if (loadingEl) loadingEl.classList.remove('hidden');
    } else {
        btn.disabled = false;
        if (textEl) textEl.classList.remove('hidden');
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}

// ============================================================================
// CHARACTER COUNT
// ============================================================================

function updateCharCount() {
    const textarea = document.getElementById('projectDescription');
    const countEl = document.getElementById('descCharCount');
    if (textarea && countEl) {
        countEl.textContent = textarea.value.length;
    }
}

// ============================================================================
// LABOR TYPE HANDLING
// ============================================================================

function handleLaborTypeChange() {
    const laborTypeSelect = document.getElementById('laborType');
    const customLaborDiv = document.getElementById('customLaborDiv');
    const laborCostInput = document.getElementById('laborCost');

    if (!laborTypeSelect || !customLaborDiv) return;

    if (laborTypeSelect.value === 'custom') {
        customLaborDiv.style.display = 'block';
        if (laborCostInput) laborCostInput.required = true;
    } else {
        customLaborDiv.style.display = 'none';
        if (laborCostInput) laborCostInput.required = false;
    }
}

// ============================================================================
// CLIENT HISTORY DROPDOWN
// ============================================================================

function setupClientHistory() {
    const clientInput = document.getElementById('clientName');
    const dropdown = document.getElementById('clientHistoryDropdown');

    if (!clientInput || !dropdown) return;

    clientInput.addEventListener('input', () => {
        const query = clientInput.value;
        const matches = ClientHistory.searchClients(query);

        if (matches.length > 0) {
            dropdown.innerHTML = matches.map(client => `
                <div class="client-history-item" role="option" tabindex="0" data-name="${client.name}" data-project="${client.projectType}">
                    <div class="client-history-name">${client.name}</div>
                    <div class="client-history-project">${client.projectType}</div>
                </div>
            `).join('');
            dropdown.classList.add('show');

            // Add click handlers
            dropdown.querySelectorAll('.client-history-item').forEach(item => {
                item.addEventListener('click', () => {
                    clientInput.value = item.dataset.name;
                    const projectType = document.getElementById('projectType');
                    if (projectType && item.dataset.project) {
                        projectType.value = item.dataset.project;
                    }
                    dropdown.classList.remove('show');
                });

                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        item.click();
                    }
                });
            });
        } else {
            dropdown.classList.remove('show');
        }
    });

    // Hide dropdown on blur
    clientInput.addEventListener('blur', () => {
        setTimeout(() => dropdown.classList.remove('show'), 200);
    });
}

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize systems
    DocumentRegistry.init();
    SettingsManager.init();

    // Load logo for PDFs
    await loadLogoForPDF();

    // Add settings button
    const settingsButton = document.createElement('button');
    settingsButton.className = 'settings-btn';
    settingsButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
    `;
    settingsButton.setAttribute('aria-label', 'Open settings');
    settingsButton.addEventListener('click', () => ModalUI.showSettings());
    document.body.appendChild(settingsButton);

    // Check for existing session (supports both online session and offline cached token)
    const loginSection = document.getElementById('loginSection');
    const quotationSection = document.getElementById('quotationSection');

    if (SessionManager.isAuthenticated()) {
        loginSection.classList.add('hidden');
        quotationSection.classList.remove('hidden');
        settingsButton.style.display = 'flex';
        restoreFormData();
    } else if (OfflineAuth.hasValidToken()) {
        // Valid offline token exists — auto-login (works both online and offline)
        SessionManager.createSession();
        loginSection.classList.add('hidden');
        quotationSection.classList.remove('hidden');
        settingsButton.style.display = 'flex';
        restoreFormData();
        if (!navigator.onLine) {
            Toast.info('Working offline with cached credentials');
        }
    } else {
        settingsButton.style.display = 'none';
    }

    // Login form handling
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const passwordInput = document.getElementById('password');
            const loginBtn = document.getElementById('loginBtn');
            const loginText = document.getElementById('loginText');
            const loginSpinner = document.getElementById('loginSpinner');
            const loginError = document.getElementById('loginError');

            const enteredPassword = passwordInput.value;

            if (!enteredPassword) {
                if (loginError) {
                    loginError.textContent = 'Please enter a password';
                    loginError.classList.remove('hidden');
                }
                return;
            }

            // Show loading state
            if (loginBtn) loginBtn.disabled = true;
            if (loginText) loginText.classList.add('hidden');
            if (loginSpinner) loginSpinner.classList.remove('hidden');
            if (loginError) loginError.classList.add('hidden');

            try {
                const response = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: enteredPassword })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    SessionManager.createSession();
                    // Store offline token for PWA offline access
                    if (data.offlineToken) {
                        OfflineAuth.storeToken(data.offlineToken);
                    }
                    loginSection.classList.add('hidden');
                    quotationSection.classList.remove('hidden');
                    settingsButton.style.display = 'flex';
                    Toast.success('Login successful');
                    restoreFormData();
                } else {
                    if (loginError) {
                        loginError.textContent = data.error || 'Invalid password';
                        loginError.classList.remove('hidden');
                    }
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            } catch (error) {
                // If offline, try offline authentication with cached token
                if (OfflineAuth.tryOfflineAuth()) {
                    SessionManager.createSession();
                    loginSection.classList.add('hidden');
                    quotationSection.classList.remove('hidden');
                    settingsButton.style.display = 'flex';
                    Toast.info('Logged in offline (cached session)');
                    restoreFormData();
                } else if (!navigator.onLine) {
                    if (loginError) {
                        loginError.textContent = 'You are offline. Please log in online at least once to enable offline access.';
                        loginError.classList.remove('hidden');
                    }
                } else {
                    if (loginError) {
                        loginError.textContent = 'Network error. Please try again.';
                        loginError.classList.remove('hidden');
                    }
                }
            } finally {
                if (loginBtn) loginBtn.disabled = false;
                if (loginText) loginText.classList.remove('hidden');
                if (loginSpinner) loginSpinner.classList.add('hidden');
            }
        });
    }

    // Setup form persistence
    const quotationForm = document.getElementById('quotationForm');
    if (quotationForm) {
        // Save on any input change
        quotationForm.addEventListener('input', saveFormDataDebounced);
        quotationForm.addEventListener('change', saveFormDataDebounced);

        // Main form submission
        quotationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            clearValidationErrors();

            const formData = new FormData(quotationForm);
            const quotationData = Object.fromEntries(formData.entries());
            quotationData.materials = JSON.stringify(gatherMaterialsData());

            // Handle custom project type
            if (quotationData.projectType === 'Other' && quotationData.customProjectType) {
                quotationData.projectType = quotationData.customProjectType;
            }

            if (!validateFormData(quotationData)) return;

            // Save client to history
            ClientHistory.addClient(quotationData.clientName, quotationData.projectType);

            setButtonLoading('generateQuotationBtn', true);

            try {
                await generateProfessionalQuotation(quotationData);
                Toast.success('Quotation generated successfully');
            } catch (error) {
                console.error('Error generating quotation:', error);
                Toast.error('Failed to generate quotation. Please try again.');
            } finally {
                setButtonLoading('generateQuotationBtn', false);
            }
        });
    }

    // Labor type change handler
    const laborTypeSelect = document.getElementById('laborType');
    if (laborTypeSelect) {
        laborTypeSelect.addEventListener('change', handleLaborTypeChange);
        handleLaborTypeChange(); // Initial state
    }

    // Project type change handler for "Other" option
    const projectTypeSelect = document.getElementById('projectType');
    const customProjectTypeDiv = document.getElementById('customProjectTypeDiv');
    const customProjectTypeInput = document.getElementById('customProjectType');
    if (projectTypeSelect && customProjectTypeDiv) {
        projectTypeSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                customProjectTypeDiv.classList.remove('hidden');
                customProjectTypeInput.required = true;
            } else {
                customProjectTypeDiv.classList.add('hidden');
                customProjectTypeInput.required = false;
                customProjectTypeInput.value = '';
            }
        });
    }

    // Character count for description
    const descriptionTextarea = document.getElementById('projectDescription');
    if (descriptionTextarea) {
        descriptionTextarea.addEventListener('input', updateCharCount);
    }

    // Material row buttons
    const addMaterialBtn = document.getElementById('addMaterialBtn');
    const addFirstMaterial = document.getElementById('addFirstMaterial');

    if (addMaterialBtn) {
        addMaterialBtn.addEventListener('click', addMaterialRow);
    }
    if (addFirstMaterial) {
        addFirstMaterial.addEventListener('click', addMaterialRow);
    }

    // Setup client history dropdown
    setupClientHistory();

    // Get form data helper
    function getFormData() {
        const formData = new FormData(document.getElementById('quotationForm'));
        const data = Object.fromEntries(formData.entries());
        data.materials = JSON.stringify(gatherMaterialsData());
        // Handle custom project type
        if (data.projectType === 'Other' && data.customProjectType) {
            data.projectType = data.customProjectType;
        }
        return data;
    }

    // Document generation event listeners
    document.getElementById('generateAcceptance')?.addEventListener('click', async function() {
        const data = getFormData();
        if (!validateFormData(data)) return;

        try {
            await generateAcceptanceLetter(data);
            Toast.success('Acceptance Letter generated');
        } catch (error) {
            Toast.error('Failed to generate document');
        }
    });

    document.getElementById('generatePayment')?.addEventListener('click', async function() {
        const data = getFormData();
        if (!validateFormData(data)) return;

        const paymentDetails = await ModalUI.promptPaymentDetails();
        if (!paymentDetails) return;

        try {
            await generatePaymentRequest(data, paymentDetails);
            Toast.success('Payment Request generated');
        } catch (error) {
            Toast.error('Failed to generate document');
        }
    });

    document.getElementById('generateInvoice')?.addEventListener('click', async function() {
        const data = getFormData();
        if (!validateFormData(data)) return;

        const invoiceDetails = await ModalUI.promptInvoiceDetails();
        if (!invoiceDetails) return;

        try {
            await generateInvoice(data, invoiceDetails);
            Toast.success('Invoice generated');
        } catch (error) {
            Toast.error('Failed to generate document');
        }
    });

    document.getElementById('generateDelivery')?.addEventListener('click', async function() {
        const data = getFormData();
        if (!validateFormData(data)) return;

        try {
            await generateDeliveryNote(data);
            Toast.success('Delivery Note generated');
        } catch (error) {
            Toast.error('Failed to generate document');
        }
    });

    document.getElementById('generateContract')?.addEventListener('click', async function() {
        const data = getFormData();
        if (!validateFormData(data)) return;

        try {
            await generateContractAgreement(data);
            Toast.success('Contract Agreement generated');
        } catch (error) {
            Toast.error('Failed to generate document');
        }
    });

    document.getElementById('generateRecommendation')?.addEventListener('click', async function() {
        const data = getFormData();
        if (!validateFormData(data)) return;

        try {
            await generateRecommendationLetter(data);
            Toast.success('Recommendation Letter generated');
        } catch (error) {
            Toast.error('Failed to generate document');
        }
    });

    document.getElementById('generateReceipt')?.addEventListener('click', async function() {
        const data = getFormData();
        if (!validateFormData(data)) return;

        const receiptDetails = await ModalUI.promptReceiptDetails();
        if (!receiptDetails) return;

        try {
            await generateReceipt(data, receiptDetails);
            Toast.success('Receipt generated');
        } catch (error) {
            Toast.error('Failed to generate document');
        }
    });

    document.getElementById('generateLPO')?.addEventListener('click', async function() {
        const data = getFormData();
        if (!validateFormData(data)) return;

        const lpoDetails = await ModalUI.promptLPODetails();
        if (!lpoDetails) return;

        try {
            await generateLPO(data, lpoDetails);
            Toast.success('Purchase Order generated');
        } catch (error) {
            Toast.error('Failed to generate document');
        }
    });

    document.getElementById('generateAll')?.addEventListener('click', async function() {
        const data = getFormData();
        if (!validateFormData(data)) return;

        // Collect all required details first
        const paymentDetails = await ModalUI.promptPaymentDetails();
        if (!paymentDetails) return;

        const invoiceDetails = await ModalUI.promptInvoiceDetails();
        if (!invoiceDetails) return;

        const receiptDetails = await ModalUI.promptReceiptDetails();
        if (!receiptDetails) return;

        const lpoDetails = await ModalUI.promptLPODetails();
        if (!lpoDetails) return;

        // Save client to history
        ClientHistory.addClient(data.clientName, data.projectType);

        setButtonLoading('generateAll', true);
        ProgressOverlay.show('Generating All Documents', 9);

        const generators = [
            { name: 'Quotation', fn: () => generateProfessionalQuotation(data) },
            { name: 'Acceptance Letter', fn: () => generateAcceptanceLetter(data) },
            { name: 'Payment Request', fn: () => generatePaymentRequest(data, paymentDetails) },
            { name: 'Invoice', fn: () => generateInvoice(data, invoiceDetails) },
            { name: 'Delivery Note', fn: () => generateDeliveryNote(data) },
            { name: 'Contract Agreement', fn: () => generateContractAgreement(data) },
            { name: 'Recommendation Letter', fn: () => generateRecommendationLetter(data) },
            { name: 'Receipt', fn: () => generateReceipt(data, receiptDetails) },
            { name: 'Purchase Order', fn: () => generateLPO(data, lpoDetails) }
        ];

        // Start batch mode – PDFs are collected instead of saved individually
        PdfBatch.start();

        let completed = 0;

        for (const generator of generators) {
            ProgressOverlay.update(completed, `Generating ${generator.name}...`);

            try {
                await generator.fn();
            } catch (error) {
                console.error(`Error generating ${generator.name}:`, error);
            }

            completed++;
        }

        // Save / download all collected PDFs at once
        ProgressOverlay.update(completed, 'Saving documents...');
        try {
            await PdfBatch.finish();
        } catch (error) {
            console.error('Batch save error:', error);
            Toast.error('Some documents may not have saved correctly');
        }

        setTimeout(() => {
            ProgressOverlay.hide();
            setButtonLoading('generateAll', false);
            Toast.success('All documents generated successfully!');
        }, 500);
    });

    // Extend session on activity
    document.addEventListener('click', () => SessionManager.extendSession());
    document.addEventListener('keypress', () => SessionManager.extendSession());
});

// ============================================================================
// DOCUMENT GENERATORS
// ============================================================================

// 1. QUOTATION
async function generateProfessionalQuotation(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    let pageNum = 1;

    function addHeader() {
        addProfessionalHeader(doc, 'QUOTATION');
    }

    function addFooter() {
        addProfessionalFooter(doc, pageNum);
    }

    const onNewPage = () => { pageNum++; addHeader(); addFooter(); };

    let yPos = 45;

    addHeader();
    addFooter();

    const quotationNumber = DocumentRegistry.generateNumber('quotation');

    // Title
    doc.setTextColor(...Colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("PROJECT ESTIMATE", margin, yPos);

    doc.setDrawColor(...Colors.primary);
    doc.setLineWidth(0.8);
    doc.line(margin, yPos + 3, margin + 55, yPos + 3);

    yPos += 15;

    // Client info box
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 28, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...Colors.text);
    doc.text("PREPARED FOR:", margin + 5, yPos + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(data.clientName, margin + 5, yPos + 16);
    doc.setFontSize(9);
    doc.text("Project: " + data.projectType, margin + 5, yPos + 23);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text([
        "Quotation: " + quotationNumber,
        "Date: " + new Date().toLocaleDateString('en-GB')
    ], pageWidth - margin - 5, yPos + 14, { align: "right" });

    yPos += 35;

    // Project scope
    if (data.projectDescription) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...Colors.secondary);
        doc.text("PROJECT SCOPE", margin, yPos);

        yPos += 6;

        doc.setFillColor(...Colors.subtle);
        const descLines = doc.splitTextToSize(data.projectDescription, pageWidth - (2 * margin) - 10);
        const descHeight = Math.max(15, descLines.length * 4.5 + 8);
        doc.roundedRect(margin, yPos, pageWidth - (2 * margin), descHeight, 3, 3, 'F');

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...Colors.text);
        doc.text(descLines, margin + 5, yPos + 6);

        yPos += descHeight + 8;
    }

    // Materials section - page break check
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 20, onNewPage);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...Colors.secondary);
    doc.text("MATERIALS BREAKDOWN", margin, yPos);

    yPos += 6;

    const materials = JSON.parse(data.materials);
    doc.autoTable({
        startY: yPos,
        head: [["#", "Description", "Unit", "Qty", "Unit Price (KES)", "Amount (KES)"]],
        body: materials.map((m, index) => [
            index + 1,
            m.name,
            m.unit,
            m.quantity.toString(),
            numberWithCommas(m.unitPrice),
            numberWithCommas(m.quantity * m.unitPrice)
        ]),
        styles: {
            fontSize: 9,
            textColor: Colors.text,
            cellPadding: 4
        },
        headStyles: {
            fillColor: Colors.secondary,
            textColor: Colors.white,
            fontSize: 9,
            fontStyle: 'bold',
            cellPadding: 5
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 32, halign: 'right' },
            5: { cellWidth: 32, halign: 'right' }
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        },
        margin: { left: margin, right: margin },
        didDrawPage: function(data) {
            pageNum++;
            addHeader();
            addFooter();
        }
    });

    yPos = doc.lastAutoTable.finalY;

    // === POST-TABLE: SmartSpacing layout ===
    const totals = calculateTotals(data);

    // Build summary items to calculate dynamic height
    const summaryItems = [
        ["Materials Total:", `KES ${numberWithCommas(totals.materialsTotal)}`],
        ["Labor Cost:", `KES ${numberWithCommas(totals.labor)}`],
        ["Subtotal:", `KES ${numberWithCommas(totals.subtotal)}`],
        [`VAT (${totals.vatPercentage}%):`, `KES ${numberWithCommas(totals.vat)}`],
        [`Contingency (${totals.contingencyPercentage}%):`, `KES ${numberWithCommas(totals.contingency)}`]
    ];
    summaryItems.push(["Gross Total:", `KES ${numberWithCommas(totals.grossTotal)}`]);
    if (totals.withholdingTaxPercentage > 0) {
        summaryItems.push([`Less: WHT (${totals.withholdingTaxPercentage}%):`, `(KES ${numberWithCommas(totals.withholdingTax)})`]);
    }
    if (totals.subcontractorWHTPercentage > 0) {
        summaryItems.push([`Less: Subcontractor WHT (${totals.subcontractorWHTPercentage}%):`, `(KES ${numberWithCommas(totals.subcontractorWHT)})`]);
    }
    if (totals.retentionPercentage > 0) {
        summaryItems.push([`Less: Retention (${totals.retentionPercentage}%):`, `(KES ${numberWithCommas(totals.retention)})`]);
    }

    const boxHeight = 10 + (summaryItems.length * 9) + 5;
    const financialSummaryH = 16 + boxHeight;

    // SmartSpacing: compute post-table layout
    const postBlocks = [
        { height: 0, minGap: 8, preferredGap: 15 },
        { height: financialSummaryH, minGap: 2, preferredGap: 5, keepWithNext: true },
        { height: 18, minGap: 3, preferredGap: 10, keepWithNext: true },
        { height: 38, minGap: 0, preferredGap: 0 }
    ];
    const postLayout = SmartSpacing.distribute(doc, yPos, postBlocks);
    let pi = 0;

    // Gap: table → financial summary
    yPos = SmartSpacing.advance(yPos, 0, postLayout, pi++, doc, onNewPage);

    // Financial summary header
    doc.setFillColor(...Colors.secondary);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 14, 3, 3, 'F');

    doc.setTextColor(...Colors.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("FINANCIAL SUMMARY", margin + 5, yPos + 9.5);

    yPos += 16;

    // Summary items box
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), boxHeight, 3, 3, 'F');

    let summaryY = yPos + 10;
    doc.setTextColor(...Colors.text);
    doc.setFontSize(10);

    summaryItems.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.text(label, margin + 8, summaryY);
        doc.setFont("helvetica", "bold");
        doc.text(value, pageWidth - margin - 8, summaryY, { align: "right" });
        summaryY += 9;
    });

    yPos += boxHeight;

    // Gap: financial summary → NET PAYABLE
    yPos = SmartSpacing.advance(yPos, 0, postLayout, pi++, doc, onNewPage);

    // NET PAYABLE bar
    doc.setFillColor(...Colors.primary);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 18, 3, 3, 'F');
    doc.setTextColor(...Colors.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const totalLabel = totals.totalDeductions > 0 ? "NET PAYABLE:" : "TOTAL AMOUNT:";
    const totalAmount = totals.totalDeductions > 0 ? totals.netPayable : totals.total;
    doc.text(totalLabel, margin + 8, yPos + 12);
    doc.setFontSize(14);
    doc.text(`KES ${numberWithCommas(totalAmount)}`, pageWidth - margin - 8, yPos + 12, { align: "right" });

    // Gap: NET PAYABLE → seal
    yPos = SmartSpacing.advance(yPos, 18, postLayout, pi++, doc, onNewPage);

    // Professional seal with QR verification
    const qtDocId = generateDocumentUUID('QUOTATION', quotationNumber);
    placeSealAndQR(doc, yPos, {
        docType: 'QUOTATION',
        docNumber: quotationNumber,
        date: new Date().toLocaleDateString('en-GB'),
        documentId: qtDocId
    }, {
        placement: 'right-side',
        signatureBlockY: yPos
    });
    const qtAmount = totals.totalDeductions > 0 ? totals.netPayable : totals.total;
    storeDocumentRecord(qtDocId, 'QUOTATION', quotationNumber, data.clientName, qtAmount).catch(() => {});

    await savePDFDocument(doc, `Pintorex-Quotation-${quotationNumber}.pdf`);
}

// 2. ACCEPTANCE LETTER
async function generateAcceptanceLetter(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    const documentNumber = DocumentRegistry.generateNumber('acceptance');
    const onNewPage = () => { addProfessionalHeader(doc, 'ACCEPTANCE'); addProfessionalFooter(doc); };

    addProfessionalHeader(doc, 'ACCEPTANCE');
    addProfessionalFooter(doc);

    let yPos = 48;
    const totals = calculateTotals(data);

    // Pre-calculate body text height for SmartSpacing
    const bodyText = `We are pleased to formally accept the contract for the above-referenced construction project valued at KES ${numberWithCommas(totals.total)}. This acceptance is issued in accordance with the terms and specifications provided, and we hereby commit to delivering the project within the agreed timeline while maintaining the highest standards of workmanship, quality control, compliance with all applicable safety regulations and building codes, and providing regular progress updates throughout the project duration. We look forward to commencing work and ensuring the successful completion of this project to your full satisfaction.`;
    const bodyLines = doc.splitTextToSize(bodyText, pageWidth - (2 * margin));
    const bodyH = bodyLines.length * 5;

    // SmartSpacing: define all sections
    const blocks = [
        { height: 8, minGap: 6, preferredGap: 12 },
        { height: 18, minGap: 3, preferredGap: 8 },
        { height: 5, minGap: 4, preferredGap: 8 },
        { height: 10, minGap: 5, preferredGap: 12 },
        { height: bodyH, minGap: 4, preferredGap: 10 },
        { height: 32, minGap: 4, preferredGap: 10 },
        { height: 5, minGap: 4, preferredGap: 8 },
        { height: 32, minGap: 0, preferredGap: 0, keepWithNext: true },
        { height: 38, minGap: 0, preferredGap: 0 }
    ];
    const layout = SmartSpacing.distribute(doc, yPos, blocks);
    let si = 0;

    // Title
    doc.setTextColor(...Colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ACCEPTANCE OF CONTRACT", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...Colors.primary);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 50, yPos + 3, pageWidth / 2 + 50, yPos + 3);

    yPos = SmartSpacing.advance(yPos, 8, layout, si++, doc, onNewPage);

    // Reference info
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 18, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);
    doc.text(`Reference: ${documentNumber}`, margin + 5, yPos + 8);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 5, yPos + 8, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Official Contract Acceptance", margin + 5, yPos + 14);

    yPos = SmartSpacing.advance(yPos, 18, layout, si++, doc, onNewPage);

    // Recipient
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...Colors.text);
    doc.text(data.clientName, margin, yPos);
    yPos = SmartSpacing.advance(yPos, 5, layout, si++, doc, onNewPage);

    // Subject
    doc.setFillColor(...Colors.primary);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 10, 2, 2, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...Colors.white);
    doc.text(`RE: ${data.projectType.toUpperCase()}`, margin + 5, yPos + 7);

    yPos = SmartSpacing.advance(yPos, 10, layout, si++, doc, onNewPage);

    // Main body
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...Colors.text);
    doc.text(bodyLines, margin, yPos);
    yPos = SmartSpacing.advance(yPos, bodyH, layout, si++, doc, onNewPage);

    // Project details
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 32, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.secondary);
    doc.text("PROJECT DETAILS:", margin + 5, yPos + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);

    let detailY = yPos + 15;
    const projectDetails = [
        `Project: ${data.projectType}`,
        `Contract Value: KES ${numberWithCommas(totals.total)}`,
        `Commencement: As per agreed schedule`
    ];

    projectDetails.forEach(detail => {
        doc.text(detail, margin + 5, detailY);
        detailY += 5;
    });

    yPos = SmartSpacing.advance(yPos, 32, layout, si++, doc, onNewPage);

    // Closing
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Yours faithfully,", margin, yPos);
    yPos = SmartSpacing.advance(yPos, 5, layout, si++, doc, onNewPage);

    // Signature area
    const signatureStartY = yPos;
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, 80, 32, 3, 3, 'F');

    let sigY = yPos + 8;
    doc.setLineWidth(0.3);
    doc.setDrawColor(...Colors.textMuted);
    doc.line(margin + 5, sigY, margin + 65, sigY);

    sigY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Joseph Ochieng", margin + 5, sigY);

    sigY += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Director/Operations Manager", margin + 5, sigY);

    sigY += 6;
    doc.setFontSize(8);
    doc.setTextColor(...Colors.textMuted);
    doc.text("Tel: +254 769 157174", margin + 5, sigY);

    yPos = SmartSpacing.advance(yPos, 32, layout, si++, doc, onNewPage);

    // Professional seal with QR verification
    const accDocId = generateDocumentUUID('ACCEPTANCE', documentNumber);
    placeSealAndQR(doc, yPos, {
        docType: 'ACCEPTANCE',
        docNumber: documentNumber,
        date: new Date().toLocaleDateString('en-GB'),
        documentId: accDocId
    }, {
        placement: 'right-of-signature',
        signatureBlockY: signatureStartY
    });
    storeDocumentRecord(accDocId, 'ACCEPTANCE', documentNumber, data.clientName, totals.total).catch(() => {});

    await savePDFDocument(doc, `Pintorex-Acceptance-${documentNumber}.pdf`);
}

// 3. PAYMENT REQUEST
async function generatePaymentRequest(data, paymentDetails) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    const documentNumber = DocumentRegistry.generateNumber('payment');
    const onNewPage = () => { addProfessionalHeader(doc, 'PAYMENT REQUEST'); addProfessionalFooter(doc); };

    addProfessionalHeader(doc, 'PAYMENT REQUEST');
    addProfessionalFooter(doc);

    let yPos = 48;
    const totals = calculateTotals(data);

    // Title
    doc.setTextColor(...Colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PAYMENT REQUEST", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...Colors.primary);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 40, yPos + 3, pageWidth / 2 + 40, yPos + 3);

    yPos += 15;

    // Request info
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 25, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);
    doc.text(`Request No: ${documentNumber}`, margin + 5, yPos + 8);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 5, yPos + 8, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Client: ${data.clientName}`, margin + 5, yPos + 15);
    doc.text(`Project: ${data.projectType}`, margin + 5, yPos + 21);

    yPos += 32;

    // Payment breakdown table
    doc.autoTable({
        startY: yPos,
        head: [["Description", "Amount (KES)"]],
        body: [
            ["Materials", numberWithCommas(totals.materialsTotal)],
            ["Labor", numberWithCommas(totals.labor)],
            ["Subtotal", numberWithCommas(totals.subtotal)],
            [`VAT (${totals.vatPercentage}%)`, numberWithCommas(totals.vat)],
            [`Contingency (${totals.contingencyPercentage}%)`, numberWithCommas(totals.contingency)]
        ],
        styles: {
            fontSize: 10,
            textColor: Colors.text,
            cellPadding: 5
        },
        headStyles: {
            fillColor: Colors.secondary,
            textColor: Colors.white,
            fontSize: 10,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 50, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        theme: 'grid'
    });

    yPos = doc.lastAutoTable.finalY;

    // === POST-TABLE: SmartSpacing layout ===
    const postBlocks = [
        { height: 0, minGap: 8, preferredGap: 15 },           // spacer: table -> AMOUNT DUE
        { height: 16, minGap: 3, preferredGap: 8 },            // AMOUNT DUE bar
        { height: 45, minGap: 3, preferredGap: 8 },            // bank details box
        { height: 20, minGap: 0, preferredGap: 0, keepWithNext: true }, // signature
        { height: 38, minGap: 0, preferredGap: 0 }             // seal
    ];
    const postLayout = SmartSpacing.distribute(doc, yPos, postBlocks);
    let pi = 0;

    // Gap: table -> AMOUNT DUE
    yPos = SmartSpacing.advance(yPos, 0, postLayout, pi++, doc, onNewPage);

    // Total
    doc.setFillColor(...Colors.primary);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 16, 3, 3, 'F');

    doc.setTextColor(...Colors.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("AMOUNT DUE:", margin + 5, yPos + 11);
    doc.text(`KES ${numberWithCommas(totals.total)}`, pageWidth - margin - 5, yPos + 11, { align: "right" });

    // Gap: AMOUNT DUE -> bank details
    yPos = SmartSpacing.advance(yPos, 16, postLayout, pi++, doc, onNewPage);

    // Bank details
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 45, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...Colors.secondary);
    doc.text("BANK DETAILS", margin + 5, yPos + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);

    let payY = yPos + 18;
    const paymentInfo = [
        `Bank: ${paymentDetails.bankName}`,
        `Account: ${paymentDetails.accountNumber}`,
        `Account Name: ${paymentDetails.accountName}`,
        paymentDetails.branch ? `Branch: ${paymentDetails.branch}` : null,
        `Payment Terms: Net 30 days`
    ].filter(Boolean);

    paymentInfo.forEach(info => {
        doc.text(info, margin + 5, payY);
        payY += 5;
    });

    // Gap: bank details -> signature
    yPos = SmartSpacing.advance(yPos, 45, postLayout, pi++, doc, onNewPage);

    // Signature
    const signatureStartY = yPos;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Prepared By:", margin, yPos);
    yPos += 8;

    doc.setDrawColor(...Colors.textMuted);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + 55, yPos);
    yPos += 4;

    doc.setFont("helvetica", "bold");
    doc.text("Joseph Ochieng", margin, yPos);
    yPos += 4;
    doc.setFont("helvetica", "normal");
    doc.text("Director/Operations Manager", margin, yPos);

    // Gap: signature -> seal (keepWithNext keeps them together)
    yPos = SmartSpacing.advance(signatureStartY, 20, postLayout, pi++, doc, onNewPage);

    // Professional seal with QR verification
    const prDocId = generateDocumentUUID('PAYMENT', documentNumber);
    placeSealAndQR(doc, yPos, {
        docType: 'PAYMENT',
        docNumber: documentNumber,
        date: new Date().toLocaleDateString('en-GB'),
        documentId: prDocId
    }, {
        placement: 'right-of-signature',
        signatureBlockY: signatureStartY
    });
    storeDocumentRecord(prDocId, 'PAYMENT', documentNumber, data.clientName, totals.total).catch(() => {});

    await savePDFDocument(doc, `Pintorex-Payment-Request-${documentNumber}.pdf`);
}

// 4. INVOICE
async function generateInvoice(data, invoiceDetails) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    const documentNumber = DocumentRegistry.generateNumber('invoice');
    const onNewPage = () => { addProfessionalHeader(doc, 'INVOICE'); addProfessionalFooter(doc); };

    addProfessionalHeader(doc, 'INVOICE');
    addProfessionalFooter(doc);

    let yPos = 48;

    // Title
    doc.setTextColor(...Colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("INVOICE", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...Colors.primary);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 30, yPos + 3, pageWidth / 2 + 30, yPos + 3);

    yPos += 15;

    // Invoice details
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 32, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);
    doc.text("INVOICE TO:", margin + 5, yPos + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text([
        data.clientName,
        "Project: " + data.projectType
    ], margin + 5, yPos + 15);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const invoiceInfo = [
        `Invoice: ${documentNumber}`,
        `Order: ${invoiceDetails.orderNumber}`,
        invoiceDetails.deliveryNumber ? `Delivery: ${invoiceDetails.deliveryNumber}` : null,
        `Date: ${new Date().toLocaleDateString('en-GB')}`,
        `Due: ${dueDate.toLocaleDateString('en-GB')}`
    ].filter(Boolean);

    let infoY = yPos + 8;
    invoiceInfo.forEach(info => {
        doc.text(info, pageWidth - margin - 5, infoY, { align: "right" });
        infoY += 4.5;
    });

    yPos += 40;

    // Materials table
    const materials = JSON.parse(data.materials || '[]');
    const totals = calculateTotals(data);

    const tableData = materials.map((m, i) => [
        i + 1,
        m.name,
        m.unit,
        m.quantity.toString(),
        numberWithCommas(m.unitPrice),
        numberWithCommas(m.quantity * m.unitPrice)
    ]);

    if (totals.labor > 0) {
        tableData.push([
            tableData.length + 1,
            'Labor Services',
            'LS',
            '1',
            numberWithCommas(totals.labor),
            numberWithCommas(totals.labor)
        ]);
    }

    doc.autoTable({
        startY: yPos,
        head: [["#", "Description", "Unit", "Qty", "Unit Price (KES)", "Amount (KES)"]],
        body: tableData,
        styles: {
            fontSize: 9,
            textColor: Colors.text,
            cellPadding: 4
        },
        headStyles: {
            fillColor: Colors.secondary,
            textColor: Colors.white,
            fontSize: 9,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 18, halign: 'right' },
            4: { cellWidth: 34, halign: 'right' },
            5: { cellWidth: 34, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        theme: 'grid'
    });

    yPos = doc.lastAutoTable.finalY;

    // === POST-TABLE: SmartSpacing layout ===
    // Build summary items to calculate dynamic height
    const summaryItems = [
        ["Subtotal:", `KES ${numberWithCommas(totals.subtotal)}`],
        [`VAT (${totals.vatPercentage}%):`, `KES ${numberWithCommas(totals.vat)}`],
        [`Contingency (${totals.contingencyPercentage}%):`, `KES ${numberWithCommas(totals.contingency)}`],
        ["Gross Total:", `KES ${numberWithCommas(totals.grossTotal)}`]
    ];

    // Add deductions if applicable
    if (totals.withholdingTaxPercentage > 0) {
        summaryItems.push([`Less: WHT (${totals.withholdingTaxPercentage}%):`, `(KES ${numberWithCommas(totals.withholdingTax)})`]);
    }
    if (totals.subcontractorWHTPercentage > 0) {
        summaryItems.push([`Less: Subcontractor WHT (${totals.subcontractorWHTPercentage}%):`, `(KES ${numberWithCommas(totals.subcontractorWHT)})`]);
    }
    if (totals.retentionPercentage > 0) {
        summaryItems.push([`Less: Retention (${totals.retentionPercentage}%):`, `(KES ${numberWithCommas(totals.retention)})`]);
    }

    const boxHeight = 8 + (summaryItems.length * 8) + 5;

    // Pre-calculate disclaimer height
    const disclaimer = "This invoice is issued in accordance with the Value Added Tax Act (Cap 476) and Income Tax Act (Cap 470) of the Laws of Kenya.";
    const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - (2 * margin));
    const disclaimerH = disclaimerLines.length * 4;

    // SmartSpacing: compute post-table layout
    const postBlocks = [
        { height: 0, minGap: 8, preferredGap: 15 },               // spacer: table -> summary box
        { height: boxHeight, minGap: 2, preferredGap: 5 },         // summary box
        { height: 16, minGap: 2, preferredGap: 5 },                // total bar
        { height: disclaimerH, minGap: 2, preferredGap: 5 },       // disclaimer
        { height: 38, minGap: 0, preferredGap: 0 }                 // seal (watermark)
    ];
    const postLayout = SmartSpacing.distribute(doc, yPos, postBlocks);
    let pi = 0;

    // Gap: table -> summary box
    yPos = SmartSpacing.advance(yPos, 0, postLayout, pi++, doc, onNewPage);

    // Summary box
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), boxHeight, 3, 3, 'F');

    let summaryY = yPos + 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);

    summaryItems.forEach(([label, value]) => {
        doc.text(label, margin + 5, summaryY);
        doc.text(value, pageWidth - margin - 5, summaryY, { align: "right" });
        summaryY += 8;
    });

    // Gap: summary box -> total bar
    yPos = SmartSpacing.advance(yPos, boxHeight, postLayout, pi++, doc, onNewPage);

    // Total bar
    doc.setFillColor(...Colors.primary);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 16, 3, 3, 'F');

    doc.setTextColor(...Colors.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const totalLabel = totals.totalDeductions > 0 ? "NET PAYABLE:" : "TOTAL AMOUNT:";
    const totalAmount = totals.totalDeductions > 0 ? totals.netPayable : totals.total;
    doc.text(totalLabel, margin + 5, yPos + 11);
    doc.text(`KES ${numberWithCommas(totalAmount)}`, pageWidth - margin - 5, yPos + 11, { align: "right" });

    // Gap: total bar -> disclaimer
    yPos = SmartSpacing.advance(yPos, 16, postLayout, pi++, doc, onNewPage);

    // Disclaimer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...Colors.textMuted);
    doc.text(disclaimerLines, margin, yPos);

    // Gap: disclaimer -> seal
    yPos = SmartSpacing.advance(yPos, disclaimerH, postLayout, pi++, doc, onNewPage);

    // Professional seal with QR verification (watermark mode for content-dense invoice)
    const invDocId = generateDocumentUUID('INVOICE', documentNumber);
    placeSealAndQR(doc, yPos, {
        docType: 'INVOICE',
        docNumber: documentNumber,
        date: new Date().toLocaleDateString('en-GB'),
        watermark: true,
        documentId: invDocId
    }, {
        placement: 'right-side'
    });
    const invAmount = totals.totalDeductions > 0 ? totals.netPayable : totals.total;
    storeDocumentRecord(invDocId, 'INVOICE', documentNumber, data.clientName, invAmount).catch(() => {});

    await savePDFDocument(doc, `Pintorex-Invoice-${documentNumber}.pdf`);
}

// 5. DELIVERY NOTE
async function generateDeliveryNote(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    const documentNumber = DocumentRegistry.generateNumber('delivery');
    const lastInvoice = DocumentRegistry.getLastDocument('invoice');
    const onNewPage = () => { addProfessionalHeader(doc, 'DELIVERY NOTE'); addProfessionalFooter(doc); };

    addProfessionalHeader(doc, 'DELIVERY NOTE');
    addProfessionalFooter(doc);

    let yPos = 48;

    // Title
    doc.setTextColor(...Colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("DELIVERY NOTE", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...Colors.primary);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 35, yPos + 3, pageWidth / 2 + 35, yPos + 3);

    yPos += 15;

    // Delivery details
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 28, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);
    doc.text(`Delivery Note: ${documentNumber}`, margin + 5, yPos + 8);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 5, yPos + 8, { align: "right" });

    if (lastInvoice) {
        doc.text(`Invoice: ${lastInvoice.number}`, pageWidth - margin - 5, yPos + 14, { align: "right" });
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Delivered To: ${data.clientName}`, margin + 5, yPos + 15);
    doc.text(`Project: ${data.projectType}`, margin + 5, yPos + 22);

    yPos += 35;

    // Materials table
    const materials = JSON.parse(data.materials);

    doc.autoTable({
        startY: yPos,
        head: [["#", "Description", "Unit", "Quantity", "Remarks"]],
        body: materials.map((m, i) => [
            i + 1,
            m.name,
            m.unit,
            m.quantity.toString(),
            ""
        ]),
        styles: {
            fontSize: 9,
            textColor: Colors.text,
            cellPadding: 5
        },
        headStyles: {
            fillColor: Colors.secondary,
            textColor: Colors.white,
            fontSize: 9,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 40, halign: 'center' }
        },
        margin: { left: margin, right: margin },
        theme: 'grid'
    });

    yPos = doc.lastAutoTable.finalY;

    // === POST-TABLE: SmartSpacing layout ===
    const postBlocks = [
        { height: 0, minGap: 8, preferredGap: 15 },               // spacer: table -> signature
        { height: 25, minGap: 0, preferredGap: 0, keepWithNext: true }, // signature section
        { height: 38, minGap: 0, preferredGap: 0 }                 // seal
    ];
    const postLayout = SmartSpacing.distribute(doc, yPos, postBlocks);
    let pi = 0;

    // Gap: table -> signature section
    yPos = SmartSpacing.advance(yPos, 0, postLayout, pi++, doc, onNewPage);

    // Signature section - two columns
    const signatureStartY = yPos;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);
    doc.text("Delivered By:", margin, yPos);
    doc.text("Received By:", pageWidth / 2 + 10, yPos);

    yPos += 12;
    doc.setDrawColor(...Colors.textMuted);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + 70, yPos);
    doc.line(pageWidth / 2 + 10, yPos, pageWidth - margin, yPos);

    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature & Date", margin, yPos);
    doc.text("Signature & Date", pageWidth / 2 + 10, yPos);

    yPos += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Joseph Ochieng", margin, yPos);
    yPos += 4;
    doc.setFont("helvetica", "normal");
    doc.text("Director/Operations Manager", margin, yPos);

    // Gap: signature -> seal (keepWithNext keeps them together)
    yPos = SmartSpacing.advance(signatureStartY, 25, postLayout, pi++, doc, onNewPage);

    // Professional seal with QR verification
    const dnDocId = generateDocumentUUID('DELIVERY', documentNumber);
    placeSealAndQR(doc, yPos, {
        docType: 'DELIVERY',
        docNumber: documentNumber,
        date: new Date().toLocaleDateString('en-GB'),
        documentId: dnDocId
    }, {
        placement: 'right-side',
        signatureBlockY: signatureStartY
    });
    storeDocumentRecord(dnDocId, 'DELIVERY', documentNumber, data.clientName, null).catch(() => {});

    await savePDFDocument(doc, `Pintorex-Delivery-Note-${documentNumber}.pdf`);
}

// 6. CONTRACT AGREEMENT
async function generateContractAgreement(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let pageNum = 1;

    function addHeader() {
        addProfessionalHeader(doc, 'CONTRACT');
    }

    function addFooter() {
        addProfessionalFooter(doc, pageNum);
    }

    const documentNumber = DocumentRegistry.generateNumber('contract');
    const onNewPage = () => { pageNum++; addHeader(); addFooter(); };

    addHeader();
    addFooter();

    let yPos = 48;
    const totals = calculateTotals(data);

    // Pre-calculate description lines for scope section
    const descLines = doc.splitTextToSize(`Description: ${data.projectDescription || 'As per agreement'}`, pageWidth - (2 * margin) - 10);

    // SmartSpacing: define all sections
    const blocks = [
        { height: 10, minGap: 4, preferredGap: 8 },            // title + contract no
        { height: 33, minGap: 4, preferredGap: 8 },             // parties section (header + box)
        { height: 25, minGap: 4, preferredGap: 8 },             // scope section (header + box)
        { height: 14, minGap: 4, preferredGap: 10 },            // contract value bar
        { height: 15, minGap: 4, preferredGap: 8 },             // terms section (header + text)
        { height: 8, minGap: 3, preferredGap: 6 },              // SIGNATURES header
        { height: 35, minGap: 0, preferredGap: 0, keepWithNext: true }, // signature boxes
        { height: 38, minGap: 0, preferredGap: 0 }              // seal
    ];
    const layout = SmartSpacing.distribute(doc, yPos, blocks);
    let si = 0;

    // Title
    doc.setTextColor(...Colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CONSTRUCTION CONTRACT", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...Colors.primary);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 55, yPos + 3, pageWidth / 2 + 55, yPos + 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Contract No: ${documentNumber}`, pageWidth / 2, yPos + 10, { align: "center" });

    yPos = SmartSpacing.advance(yPos, 10, layout, si++, doc, onNewPage);

    // Parties
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...Colors.secondary);
    doc.text("PARTIES TO THE CONTRACT", margin, yPos);

    const partiesBoxY = yPos + 7;
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, partiesBoxY, pageWidth - (2 * margin), 26, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);
    doc.text("CONTRACTOR:", margin + 5, partiesBoxY + 8);
    doc.setFont("helvetica", "normal");
    doc.text("Pintorex Construction Limited", margin + 5, partiesBoxY + 14);
    doc.setFontSize(8);
    doc.text("Tel: +254 769 157174 | Email: pintorexkenya@gmail.com", margin + 5, partiesBoxY + 19);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("CLIENT:", pageWidth - margin - 5, partiesBoxY + 8, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(data.clientName, pageWidth - margin - 5, partiesBoxY + 14, { align: "right" });

    yPos = SmartSpacing.advance(yPos, 33, layout, si++, doc, onNewPage);

    // Scope
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...Colors.secondary);
    doc.text("SCOPE OF WORK", margin, yPos);

    const scopeBoxY = yPos + 7;
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, scopeBoxY, pageWidth - (2 * margin), 18, 3, 3, 'F');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);
    doc.text(`Project Type: ${data.projectType}`, margin + 5, scopeBoxY + 8);
    doc.text(descLines, margin + 5, scopeBoxY + 14);

    yPos = SmartSpacing.advance(yPos, 25, layout, si++, doc, onNewPage);

    // Contract value
    doc.setFillColor(...Colors.primary);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 14, 3, 3, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...Colors.white);
    doc.text("CONTRACT VALUE:", margin + 5, yPos + 9.5);
    doc.text(`KES ${numberWithCommas(totals.total)}`, pageWidth - margin - 5, yPos + 9.5, { align: "right" });

    yPos = SmartSpacing.advance(yPos, 14, layout, si++, doc, onNewPage);

    // Terms
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...Colors.secondary);
    doc.text("TERMS AND CONDITIONS", margin, yPos);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...Colors.textMuted);
    doc.text("Subject to standard terms. Defects liability: 6 months. Governed by Laws of Kenya.", margin, yPos + 7);

    yPos = SmartSpacing.advance(yPos, 15, layout, si++, doc, onNewPage);

    // Signatures header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...Colors.secondary);
    doc.text("SIGNATURES", margin, yPos);

    yPos = SmartSpacing.advance(yPos, 8, layout, si++, doc, onNewPage);

    // Two column signature boxes
    const colWidth = (pageWidth - (2 * margin) - 10) / 2;

    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, colWidth, 35, 3, 3, 'F');
    doc.roundedRect(margin + colWidth + 10, yPos, colWidth, 35, 3, 3, 'F');

    // Contractor signature
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);
    doc.text("CONTRACTOR:", margin + 5, yPos + 8);
    doc.setDrawColor(...Colors.textMuted);
    doc.setLineWidth(0.3);
    doc.line(margin + 5, yPos + 18, margin + colWidth - 5, yPos + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature & Date", margin + 5, yPos + 23);
    doc.text("Joseph Ochieng - Director/Operations Manager", margin + 5, yPos + 28);

    // Client signature
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("CLIENT:", margin + colWidth + 15, yPos + 8);
    doc.line(margin + colWidth + 15, yPos + 18, pageWidth - margin - 5, yPos + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature & Date", margin + colWidth + 15, yPos + 23);
    doc.text(data.clientName, margin + colWidth + 15, yPos + 28);

    // Gap: signature boxes -> seal (keepWithNext keeps them together)
    yPos = SmartSpacing.advance(yPos, 35, layout, si++, doc, onNewPage);

    // Professional seal with QR verification
    const ctDocId = generateDocumentUUID('CONTRACT', documentNumber);
    placeSealAndQR(doc, yPos, {
        docType: 'CONTRACT',
        docNumber: documentNumber,
        date: new Date().toLocaleDateString('en-GB'),
        documentId: ctDocId
    }, {
        placement: 'centered-below'
    });
    storeDocumentRecord(ctDocId, 'CONTRACT', documentNumber, data.clientName, totals.total).catch(() => {});

    await savePDFDocument(doc, `Pintorex-Contract-${documentNumber}.pdf`);
}

// 7. RECOMMENDATION LETTER
async function generateRecommendationLetter(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    const documentNumber = DocumentRegistry.generateNumber('recommendation');
    const onNewPage = () => { addProfessionalHeader(doc, 'RECOMMENDATION'); addProfessionalFooter(doc); };

    addProfessionalHeader(doc, 'RECOMMENDATION');
    addProfessionalFooter(doc);

    let yPos = 48;

    // Pre-calculate body height for SmartSpacing
    doc.setFontSize(10);
    const bodyParagraphs = [
        `This is to certify that ${data.clientName} engaged Pintorex Construction Limited for ${data.projectType}.`,
        "",
        "Throughout our professional engagement, the client demonstrated professionalism in all dealings, timely fulfillment of financial obligations, clear communication of project requirements, and strong commitment to quality standards.",
        "",
        "The project was completed to mutual satisfaction. We recommend them without reservation for future construction engagements.",
        "",
        "For further information, please contact us using the details provided above."
    ];
    let bodyH = 0;
    bodyParagraphs.forEach(para => {
        if (para === "") { bodyH += 3; }
        else { bodyH += doc.splitTextToSize(para, pageWidth - (2 * margin)).length * 5; }
    });

    // SmartSpacing: define all sections
    const blocks = [
        { height: 12, minGap: 6, preferredGap: 12 },
        { height: 5, minGap: 6, preferredGap: 12 },
        { height: 5, minGap: 6, preferredGap: 12 },
        { height: bodyH, minGap: 5, preferredGap: 10 },
        { height: 5, minGap: 4, preferredGap: 8 },
        { height: 15, minGap: 0, preferredGap: 0, keepWithNext: true },
        { height: 38, minGap: 0, preferredGap: 0 }
    ];
    const layout = SmartSpacing.distribute(doc, yPos, blocks);
    let si = 0;

    // Title + reference
    doc.setTextColor(...Colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("RECOMMENDATION LETTER", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...Colors.primary);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 55, yPos + 3, pageWidth / 2 + 55, yPos + 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Reference: ${documentNumber}`, pageWidth / 2, yPos + 10, { align: "center" });

    yPos = SmartSpacing.advance(yPos, 12, layout, si++, doc, onNewPage);

    // Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...Colors.text);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, yPos, { align: "right" });

    yPos = SmartSpacing.advance(yPos, 5, layout, si++, doc, onNewPage);

    // Salutation
    doc.text("TO WHOM IT MAY CONCERN", margin, yPos);
    yPos = SmartSpacing.advance(yPos, 5, layout, si++, doc, onNewPage);

    // Body
    doc.setFontSize(10);
    bodyParagraphs.forEach(para => {
        if (para === "") {
            yPos += 3;
        } else {
            const lines = doc.splitTextToSize(para, pageWidth - (2 * margin));
            doc.text(lines, margin, yPos);
            yPos += (lines.length * 5);
        }
    });
    yPos = SmartSpacing.advance(yPos, 0, layout, si++, doc, onNewPage);

    // Closing
    doc.text("Yours faithfully,", margin, yPos);
    yPos = SmartSpacing.advance(yPos, 5, layout, si++, doc, onNewPage);

    // Signature
    const signatureStartY = yPos;
    doc.setDrawColor(...Colors.textMuted);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + 55, yPos);
    yPos += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Joseph Ochieng", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Director/Operations Manager", margin, yPos);

    yPos = SmartSpacing.advance(signatureStartY, 15, layout, si++, doc, onNewPage);

    // Professional seal with QR verification
    const recDocId = generateDocumentUUID('RECOMMENDATION', documentNumber);
    placeSealAndQR(doc, yPos, {
        docType: 'RECOMMENDATION',
        docNumber: documentNumber,
        date: new Date().toLocaleDateString('en-GB'),
        documentId: recDocId
    }, {
        placement: 'right-of-signature',
        signatureBlockY: signatureStartY
    });
    storeDocumentRecord(recDocId, 'RECOMMENDATION', documentNumber, data.clientName, null).catch(() => {});

    await savePDFDocument(doc, `Pintorex-Recommendation-${documentNumber}.pdf`);
}

// 8. RECEIPT
async function generateReceipt(data, receiptDetails) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    const documentNumber = DocumentRegistry.generateNumber('receipt');
    const totals = calculateTotals(data);
    const amountPaid = receiptDetails.amountPaid ? parseFloat(receiptDetails.amountPaid) : totals.total;
    const onNewPage = () => { addProfessionalHeader(doc, 'RECEIPT'); addProfessionalFooter(doc); };

    addProfessionalHeader(doc, 'RECEIPT');
    addProfessionalFooter(doc);

    let yPos = 48;

    // SmartSpacing: define all sections
    const blocks = [
        { height: 12, minGap: 6, preferredGap: 12 },
        { height: 60, minGap: 5, preferredGap: 12 },
        { height: 25, minGap: 5, preferredGap: 12 },
        { height: 26, minGap: 0, preferredGap: 0, keepWithNext: true },
        { height: 38, minGap: 0, preferredGap: 0 }
    ];
    const layout = SmartSpacing.distribute(doc, yPos, blocks);
    let si = 0;

    // Title + receipt number
    doc.setTextColor(...Colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("RECEIPT", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...Colors.primary);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 22, yPos + 3, pageWidth / 2 + 22, yPos + 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Receipt No: ${documentNumber}`, pageWidth / 2, yPos + 10, { align: "center" });

    yPos = SmartSpacing.advance(yPos, 12, layout, si++, doc, onNewPage);

    // Receipt details box
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 60, 3, 3, 'F');

    let detailY = yPos + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...Colors.text);
    doc.text("RECEIVED FROM:", margin + 8, detailY);

    detailY += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(data.clientName, margin + 8, detailY);

    detailY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("AMOUNT:", margin + 8, detailY);
    doc.setFont("helvetica", "normal");
    doc.text(`KES ${numberWithCommas(amountPaid)}`, margin + 35, detailY);

    detailY += 10;
    doc.setFont("helvetica", "bold");
    doc.text("FOR:", margin + 8, detailY);
    doc.setFont("helvetica", "normal");
    doc.text(data.projectType, margin + 35, detailY);

    detailY += 10;
    doc.setFont("helvetica", "bold");
    doc.text("DATE:", margin + 8, detailY);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString('en-GB'), margin + 35, detailY);

    yPos = SmartSpacing.advance(yPos, 60, layout, si++, doc, onNewPage);

    // Payment method
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...Colors.border);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 25, 3, 3, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.secondary);
    doc.text("PAYMENT DETAILS", margin + 5, yPos + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);
    doc.text(`Method: ${receiptDetails.paymentMethod}`, margin + 5, yPos + 16);
    if (receiptDetails.referenceNumber) {
        doc.text(`Reference: ${receiptDetails.referenceNumber}`, margin + 80, yPos + 16);
    }

    yPos = SmartSpacing.advance(yPos, 25, layout, si++, doc, onNewPage);

    // Signature
    const signatureStartY = yPos;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Received By:", margin, yPos);
    yPos += 12;

    doc.setDrawColor(...Colors.textMuted);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + 55, yPos);
    yPos += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Authorized Signature", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Joseph Ochieng", margin, yPos);
    yPos += 4;
    doc.setFont("helvetica", "normal");
    doc.text("Director/Operations Manager", margin, yPos);

    yPos = SmartSpacing.advance(signatureStartY, 26, layout, si++, doc, onNewPage);

    // Professional seal with QR verification
    const rcptDocId = generateDocumentUUID('RECEIPT', documentNumber);
    placeSealAndQR(doc, yPos, {
        docType: 'RECEIPT',
        docNumber: documentNumber,
        date: new Date().toLocaleDateString('en-GB'),
        documentId: rcptDocId
    }, {
        placement: 'right-of-signature',
        signatureBlockY: signatureStartY
    });
    storeDocumentRecord(rcptDocId, 'RECEIPT', documentNumber, data.clientName, parseFloat(receiptDetails.amount)).catch(() => {});

    await savePDFDocument(doc, `Pintorex-Receipt-${documentNumber}.pdf`);
}

// 9. LPO (Purchase Order)
async function generateLPO(data, lpoDetails) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    const documentNumber = DocumentRegistry.generateNumber('lpo');
    const onNewPage = () => { addProfessionalHeader(doc, 'PURCHASE ORDER'); addProfessionalFooter(doc); };

    addProfessionalHeader(doc, 'PURCHASE ORDER');
    addProfessionalFooter(doc);

    let yPos = 48;

    // Title
    doc.setTextColor(...Colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("LOCAL PURCHASE ORDER", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...Colors.primary);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 50, yPos + 3, pageWidth / 2 + 50, yPos + 3);

    yPos += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`LPO No: ${documentNumber}`, pageWidth / 2, yPos, { align: "center" });

    yPos += 15;

    // LPO details
    doc.setFillColor(...Colors.subtle);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 30, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);
    doc.text("SUPPLIER:", margin + 5, yPos + 8);
    doc.setFont("helvetica", "normal");
    doc.text(lpoDetails.supplierName, margin + 5, yPos + 14);
    if (lpoDetails.supplierAddress) {
        doc.setFontSize(8);
        doc.text(lpoDetails.supplierAddress, margin + 5, yPos + 19);
    }
    if (lpoDetails.supplierContact) {
        doc.text(lpoDetails.supplierContact, margin + 5, yPos + 24);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 5, yPos + 8, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Project: ${data.projectType}`, pageWidth - margin - 5, yPos + 14, { align: "right" });
    doc.text(`Client: ${data.clientName}`, pageWidth - margin - 5, yPos + 19, { align: "right" });

    yPos += 38;

    // Materials table
    const materials = JSON.parse(data.materials);
    const materialsTotal = materials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);

    doc.autoTable({
        startY: yPos,
        head: [["#", "Description", "Unit", "Qty", "Unit Price (KES)", "Total (KES)"]],
        body: materials.map((m, i) => [
            i + 1,
            m.name,
            m.unit,
            m.quantity.toString(),
            numberWithCommas(m.unitPrice),
            numberWithCommas(m.quantity * m.unitPrice)
        ]),
        styles: {
            fontSize: 9,
            textColor: Colors.text,
            cellPadding: 4
        },
        headStyles: {
            fillColor: Colors.secondary,
            textColor: Colors.white,
            fontSize: 9,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 32, halign: 'right' },
            5: { cellWidth: 32, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        theme: 'grid'
    });

    yPos = doc.lastAutoTable.finalY;

    // === POST-TABLE: SmartSpacing layout ===
    const postBlocks = [
        { height: 0, minGap: 8, preferredGap: 15 },
        { height: 14, minGap: 6, preferredGap: 12, keepWithNext: true },
        { height: 25, minGap: 0, preferredGap: 0, keepWithNext: true },
        { height: 38, minGap: 0, preferredGap: 0 }
    ];
    const postLayout = SmartSpacing.distribute(doc, yPos, postBlocks);
    let pi = 0;

    // Gap: table → total bar
    yPos = SmartSpacing.advance(yPos, 0, postLayout, pi++, doc, onNewPage);

    // Total bar
    doc.setFillColor(...Colors.primary);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 14, 3, 3, 'F');

    doc.setTextColor(...Colors.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL:", margin + 5, yPos + 9.5);
    doc.text(`KES ${numberWithCommas(materialsTotal)}`, pageWidth - margin - 5, yPos + 9.5, { align: "right" });

    // Gap: total bar → auth signature (fixes the collision!)
    yPos = SmartSpacing.advance(yPos, 14, postLayout, pi++, doc, onNewPage);

    // Signature section
    const signatureStartY = yPos;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...Colors.text);
    doc.text("Authorized By:", margin, yPos);
    yPos += 12;

    doc.setDrawColor(...Colors.textMuted);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + 60, yPos);
    yPos += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature & Date", margin, yPos);
    yPos += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Joseph Ochieng", margin, yPos);
    yPos += 4;
    doc.setFont("helvetica", "normal");
    doc.text("Director/Operations Manager", margin, yPos);

    // Gap: signature → seal
    yPos = SmartSpacing.advance(signatureStartY, 25, postLayout, pi++, doc, onNewPage);

    // Professional seal with QR verification
    const lpoDocId = generateDocumentUUID('LPO', documentNumber);
    placeSealAndQR(doc, yPos, {
        docType: 'LPO',
        docNumber: documentNumber,
        date: new Date().toLocaleDateString('en-GB'),
        documentId: lpoDocId
    }, {
        placement: 'right-of-signature',
        signatureBlockY: signatureStartY
    });
    storeDocumentRecord(lpoDocId, 'LPO', documentNumber, data.clientName, materialsTotal).catch(() => {});

    await savePDFDocument(doc, `Pintorex-LPO-${documentNumber}.pdf`);
}
