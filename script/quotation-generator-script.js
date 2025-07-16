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
    const _pageWidth = doc.internal.pageSize.width;
    const _pageHeight = doc.internal.pageSize.height;
    const _margin = 15; // Reduced margin for more content space

    const documentNumber = generateDocumentNumber('acceptance');

    const _colors = {
        primary: [31, 41, 55], // Dark grey/blue
        secondary: [107, 114, 128], // Medium grey
        accent: [245, 158, 11], // Orange accent
        text: [17, 24, 39], // Very dark grey for main text
        subtle: [249, 250, 251] // Very light grey for background fills
    };

    const _headerHeight = 20; // Reduced header height
    const _footerHeight = 15; // Kept as is, but content adjusted
    // Usable Y coordinate before which content should end to leave space for footer and bottom margin
    const _maxContentYBeforeFooter = _pageHeight - _footerHeight - _margin;

    function addHeader() {
        doc.setFillColor(..._colors.primary);
        doc.rect(0, 0, _pageWidth, _headerHeight, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12.5); // Slightly increased
        doc.text("PINTOREX", _margin, 12); // Adjusted Y to fit new header height

        doc.setFontSize(7.5); // Slightly increased
        doc.setFont("helvetica", "normal");
        doc.text("CONSTRUCTION LIMITED", _margin, 18); // Adjusted Y

        doc.setFontSize(7.5); // Slightly increased
        doc.text([
            "Tel: +254 769 157174",
            "Email: pintorexkenya@gmail.com"
        ], _pageWidth - _margin, 12, { align: "right" }); // Adjusted Y
    }

    function addFooter() {
        const footerY = _pageHeight - _footerHeight;
        doc.setFillColor(..._colors.primary);
        doc.rect(0, footerY, _pageWidth, _footerHeight, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7); // Slightly increased
        doc.text([
            "Pintorex Construction Limited | Building Excellence, Crafting Dreams",
            "+254 769 157174 | pintorexkenya@gmail.com"
        ], _pageWidth / 2, footerY + 5, { align: "center" }); // Adjusted Y for better vertical centering
    }

    // Function to check if a new page is needed and add it
    function _checkAndAddPage(currentY, spaceRequiredForNextElement = 10) {
        if (currentY + spaceRequiredForNextElement > _maxContentYBeforeFooter) {
            doc.addPage();
            addHeader();
            addFooter();
            return _headerHeight + _margin; // New yPos after header on new page
        }
        return currentY;
    }

    // Calculate project totals for reference (assuming data structure is consistent)
    const materials = JSON.parse(data.materials || '[]'); // Ensure materials is an array
    const materialsTotal = materials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);
    let labor = data.laborType === 'custom' ? parseFloat(data.laborCost) || 0 : materialsTotal * (parseFloat(data.laborType) / 100);
    const subtotal = materialsTotal + labor;
    const vat = subtotal * (parseFloat(data.vatPercentage) / 100);
    const contingency = subtotal * (parseFloat(data.contingencyPercentage) / 100);
    const total = subtotal + vat + contingency;

    // Start generating the PDF
    addHeader();
    addFooter(); // Add footer to the first page

    let yPos = _headerHeight + 8; // Initial Y position after header, reduced padding

    // Document title
    const titleText = "CONTRACT ACCEPTANCE LETTER";
    const titleFontSize = 15.5; // Slightly increased
    const titleSectionHeight = titleFontSize * 1.2 + 2 + 10; // Text height + line + reduced padding after
    yPos = _checkAndAddPage(yPos, titleSectionHeight);
    doc.setTextColor(..._colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(titleFontSize);
    doc.text(titleText, _pageWidth / 2, yPos, { align: "center" });
    doc.setDrawColor(..._colors.accent);
    doc.setLineWidth(0.7); // Slightly thinner line
    doc.line(_pageWidth / 2 - 60, yPos + 2, _pageWidth / 2 + 60, yPos + 2); // Adjusted line Y
    yPos += 10; // Reduced padding after title section

    // Document number and date section
    const docInfoRectHeight = 18; // Reduced height
    const docInfoSectionHeight = docInfoRectHeight + 4; // rect height + reduced padding after
    yPos = _checkAndAddPage(yPos, docInfoSectionHeight);
    doc.setFillColor(..._colors.subtle);
    doc.rect(_margin, yPos, _pageWidth - (2 * _margin), docInfoRectHeight, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9); // Slightly increased
    doc.setTextColor(..._colors.text);
    doc.text(`Document No: ${documentNumber}`, _margin + 5, yPos + 7); // Adjusted Y
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, _pageWidth - _margin - 5, yPos + 7, { align: "right" }); // Adjusted Y
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8); // Slightly increased
    doc.text("Official Contract Acceptance", _margin + 5, yPos + 14); // Adjusted Y
    doc.text(`Valid from: ${new Date().toLocaleDateString('en-GB')}`, _pageWidth - _margin - 5, yPos + 14, { align: "right" }); // Adjusted Y
    yPos += docInfoSectionHeight;

    // Client address section
    const clientAddrRectHeight = 22; // Reduced height
    const clientAddrSectionHeight = 5 + clientAddrRectHeight + 8; // "TO:" height + rect + reduced padding
    yPos = _checkAndAddPage(yPos, clientAddrSectionHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10); // Slightly increased
    doc.setTextColor(..._colors.primary);
    doc.text("TO:", _margin, yPos);
    yPos += 5;
    doc.setFillColor(..._colors.subtle);
    doc.rect(_margin, yPos, _pageWidth - (2 * _margin), clientAddrRectHeight, 'F');
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10); // Slightly increased
    doc.setTextColor(..._colors.text);
    doc.text([
        data.clientName,
        "", // For slight visual separation, can be removed for more compactness
        "Dear Valued Client,"
    ], _margin + 5, yPos + 7); // Adjusted Y
    yPos += clientAddrRectHeight + 8; // Reduced padding

    // Subject line with accent background
    const subjectRectHeight = 11; // Reduced height
    const subjectSectionHeight = subjectRectHeight + 6; // rect height + reduced padding after
    yPos = _checkAndAddPage(yPos, subjectSectionHeight);
    doc.setFillColor(..._colors.accent);
    doc.rect(_margin, yPos, _pageWidth - (2 * _margin), subjectRectHeight, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10); // Slightly increased
    doc.setTextColor(..._colors.primary);
    doc.text(`RE: ACCEPTANCE OF CONTRACT - ${data.projectType.toUpperCase()}`, _margin + 5, yPos + 7.5); // Adjusted Y
    yPos += subjectRectHeight + 6; // Reduced padding

    // Main content section (intro)
    yPos = _checkAndAddPage(yPos, 5); // Check for at least one line before starting
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10); // Slightly increased
    doc.setTextColor(..._colors.text);
    const introText = [
        "We are pleased to formally acknowledge receipt of your project requirements and hereby ACCEPT the contract for the above-mentioned construction project."
    ];
    introText.forEach(lineContent => {
        // Increased maxWidth to allow sentences to span wider
        const lines = doc.splitTextToSize(lineContent, _pageWidth - (2 * _margin) - 2); // Reduced by 2 for safety
        const blockHeight = lines.length * 4.7 + 1; // Adjusted line height for compactness, slightly more due to font increase
        yPos = _checkAndAddPage(yPos, blockHeight);
        doc.text(lines, _margin, yPos);
        yPos += blockHeight;
    });
    yPos += 6; // Reduced padding after intro section

    // Project details section with styling
    let projectDetailsText = [
        `• Project Type: ${data.projectType}`,
        `• Project Description: ${data.projectDescription || 'As per specifications provided'}`,
        `• Contract Value: KES ${numberWithCommas(total)}`,
        `• Estimated Duration: To be confirmed upon project commencement`
    ];
    // Calculate required height for project details content
    const projectDetailsLines = projectDetailsText.flatMap(detail => doc.splitTextToSize(detail, _pageWidth - (2 * _margin) - 10));
    const projectDetailsContentHeight = projectDetailsLines.length * 4.7; // Height of text lines, adjusted
    const projectDetailsCalculatedHeight = projectDetailsContentHeight + 8 + 8; // Text height + title padding + bottom padding
    const projectDetailsRectHeight = Math.max(projectDetailsCalculatedHeight, 40); // Minimum height for visual consistency
    
    yPos = _checkAndAddPage(yPos, projectDetailsRectHeight + 8); // Check for rect + reduced padding
    doc.setFillColor(..._colors.subtle);
    doc.rect(_margin, yPos, _pageWidth - (2 * _margin), projectDetailsRectHeight, 'F');
    let contentYInProjectRect = yPos + 6; // Adjusted start Y within the rectangle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10); // Slightly increased
    doc.setTextColor(..._colors.primary);
    doc.text("PROJECT DETAILS:", _margin + 5, contentYInProjectRect);
    contentYInProjectRect += 7; // Adjusted space after title

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5); // Slightly increased
    doc.setTextColor(..._colors.text);
    projectDetailsText.forEach(detail => {
        // Increased maxWidth to allow sentences to span wider within the rect
        const lines = doc.splitTextToSize(detail, _pageWidth - (2 * _margin) - 10); // -10 for padding within rect
        doc.text(lines, _margin + 5, contentYInProjectRect);
        contentYInProjectRect += lines.length * 4.7; // Adjusted line spacing
    });
    yPos += projectDetailsRectHeight + 8; // Reduced padding after section

    // Commitments section
    const commitmentTitleHeight = 10; // Rough estimate for "OUR COMMITMENT..."
    yPos = _checkAndAddPage(yPos, commitmentTitleHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10); // Slightly increased
    doc.setTextColor(..._colors.primary);
    doc.text("OUR COMMITMENT TO YOU:", _margin, yPos);
    yPos += 7; // Reduced space after title

    yPos = _checkAndAddPage(yPos, 5); // Check for first commitment item
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5); // Slightly increased
    doc.setTextColor(..._colors.text);
    const commitments = [
        "• Complete the project within the agreed timeline and specifications",
        "• Maintain the highest standards of workmanship and quality control",
        "• Comply with all safety regulations, building codes, and industry standards",
        "• Provide regular progress updates and maintain clear communication",
        "• Use only approved materials that meet or exceed specified requirements",
        "• Maintain comprehensive insurance coverage throughout the project duration",
        "• Ensure site safety and cleanliness at all times",
        "• Provide warranty coverage as per industry standards"
    ];
    commitments.forEach(commitment => {
        // Increased maxWidth to allow sentences to span wider
        const lines = doc.splitTextToSize(commitment, _pageWidth - (2 * _margin) - 2); // Reduced by 2 for safety
        const itemHeight = lines.length * 4.7 + 1; // Adjusted line height for compactness
        yPos = _checkAndAddPage(yPos, itemHeight);
        doc.text(lines, _margin, yPos);
        yPos += itemHeight;
    });
    yPos += 6; // Reduced padding after commitments section

    // Next steps section
    let nextStepsText = [
        "1. Contract signing and documentation finalization",
        "2. Project timeline and milestone planning",
        "3. Site preparation and mobilization of resources"
    ];
    // Calculate required height for next steps content
    const nextStepsLines = nextStepsText.flatMap(step => doc.splitTextToSize(step, _pageWidth - (2 * _margin) - 10));
    const nextStepsContentHeight = nextStepsLines.length * 4.7; // Height of text lines, adjusted
    const nextStepsCalculatedHeight = nextStepsContentHeight + 8 + 8; // Text height + title padding + bottom padding
    const nextStepsRectHeight = Math.max(nextStepsCalculatedHeight, 25); // Minimum height
    
    yPos = _checkAndAddPage(yPos, nextStepsRectHeight + 8); // Check for rect + reduced padding
    doc.setFillColor(..._colors.subtle);
    doc.rect(_margin, yPos, _pageWidth - (2 * _margin), nextStepsRectHeight, 'F');
    let contentYInNextStepsRect = yPos + 6; // Adjusted start Y within the rectangle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10); // Slightly increased
    doc.setTextColor(..._colors.primary);
    doc.text("NEXT STEPS:", _margin + 5, contentYInNextStepsRect);
    contentYInNextStepsRect += 7; // Adjusted space after title

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5); // Slightly increased
    doc.setTextColor(..._colors.text);
    nextStepsText.forEach(step => {
        // Increased maxWidth to allow sentences to span wider within the rect
        doc.text(step, _margin + 5, contentYInNextStepsRect); // Assuming these are naturally short
        contentYInNextStepsRect += 4.7; // Adjusted spacing between steps
    });
    yPos += nextStepsRectHeight + 8; // Reduced padding after section

    // Closing statement
    yPos = _checkAndAddPage(yPos, 5); // Check for first line of closing
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10); // Slightly increased
    doc.setTextColor(..._colors.text);
    const closingText = [
        "We are excited about the opportunity to work with you and look forward to delivering excellence that exceeds your expectations. Our team is committed to making your construction project a complete success."
    ];
    closingText.forEach(line => {
        // Increased maxWidth to allow sentences to span wider
        const lines = doc.splitTextToSize(line, _pageWidth - (2 * _margin) - 2); // Reduced by 2 for safety
        yPos = _checkAndAddPage(yPos, lines.length * 4.7); // Check for each line
        doc.text(lines, _margin, yPos);
        yPos += lines.length * 4.7; // Reduced line height
    });
    yPos += 8; // Reduced padding

    yPos = _checkAndAddPage(yPos, 5);
    doc.text("Thank you for choosing Pintorex Construction Limited.", _margin, yPos);
    yPos += 15; // Reduced padding before signature

    // Signature section with professional styling - CRITICAL FOR FITTING
    // Calculate precise height needed for all elements within the signature block
    const calculatedSignatureContentHeight = 
        (1 * 10) + // "Yours faithfully," (larger font, adjusted from 9.5)
        18 +        // Space for signature line
        (1 * 9) +   // "Project Manager" (adjusted from 8.5)
        (1 * 9.5) + // "Pintorex Construction Limited" (adjusted from 9)
        (1 * 8) +   // "Direct Line" (adjusted from 7.5)
        (1 * 8) +   // "Email" (adjusted from 7.5)
        (4 * 2);    // Additional small vertical padding/spacing between elements

    const signatureRectHeight = Math.max(calculatedSignatureContentHeight, 60); // Ensure minimum height for visual appeal
    
    yPos = _checkAndAddPage(yPos, signatureRectHeight + 10); // Check for the entire signature block + some buffer
    doc.setFillColor(..._colors.subtle);
    doc.rect(_margin, yPos, _pageWidth - (2 * _margin), signatureRectHeight, 'F');

    let sigBlockContentY = yPos + 10; // Adjusted start Y within the rectangle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10); // Slightly increased
    doc.setTextColor(..._colors.text);
    doc.text("Yours faithfully,", _margin + 5, sigBlockContentY);

    sigBlockContentY += 18; // Space before signature line, precisely adjusted
    doc.setLineWidth(0.4); // Slightly thinner line
    doc.setDrawColor(..._colors.secondary);
    doc.line(_margin + 5, sigBlockContentY, _margin + 80, sigBlockContentY);

    sigBlockContentY += 6; // Reduced space
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9); // Slightly increased
    doc.setTextColor(..._colors.text);
    doc.text("Project Manager", _margin + 5, sigBlockContentY);

    sigBlockContentY += 4; // Reduced space
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5); // Slightly increased
    doc.text("Pintorex Construction Limited", _margin + 5, sigBlockContentY);

    sigBlockContentY += 7; // Reduced space
    doc.setFontSize(8); // Slightly increased
    doc.setTextColor(..._colors.secondary);
    doc.text("Direct Line: +254 769 157174", _margin + 5, sigBlockContentY);
    sigBlockContentY += 3.5; // Reduced space
    doc.text("Email: pintorexkenya@gmail.com", _margin + 5, sigBlockContentY);

    // Company seal area (placeholder) - position relative to the *bottom* of the rect, or a fixed relative offset
    const sealCircleY = yPos + signatureRectHeight - 25; // Adjusted to be higher within the box
    const sealCircleX = _pageWidth - _margin - 30; // Kept as is, relative to right margin
    doc.setDrawColor(..._colors.primary);
    doc.setLineWidth(0.8); // Slightly thinner
    doc.circle(sealCircleX, sealCircleY, 18, 'S'); // Slightly smaller circle
    doc.setFontSize(6); // Slightly increased
    doc.setTextColor(..._colors.primary);
    doc.text("COMPANY", sealCircleX, sealCircleY - 5, { align: "center" }); // Adjusted Y relative to circle center
    doc.text("SEAL", sealCircleX, sealCircleY, { align: "center" }); // Adjusted Y

    doc.save(`Pintorex-Contract-Acceptance-${documentNumber}.pdf`);
}

