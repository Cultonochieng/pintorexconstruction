// ============================================================================
// PINTOREX QUOTATION GENERATOR
// Secure server-side authentication
// ============================================================================

// ============================================================================
// DOCUMENT REGISTRY & NUMBERING SYSTEM
// ============================================================================

const DocumentRegistry = {
    // Initialize registry from localStorage
    init() {
        if (!localStorage.getItem('pintorex_registry')) {
            localStorage.setItem('pintorex_registry', JSON.stringify({
                documents: [],
                counters: {}
            }));
        }
    },

    // Generate unique document number
    generateNumber(type) {
        const registry = JSON.parse(localStorage.getItem('pintorex_registry'));
        const date = new Date();
        const yearMonth = date.getFullYear().toString().slice(-2) +
                         (date.getMonth() + 1).toString().padStart(2, '0');

        // Get or initialize counter for this type and month
        const key = `${type}_${yearMonth}`;
        if (!registry.counters[key]) {
            registry.counters[key] = Math.floor(Math.random() * 100) + 100; // Start from 100-199
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

        // Store in registry
        registry.documents.push({
            number: number,
            type: type,
            date: date.toISOString(),
            timestamp: Date.now()
        });

        localStorage.setItem('pintorex_registry', JSON.stringify(registry));
        return number;
    },

    // Check if number exists
    exists(number) {
        const registry = JSON.parse(localStorage.getItem('pintorex_registry'));
        return registry.documents.some(doc => doc.number === number);
    },

    // Get last generated document of specific type
    getLastDocument(type) {
        const registry = JSON.parse(localStorage.getItem('pintorex_registry'));
        const docs = registry.documents.filter(doc => doc.type === type);
        return docs.length > 0 ? docs[docs.length - 1] : null;
    },

    // Get all documents
    getAllDocuments() {
        const registry = JSON.parse(localStorage.getItem('pintorex_registry'));
        return registry.documents;
    }
};

// ============================================================================
// SETTINGS MANAGEMENT SYSTEM
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
    },

    getSuppliers() {
        return this.getSettings().suppliers;
    },

    addSupplier(supplier) {
        const settings = this.getSettings();
        settings.suppliers.push(supplier);
        this.saveSettings(settings);
    }
};

// ============================================================================
// UI MODAL SYSTEM
// ============================================================================

