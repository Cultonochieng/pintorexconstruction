// Initialize the encrypted password
window.encryptedPassword = "AAAAAAAAAAB9JgwcFgA5EBokAAEaL0ZVTGNVTQ==";

// Encryption and decryption functions
function xorCrypt(input, key) {
    let output = '';
    for (let i = 0; i < input.length; ++i) {
        output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return output;
}

function b64Encode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
}

function b64Decode(str) {
    return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

function decryptPassword(encryptedPassword) {
    const key = "PintorexSecretKey"; 
    const decoded = b64Decode(encryptedPassword);
    return xorCrypt(decoded, key);
}

// Create material row function
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

// Add material row function
function addMaterialRow() {
    const materialsContainer = document.getElementById('materialsContainer');
    const newRow = createMaterialRow();
    materialsContainer.appendChild(newRow);
    
    // Add event listener to the remove button
    const removeBtn = newRow.querySelector('.removeMaterialBtn');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            materialsContainer.removeChild(newRow);
        });
    }
}

// Gather materials data
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

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize login form
    const loginForm = document.getElementById('loginForm');
    const loginSection = document.getElementById('loginSection');
    const quotationSection = document.getElementById('quotationSection');
    
    // Handle login
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const enteredPassword = document.getElementById('password').value;
            const correctPassword = decryptPassword(window.encryptedPassword);

            if (enteredPassword === correctPassword) {
                loginSection.classList.add('hidden');
                quotationSection.classList.remove('hidden');
            } else {
                alert('Incorrect password. Please try again.');
            }
        });
    }

    // Initialize quotation form
    const quotationForm = document.getElementById('quotationForm');
    const addMaterialBtn = document.getElementById('addMaterialBtn');
    const materialsContainer = document.getElementById('materialsContainer');

    // Add initial material row
    if (materialsContainer) {
        addMaterialRow();
    }

    // Handle add material button
    if (addMaterialBtn) {
        addMaterialBtn.addEventListener('click', addMaterialRow);
    }

    // Handle quotation form submission
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

    // Individual document generation event listeners
    document.getElementById('generateAcceptance')?.addEventListener('click', function() {
        const data = getFormData();
        if (validateFormData(data)) {
            generateAcceptanceLetter(data);
        }
    });

    document.getElementById('generatePayment')?.addEventListener('click', function() {
        const data = getFormData();
        if (validateFormData(data)) {
            generatePaymentRequest(data);
        }
    });

    document.getElementById('generateInvoice')?.addEventListener('click', function() {
        const data = getFormData();
        if (validateFormData(data)) {
            generateInvoice(data);
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

    document.getElementById('generateLPO')?.addEventListener('click', function() {
        const data = getFormData();
        if (validateFormData(data)) {
            generateLPO(data);
        }
    });

    // Generate all documents at once
    document.getElementById('generateAll')?.addEventListener('click', function() {
        const data = getFormData();
        if (validateFormData(data)) {
            // Generate all documents with a small delay between each to prevent browser issues
            const generators = [
                () => generateAcceptanceLetter(data),
                () => generatePaymentRequest(data),
                () => generateInvoice(data),
                () => generateDeliveryNote(data),
                () => generateContractAgreement(data),
                () => generateRecommendationLetter(data),
                () => generateReceipt(data),
                () => generateLPO(data)
            ];
            
            generators.forEach((generator, index) => {
                setTimeout(() => {
                    generator();
                }, index * 500); // 500ms delay between each document
            });
            
            alert('All documents are being generated. Please wait for all downloads to complete.');
        }
});

// Form validation function
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

function generateQuotationNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PNX-${year}${month}${day}-${random}`;
}

function numberWithCommas(x) {
    return x.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function generateProfessionalQuotation(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    // Refined color palette
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

    // Start generating the PDF
    addHeader();
    addFooter();

    // Quotation Info Section
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PROJECT ESTIMATE", margin, yPos);
    
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos + 4, margin + 50, yPos + 4);
    
    yPos += 12;

    // Client & Quotation Details Box
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
        "QUOTATION NO: " + generateQuotationNumber(),
        "DATE: " + new Date().toLocaleDateString('en-GB')
    ], pageWidth - margin - 5, yPos + 16, { align: "right" });

    yPos += 30;

    // Project Scope
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

    yPos += 20 + (descriptionLines.length - 1) * 3.5; // Adjust based on number of lines

    // Materials Breakdown
    checkPageBreak(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("MATERIALS BREAKDOWN", margin, yPos);
    
    yPos += 6;

   // Materials Table
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

    // Financial Summary
    const materialsTotal = materials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);
    let labor;
    if (data.laborType === 'custom') {
        labor = parseFloat(data.laborCost) || 0;
    } else {
        const laborPercentage = parseFloat(data.laborType) || 0;
        labor = materialsTotal * (laborPercentage / 100);
    }
    const subtotal = materialsTotal + labor;
    const vatPercentage = parseFloat(data.vatPercentage) || 0;
    const vat = subtotal * (vatPercentage / 100);
    const contingencyPercentage = parseFloat(data.contingencyPercentage) || 0;
    const contingency = subtotal * (contingencyPercentage / 100);
    const total = subtotal + vat + contingency;

    // Summary Box
    checkPageBreak(85); // Increased to accommodate the new contingency line
    doc.setFillColor(...colors.primary);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 15, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("FINANCIAL SUMMARY", margin + 5, yPos + 10);

    yPos += 15;
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 60, 'F'); // Increased height

    let summaryY = yPos + 8;
    doc.setTextColor(...colors.text);
    doc.setFontSize(9);
    
    const summaryItems = [
        ["Materials Total:", `KES ${numberWithCommas(materialsTotal)}`],
        ["Labor Cost:", `KES ${numberWithCommas(labor)}`],
        ["Subtotal:", `KES ${numberWithCommas(subtotal)}`],
        [`VAT (${vatPercentage}%):`, `KES ${numberWithCommas(vat)}`],
        [`Contingency (${contingencyPercentage}%):`, `KES ${numberWithCommas(contingency)}`]
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
    doc.text(`KES ${numberWithCommas(total)}`, pageWidth - margin - 5, yPos + 13, { align: "right" });

    // Save the PDF
    doc.save(`Pintorex-Quotation-${generateQuotationNumber()}.pdf`);
}

// Generate unique document numbers for each document type
function generateDocumentNumber(type) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const prefixes = {
        'acceptance': 'ACC',
        'payment': 'PAY',
        'invoice': 'INV',
        'delivery': 'DEL',
        'contract': 'CON',
        'recommendation': 'REC',
        'receipt': 'RCP',
        'lpo': 'LPO'
    };
    
    return `PNX-${prefixes[type]}-${year}${month}${day}-${random}`;
}

// Common header and footer functions for consistency
function addDocumentHeader(doc, title, documentNumber) {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const colors = {
        primary: [31, 41, 55],
        accent: [245, 158, 11]
    };

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

    // Document title
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, pageWidth / 2, 40, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Document No: ${documentNumber}`, pageWidth / 2, 50, { align: "center" });
}

function addDocumentFooter(doc) {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const colors = { primary: [31, 41, 55] };
    
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

// 1. Acceptance Letter
function generateAcceptanceLetter(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const documentNumber = generateDocumentNumber('acceptance');
    
    addDocumentHeader(doc, "CONTRACT ACCEPTANCE LETTER", documentNumber);
    addDocumentFooter(doc);
    
    let yPos = 70;
    
    // Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, yPos, { align: "right" });
    
    yPos += 20;
    
    // Client address
    doc.text([
        data.clientName,
        "Dear Sir/Madam,"
    ], margin, yPos);
    
    yPos += 25;
    
    // Main content
    doc.setFont("helvetica", "bold");
    doc.text("RE: ACCEPTANCE OF CONTRACT - " + data.projectType.toUpperCase(), margin, yPos);
    
    yPos += 15;
    
    doc.setFont("helvetica", "normal");
    const content = [
        "We are pleased to formally accept the contract for the above-mentioned project.",
        "",
        "Project Details:",
        `• Project Type: ${data.projectType}`,
        `• Project Description: ${data.projectDescription}`,
        "",
        "We confirm our commitment to:",
        "• Complete the project within the agreed timeline",
        "• Maintain the highest standards of workmanship",
        "• Comply with all safety regulations and building codes",
        "• Provide regular progress updates",
        "",
        "We look forward to commencing work and delivering excellence as per our reputation.",
        "",
        "Thank you for choosing Pintorex Construction Limited."
    ];
    
    content.forEach(line => {
        if (line === "") {
            yPos += 5;
        } else {
            const lines = doc.splitTextToSize(line, pageWidth - 2 * margin);
            doc.text(lines, margin, yPos);
            yPos += lines.length * 5;
        }
    });
    
    // Signature section
    yPos += 20;
    doc.text("Yours faithfully,", margin, yPos);
    yPos += 30;
    doc.text("_____________________", margin, yPos);
    yPos += 5;
    doc.text("Project Manager", margin, yPos);
    yPos += 5;
    doc.text("Pintorex Construction Limited", margin, yPos);
    
    doc.save(`Pintorex-Acceptance-Letter-${documentNumber}.pdf`);
}

// 2. Payment Request
function generatePaymentRequest(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const documentNumber = generateDocumentNumber('payment');
    
    addDocumentHeader(doc, "PAYMENT REQUEST", documentNumber);
    addDocumentFooter(doc);
    
    let yPos = 70;
    
    // Date and client info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, yPos, { align: "right" });
    
    yPos += 15;
    doc.text(`To: ${data.clientName}`, margin, yPos);
    yPos += 10;
    doc.text(`Project: ${data.projectType}`, margin, yPos);
    
    yPos += 20;
    
    // Calculate totals (using same logic as quotation)
    const materials = JSON.parse(data.materials);
    const materialsTotal = materials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);
    let labor = data.laborType === 'custom' ? parseFloat(data.laborCost) || 0 : materialsTotal * (parseFloat(data.laborType) / 100);
    const subtotal = materialsTotal + labor;
    const vat = subtotal * (parseFloat(data.vatPercentage) / 100);
    const contingency = subtotal * (parseFloat(data.contingencyPercentage) / 100);
    const total = subtotal + vat + contingency;
    
    // Payment request table
    doc.autoTable({
        startY: yPos,
        head: [["Description", "Amount (KES)"]],
        body: [
            ["Materials Cost", numberWithCommas(materialsTotal)],
            ["Labor Cost", numberWithCommas(labor)],
            ["Subtotal", numberWithCommas(subtotal)],
            [`VAT (${data.vatPercentage}%)`, numberWithCommas(vat)],
            [`Contingency (${data.contingencyPercentage}%)`, numberWithCommas(contingency)],
            ["TOTAL AMOUNT DUE", numberWithCommas(total)]
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [31, 41, 55] },
        columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 60, halign: 'right' }
        }
    });
    
    yPos = doc.lastAutoTable.finalY + 20;
    
    doc.text([
        "Payment Terms: Net 30 days",
        "Bank Details:",
        "Bank: [Bank Name]",
        "Account: [Account Number]",
        "Account Name: Pintorex Construction Limited"
    ], margin, yPos);
    
    doc.save(`Pintorex-Payment-Request-${documentNumber}.pdf`);
}