// 2.Payment Request
function generatePaymentRequest(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    const documentNumber = generateDocumentNumber('payment');

    const colors = {
        primary: [31, 41, 55],
        secondary: [107, 114, 128],
        accent: [245, 158, 11],
        text: [17, 24, 39],
        subtle: [249, 250, 251],
        lightGray: [243, 244, 246],
        border: [229, 231, 235]
    };

    // Header with better spacing and typography
    function addHeader() {
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, pageWidth, 28, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("PINTOREX", margin, 16);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("CONSTRUCTION LIMITED", margin, 22);

        // Better aligned contact info
        doc.setFontSize(8);
        const contactInfo = [
            "Tel: +254 769 157174",
            "Email: pintorexkenya@gmail.com"
        ];
        doc.text(contactInfo, pageWidth - margin, 14, { align: "right" });
    }

    // Enhanced Footer with refined spacing
    function addFooter() {
        const footerY = pageHeight - 18;
        doc.setFillColor(...colors.primary);
        doc.rect(0, footerY, pageWidth, 18, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        
        // Split footer into two lines for better readability
        doc.text("Pintorex Construction Limited | Building Excellence, Crafting Dreams", 
                 pageWidth / 2, footerY + 7, { align: "center" });
        doc.text("+254 769 157174 | pintorexkenya@gmail.com", 
                 pageWidth / 2, footerY + 13, { align: "center" });
    }

    // Enhanced page break function
    function checkPageBreak(currentY, spaceRequired = 15) {
        if (currentY + spaceRequired > pageHeight - 30) {
            doc.addPage();
            addHeader();
            addFooter();
            return 40; // Adjusted start position after header
        }
        return currentY;
    }
    
    // Start generating the PDF
    addHeader();
    addFooter();
    
    let yPos = 40; // Better initial spacing after header

    // Enhanced Main Title Section with refined typography
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("PAYMENT REQUEST", margin, yPos);
    
    // Enhanced accent line with better proportions
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(1);
    doc.line(margin, yPos + 5, margin + 80, yPos + 5);
    
    yPos += 18; // Better spacing after title

    // Enhanced Invoice Reference & Client Details with improved layout
    yPos = checkPageBreak(yPos, 50);
    
    // Subtle border for the info box
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.3);
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 48, 'FD');
    
    // Invoice Reference section with better typography
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("INVOICE REFERENCE", margin + 8, yPos + 12);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);
    const invoiceNumber = prompt("Please enter the Invoice Number for this Payment Request:") || "N/A";
    doc.text(invoiceNumber, pageWidth - margin - 8, yPos + 12, { align: "right" });

    // Separator line within the box
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.2);
    doc.line(margin + 8, yPos + 18, pageWidth - margin - 8, yPos + 18);

    // Client details with enhanced spacing
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("PAYMENT REQUEST DETAILS", margin + 8, yPos + 28);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...colors.text);
    
    const clientDetails = [
        `Client: ${data.clientName}`,
        `Project: ${data.projectType}`,
        `Request Date: ${new Date().toLocaleDateString('en-GB')}`
    ];
    
    clientDetails.forEach((detail, index) => {
        doc.text(detail, margin + 8, yPos + 35 + (index * 4));
    });

    yPos += 60; // Better spacing after info box

    // Enhanced Summary Section with refined typography
    yPos = checkPageBreak(yPos, 20);
    
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PAYMENT BREAKDOWN", margin, yPos);
    
    // Enhanced accent line
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.8);
    doc.line(margin, yPos + 6, margin + 85, yPos + 6);
    
    yPos += 16; // Better spacing after section title

    // Calculate totals (same logic, better presentation)
    const materials = JSON.parse(data.materials || '[]');
    const materialsTotal = materials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);
    let labor = data.laborType === 'custom' ? parseFloat(data.laborCost) || 0 : materialsTotal * (parseFloat(data.laborType) / 100);
    const subtotal = materialsTotal + labor;
    const vat = subtotal * (parseFloat(data.vatPercentage) / 100);
    const contingency = subtotal * (parseFloat(data.contingencyPercentage) / 100);
    const total = subtotal + vat + contingency;
    
    // Enhanced Payment Summary Table with better styling
    doc.autoTable({
        startY: yPos,
        head: [["Description", "Amount (KES)"]],
        body: [
            ["Materials Cost", numberWithCommas(materialsTotal)],
            ["Labor Services", numberWithCommas(labor)], 
            ["Subtotal", numberWithCommas(subtotal)],
            [`VAT (${data.vatPercentage}%)`, numberWithCommas(vat)],
            [`Contingency (${data.contingencyPercentage}%)`, numberWithCommas(contingency)]
        ],
        styles: {
            fontSize: 9.5,
            textColor: [...colors.text],
            cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
            lineWidth: 0.1,
            lineColor: [...colors.border]
        },
        headStyles: {
            fillColor: [...colors.primary],
            textColor: [255, 255, 255],
            fontSize: 10.5,
            fontStyle: 'bold',
            cellPadding: { top: 6, right: 6, bottom: 6, left: 6 }
        },
        columnStyles: {
            0: { cellWidth: 120, fontStyle: 'normal' },
            1: { cellWidth: 60, halign: 'right', fontStyle: 'normal' }
        },
        alternateRowStyles: {
            fillColor: [...colors.lightGray]
        },
        margin: { left: margin, right: margin },
        theme: 'grid',
        didDrawPage: function(data) {
            addHeader();
            addFooter();
        }
    });
    
    yPos = doc.lastAutoTable.finalY + 8;

    // Enhanced Total Amount Due with premium styling
    yPos = checkPageBreak(yPos, 25);
    
    // Gradient-like effect with multiple rectangles
    doc.setFillColor(...colors.accent);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 22, 'F');
    
    // Border for the total box
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 22, 'D');
    
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL AMOUNT DUE:", margin + 8, yPos + 14);
    
    doc.setFontSize(14);
    doc.text(`KES ${numberWithCommas(total)}`, pageWidth - margin - 8, yPos + 14, { align: "right" });

    yPos += 35; // Better spacing after total

    // Enhanced Payment Information Section
    yPos = checkPageBreak(yPos, 55);
    
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PAYMENT INFORMATION", margin, yPos);
    
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.8);
    doc.line(margin, yPos + 6, margin + 90, yPos + 6);
    
    yPos += 16;

    // Enhanced payment info box with better structure
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.3);
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 50, 'FD');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...colors.primary);
    doc.text("PAYMENT TERMS", margin + 8, yPos + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text("Payment is due Net 30 days from the date of this request.", margin + 8, yPos + 16);
    
    // Bank details section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...colors.primary);
    doc.text("BANK DETAILS", margin + 8, yPos + 26);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    
    const bankDetails = [
        "Bank Name: [Bank Name - e.g., Equity Bank Kenya Ltd]",
        "Account Holder: Pintorex Construction Limited",
        "Account Number: [Your Account Number - e.g., 1234567890]"
    ];
    
    bankDetails.forEach((detail, index) => {
        doc.text(detail, margin + 8, yPos + 32 + (index * 5));
    });

    yPos += 65; // Better spacing after payment info

    // Enhanced Authorization Section with professional styling
    yPos = checkPageBreak(yPos, 45);
    
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("AUTHORIZATION", margin, yPos);
    
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.8);
    doc.line(margin, yPos + 6, margin + 70, yPos + 6);
    
    yPos += 18;

    // Signature box with enhanced styling
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.3);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, yPos, 120, 35, 'FD');
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...colors.text);
    doc.text("Prepared By:", margin + 8, yPos + 10);
    
    // Signature line with better styling
    doc.setDrawColor(...colors.secondary);
    doc.setLineWidth(0.4);
    doc.line(margin + 8, yPos + 20, margin + 85, yPos + 20);
    
    // Enhanced signature details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("Project Manager", margin + 8, yPos + 26);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text("Pintorex Construction Limited", margin + 8, yPos + 31);
    
    // Date with better formatting
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.secondary);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, margin + 90, yPos + 10);

    // Save with enhanced filename
    doc.save(`Pintorex-Payment-Request-${documentNumber}.pdf`);
}