const ModalUI = {
    // Create modal HTML
    createModal(title, content, buttons) {
        const modalHTML = `
            <div id="pintorexModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 8px; padding: 30px; max-width: 500px; width: 90%; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">${title}</h2>
                    <div id="modalContent">${content}</div>
                    <div id="modalButtons" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                        ${buttons}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        return document.getElementById('pintorexModal');
    },

    // Remove modal
    removeModal() {
        const modal = document.getElementById('pintorexModal');
        if (modal) modal.remove();
    },

    // Prompt for LPO supplier details
    async promptLPODetails() {
        return new Promise((resolve) => {
            const content = `
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 500;">Supplier Name *</label>
                        <input type="text" id="supplierName" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" required>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 500;">Supplier Address</label>
                        <input type="text" id="supplierAddress" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 500;">Supplier Contact</label>
                        <input type="text" id="supplierContact" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                    </div>
                </div>
            `;

            const buttons = `
                <button onclick="document.getElementById('pintorexModal').dispatchEvent(new CustomEvent('cancel'))" style="padding: 8px 16px; background: #e5e7eb; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button onclick="document.getElementById('pintorexModal').dispatchEvent(new CustomEvent('submit'))" style="padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;">Continue</button>
            `;

            const modal = this.createModal('LPO Supplier Details', content, buttons);

            modal.addEventListener('submit', () => {
                const supplierName = document.getElementById('supplierName').value;
                if (!supplierName) {
                    alert('Supplier name is required');
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

    // Prompt for payment details
    async promptPaymentDetails() {
        const settings = SettingsManager.getBankDetails();

        return new Promise((resolve) => {
            const content = `
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 500;">Bank Name *</label>
                        <input type="text" id="bankName" value="${settings.bankName}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" required>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 500;">Account Number *</label>
                        <input type="text" id="accountNumber" value="${settings.accountNumber}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" required>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 500;">Branch</label>
                        <input type="text" id="branch" value="${settings.branch}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                    </div>
                    <div style="margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; color: #374151;">
                            <input type="checkbox" id="saveDetails" checked>
                            <span>Save these details for future use</span>
                        </label>
                    </div>
                </div>
            `;

            const buttons = `
                <button onclick="document.getElementById('pintorexModal').dispatchEvent(new CustomEvent('cancel'))" style="padding: 8px 16px; background: #e5e7eb; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button onclick="document.getElementById('pintorexModal').dispatchEvent(new CustomEvent('submit'))" style="padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;">Continue</button>
            `;

            const modal = this.createModal('Bank Payment Details', content, buttons);

            modal.addEventListener('submit', () => {
                const bankName = document.getElementById('bankName').value;
                const accountNumber = document.getElementById('accountNumber').value;

                if (!bankName || !accountNumber) {
                    alert('Bank name and account number are required');
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

    // Prompt for invoice order number
    async promptInvoiceDetails() {
        const lastDelivery = DocumentRegistry.getLastDocument('delivery');

        return new Promise((resolve) => {
            const content = `
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 500;">Order Number *</label>
                        <input type="text" id="orderNumber" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" required>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 500;">Delivery Note Number</label>
                        <input type="text" id="deliveryNumber" value="${lastDelivery ? lastDelivery.number : ''}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                        ${lastDelivery ? '<small style="color: #6b7280;">Auto-filled from last delivery note</small>' : '<small style="color: #6b7280;">Optional - leave blank if not applicable</small>'}
                    </div>
                </div>
            `;

            const buttons = `
                <button onclick="document.getElementById('pintorexModal').dispatchEvent(new CustomEvent('cancel'))" style="padding: 8px 16px; background: #e5e7eb; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button onclick="document.getElementById('pintorexModal').dispatchEvent(new CustomEvent('submit'))" style="padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;">Continue</button>
            `;

            const modal = this.createModal('Invoice Details', content, buttons);

            modal.addEventListener('submit', () => {
                const orderNumber = document.getElementById('orderNumber').value;

                if (!orderNumber) {
                    alert('Order number is required');
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

    // Settings modal
    showSettings() {
        const settings = SettingsManager.getSettings();

        const content = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div>
                    <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">Bank Details</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #374151; font-size: 14px;">Bank Name</label>
                            <input type="text" id="settingsBankName" value="${settings.bankDetails.bankName}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #374151; font-size: 14px;">Account Number</label>
                            <input type="text" id="settingsAccountNumber" value="${settings.bankDetails.accountNumber}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #374151; font-size: 14px;">Branch</label>
                            <input type="text" id="settingsBranch" value="${settings.bankDetails.branch}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                        </div>
                    </div>
                </div>

                <div>
                    <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">Document Registry</h3>
                    <div style="max-height: 200px; overflow-y: auto; border: 1px solid #d1d5db; border-radius: 4px; padding: 10px;">
                        <div style="font-size: 12px; color: #6b7280;">
                            ${DocumentRegistry.getAllDocuments().slice(-10).reverse().map(doc =>
                                `<div style="padding: 5px 0; border-bottom: 1px solid #e5e7eb;">
                                    <strong>${doc.number}</strong> - ${doc.type} - ${new Date(doc.date).toLocaleDateString('en-GB')}
                                </div>`
                            ).join('') || '<div style="color: #9ca3af;">No documents generated yet</div>'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const buttons = `
            <button onclick="document.getElementById('pintorexModal').dispatchEvent(new CustomEvent('close'))" style="padding: 8px 16px; background: #e5e7eb; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            <button onclick="document.getElementById('pintorexModal').dispatchEvent(new CustomEvent('save'))" style="padding: 8px 16px; background: #1f2937; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Settings</button>
        `;

        const modal = this.createModal('Settings & Registry', content, buttons);

        modal.addEventListener('save', () => {
            const bankDetails = {
                bankName: document.getElementById('settingsBankName').value,
                accountNumber: document.getElementById('settingsAccountNumber').value,
                branch: document.getElementById('settingsBranch').value,
                accountName: 'Pintorex Construction Limited'
            };

            SettingsManager.saveBankDetails(bankDetails);
            alert('Settings saved successfully!');
            this.removeModal();
        });

        modal.addEventListener('close', () => {
            this.removeModal();
        });
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
    error(message) { this.show(message, 'error'); },
    info(message) { this.show(message, 'info'); }
};

// ============================================================================
// MATERIAL ROW FUNCTIONS
// ============================================================================

function createMaterialRow() {
    const row = document.createElement('div');
    row.className = 'material-row mb-4 grid grid-cols-6 gap-2 items-center';
    row.innerHTML = `
        <input type="text" name="materialName[]" placeholder="Material name" class="col-span-2 p-2 border rounded" required>
        <select name="materialUnit[]" class="p-2 border rounded">
            <option value="kgs">Kilograms (kgs)</option>
            <option value="m">Meters (m)</option>
            <option value="sqm">Square Meters (sq.m)</option>
            <option value="pcs">Pieces (pcs)</option>
            <option value="bags">Bags</option>
            <option value="ltrs">Liters (ltrs)</option>
            <option value="inch">Inches (in)</option>
            <option value="ft">Feet (ft)</option>
            <option value="rolls">Rolls</option>
            <option value="cu.m">Cubic Meters (cu.m)</option>
            <option value="tonnes">Tonnes</option>
            <option value="sheets">Sheets</option>
            <option value="boxes">Boxes</option>
            <option value="units">Units</option>
            <option value="yards">Yards</option>
            <option value="gallons">Gallons</option>
        </select>
        <input type="number" name="materialQuantity[]" placeholder="Quantity" class="p-2 border rounded" required>
        <input type="number" name="materialUnitPrice[]" placeholder="Unit Price" class="p-2 border rounded" required>
        <button type="button" class="removeMaterialBtn bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded transition-colors">
            Remove
        </button>
    `;
    return row;
}

function addMaterialRow() {
    const materialsContainer = document.getElementById('materialsContainer');
    const newRow = createMaterialRow();
    materialsContainer.appendChild(newRow);

    const removeBtn = newRow.querySelector('.removeMaterialBtn');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            materialsContainer.removeChild(newRow);
        });
    }
}

function gatherMaterialsData() {
    const materials = [];
    const rows = document.querySelectorAll('.material-row');

    rows.forEach(row => {
        const name = row.querySelector('[name="materialName[]"]').value;
        const unit = row.querySelector('[name="materialUnit[]"]').value;
        const quantity = parseFloat(row.querySelector('[name="materialQuantity[]"]').value);
        const unitPrice = parseFloat(row.querySelector('[name="materialUnitPrice[]"]').value);

        if (name && !isNaN(quantity) && !isNaN(unitPrice)) {
            materials.push({ name, unit, quantity, unitPrice });
        }
    });

    return materials;
}

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
    const total = subtotal + vat + contingency;

    return {
        materialsTotal,
        labor,
        subtotal,
        vat,
        contingency,
        total,
        vatPercentage,
        contingencyPercentage
    };
}

// ============================================================================
// SMART SPACING SYSTEM
// ============================================================================

const SmartSpacing = {
    calculateAvailableSpace(doc, currentY) {
        const pageHeight = doc.internal.pageSize.height;
        const footerHeight = 15;
        const bottomMargin = 20;
        return pageHeight - currentY - footerHeight - bottomMargin;
    },

    checkAndAddPage(doc, currentY, requiredHeight, addHeaderFooter) {
        const availableSpace = this.calculateAvailableSpace(doc, currentY);

        if (availableSpace < requiredHeight) {
            doc.addPage();
            if (addHeaderFooter) addHeaderFooter();
            return 35; // Return new yPos after header
        }
        return currentY;
    },

    optimizeTextSpacing(lines, availableHeight) {
        const baseLineHeight = 5;
        const minLineHeight = 4;
        const maxLineHeight = 6;

        const requiredHeight = lines * baseLineHeight;

        if (requiredHeight > availableHeight) {
            return Math.max(minLineHeight, availableHeight / lines);
        } else if (requiredHeight < availableHeight * 0.5) {
            return Math.min(maxLineHeight, availableHeight / lines);
        }

        return baseLineHeight;
    }
};

// ============================================================================
// COMMON HEADER AND FOOTER
// ============================================================================

function addDocumentHeader(doc) {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PINTOREX", margin, 15);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("CONSTRUCTION LIMITED", margin, 20);

    doc.setFontSize(8);
    doc.text([
        "Tel: +254 769 157174",
        "Email: pintorexkenya@gmail.com"
    ], pageWidth - margin, 15, { align: "right" });
}

function addDocumentFooter(doc) {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const footerY = pageHeight - 15;
    doc.setFillColor(31, 41, 55);
    doc.rect(0, footerY, pageWidth, 15, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text([
        "Pintorex Construction Limited | Building Excellence, Crafting Dreams",
        "+254 769 157174 | pintorexkenya@gmail.com"
    ], pageWidth / 2, footerY + 6, { align: "center" });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize systems
    DocumentRegistry.init();
    SettingsManager.init();

    // Add settings button to the page
    const settingsButton = document.createElement('button');
    settingsButton.innerHTML = '⚙️ Settings';
    settingsButton.style.cssText = 'position: fixed; bottom: 20px; right: 20px; padding: 12px 20px; background: #1f2937; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 1000;';
    settingsButton.addEventListener('click', () => ModalUI.showSettings());
    document.body.appendChild(settingsButton);

    // Login form - SERVER-SIDE AUTHENTICATION
    const loginForm = document.getElementById('loginForm');
    const loginSection = document.getElementById('loginSection');
    const quotationSection = document.getElementById('quotationSection');

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
                    loginSection.classList.add('hidden');
                    quotationSection.classList.remove('hidden');
                    Toast.success('Login successful');
                } else {
                    if (loginError) {
                        loginError.textContent = data.error || 'Invalid password';
                        loginError.classList.remove('hidden');
                    }
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            } catch (error) {
                if (loginError) {
                    loginError.textContent = 'Network error. Please try again.';
                    loginError.classList.remove('hidden');
                }
            } finally {
                // Reset button state
                if (loginBtn) loginBtn.disabled = false;
                if (loginText) loginText.classList.remove('hidden');
                if (loginSpinner) loginSpinner.classList.add('hidden');
            }
        });
    }

    // Quotation form
    const quotationForm = document.getElementById('quotationForm');
    const addMaterialBtn = document.getElementById('addMaterialBtn');
    const materialsContainer = document.getElementById('materialsContainer');

    if (materialsContainer) {
        addMaterialRow();
    }

    if (addMaterialBtn) {
        addMaterialBtn.addEventListener('click', addMaterialRow);
    }

    if (quotationForm) {
        quotationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(quotationForm);
            const quotationData = Object.fromEntries(formData.entries());
            quotationData.materials = JSON.stringify(gatherMaterialsData());
            generateProfessionalQuotation(quotationData);
        });
    }

    const laborTypeSelect = document.getElementById('laborType');
    const customLaborDiv = document.getElementById('customLaborDiv');
    const laborCostInput = document.getElementById('laborCost');

    if (laborTypeSelect) {
        laborTypeSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customLaborDiv.style.display = 'block';
                laborCostInput.required = true;
            } else {
                customLaborDiv.style.display = 'none';
                laborCostInput.required = false;
            }
        });
    }

    function getFormData() {
        const formData = new FormData(document.getElementById('quotationForm'));
        const data = Object.fromEntries(formData.entries());
        data.materials = JSON.stringify(gatherMaterialsData());
        return data;
    }

    // Document generation event listeners
    document.getElementById('generateAcceptance')?.addEventListener('click', function() {
        const data = getFormData();
        if (validateFormData(data)) {
            generateAcceptanceLetter(data);
        }
    });

    document.getElementById('generatePayment')?.addEventListener('click', async function() {
        const data = getFormData();
        if (validateFormData(data)) {
            const paymentDetails = await ModalUI.promptPaymentDetails();
            if (paymentDetails) {
                generatePaymentRequest(data, paymentDetails);
            }
        }
    });

    document.getElementById('generateInvoice')?.addEventListener('click', async function() {
        const data = getFormData();
        if (validateFormData(data)) {
            const invoiceDetails = await ModalUI.promptInvoiceDetails();
            if (invoiceDetails) {
                generateInvoice(data, invoiceDetails);
            }
        }
    });

    document.getElementById('generateDelivery')?.addEventListener('click', function() {
        const data = getFormData();
        if (validateFormData(data)) {
            generateDeliveryNote(data);
        }
    });

    document.getElementById('generateContract')?.addEventListener('click', function() {
        const data = getFormData();
        if (validateFormData(data)) {
            generateContractAgreement(data);
        }
    });

    document.getElementById('generateRecommendation')?.addEventListener('click', function() {
        const data = getFormData();
        if (validateFormData(data)) {
            generateRecommendationLetter(data);
        }
    });

    document.getElementById('generateReceipt')?.addEventListener('click', function() {
        const data = getFormData();
        if (validateFormData(data)) {
            generateReceipt(data);
        }
    });

    document.getElementById('generateLPO')?.addEventListener('click', async function() {
        const data = getFormData();
        if (validateFormData(data)) {
            const lpoDetails = await ModalUI.promptLPODetails();
            if (lpoDetails) {
                generateLPO(data, lpoDetails);
            }
        }
    });

    document.getElementById('generateAll')?.addEventListener('click', async function() {
        const data = getFormData();
        if (validateFormData(data)) {
            const paymentDetails = await ModalUI.promptPaymentDetails();
            if (!paymentDetails) return;

            const invoiceDetails = await ModalUI.promptInvoiceDetails();
            if (!invoiceDetails) return;

            const lpoDetails = await ModalUI.promptLPODetails();
            if (!lpoDetails) return;

            const generators = [
                () => generateAcceptanceLetter(data),
                () => generatePaymentRequest(data, paymentDetails),
                () => generateInvoice(data, invoiceDetails),
                () => generateDeliveryNote(data),
                () => generateContractAgreement(data),
                () => generateRecommendationLetter(data),
                () => generateReceipt(data),
                () => generateLPO(data, lpoDetails)
            ];

            generators.forEach((generator, index) => {
                setTimeout(() => {
                    generator();
                }, index * 500);
            });

            alert('All documents are being generated. Please wait for all downloads to complete.');
        }
    });

    function validateFormData(data) {
        if (!data.clientName || !data.projectType) {
            alert('Please fill in Client Name and Project Type before generating documents.');
            return false;
        }

        const materials = JSON.parse(data.materials);
        if (materials.length === 0) {
            alert('Please add at least one material before generating documents.');
            return false;
        }

        return true;
    }
});

// ============================================================================
// DOCUMENT GENERATORS
// ============================================================================

// 1. QUOTATION (UNCHANGED AS REQUESTED)
function generateProfessionalQuotation(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    const colors = {
        primary: [31, 41, 55],
        secondary: [107, 114, 128],
        accent: [245, 158, 11],
        text: [17, 24, 39],
        subtle: [249, 250, 251]
    };

    function addHeader() {
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, pageWidth, 25, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("PINTOREX", margin, 15);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("CONSTRUCTION LIMITED", margin, 20);

        doc.setFontSize(8);
        doc.text([
            "Tel: +254 769 157174",
            "Email: pintorexkenya@gmail.com"
        ], pageWidth - margin, 15, { align: "right" });
    }

    function addFooter() {
        const footerY = pageHeight - 15;
        doc.setFillColor(...colors.primary);
        doc.rect(0, footerY, pageWidth, 15, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text([
            "Pintorex Construction Limited | Building Excellence, Crafting Dreams",
            "+254 769 157174 | pintorexkenya@gmail.com"
        ], pageWidth / 2, footerY + 6, { align: "center" });
    }

    let yPos = 35;

    function checkPageBreak(height) {
        if (yPos + height > pageHeight - 25) {
            doc.addPage();
            addHeader();
            addFooter();
            yPos = 35;
        }
    }

    addHeader();
    addFooter();

    const quotationNumber = DocumentRegistry.generateNumber('quotation');

    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PROJECT ESTIMATE", margin, yPos);

    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos + 4, margin + 50, yPos + 4);

    yPos += 12;

    checkPageBreak(25);
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 25, 'F');

    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text("PREPARED FOR:", margin + 5, yPos + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text([
        data.clientName,
        "Project Type: " + data.projectType
    ], margin + 5, yPos + 16);

    doc.setFont("helvetica", "bold");
    doc.text([
        "QUOTATION NO: " + quotationNumber,
        "DATE: " + new Date().toLocaleDateString('en-GB')
    ], pageWidth - margin - 5, yPos + 16, { align: "right" });

    yPos += 30;

    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("PROJECT SCOPE", margin, yPos);

    yPos += 6;

    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 15, 'F');
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.text);
    const descriptionLines = doc.splitTextToSize(data.projectDescription, pageWidth - (2 * margin) - 10);
    doc.text(descriptionLines, margin + 5, yPos + 5);

    yPos += 20 + (descriptionLines.length - 1) * 3.5;

    checkPageBreak(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("MATERIALS BREAKDOWN", margin, yPos);

    yPos += 6;

    const materials = JSON.parse(data.materials);
    doc.autoTable({
        startY: yPos,
        head: [["No.", "Item Description", "Unit", "Qty", "Unit Price (KES)", "Amount (KES)"]],
        body: materials.map((m, index) => [
            index + 1,
            m.name,
            m.unit,
            m.quantity.toString(),
            numberWithCommas(m.unitPrice),
            numberWithCommas(m.quantity * m.unitPrice)
        ]),
        styles: {
            fontSize: 8,
            textColor: [...colors.text],
            cellPadding: 2
        },
        headStyles: {
            fillColor: [...colors.primary],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 35, halign: 'right' },
            5: { cellWidth: 35, halign: 'right' }
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        },
        margin: { left: margin, right: margin },
        didDrawPage: function(data) {
            addHeader();
            addFooter();
        }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    const totals = calculateTotals(data);

    checkPageBreak(85);
    doc.setFillColor(...colors.primary);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 15, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("FINANCIAL SUMMARY", margin + 5, yPos + 10);

    yPos += 15;
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 60, 'F');

    let summaryY = yPos + 8;
    doc.setTextColor(...colors.text);
    doc.setFontSize(9);

    const summaryItems = [
        ["Materials Total:", `KES ${numberWithCommas(totals.materialsTotal)}`],
        ["Labor Cost:", `KES ${numberWithCommas(totals.labor)}`],
        ["Subtotal:", `KES ${numberWithCommas(totals.subtotal)}`],
        [`VAT (${totals.vatPercentage}%):`, `KES ${numberWithCommas(totals.vat)}`],
        [`Contingency (${totals.contingencyPercentage}%):`, `KES ${numberWithCommas(totals.contingency)}`]
    ];

    summaryItems.forEach(([label, value]) => {
        doc.text(label, margin + 5, summaryY);
        doc.text(value, pageWidth - margin - 5, summaryY, { align: "right" });
        summaryY += 10;
    });

    yPos += 60;
    doc.setFillColor(...colors.accent);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 20, 'F');
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL AMOUNT:", margin + 5, yPos + 13);
    doc.setFontSize(11);
    doc.text(`KES ${numberWithCommas(totals.total)}`, pageWidth - margin - 5, yPos + 13, { align: "right" });

    doc.save(`Pintorex-Quotation-${quotationNumber}.pdf`);
}

// 2. ACCEPTANCE LETTER - REFINED
function generateAcceptanceLetter(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    const documentNumber = DocumentRegistry.generateNumber('acceptance');
    const colors = {
        primary: [31, 41, 55],
        accent: [245, 158, 11],
        text: [17, 24, 39],
        subtle: [249, 250, 251]
    };

    addDocumentHeader(doc);
    addDocumentFooter(doc);

    let yPos = 35;
    const totals = calculateTotals(data);

    // Title
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ACCEPTANCE OF CONTRACT", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 50, yPos + 3, pageWidth / 2 + 50, yPos + 3);

    yPos += 12;

    // Document info
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 18, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text(`Reference: ${documentNumber}`, margin + 5, yPos + 8);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 5, yPos + 8, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Official Contract Acceptance", margin + 5, yPos + 14);

    yPos += 25;

    // Recipient
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);
    doc.text(data.clientName, margin, yPos);
    yPos += 10;

    // Subject
    doc.setFillColor(...colors.accent);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text(`RE: ${data.projectType.toUpperCase()}`, margin + 5, yPos + 7);

    yPos += 16;

    // Main body paragraph
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);

    const bodyText = `We are pleased to formally accept the contract for the above-referenced construction project valued at KES ${numberWithCommas(totals.total)}. This acceptance is issued in accordance with the terms and specifications provided, and we hereby commit to delivering the project within the agreed timeline while maintaining the highest standards of workmanship, quality control, compliance with all applicable safety regulations and building codes, and providing regular progress updates throughout the project duration. We look forward to commencing work and ensuring the successful completion of this project to your full satisfaction.`;

    const bodyLines = doc.splitTextToSize(bodyText, pageWidth - (2 * margin));
    doc.text(bodyLines, margin, yPos);
    yPos += (bodyLines.length * 5) + 10;

    // Project details
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 35, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 32, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.primary);
    doc.text("PROJECT DETAILS:", margin + 5, yPos + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);

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

    yPos += 40;

    // Closing
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Yours faithfully,", margin, yPos);
    yPos += 18;

    // Signature
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 35, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 35, 'F');

    let sigY = yPos + 8;
    doc.setLineWidth(0.3);
    doc.setDrawColor(107, 114, 128);
    doc.line(margin + 5, sigY, margin + 65, sigY);

    sigY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Project Manager", margin + 5, sigY);

    sigY += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Pintorex Construction Limited", margin + 5, sigY);

    sigY += 7;
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("Tel: +254 769 157174", margin + 5, sigY);
    sigY += 4;
    doc.text("Email: pintorexkenya@gmail.com", margin + 5, sigY);

    // Seal
    const sealX = pageWidth - margin - 22;
    const sealY = yPos + 17;
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.7);
    doc.circle(sealX, sealY, 13, 'S');
    doc.setFontSize(6);
    doc.setTextColor(...colors.primary);
    doc.text("COMPANY", sealX, sealY - 3, { align: "center" });
    doc.text("SEAL", sealX, sealY + 2, { align: "center" });

    doc.save(`Pintorex-Contract-Acceptance-${documentNumber}.pdf`);
}

// 3. PAYMENT REQUEST - REFINED
function generatePaymentRequest(data, paymentDetails) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    const documentNumber = DocumentRegistry.generateNumber('payment');
    const colors = {
        primary: [31, 41, 55],
        accent: [245, 158, 11],
        text: [17, 24, 39],
        subtle: [249, 250, 251]
    };

    addDocumentHeader(doc);
    addDocumentFooter(doc);

    let yPos = 35;

    // Title
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PAYMENT REQUEST", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 40, yPos + 3, pageWidth / 2 + 40, yPos + 3);

    yPos += 12;

    // Request info
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 25, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text(`Request No: ${documentNumber}`, margin + 5, yPos + 8);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 5, yPos + 8, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Client: ${data.clientName}`, margin + 5, yPos + 15);
    doc.text(`Project: ${data.projectType}`, margin + 5, yPos + 21);

    yPos += 32;

    // Calculate totals
    const totals = calculateTotals(data);

    // Payment breakdown
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 80, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

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
            fontSize: 9,
            textColor: [17, 24, 39],
            cellPadding: 4
        },
        headStyles: {
            fillColor: [31, 41, 55],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 60, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        theme: 'grid'
    });

    yPos = doc.lastAutoTable.finalY + 8;

    // Total
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 18, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFillColor(...colors.accent);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 16, 'F');

    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("AMOUNT DUE:", margin + 5, yPos + 11);
    doc.text(`KES ${numberWithCommas(totals.total)}`, pageWidth - margin - 5, yPos + 11, { align: "right" });

    yPos += 23;

    // Payment information
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 42, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 42, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("BANK DETAILS", margin + 5, yPos + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);

    let payY = yPos + 18;
    const paymentInfo = [
        `Bank: ${paymentDetails.bankName}`,
        `Account: ${paymentDetails.accountNumber}`,
        `Account Name: ${paymentDetails.accountName}`,
        `${paymentDetails.branch ? 'Branch: ' + paymentDetails.branch : ''}`,
        `Payment Terms: Net 30 days`
    ];

    paymentInfo.forEach(info => {
        if (info) {
            doc.text(info, margin + 5, payY);
            payY += 5;
        }
    });

    yPos += 50;

    // Signature
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 25, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Prepared By:", margin, yPos);
    yPos += 8;

    doc.setDrawColor(107, 114, 128);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + 55, yPos);
    yPos += 5;

    doc.setFont("helvetica", "bold");
    doc.text("Project Manager", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Pintorex Construction Limited", margin, yPos);

    doc.save(`Pintorex-Payment-Request-${documentNumber}.pdf`);
}