// 3. Invoice
function generateInvoice(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const documentNumber = generateDocumentNumber('invoice');
    
    addDocumentHeader(doc, "INVOICE", documentNumber);
    addDocumentFooter(doc);
    
    let yPos = 70;
    
    // Invoice details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("BILL TO:", margin, yPos);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, yPos, { align: "right" });
    
    yPos += 5;
    doc.text(`Due Date: ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-GB')}`, pageWidth - margin, yPos, { align: "right" });
    
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text([
        data.clientName,
        `Project: ${data.projectType}`
    ], margin, yPos);
    
    yPos += 25;
    
    // Invoice items table
    const materials = JSON.parse(data.materials);
    const materialsTotal = materials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);
    let labor = data.laborType === 'custom' ? parseFloat(data.laborCost) || 0 : materialsTotal * (parseFloat(data.laborType) / 100);
    const subtotal = materialsTotal + labor;
    const vat = subtotal * (parseFloat(data.vatPercentage) / 100);
    const contingency = subtotal * (parseFloat(data.contingencyPercentage) / 100);
    const total = subtotal + vat + contingency;
    
    doc.autoTable({
        startY: yPos,
        head: [["Item", "Description", "Amount (KES)"]],
        body: [
            ["1", "Materials Supply", numberWithCommas(materialsTotal)],
            ["2", "Labor Services", numberWithCommas(labor)],
            ["3", `VAT (${data.vatPercentage}%)`, numberWithCommas(vat)],
            ["4", `Contingency (${data.contingencyPercentage}%)`, numberWithCommas(contingency)]
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [31, 41, 55] },
        columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 120 },
            2: { cellWidth: 50, halign: 'right' }
        }
    });
    
    yPos = doc.lastAutoTable.finalY + 5;
    
    // Total
    doc.setFillColor(245, 158, 11);
    doc.rect(margin + 90, yPos, 100, 15, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", margin + 95, yPos + 10);
    doc.text(`KES ${numberWithCommas(total)}`, margin + 185, yPos + 10, { align: "right" });
    
    doc.save(`Pintorex-Invoice-${documentNumber}.pdf`);
}