// 3. Invoice
// Enhanced Professional Pintorex Invoice Generator
// Consistent with quotation design, production-ready

function generateInvoice(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    // Professional color palette matching quotation
    const colors = {
        primary: [31, 41, 55],
        secondary: [107, 114, 128],
        accent: [245, 158, 11],
        text: [17, 24, 39],
        subtle: [249, 250, 251],
        lightGray: [229, 231, 235]
    };

    const documentNumber = generateDocumentNumber();
    let currentPage = 1;
    let yPos = 0;

    function addHeader() {
        // Header background
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, pageWidth, 25, 'F');
        
        // Company name
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("PINTOREX", margin, 15);
        
        // Company subtitle
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("CONSTRUCTION LIMITED", margin, 20);

        // Contact info - right aligned
        doc.setFontSize(8);
        doc.text([
            "Tel: +254 769 157174",
            "Email: pintorexkenya@gmail.com"
        ], pageWidth - margin, 15, { align: "right" });

        return 30;
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

    function checkPageBreak(height) {
        if (yPos + height > pageHeight - 25) {
            doc.addPage();
            currentPage++;
            yPos = addHeader();
            addFooter();
        }
    }

    // Initialize document
    yPos = addHeader();
    addFooter();

    // Document title section
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("INVOICE", margin, yPos);
    
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos + 4, margin + 35, yPos + 4);
    
    yPos += 15;

    // Invoice details box
    checkPageBreak(30);
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 28, 'F');
    
    // Left side - Client info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text("PREPARED FOR:", margin + 8, yPos + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text([
        data.clientName || "Client Name",
        "Project Type: " + (data.projectType || "Construction Project")
    ], margin + 8, yPos + 18);

    // Right side - Invoice details
    const rightX = pageWidth - margin - 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text([
        "INVOICE NO: " + documentNumber,
        "DATE: " + new Date().toLocaleDateString('en-GB'),
        "DUE DATE: " + new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-GB')
    ], rightX, yPos + 10, { align: "right" });

    yPos += 35;

    // Project scope section
    checkPageBreak(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("PROJECT SCOPE", margin, yPos);
    
    yPos += 8;
    
    doc.setFillColor(...colors.subtle);
    const scopeHeight = 15;
    doc.rect(margin, yPos, pageWidth - (2 * margin), scopeHeight, 'F');
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.text);
    const description = data.projectDescription || "Construction Services";
    const descriptionLines = doc.splitTextToSize(description, pageWidth - (2 * margin) - 16);
    doc.text(descriptionLines, margin + 8, yPos + 8);

    yPos += scopeHeight + 10;

    // Materials breakdown header
    checkPageBreak(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("MATERIALS BREAKDOWN", margin, yPos);
    
    yPos += 8;

    // Calculate totals
    const totals = calculateInvoiceTotals(data);
    
    // Prepare table data
    const materials = JSON.parse(data.materials || '[]');
    const tableData = [];
    let itemNumber = 1;
    
    // Add materials
    materials.forEach(item => {
        tableData.push([
            itemNumber.toString(),
            item.name || `Material ${itemNumber}`,
            item.unit || 'PC',
            formatNumber(item.quantity || 1),
            formatNumber(item.unitPrice || 0),
            formatNumber((item.quantity || 1) * (item.unitPrice || 0))
        ]);
        itemNumber++;
    });
    
    // Add labor if applicable
    if (totals.labor > 0) {
        tableData.push([
            itemNumber.toString(),
            'Labor Services',
            'LS',
            '1',
            formatNumber(totals.labor),
            formatNumber(totals.labor)
        ]);
    }

    // Materials table - with better centered alignment and responsive sizing
    const tableWidth = pageWidth - (2 * margin) - 10; // Total available width
    doc.autoTable({
        startY: yPos,
        head: [["No.", "Item Description", "Unit", "Qty", "Unit Price (KES)", "Amount (KES)"]],
        body: tableData,
        styles: {
            fontSize: 8,
            textColor: [...colors.text],
            cellPadding: 3,
            lineColor: [...colors.lightGray],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [...colors.primary],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            cellPadding: 4
        },
        columnStyles: {
            0: { cellWidth: tableWidth * 0.08, halign: 'center' }, // 8% - No.
            1: { cellWidth: tableWidth * 0.40, halign: 'left' },   // 40% - Item Description
            2: { cellWidth: tableWidth * 0.10, halign: 'center' }, // 10% - Unit
            3: { cellWidth: tableWidth * 0.12, halign: 'right' },  // 12% - Qty
            4: { cellWidth: tableWidth * 0.15, halign: 'right' },  // 15% - Unit Price
            5: { cellWidth: tableWidth * 0.15, halign: 'right' }   // 15% - Amount
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        },
        margin: { left: margin + 5, right: margin + 5 }, // Better centered positioning
        theme: 'grid',
        tableWidth: 'wrap',
        didDrawPage: function(data) {
            if (data.pageNumber > 1) {
                addHeader();
                addFooter();
            }
        }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Calculate space needed for financial summary
    const summaryHeight = 75; // Reduced height for better fit
    const availableSpace = pageHeight - 25 - yPos; // Space before footer

    // If not enough space, add page break
    if (availableSpace < summaryHeight) {
        doc.addPage();
        currentPage++;
        yPos = addHeader();
        addFooter();
    }

    // Financial summary
    // Summary header
    doc.setFillColor(...colors.primary);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 12, 'F'); // Reduced height
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9); // Reduced font size
    doc.text("FINANCIAL SUMMARY", margin + 8, yPos + 8);

    yPos += 12;

    // Summary content
    doc.setFillColor(...colors.subtle);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 45, 'F'); // Reduced height

    let summaryY = yPos + 10;
    doc.setTextColor(...colors.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8); // Reduced font size
    
    const summaryItems = [
        ["Materials Total:", `KES ${formatNumber(totals.materialsTotal)}`],
        ["Labor Cost:", `KES ${formatNumber(totals.labor)}`],
        ["Subtotal:", `KES ${formatNumber(totals.subtotal)}`],
        [`VAT (${totals.vatPercentage}%):`, `KES ${formatNumber(totals.vat)}`],
        [`Contingency (${totals.contingencyPercentage}%):`, `KES ${formatNumber(totals.contingency)}`]
    ];

    summaryItems.forEach(([label, value]) => {
        doc.text(label, margin + 8, summaryY);
        doc.text(value, pageWidth - margin - 8, summaryY, { align: "right" });
        summaryY += 8; // Reduced line spacing
    });

    yPos += 45;

    // Total amount
    doc.setFillColor(...colors.accent);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 15, 'F'); // Reduced height
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10); // Reduced font size
    doc.text("TOTAL AMOUNT:", margin + 8, yPos + 10);
    doc.setFontSize(11); // Reduced font size
    doc.text(`KES ${formatNumber(totals.total)}`, pageWidth - margin - 8, yPos + 10, { align: "right" });

    yPos += 20; // Reduced spacing

    // Legal disclaimer - positioned right below financial summary and spans its width
    doc.setTextColor(...colors.secondary);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7); // Reduced font size
    
    const disclaimerText = "This invoice is issued in accordance with the Value Added Tax Act (Cap 476) and Income Tax Act (Cap 470) of the Laws of Kenya. Payment terms: Net 30 days.";
    const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - (2 * margin));
    doc.text(disclaimerLines, margin, yPos);

    // Save the document
    doc.save(`Pintorex-Invoice-${documentNumber}.pdf`);
}

function generateDocumentNumber() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PNX-INV-${year}${month}${day}-${random}`;
}

function calculateInvoiceTotals(data) {
    const materials = JSON.parse(data.materials || '[]');
    const materialsTotal = materials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);
    
    let labor = 0;
    if (data.laborType === 'custom') {
        labor = parseFloat(data.laborCost) || 0;
    } else {
        labor = materialsTotal * (parseFloat(data.laborType) / 100);
    }
    
    const subtotal = materialsTotal + labor;
    const vatPercentage = parseFloat(data.vatPercentage) || 16;
    const contingencyPercentage = parseFloat(data.contingencyPercentage) || 5;
    
    const vat = subtotal * (vatPercentage / 100);
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

function formatNumber(num) {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Export function for production use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateInvoice };
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