// 4. INVOICE - REFINED WITH LINKING
function generateInvoice(data, invoiceDetails) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    const documentNumber = DocumentRegistry.generateNumber('invoice');
    const colors = {
        primary: [31, 41, 55],
        accent: [245, 158, 11],
        text: [17, 24, 39],
        subtle: [249, 250, 251]
    };

    addDocumentHeader(doc);
    addDocumentFooter(doc);

    let yPos = 35;

    // Title
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("TAX INVOICE", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 30, yPos + 3, pageWidth / 2 + 30, yPos + 3);

    yPos += 12;

    // Invoice details
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 32, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text("INVOICE TO:", margin + 5, yPos + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text([
        data.clientName,
        "Project: " + data.projectType
    ], margin + 5, yPos + 15);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const invoiceInfo = [
        `INVOICE NO: ${documentNumber}`,
        `ORDER NO: ${invoiceDetails.orderNumber}`,
        invoiceDetails.deliveryNumber ? `DELIVERY NOTE: ${invoiceDetails.deliveryNumber}` : '',
        `DATE: ${new Date().toLocaleDateString('en-GB')}`,
        `DUE DATE: ${dueDate.toLocaleDateString('en-GB')}`
    ].filter(info => info);

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

    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 60, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.autoTable({
        startY: yPos,
        head: [["No.", "Description", "Unit", "Qty", "Unit Price (KES)", "Amount (KES)"]],
        body: tableData,
        styles: {
            fontSize: 8,
            textColor: [17, 24, 39],
            cellPadding: 3
        },
        headStyles: {
            fillColor: [31, 41, 55],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 20, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' },
            5: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        theme: 'grid'
    });

    yPos = doc.lastAutoTable.finalY + 8;

    // Financial summary
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 60, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 40, 'F');

    let summaryY = yPos + 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);

    const summaryItems = [
        ["Subtotal:", `KES ${numberWithCommas(totals.subtotal)}`],
        [`VAT (${totals.vatPercentage}%):`, `KES ${numberWithCommas(totals.vat)}`],
        [`Contingency (${totals.contingencyPercentage}%):`, `KES ${numberWithCommas(totals.contingency)}`]
    ];

    summaryItems.forEach(([label, value]) => {
        doc.text(label, margin + 5, summaryY);
        doc.text(value, pageWidth - margin - 5, summaryY, { align: "right" });
        summaryY += 8;
    });

    yPos += 40;

    // Total
    doc.setFillColor(...colors.accent);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 16, 'F');

    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL AMOUNT:", margin + 5, yPos + 11);
    doc.text(`KES ${numberWithCommas(totals.total)}`, pageWidth - margin - 5, yPos + 11, { align: "right" });

    yPos += 20;

    // Disclaimer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    const disclaimer = "This is a tax invoice issued in accordance with the Value Added Tax Act (Cap 476) and Income Tax Act (Cap 470) of the Laws of Kenya.";
    const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - (2 * margin));
    doc.text(disclaimerLines, margin, yPos);

    doc.save(`Pintorex-Invoice-${documentNumber}.pdf`);
}