// 4. Delivery Note
function generateDeliveryNote(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const documentNumber = generateDocumentNumber('delivery');
    
    addDocumentHeader(doc, "DELIVERY NOTE", documentNumber);
    addDocumentFooter(doc);
    
    let yPos = 70;
    
    // Delivery details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, yPos, { align: "right" });
    doc.text(`Delivered To: ${data.clientName}`, margin, yPos);
    yPos += 10;
    doc.text(`Project: ${data.projectType}`, margin, yPos);
    
    yPos += 20;
    
    // Materials table
    const materials = JSON.parse(data.materials);
    doc.autoTable({
        startY: yPos,
        head: [["Item No.", "Description", "Unit", "Quantity Delivered", "Remarks"]],
        body: materials.map((m, index) => [
            index + 1,
            m.name,
            m.unit,
            m.quantity.toString(),
            "Good Condition"
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [31, 41, 55] }
    });
    
    yPos = doc.lastAutoTable.finalY + 30;
    
    // Signature section
    doc.text("Delivered By: ____________________", margin, yPos);
    doc.text("Received By: ____________________", margin + 100, yPos);
    yPos += 20;
    doc.text("Signature: ____________________", margin, yPos);
    doc.text("Signature: ____________________", margin + 100, yPos);
    yPos += 10;
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, margin, yPos);
    doc.text("Date: ____________________", margin + 100, yPos);
    
    doc.save(`Pintorex-Delivery-Note-${documentNumber}.pdf`);
}

