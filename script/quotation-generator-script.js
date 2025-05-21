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
    // Add this inside your DOMContentLoaded event listener
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