// 5. DELIVERY NOTE - REFINED WITH LINKING
function generateDeliveryNote(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    const documentNumber = DocumentRegistry.generateNumber('delivery');
    const lastInvoice = DocumentRegistry.getLastDocument('invoice');

    const colors = {
        primary: [31, 41, 55],
        accent: [245, 158, 11],
        text: [17, 24, 39],
        subtle: [249, 250, 251]
    };

    addDocumentHeader(doc);
    addDocumentFooter(doc);

    let yPos = 35;

    // Title
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("DELIVERY NOTE", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 35, yPos + 3, pageWidth / 2 + 35, yPos + 3);

    yPos += 12;

    // Delivery details
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 28, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text(`Delivery Note: ${documentNumber}`, margin + 5, yPos + 8);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 5, yPos + 8, { align: "right" });

    if (lastInvoice) {
        doc.text(`Invoice No: ${lastInvoice.number}`, pageWidth - margin - 5, yPos + 14, { align: "right" });
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Delivered To: ${data.clientName}`, margin + 5, yPos + 15);
    doc.text(`Project: ${data.projectType}`, margin + 5, yPos + 22);

    yPos += 35;

    // Materials table
    const materials = JSON.parse(data.materials);

    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 60, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.autoTable({
        startY: yPos,
        head: [["No.", "Description", "Unit", "Quantity", "Remarks"]],
        body: materials.map((m, i) => [
            i + 1,
            m.name,
            m.unit,
            m.quantity.toString(),
            ""
        ]),
        styles: {
            fontSize: 9,
            textColor: [17, 24, 39],
            cellPadding: 3
        },
        headStyles: {
            fillColor: [31, 41, 55],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 28, halign: 'center' },
            3: { cellWidth: 28, halign: 'right' },
            4: { cellWidth: 35, halign: 'center' }
        },
        margin: { left: margin, right: margin },
        theme: 'grid'
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Signature section
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 25, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Delivered By:", margin, yPos);
    doc.text("Received By:", margin + 95, yPos);

    yPos += 12;
    doc.setDrawColor(107, 114, 128);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + 65, yPos);
    doc.line(margin + 95, yPos, margin + 160, yPos);

    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature & Date", margin, yPos);
    doc.text("Signature & Date", margin + 95, yPos);

    doc.save(`Pintorex-Delivery-Note-${documentNumber}.pdf`);
}

// 6. CONTRACT AGREEMENT - PROFESSIONALLY REFINED
function generateContractAgreement(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    const documentNumber = DocumentRegistry.generateNumber('contract');
    const colors = {
        primary: [31, 41, 55],
        accent: [245, 158, 11],
        text: [17, 24, 39],
        subtle: [249, 250, 251]
    };

    addDocumentHeader(doc);
    addDocumentFooter(doc);

    let yPos = 35;

    // Title
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CONSTRUCTION CONTRACT", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 55, yPos + 3, pageWidth / 2 + 55, yPos + 3);

    yPos += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Contract No: ${documentNumber}`, pageWidth / 2, yPos, { align: "center" });

    yPos += 15;

    // Calculate totals
    const totals = calculateTotals(data);

    // Parties
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("PARTIES TO THE CONTRACT", margin, yPos);
    yPos += 7;

    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 26, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text("CONTRACTOR:", margin + 5, yPos + 8);
    doc.setFont("helvetica", "normal");
    doc.text("Pintorex Construction Limited", margin + 5, yPos + 14);
    doc.setFontSize(8);
    doc.text("Tel: +254 769 157174 | Email: pintorexkenya@gmail.com", margin + 5, yPos + 19);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("CLIENT:", pageWidth - margin - 5, yPos + 8, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(data.clientName, pageWidth - margin - 5, yPos + 14, { align: "right" });

    yPos += 33;

    // Scope
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 28, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("SCOPE OF WORK", margin, yPos);
    yPos += 7;

    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 18, 'F');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text(`Project Type: ${data.projectType}`, margin + 5, yPos + 8);
    const descLines = doc.splitTextToSize(`Description: ${data.projectDescription}`, pageWidth - (2 * margin) - 10);
    doc.text(descLines, margin + 5, yPos + 14);

    yPos += 25;

    // Contract value
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 15, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFillColor(...colors.accent);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 14, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colors.primary);
    doc.text("CONTRACT VALUE:", margin + 5, yPos + 9.5);
    doc.text(`KES ${numberWithCommas(totals.total)}`, pageWidth - margin - 5, yPos + 9.5, { align: "right" });

    yPos += 21;

    // Terms - Professional Kenya-specific
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 50, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("TERMS AND CONDITIONS", margin, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);

    const terms = [
        "1. The Contractor shall execute and complete the Works in accordance with the Contract Documents and the instructions of the Employer's authorized representative.",
        "2. All materials, workmanship and work shall comply with the specifications and shall be to the satisfaction of the Employer's representative and in accordance with the National Building Code 2024.",
        "3. Payment shall be made in accordance with the agreed payment schedule upon submission and certification of interim valuations by the quantity surveyor.",
        "4. Any variations to the Works shall be executed only upon written instruction from the Employer and shall be valued in accordance with the Contract rates.",
        "5. This Contract shall be governed by and construed in accordance with the Laws of Kenya, and disputes shall be resolved through arbitration as per the Arbitration Act (Cap 49)."
    ];

    terms.forEach(term => {
        yPos = SmartSpacing.checkAndAddPage(doc, yPos, 15, () => {
            addDocumentHeader(doc);
            addDocumentFooter(doc);
        });

        const lines = doc.splitTextToSize(term, pageWidth - (2 * margin));
        doc.text(lines, margin, yPos);
        yPos += (lines.length * 4.5) + 3;
    });

    yPos += 10;

    // Signatures
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 40, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("SIGNATURES", margin, yPos);
    yPos += 8;

    // Contractor signature
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text("CONTRACTOR:", margin, yPos);
    yPos += 8;
    doc.setDrawColor(107, 114, 128);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + 55, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature & Date", margin, yPos);
    yPos += 4;
    doc.text("Pintorex Construction Limited", margin, yPos);

    yPos += 12;

    // Client signature
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 25, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("CLIENT:", margin, yPos);
    yPos += 8;
    doc.line(margin, yPos, margin + 55, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature & Date", margin, yPos);
    yPos += 4;
    doc.text(data.clientName, margin, yPos);

    doc.save(`Pintorex-Contract-${documentNumber}.pdf`);
}