// 5. Contract Agreement
function generateContractAgreement(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const documentNumber = generateDocumentNumber('contract');
    
    addDocumentHeader(doc, "CONTRACT AGREEMENT", documentNumber);
    addDocumentFooter(doc);
    
    let yPos = 70;
    
    const materials = JSON.parse(data.materials);
    const materialsTotal = materials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);
    let labor = data.laborType === 'custom' ? parseFloat(data.laborCost) || 0 : materialsTotal * (parseFloat(data.laborType) / 100);
    const subtotal = materialsTotal + labor;
    const vat = subtotal * (parseFloat(data.vatPercentage) / 100);
    const contingency = subtotal * (parseFloat(data.contingencyPercentage) / 100);
    const total = subtotal + vat + contingency;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const contractContent = [
        "This Contract Agreement is entered into between:",
        "",
        "CONTRACTOR: Pintorex Construction Limited",
        "Tel: +254 769 157174 | Email: pintorexkenya@gmail.com",
        "",
        `CLIENT: ${data.clientName}`,
        "",
        "SCOPE OF WORK:",
        `Project Type: ${data.projectType}`,
        `Description: ${data.projectDescription}`,
        "",
        `CONTRACT VALUE: KES ${numberWithCommas(total)}`,
        "",
        "TERMS AND CONDITIONS:",
        "1. The contractor shall complete the work within the agreed timeframe",
        "2. All materials shall be of approved quality and specifications",
        "3. Payment shall be made as per agreed schedule",
        "4. Any variations shall be agreed upon in writing",
        "5. The contractor shall maintain all necessary insurances",
        "",
        "SIGNATURES:",
        "",
        "CONTRACTOR:",
        "Signature: ____________________    Date: ____________________",
        "Name: Project Manager",
        "Pintorex Construction Limited",
        "",
        "CLIENT:",
        "Signature: ____________________    Date: ____________________",
        `Name: ${data.clientName}`
    ];
    
    contractContent.forEach(line => {
        if (line === "") {
            yPos += 5;
        } else {
            const lines = doc.splitTextToSize(line, pageWidth - 2 * margin);
            doc.text(lines, margin, yPos);
            yPos += lines.length * 5;
        }
    });
    
    doc.save(`Pintorex-Contract-Agreement-${documentNumber}.pdf`);
}

