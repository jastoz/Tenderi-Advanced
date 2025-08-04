// ========================================
// PROŠLOGODIŠNJE CIJENE - ENHANCED
// ========================================

// Global data storage
let proslogodisnjeCijene = [];
let filteredProslogodisnjeCijene = [];

// Initialize proslogodisnje cijene functionality
function initializeProslogodisnjeCijene() {
    // console.log('📅 Initializing Prošlogodišnje cijene functionality...');
    
    // Show empty state initially
    showProslogodisnjeCijeneEmptyState();
    
    // Setup search functionality
    setupProslogodisnjeCijeneSearch();
    
    // console.log('✅ Prošlogodišnje cijene functionality initialized');
}

// Show empty state
function showProslogodisnjeCijeneEmptyState() {
    const tableContainer = document.getElementById('proslogodisnjeCijeneTableContainer');
    const emptyState = document.getElementById('proslogodisnjeCijeneEmptyState');
    
    if (tableContainer && emptyState) {
        tableContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }
}

// Show table with data
function showProslogodisnjeCijeneTable() {
    const tableContainer = document.getElementById('proslogodisnjeCijeneTableContainer');
    const emptyState = document.getElementById('proslogodisnjeCijeneEmptyState');
    
    if (tableContainer && emptyState) {
        tableContainer.classList.remove('hidden');
        emptyState.classList.add('hidden');
    }
}

// Setup search functionality
function setupProslogodisnjeCijeneSearch() {
    const searchInput = document.getElementById('proslogodisnjeCijeneSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            handleProslogodisnjeCijeneSearch();
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleProslogodisnjeCijeneSearch();
            }
        });
    }
}

// Handle file upload
function handleProslogodisnjeCijeneFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processProslogodisnjeCijeneFile(file);
    }
    event.target.value = '';
}

// Handle file drop
function handleProslogodisnjeCijeneFileDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
        processProslogodisnjeCijeneFile(files[0]);
    }
}

// Process uploaded file
function processProslogodisnjeCijeneFile(file) {
    // console.log('📅 Processing proslogodisnje cijene file:', file.name);
    
    showMessage('info', `🔄 Obrađujem ${file.name}...`, 'proslogodisnjeCijeneStatus');
    
    if (file.name.toLowerCase().endsWith('.csv')) {
        processCSVFile(file);
    } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        processExcelFile(file);
    } else if (file.name.toLowerCase().endsWith('.xml')) {
        processXMLFile(file);
    } else {
        showMessage('error', 'Nepoznat format datoteke. Molimo koristite CSV, Excel ili XML format.', 'proslogodisnjeCijeneStatus');
    }
}

// Process CSV file
function processCSVFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.split('\n');
            
            // Skip header row
            const dataLines = lines.slice(1).filter(line => line.trim());
            
            proslogodisnjeCijene = [];
            
            dataLines.forEach((line) => {
                const columns = parseCSVLine(line);
                if (columns.length >= 4) {
                    const item = {
                        sifra: columns[0]?.trim() || '',
                        naziv: columns[1]?.trim() || '',
                        jm: columns[2]?.trim() || '',
                        cijena: parseFloat(columns[3]?.replace(',', '.')) || 0,
                        datum: new Date().toLocaleDateString('hr-HR')
                    };
                    
                    if (item.sifra && item.naziv) {
                        proslogodisnjeCijene.push(item);
                    }
                }
            });
            
            processProslogodisnjeCijeneData();
            
        } catch (error) {
            console.error('Error processing CSV:', error);
            showMessage('error', `Greška pri obradi CSV datoteke: ${error.message}`, 'proslogodisnjeCijeneStatus');
        }
    };
    reader.readAsText(file);
}