// 7. RECOMMENDATION LETTER - REFINED
function generateRecommendationLetter(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    const documentNumber = DocumentRegistry.generateNumber('recommendation');
    const colors = {
        primary: [31, 41, 55],
        accent: [245, 158, 11],
        text: [17, 24, 39],
        subtle: [249, 250, 251]
    };

    addDocumentHeader(doc);
    addDocumentFooter(doc);

    let yPos = 35;

    // Title
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("RECOMMENDATION LETTER", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 55, yPos + 3, pageWidth / 2 + 55, yPos + 3);

    yPos += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Reference: ${documentNumber}`, pageWidth / 2, yPos, { align: "center" });

    yPos += 15;

    // Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, yPos, { align: "right" });

    yPos += 15;

    // Salutation
    doc.text("TO WHOM IT MAY CONCERN", margin, yPos);
    yPos += 15;

    // Body
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

    bodyParagraphs.forEach(para => {
        if (para === "") {
            yPos += 5;
        } else {
            yPos = SmartSpacing.checkAndAddPage(doc, yPos, 15, () => {
                addDocumentHeader(doc);
                addDocumentFooter(doc);
            });

            const lines = doc.splitTextToSize(para, pageWidth - (2 * margin));
            doc.text(lines, margin, yPos);
            yPos += (lines.length * 5);
        }
    });

    yPos += 15;

    // Signature
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 25, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.text("Yours faithfully,", margin, yPos);
    yPos += 15;

    doc.setDrawColor(107, 114, 128);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + 55, yPos);
    yPos += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Project Manager", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Pintorex Construction Limited", margin, yPos);

    doc.save(`Pintorex-Recommendation-${documentNumber}.pdf`);
}

// 8. RECEIPT - REFINED
function generateReceipt(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    const documentNumber = DocumentRegistry.generateNumber('receipt');
    const colors = {
        primary: [31, 41, 55],
        accent: [245, 158, 11],
        text: [17, 24, 39],
        subtle: [249, 250, 251]
    };

    addDocumentHeader(doc);
    addDocumentFooter(doc);

    let yPos = 35;

    // Title
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("OFFICIAL RECEIPT", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 38, yPos + 3, pageWidth / 2 + 38, yPos + 3);

    yPos += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Receipt No: ${documentNumber}`, pageWidth / 2, yPos, { align: "center" });

    yPos += 15;

    // Calculate total
    const totals = calculateTotals(data);

    // Receipt details
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 48, 'F');

    let detailY = yPos + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);
    doc.text("RECEIVED FROM:", margin + 5, detailY);

    detailY += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(data.clientName, margin + 5, detailY);

    detailY += 10;
    doc.setFont("helvetica", "bold");
    doc.text("AMOUNT:", margin + 5, detailY);
    doc.setFont("helvetica", "normal");
    doc.text(`KES ${numberWithCommas(totals.total)}`, margin + 28, detailY);

    detailY += 10;
    doc.setFont("helvetica", "bold");
    doc.text("FOR:", margin + 5, detailY);
    doc.setFont("helvetica", "normal");
    doc.text(data.projectType, margin + 28, detailY);

    detailY += 10;
    doc.setFont("helvetica", "bold");
    doc.text("DATE:", margin + 5, detailY);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString('en-GB'), margin + 28, detailY);

    yPos += 58;

    // Payment method
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Payment Method: _____________________", margin, yPos);

    yPos += 20;

    // Signature
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 25, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFont("helvetica", "bold");
    doc.text("Received By:", margin, yPos);
    yPos += 12;

    doc.setDrawColor(107, 114, 128);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + 55, yPos);
    yPos += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Authorized Signature", margin, yPos);
    yPos += 5;
    doc.text("Pintorex Construction Limited", margin, yPos);

    doc.save(`Pintorex-Receipt-${documentNumber}.pdf`);
}