// 6. Recommendation Letter
function generateRecommendationLetter(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const documentNumber = generateDocumentNumber('recommendation');
    
    addDocumentHeader(doc, "LETTER OF RECOMMENDATION", documentNumber);
    addDocumentFooter(doc);
    
    let yPos = 70;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, yPos, { align: "right" });
    
    yPos += 20;
    
    doc.text("TO WHOM IT MAY CONCERN", margin, yPos);
    yPos += 20;
    
    const recommendationContent = [
        `This is to certify that ${data.clientName} has successfully engaged Pintorex Construction Limited for ${data.projectType}.`,
        "",
        "Throughout the duration of our professional relationship, we have found them to be:",
        "• Professional in all dealings",
        "• Prompt in meeting financial obligations", 
        "• Clear in project requirements and expectations",
        "• Supportive of quality workmanship",
        "",
        "The project was completed to mutual satisfaction, and we would gladly work with them again on future projects.",
        "",
        "We recommend them without reservation for any construction-related engagements.",
        "",
        "Should you require any further information, please do not hesitate to contact us."
    ];
    
    recommendationContent.forEach(line => {
        if (line === "") {
            yPos += 5;
        } else {
            const lines = doc.splitTextToSize(line, pageWidth - 2 * margin);
            doc.text(lines, margin, yPos);
            yPos += lines.length * 5;
        }
    });
    
    yPos += 20;
    doc.text("Yours faithfully,", margin, yPos);
    yPos += 30;
    doc.text("_____________________", margin, yPos);
    yPos += 5;
    doc.text("Project Manager", margin, yPos);
    yPos += 5;
    doc.text("Pintorex Construction Limited", margin, yPos);
    
    doc.save(`Pintorex-Recommendation-Letter-${documentNumber}.pdf`);
}

// 7. Receipt
function generateReceipt(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const documentNumber = generateDocumentNumber('receipt');
    
    addDocumentHeader(doc, "OFFICIAL RECEIPT", documentNumber);
    addDocumentFooter(doc);
    
    let yPos = 70;
    
    const materials = JSON.parse(data.materials);
    const materialsTotal = materials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);
    let labor = data.laborType === 'custom' ? parseFloat(data.laborCost) || 0 : materialsTotal * (parseFloat(data.laborType) / 100);
    const subtotal = materialsTotal + labor;
    const vat = subtotal * (parseFloat(data.vatPercentage) / 100);
    const contingency = subtotal * (parseFloat(data.contingencyPercentage) / 100);
    const total = subtotal + vat + contingency;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, yPos, { align: "right" });
    
    yPos += 15;
    doc.text(`Received from: ${data.clientName}`, margin, yPos);
    yPos += 10;
    doc.text(`Amount: KES ${numberWithCommas(total)}`, margin, yPos);
    yPos += 10;
    doc.text(`Payment for: ${data.projectType}`, margin, yPos);
    yPos += 10;
    doc.text(`Method of Payment: _________________`, margin, yPos);
    
    yPos += 30;
    
    // Amount in words (simplified)
    doc.text(`Amount in Words: ${convertNumberToWords(total)} Shillings Only`, margin, yPos);
    
    yPos += 30;
    doc.text("Received By: _____________________", margin, yPos);
    yPos += 20;
    doc.text("Signature: _____________________", margin, yPos);
    yPos += 10;
    doc.text("Pintorex Construction Limited", margin, yPos);
    
    doc.save(`Pintorex-Receipt-${documentNumber}.pdf`);
}

// 8. Local Purchase Order (LPO)
function generateLPO(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const documentNumber = generateDocumentNumber('lpo');
    
    addDocumentHeader(doc, "LOCAL PURCHASE ORDER", documentNumber);
    addDocumentFooter(doc);
    
    let yPos = 70;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, yPos, { align: "right" });
    
    yPos += 15;
    doc.text("SUPPLIER: _____________________", margin, yPos);
    yPos += 10;
    doc.text(`PROJECT: ${data.projectType}`, margin, yPos);
    yPos += 10;
    doc.text(`CLIENT: ${data.clientName}`, margin, yPos);
    
    yPos += 20;
    
    // Materials table
    const materials = JSON.parse(data.materials);
    doc.autoTable({
        startY: yPos,
        head: [["Item No.", "Description", "Unit", "Quantity", "Unit Price", "Total"]],
        body: materials.map((m, index) => [
            index + 1,
            m.name,
            m.unit,
            m.quantity.toString(),
            numberWithCommas(m.unitPrice),
            numberWithCommas(m.quantity * m.unitPrice)
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [31, 41, 55] }
    });
    
    yPos = doc.lastAutoTable.finalY + 20;
    
    doc.text([
        "Terms and Conditions:",
        "1. Delivery within 7 days of order",
        "2. All materials to be of approved quality",
        "3. Payment within 30 days of delivery",
        "",
        "Authorized By: _____________________",
        "Signature: _____________________",
        "Pintorex Construction Limited"
    ], margin, yPos);
    
    doc.save(`Pintorex-LPO-${documentNumber}.pdf`);
}

// Helper function for number to words conversion (simplified)
function convertNumberToWords(num) {
    // This is a simplified version - you can enhance it for better accuracy
    if (num < 1000) return "Less than One Thousand";
    if (num < 1000000) return `${Math.floor(num/1000)} Thousand`;
    return `${Math.floor(num/1000000)} Million`;
}