// Process Excel file
function processExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            proslogodisnjeCijene = [];
            
            // Skip header row
            jsonData.slice(1).forEach(row => {
                if (row.length >= 4) {
                    const item = {
                        sifra: String(row[0] || '').trim(),
                        naziv: String(row[1] || '').trim(), 
                        jm: String(row[2] || '').trim(),
                        cijena: parseFloat(String(row[3] || '0').replace(',', '.')) || 0,
                        datum: new Date().toLocaleDateString('hr-HR')
                    };
                    
                    if (item.sifra && item.naziv) {
                        proslogodisnjeCijene.push(item);
                    }
                }
            });
            
            processProslogodisnjeCijeneData();
            
        } catch (error) {
            console.error('Error processing Excel:', error);
            showMessage('error', `Greška pri obradi Excel datoteke: ${error.message}`, 'proslogodisnjeCijeneStatus');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Process XML file
function processXMLFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const xmlText = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Check for parsing errors
            const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
            if (parserError) {
                throw new Error('XML parsing error: ' + parserError.textContent);
            }
            
            proslogodisnjeCijene = [];
            
            // Try different XML structures
            const items = parseXMLContent(xmlDoc);
            
            items.forEach(item => {
                if (item.sifra && item.naziv) {
                    proslogodisnjeCijene.push({
                        sifra: item.sifra,
                        naziv: item.naziv,
                        jm: item.jm || '',
                        cijena: parseFloat(String(item.cijena || '0').replace(',', '.')) || 0,
                        datum: new Date().toLocaleDateString('hr-HR')
                    });
                }
            });
            
            processProslogodisnjeCijeneData();
            
        } catch (error) {
            console.error('Error processing XML:', error);
            showMessage('error', `Greška pri obradi XML datoteke: ${error.message}`, 'proslogodisnjeCijeneStatus');
        }
    };
    reader.readAsText(file, 'UTF-8');
}

// Parse XML content - supports multiple XML structures
function parseXMLContent(xmlDoc) {
    const items = [];
    // console.log('📅 XML DEBUG: Starting XML parsing...');
    // console.log('📅 XML DEBUG: Root element:', xmlDoc.documentElement?.tagName);
    
    // Try structured format: <TablicaRabata><Artikal><Sifra>...
    let elements = xmlDoc.getElementsByTagName('Artikal');
    // console.log('📅 XML DEBUG: Found', elements.length, 'Artikal elements');
    if (elements.length > 0) {
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const item = {
                sifra: getElementTextContent(element, 'Sifra') || getElementTextContent(element, 'sifra'),
                naziv: getElementTextContent(element, 'Naziv') || getElementTextContent(element, 'naziv'),
                jm: getElementTextContent(element, 'JM') || getElementTextContent(element, 'jm') || getElementTextContent(element, 'J.M.'),
                cijena: getElementTextContent(element, 'Cijena') || getElementTextContent(element, 'cijena')
            };
            // console.log('📅 XML DEBUG: Artikal item:', item);
            items.push(item);
        }
        return items;
    }
    
    // Try flat format: <root><row><A><B><C><D>...
    elements = xmlDoc.getElementsByTagName('row');
    // console.log('📅 XML DEBUG: Found', elements.length, 'row elements');
    if (elements.length > 0) {
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const item = {
                sifra: getElementTextContent(element, 'A'),
                naziv: getElementTextContent(element, 'B'),
                jm: getElementTextContent(element, 'C'),
                cijena: getElementTextContent(element, 'D')
            };
            // console.log('📅 XML DEBUG: Row item:', item);
            items.push(item);
        }
        return items;
    }
    
    // Try item-based format: <root><item><sifra>...
    elements = xmlDoc.getElementsByTagName('item');
    // console.log('📅 XML DEBUG: Found', elements.length, 'item elements');
    if (elements.length > 0) {
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const item = {
                sifra: getElementTextContent(element, 'sifra') || getElementTextContent(element, 'Sifra'),
                naziv: getElementTextContent(element, 'naziv') || getElementTextContent(element, 'Naziv'),
                jm: getElementTextContent(element, 'jm') || getElementTextContent(element, 'JM'),
                cijena: getElementTextContent(element, 'cijena') || getElementTextContent(element, 'Cijena')
            };
            // console.log('📅 XML DEBUG: Item item:', item);
            items.push(item);
        }
        return items;
    }
    
    // Try Excel XML format: <Workbook><Worksheet><Table><Row><Cell><Data>...
    elements = xmlDoc.getElementsByTagName('Worksheet');
    // console.log('📅 XML DEBUG: Found', elements.length, 'Worksheet elements (Excel XML)');
    if (elements.length > 0) {
        const worksheet = elements[0];
        const rows = worksheet.getElementsByTagName('Row');
        // console.log('📅 XML DEBUG: Found', rows.length, 'Row elements in worksheet');
        
        // Skip header row if it exists
        const startRow = rows.length > 1 ? 1 : 0;
        
        for (let i = startRow; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.getElementsByTagName('Cell');
            // console.log('📅 XML DEBUG: Row', i, 'has', cells.length, 'cells');
            
            if (cells.length >= 4) {
                const cellData = [];
                for (let j = 0; j < Math.min(4, cells.length); j++) {
                    const data = cells[j].getElementsByTagName('Data')[0];
                    cellData.push(data ? data.textContent.trim() : '');
                }
                
                const item = {
                    sifra: cellData[0] || '',
                    naziv: cellData[1] || '',
                    jm: cellData[2] || '',
                    cijena: cellData[3] || '0'
                };
                
                // console.log('📅 XML DEBUG: Excel XML item:', item);
                if (item.sifra && item.naziv) {
                    items.push(item);
                }
            }
        }
        
        if (items.length > 0) {
            return items;
        }
    }
    
    // Try direct children approach
    const rootElement = xmlDoc.documentElement;
    // console.log('📅 XML DEBUG: Trying direct children approach');
    if (rootElement) {
        const children = rootElement.children;
        // console.log('📅 XML DEBUG: Root has', children.length, 'children');
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            // console.log('📅 XML DEBUG: Child', i, 'tagName:', child.tagName);
            
            // Check if this child has the required fields
            const sifra = getElementTextContent(child, 'sifra') || getElementTextContent(child, 'Sifra') || getElementTextContent(child, 'A');
            const naziv = getElementTextContent(child, 'naziv') || getElementTextContent(child, 'Naziv') || getElementTextContent(child, 'B');
            
            // console.log('📅 XML DEBUG: Child', i, 'sifra:', sifra, 'naziv:', naziv);
            
            if (sifra && naziv) {
                const item = {
                    sifra: sifra,
                    naziv: naziv,
                    jm: getElementTextContent(child, 'jm') || getElementTextContent(child, 'JM') || getElementTextContent(child, 'C') || '',
                    cijena: getElementTextContent(child, 'cijena') || getElementTextContent(child, 'Cijena') || getElementTextContent(child, 'D') || '0'
                };
                // console.log('📅 XML DEBUG: Direct child item:', item);
                items.push(item);
            }
        }
    }
    
    // console.log('📅 XML DEBUG: Final items array:', items);
    return items;
}