// 9. LPO - REFINED
function generateLPO(data, lpoDetails) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    const documentNumber = DocumentRegistry.generateNumber('lpo');
    const colors = {
        primary: [31, 41, 55],
        accent: [245, 158, 11],
        text: [17, 24, 39],
        subtle: [249, 250, 251]
    };

    addDocumentHeader(doc);
    addDocumentFooter(doc);

    let yPos = 35;

    // Title
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PURCHASE ORDER", pageWidth / 2, yPos, { align: "center" });

    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 42, yPos + 3, pageWidth / 2 + 42, yPos + 3);

    yPos += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`LPO No: ${documentNumber}`, pageWidth / 2, yPos, { align: "center" });

    yPos += 15;

    // LPO details
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 30, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
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

    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 60, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.autoTable({
        startY: yPos,
        head: [["No.", "Description", "Unit", "Qty", "Unit Price", "Total"]],
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
            textColor: [17, 24, 39],
            cellPadding: 3
        },
        headStyles: {
            fillColor: [31, 41, 55],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' },
            5: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        theme: 'grid'
    });

    yPos = doc.lastAutoTable.finalY + 8;

    // Total
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 15, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFillColor(...colors.accent);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 14, 'F');

    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL:", margin + 5, yPos + 9.5);
    doc.text(`KES ${numberWithCommas(materialsTotal)}`, pageWidth - margin - 5, yPos + 9.5, { align: "right" });

    yPos += 22;

    // Authorization
    yPos = SmartSpacing.checkAndAddPage(doc, yPos, 25, () => {
        addDocumentHeader(doc);
        addDocumentFooter(doc);
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text("Authorized By:", margin, yPos);
    yPos += 12;

    doc.setDrawColor(107, 114, 128);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + 55, yPos);
    yPos += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Signature & Date", margin, yPos);
    yPos += 4;
    doc.text("Pintorex Construction Limited", margin, yPos);

    doc.save(`Pintorex-LPO-${documentNumber}.pdf`);
}