// Helper function to get text content from XML element
function getElementTextContent(parent, tagName) {
    const element = parent.getElementsByTagName(tagName)[0];
    return element ? element.textContent.trim() : '';
}

// Process parsed data
function processProslogodisnjeCijeneData() {
    if (proslogodisnjeCijene.length === 0) {
        showMessage('error', 'Nema validnih podataka u datoteci.', 'proslogodisnjeCijeneStatus');
        return;
    }
    
    // Remove duplicates based on sifra
    const uniqueItems = [];
    const seenSifre = new Set();
    
    proslogodisnjeCijene.forEach(item => {
        if (!seenSifre.has(item.sifra)) {
            seenSifre.add(item.sifra);
            uniqueItems.push(item);
        }
    });
    
    proslogodisnjeCijene = uniqueItems;
    filteredProslogodisnjeCijene = [...proslogodisnjeCijene];
    
    showMessage('success', `✅ Uspješno učitano ${proslogodisnjeCijene.length} prošlogodišnjih cijena!`, 'proslogodisnjeCijeneStatus');
    
    updateProslogodisnjeCijeneDisplay();
    updateProslogodisnjeCijeneStats();
    showProslogodisnjeCijeneTable();
    
    // Show export/clear buttons
    const exportBtn = document.getElementById('exportProslogodisnjeCijeneBtn');
    const clearBtn = document.getElementById('clearProslogodisnjeCijeneBtn');
    if (exportBtn) exportBtn.style.display = 'inline-block';
    if (clearBtn) clearBtn.style.display = 'inline-block';
}

// Update table display
function updateProslogodisnjeCijeneDisplay() {
    const tableBody = document.getElementById('proslogodisnjeCijeneTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    filteredProslogodisnjeCijene.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight: bold; color: #1f2937;">${item.sifra}</td>
            <td style="color: #374151;">${item.naziv}</td>
            <td style="text-align: center; color: #6b7280;">${item.jm}</td>
            <td style="text-align: right; font-weight: bold; color: #059669;">${item.cijena.toFixed(2)} €</td>
            <td style="text-align: center; color: #6b7280; font-size: 12px;">${item.datum}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Update statistics
function updateProslogodisnjeCijeneStats() {
    const itemCount = document.getElementById('proslogodisnjeCijeneItemCount');
    const tabCount = document.getElementById('proslogodisnjeCijeneCount');
    
    if (itemCount) itemCount.textContent = filteredProslogodisnjeCijene.length;
    if (tabCount) tabCount.textContent = proslogodisnjeCijene.length;
}

// Handle search
function handleProslogodisnjeCijeneSearch() {
    const searchInput = document.getElementById('proslogodisnjeCijeneSearch');
    if (!searchInput) return;
    
    const query = searchInput.value.toLowerCase().trim();
    
    if (!query) {
        filteredProslogodisnjeCijene = [...proslogodisnjeCijene];
    } else {
        filteredProslogodisnjeCijene = proslogodisnjeCijene.filter(item => 
            item.sifra.toLowerCase().includes(query) ||
            item.naziv.toLowerCase().includes(query) ||
            item.jm.toLowerCase().includes(query)
        );
    }
    
    updateProslogodisnjeCijeneDisplay();
    updateProslogodisnjeCijeneStats();
}

// Export prošlogodišnje cijene
function handleExportProslogodisnje() {
    if (proslogodisnjeCijene.length === 0) {
        showMessage('error', 'Nema podataka za export.', 'proslogodisnjeCijeneStatus');
        return;
    }
    
    const csvContent = generateProslogodisnjeCijeneCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `proslogodisnje-cijene-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('success', `💾 Export završen! Datoteka s ${proslogodisnjeCijene.length} stavki spremljena.`, 'proslogodisnjeCijeneStatus');
    }
}

// Generate CSV content
function generateProslogodisnjeCijeneCSV() {
    let csv = 'Šifra,Naziv,J.M.,Cijena,Datum\n';
    
    proslogodisnjeCijene.forEach(item => {
        csv += `"${item.sifra}","${item.naziv}","${item.jm}","${item.cijena.toFixed(2)}","${item.datum}"\n`;
    });
    
    return csv;
}

// Clear all data
function handleClearProslogodisnje() {
    if (confirm('Jeste li sigurni da želite obrisati sve prošlogodišnje cijene?')) {
        proslogodisnjeCijene = [];
        filteredProslogodisnjeCijene = [];
        
        showProslogodisnjeCijeneEmptyState();
        updateProslogodisnjeCijeneStats();
        
        // Hide export/clear buttons
        const exportBtn = document.getElementById('exportProslogodisnjeCijeneBtn');
        const clearBtn = document.getElementById('clearProslogodisnjeCijeneBtn');
        if (exportBtn) exportBtn.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        
        showMessage('success', '🗑️ Sve prošlogodišnje cijene su obrisane.', 'proslogodisnjeCijeneStatus');
    }
}

// Get price for article by sifra
function getProslogodisnjaCijena(sifra) {
    const item = proslogodisnjeCijene.find(item => item.sifra === sifra);
    return item ? item.cijena : null;
}

// Get all proslogodisnje cijene for autocomplete suggestions
function getProslogodisnjeCijeneForAutocomplete() {
    return proslogodisnjeCijene.map(item => ({
        sifra: item.sifra,
        naziv: item.naziv,
        jm: item.jm,
        prosla_cijena: item.cijena
    }));
}

// Parse CSV line (handles quotes and commas)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other modules to load
    setTimeout(initializeProslogodisnjeCijene, 100);
});

// Export functions to global scope
window.handleProslogodisnjeCijeneFileSelect = handleProslogodisnjeCijeneFileSelect;
window.handleProslogodisnjeCijeneFileDrop = handleProslogodisnjeCijeneFileDrop;
window.handleProslogodisnjeCijeneSearch = handleProslogodisnjeCijeneSearch;
window.handleExportProslogodisnje = handleExportProslogodisnje;
window.handleClearProslogodisnje = handleClearProslogodisnje;
window.getProslogodisnjaCijena = getProslogodisnjaCijena;
window.getProslogodisnjeCijeneForAutocomplete = getProslogodisnjeCijeneForAutocomplete;

// console.log('✅ Prošlogodišnje cijene module loaded successfully!');