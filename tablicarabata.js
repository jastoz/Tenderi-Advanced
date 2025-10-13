/**
 * TABLICA RABATA MODULE - FIXED COLORS (RED TO PURPLE)
 * Handles tablica rabata functionality with proper purple color scheme
 */

// Ensure tablicaRabata exists globally
if (typeof window.tablicaRabata === 'undefined') {
    window.tablicaRabata = [];
}

/**
 * Updates tablica rabata display
 */
function updateTablicaRabataDisplay() {
    const container = document.getElementById('tablicaRabataContainer');
    const exportCSVBtn = document.getElementById('exportTablicaRabataCSVBtn');
    const exportExcelBtn = document.getElementById('exportTablicaRabataExcelBtn');
    const exportXMLBtn = document.getElementById('exportTablicaRabataXMLBtn');
    const clearBtn = document.getElementById('clearTablicaRabataBtn');
    
    if (!container) {
        console.error('❌ tablicaRabataContainer element not found!');
        return;
    }
    
    if (!tablicaRabata || tablicaRabata.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <div style="font-size: 48px; margin-bottom: 12px;">📊</div>
                <h3>Nema generiranih podataka</h3>
                <p>Kliknite "Generiraj iz rezultata" za kreiranje tablice rabata.</p>
                <div class="info-msg" style="margin-top: 20px; text-align: left;">
                    <strong>🛠️ POPRAVLJENA - Generiranje za robni program:</strong><br>
                    • <strong>🏠 Naši artikli</strong>: LAGER/URPD s direktno unesenim cijenama<br>
                    • <strong>🏛️ HISTORICAL_LAGER</strong>: Historical + Weight database artikli<br>
                    • <strong>⚖️ Weight Database</strong>: Direktno iz baze težina<br>
                    • <strong>📋 Šifre u zagradama</strong>: "19. (1445)" format<br>
                    • <strong>📅 Prošlogodišnje cijene</strong>: Importirani historical data<br>
                    • <strong>🔧 Vanjski artikli</strong>: S custom PDV postavkama<br>
                    • <strong>⚠️ ISKLJUČENO: Ručno unesene stavke</strong> (nemaju prave šifre)<br>
                    • Za istu šifru uzima se najjeftinija stavka<br>
                    • ✅ Sada UKLJUČUJE Weight database i HISTORICAL_LAGER!
                </div>
            </div>
        `;
        if (exportCSVBtn) exportCSVBtn.style.display = 'none';
        if (exportExcelBtn) exportExcelBtn.style.display = 'none';
        if (exportXMLBtn) exportXMLBtn.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }
    
    if (exportCSVBtn) exportCSVBtn.style.display = 'block';
    if (exportExcelBtn) exportExcelBtn.style.display = 'block';
    if (exportXMLBtn) exportXMLBtn.style.display = 'block';
    if (clearBtn) clearBtn.style.display = 'block';
    
    // Calculate summary statistics
    const uniqueCodes = new Set(tablicaRabata.map(item => item.sifra_artikla)).size;
    const groups = new Set(tablicaRabata.map(item => item.redni_broj_grupe)).size;
    const enhancedItems = tablicaRabata.filter(item => item.calculation_source === 'enhanced_results').length;

    let html = `
        <div style="margin-bottom: 20px; padding: 16px; background: #f3f4f6; border-radius: 8px;">
            <div>
                <strong>PROŠIRENA Tablica rabata:</strong> ${tablicaRabata.length} stavki •
                <strong>Šifre:</strong> ${uniqueCodes} •
                <strong>Grupe:</strong> ${groups} •
                <strong>Svi tipovi:</strong> ${enhancedItems}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
                📊 Generirano iz PROŠIRENIH rezultata - uključuje SVE tipove artikala
            </div>
        </div>
        
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th style="width: 80px;">Šifra artikla</th>
                        <th>Naziv artikla</th>
                        <th style="width: 60px;">J.M.</th>
                        <th style="width: 120px;">Cijena za tab. (€)</th>
                        <th style="width: 80px; position:relative;">
                            RB Grupe<br>
                            <button onclick="showMissingRBs()" style="margin-top:4px; font-size:11px; padding:2px 8px; background:#f59e0b; color:#fff; border:none; border-radius:6px; cursor:pointer;">Koji brojevi nedostaju?</button>
                        </th>
                        <th>Naziv stavke u troškovniku</th>
                        <th style="width: 60px;">J.M. trošk.</th>
                        <th style="width: 80px;">Količina</th>
                        <th style="width: 120px;">Dobavljač</th>
                        <th style="width: 100px;">Izvor</th>
                        <th style="width: 80px;">Akcije</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    tablicaRabata.forEach((item, index) => {
        const rowStyle = index % 2 === 0 ? 'background: #f9fafb;' : '';
        
        // ENHANCED: Article type-based visual coding
        const groupColor = getGroupColor(item.redni_broj_grupe);
        const isEnhanced = item.calculation_source === 'enhanced_results';
        
        // Article type styling and badges
        let typeColor = '#7c3aed'; // default purple
        let typeBadge = '⚡';
        let typeText = 'ENHANCED';
        
        if (item.article_type) {
            switch (item.article_type) {
                case 'our_article':
                    typeColor = '#16a34a'; // green
                    typeBadge = '🏠';
                    typeText = 'NAŠI';
                    break;
                case 'historical_lager':
                    typeColor = '#0284c7'; // darker blue
                    typeBadge = '🏛️';
                    typeText = 'HIST_LAGER';
                    break;
                case 'weight_database':
                    typeColor = '#059669'; // emerald
                    typeBadge = '⚖️';
                    typeText = 'WEIGHT_DB';
                    break;
                case 'bracket_code':
                    typeColor = '#f59e0b'; // orange
                    typeBadge = '📋';
                    typeText = 'ZAGRADE';
                    break;
                case 'historical':
                    typeColor = '#0ea5e9'; // blue
                    typeBadge = '📅';
                    typeText = 'PROŠLE';
                    break;
                case 'external_pdv':
                    typeColor = '#7c3aed'; // purple
                    typeBadge = '🔧';
                    typeText = 'PDV';
                    break;
                default:
                    typeColor = '#6b7280'; // gray
                    typeBadge = '❓';
                    typeText = 'OTHER';
                    break;
            }
        }
        
        const enhancedStyle = isEnhanced ? `border-left: 3px solid ${typeColor};` : '';
        
        html += `
            <tr style="${rowStyle} ${enhancedStyle}">
                <td>
                    <strong style="color: ${typeColor};">${item.sifra_artikla}</strong>
                    ${isEnhanced ? `<div style="font-size: 8px; color: ${typeColor}; font-weight: bold;">${typeBadge} ${typeText}</div>` : ''}
                </td>
                <td title="${item.naziv_artikla}">
                    <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                        ${item.naziv_artikla}
                    </div>
                </td>
                <td>${item.jedinica_mjere}</td>
                <td>
                    <input 
                        type="number" 
                        step="0.01" 
                        value="${item.cijena.toFixed(2)}"
                        onchange="updateTablicaRabataItem(${item.id}, 'cijena', this.value)"
                        style="width: 100px; padding: 4px; border: 1px solid ${isEnhanced ? typeColor : '#d1d5db'}; border-radius: 4px; font-size: 12px; font-weight: bold; ${isEnhanced ? `background: #f3f4f6; color: ${typeColor};` : ''}"
                        title="Editabilna cijena za tablicu ${isEnhanced ? `(${typeText})` : ''}"
                    >
                    ${isEnhanced ? `<div style="font-size: 8px; color: ${typeColor};">${typeText} tip</div>` : ''}
                </td>
                <td>
                    <span style="background: ${groupColor}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                        ${item.redni_broj_grupe}
                    </span>
                </td>
                <td title="${item.naziv_stavke_troskovnik}">
                    <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                        ${item.naziv_stavke_troskovnik}
                    </div>
                </td>
                <td>${item.jedinica_mjere_troskovnik}</td>
                <td>
                    <input 
                        type="number" 
                        step="1" 
                        value="${item.kolicina_troskovnik}"
                        onchange="updateTablicaRabataItem(${item.id}, 'kolicina_troskovnik', this.value)"
                        style="width: 60px; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;"
                        title="Editabilna količina"
                    >
                </td>
                <td>${item.dobavljac || 'N/A'}</td>
                <td>
                    <span class="badge ${getBadgeClass(item.izvor || '')}" style="${isEnhanced ? 'box-shadow: 0 0 0 1px #7c3aed;' : ''}">
                        ${item.izvor || 'N/A'}
                    </span>
                </td>
                <td>
                    <button 
                        class="auto-btn" 
                        onclick="removeTablicaRabataItem('${item.id}')"
                        title="Ukloni stavku"
                        style="background: #7c3aed;"
                    >
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Update counter in tab title
    const tablicaRabataCountEl = document.getElementById('tablicaRabataCount');
    if (tablicaRabataCountEl) {
        tablicaRabataCountEl.textContent = tablicaRabata.length;
    }
    
    // console.log('✅ Enhanced tablica rabata display updated with', tablicaRabata.length, 'items');
}

/**
 * Gets color for group based on redni broj - FIXED PURPLE THEME
 */
function getGroupColor(rb) {
    const colors = ['#7c3aed', '#059669', '#7c3aed', '#d97706', '#0891b2', '#7c2d12', '#be185d'];
    return colors[rb % colors.length];
}



/**
 * Updates a tablica rabata item field
 */
function updateTablicaRabataItem(itemId, field, value) {
    if (!tablicaRabata) return;
    
    const item = tablicaRabata.find(item => item.id === itemId);
    if (!item) return;

    if (field === 'cijena' || field === 'kolicina_troskovnik') {
        item[field] = parseFloat(value) || 0;
        // Force 2 decimals for prices
        if (field === 'cijena') {
            item[field] = Math.round(item[field] * 100) / 100;
        }
    } else {
        item[field] = value || '';
    }

    updateTablicaRabataDisplay();
    // console.log(`Updated ${field} for item ${itemId}:`, value);
}

/**
 * Removes a tablica rabata item
 */
function removeTablicaRabataItem(itemId) {
    if (!tablicaRabata) return;
    
    const index = tablicaRabata.findIndex(item => item.id === itemId);
    if (index !== -1) {
        const removedItem = tablicaRabata.splice(index, 1)[0];
        updateTablicaRabataDisplay();
        showMessage('success', `Uklonjena stavka: ${removedItem.naziv_artikla}`, 'tablicaRabataStatus');
    }
}

/**
 * Exports tablica rabata to CSV
 */
function exportTablicaRabataCSV() {
    if (!tablicaRabata || tablicaRabata.length === 0) {
        alert('Nema podataka za export!');
        return;
    }
    
    const csvHeaders = [
        'Šifra artikla', 'Naziv artikla', 'J.M.', 'Cijena za tab. (€)',
        'RB Grupe', 'Naziv stavke u troškovniku', 'J.M. troškovnik', 'Količina',
        'Dobavljač', 'Izvor', 'Enhanced', 'Formula cijene'
    ];

    const csvData = tablicaRabata.map(item => [
        item.sifra_artikla,
        item.naziv_artikla,
        item.jedinica_mjere,
        item.cijena.toFixed(2),
        item.redni_broj_grupe,
        item.naziv_stavke_troskovnik,
        item.jedinica_mjere_troskovnik,
        item.kolicina_troskovnik,
        item.dobavljac || 'N/A',
        item.izvor || 'N/A',
        item.calculation_source === 'enhanced_results' ? 'Da' : 'Ne',
        item.price_formula || 'N/A'
    ]);
    
    const filename = `enhanced_tablica_rabata_${tablicaRabata.length}_stavki.csv`;
    exportToCSV(csvHeaders, csvData, filename);

    const enhancedCount = tablicaRabata.filter(item => item.calculation_source === 'enhanced_results').length;

    showMessage('success',
        `✅ Enhanced tablica rabata exportana!\n` +
        `📁 ${filename}\n` +
        `📊 Stavki: ${tablicaRabata.length}\n` +
        `⚡ Enhanced: ${enhancedCount}`,
        'tablicaRabataStatus'
    );
}

/**
 * Exports tablica rabata to Excel
 */
function exportTablicaRabataExcel() {
    if (!tablicaRabata || tablicaRabata.length === 0) {
        alert('Nema podataka za export!');
        return;
    }
    
    if (typeof XLSX === 'undefined') {
        alert('XLSX library nije učitana!');
        return;
    }
    
    // Prepare data for Excel
    const excelData = [
        ['Šifra artikla', 'Naziv artikla', 'J.M.', 'Cijena za tab. (€)',
         'RB Grupe', 'Naziv stavke u troškovniku', 'J.M. troškovnik', 'Količina',
         'Dobavljač', 'Izvor', 'Enhanced', 'Formula cijene', 'Težina (kg)', 'VPC/kg (€)']
    ];

    tablicaRabata.forEach(item => {
        excelData.push([
            item.sifra_artikla,
            item.naziv_artikla,
            item.jedinica_mjere,
            item.cijena,
            item.redni_broj_grupe,
            item.naziv_stavke_troskovnik,
            item.jedinica_mjere_troskovnik,
            item.kolicina_troskovnik,
            item.dobavljac || 'N/A',
            item.izvor || 'N/A',
            item.calculation_source === 'enhanced_results' ? 'Da' : 'Ne',
            item.price_formula || 'N/A',
            item.weight_used || 0,
            item.price_per_kg || 0
        ]);
    });
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    const wscols = [
        {wch: 12}, // Šifra artikla
        {wch: 30}, // Naziv artikla
        {wch: 8},  // J.M.
        {wch: 15}, // Cijena za tab.
        {wch: 10}, // RB Grupe
        {wch: 30}, // Naziv stavke u troškovniku
        {wch: 12}, // J.M. troškovnik
        {wch: 10}, // Količina
        {wch: 12}, // Ukupno
        {wch: 20}, // Dobavljač
        {wch: 15}, // Izvor
        {wch: 10}, // Enhanced
        {wch: 25}, // Formula cijene
        {wch: 12}, // Težina
        {wch: 12}  // VPC/kg
    ];
    ws['!cols'] = wscols;
    
    // Add missing RB numbers to G1 cell
    const missingRBs = getMissingRBString();
    if (missingRBs) {
        ws['G1'] = { t: 's', v: missingRBs };
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Enhanced Tablica Rabata');
    
    // Generate filename using tender header data
    const filenames = generateTenderFilenames('Rabata', 'xlsx');
    const filename = `${filenames.datumPredaje}_${filenames.cleanGrupa}_${filenames.cleanKupac}_Rabata.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);

    const enhancedCount = tablicaRabata.filter(item => item.calculation_source === 'enhanced_results').length;

    showMessage('success',
        `✅ Enhanced Excel tablica rabata exportana!\n` +
        `📁 Datoteka: ${filename}\n` +
        `📊 Stavki: ${tablicaRabata.length}\n` +
        `⚡ Enhanced stavki: ${enhancedCount}\n` +
        `🎯 S direktno unesenim cijenama iz autocomplete`,
        'tablicaRabataStatus'
    );
}

/**
 * Clears all tablica rabata data
 */
function clearTablicaRabata() {
    if (!tablicaRabata || tablicaRabata.length === 0) return;
    
    if (confirm(`Obrisati enhanced tablicu rabata s ${tablicaRabata.length} stavki?`)) {
        const count = tablicaRabata.length;
        tablicaRabata.length = 0;
        updateTablicaRabataDisplay();
        showMessage('success', `Obrisano ${count} stavki iz enhanced tablice rabata.`, 'tablicaRabataStatus');
    }
}

// NOTE: isTrulyOurArticle() is centrally defined in utils.js and exported as window.isTrulyOurArticle

// NOTE: generateFromResults() is now centrally defined in enhanced-functions.js and exported as window.generateFromResults

/**
 * Get troškovnik item for RB
 */
function getTroskovnikItemForRB(rb) {
    if (!troskovnik || troskovnik.length === 0) return null;
    return troskovnik.find(item => item.redni_broj == rb) || null;
}

/**
 * Helper function to get missing RB numbers as a string for export
 * @returns {string} Missing RB numbers in format "1,4,22,33" or empty string if none missing
 */
function getMissingRBString() {
    if (!window.troskovnik || !Array.isArray(window.troskovnik) || troskovnik.length === 0) {
        console.log('🔍 DEBUG getMissingRBString: troskovnik je prazan ili nedostaje');
        return '';
    }
    
    // Skupljamo sve RB iz troškovnika - FIXED: Konvertiramo u brojeve
    const allRBs = troskovnik.map(t => parseInt(t.redni_broj)).filter(x => !isNaN(x));
    console.log(`🔍 DEBUG getMissingRBString: Troskovnik RBs: [${allRBs.join(', ')}]`);
    
    if (allRBs.length === 0) {
        console.log('🔍 DEBUG getMissingRBString: Nema valjan RB brojeva u troskovniku');
        return '';
    }
    
    const minRB = Math.min(...allRBs);
    const maxRB = Math.max(...allRBs);
    console.log(`🔍 DEBUG getMissingRBString: Range ${minRB}-${maxRB}`);
    
    // Skupljamo sve RB iz tablice rabata - FIXED: Konvertiramo u brojeve
    const rabataRBs = new Set((window.tablicaRabata || []).map(r => parseInt(r.redni_broj_grupe)).filter(x => !isNaN(x)));
    console.log(`🔍 DEBUG getMissingRBString: Tablica rabata RBs: [${Array.from(rabataRBs).join(', ')}]`);
    
    // Tražimo koji brojevi nedostaju
    const missing = [];
    for (let i = minRB; i <= maxRB; i++) {
        if (!rabataRBs.has(i)) {
            missing.push(i);
        }
    }
    
    console.log(`🔍 DEBUG getMissingRBString: Missing RBs: [${missing.join(', ')}]`);
    return missing.join(',');
}

/**
 * NEW: Function to show missing RBs in tablica rabata
 */
function showMissingRBs() {
    if (!window.troskovnik || !Array.isArray(window.troskovnik) || troskovnik.length === 0) {
        alert('Troskovnik nije učitan!');
        return;
    }
    // Skupljamo sve RB iz troškovnika
    const allRBs = troskovnik.map(t => t.redni_broj).filter(x => typeof x === 'number' && !isNaN(x));
    if (allRBs.length === 0) {
        alert('Nema rednih brojeva u troskovniku!');
        return;
    }
    const minRB = Math.min(...allRBs);
    const maxRB = Math.max(...allRBs);
    // Skupljamo sve RB iz tablice rabata
    const rabataRBs = new Set((window.tablicaRabata || []).map(r => r.redni_broj_grupe));
    // Tražimo koji brojevi nedostaju
    const missing = [];
    for (let i = minRB; i <= maxRB; i++) {
        if (!rabataRBs.has(i)) missing.push(i);
    }
    if (missing.length === 0) {
        alert('Svi brojevi iz troškovnika su pokriveni u tablici rabata!');
    } else {
        const text = missing.join(', ');
        // Kopiraj u clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Nedostaju brojevi: ' + text + '\n(Spremljeno u clipboard, spremno za paste!)');
            }, () => {
                alert('Nedostaju brojevi: ' + text + '\n(Nije uspjelo automatsko kopiranje u clipboard)');
            });
        } else {
            // Fallback za starije preglednike
            try {
                const temp = document.createElement('textarea');
                temp.value = text;
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                document.body.removeChild(temp);
                alert('Nedostaju brojevi: ' + text + '\n(Spremljeno u clipboard, spremno za paste!)');
            } catch (e) {
                alert('Nedostaju brojevi: ' + text + '\n(Nije uspjelo automatsko kopiranje u clipboard)');
            }
        }
    }
}

// Expose functions globally
window.updateTablicaRabataDisplay = updateTablicaRabataDisplay;
window.updateTablicaRabataItem = updateTablicaRabataItem;
window.removeTablicaRabataItem = removeTablicaRabataItem;
window.exportTablicaRabataCSV = exportTablicaRabataCSV;
window.exportTablicaRabataExcel = exportTablicaRabataExcel;
window.clearTablicaRabata = clearTablicaRabata;
// NOTE: generateFromResults is exported from enhanced-functions.js
window.getGroupColor = getGroupColor;
window.getTroskovnikItemForRB = getTroskovnikItemForRB;
window.showMissingRBs = showMissingRBs;
window.getMissingRBString = getMissingRBString;

// console.log('✅ FIXED Tablica Rabata module loaded:');
// console.log('🎨 FIXED: All red colors changed to purple (#7c3aed)');
// console.log('🗑️ FIXED: Delete buttons use purple background');
// console.log('💜 FIXED: Group colors use purple theme');
// console.log('📊 Enhanced tablica rabata functionality ready');
// ========================================
// DODAJ OVO NA KRAJ POSTOJEĆE tablicarabata.js DATOTEKE
// ========================================

/**
 * FIXED: Exports tablica rabata to Excel (XLSX) format - SAMO POPRAVKA
 */
function exportTablicaRabataExcel() {
    if (!tablicaRabata || tablicaRabata.length === 0) {
        alert('Nema podataka za export!');
        return;
    }
    
    // Check if XLSX library is available
    if (typeof XLSX === 'undefined') {
        alert('XLSX library nije učitana! Molimo osvježite stranicu.');
        return;
    }
    
    try {
        // console.log('📊 Starting XLSX export with', tablicaRabata.length, 'items');
        
        // Prepare data for Excel with proper structure
        const excelData = [];
        
        // Add header row
        excelData.push([
            'Šifra artikla', 'Naziv artikla', 'J.M.', 'Cijena za tab. (€)',
            'RB Grupe', 'Naziv stavke u troškovniku', 'J.M. troškovnik', 'Količina',
            'Dobavljač', 'Izvor', 'Enhanced', 'Formula cijene',
            'Težina (kg)', 'VPC/kg (€)', 'Datum generiranja'
        ]);

        // Add data rows
        tablicaRabata.forEach(item => {
            const isEnhanced = item.calculation_source === 'enhanced_results';

            excelData.push([
                item.sifra_artikla || '',
                item.naziv_artikla || '',
                item.jedinica_mjere || '',
                parseFloat(item.cijena.toFixed(2)),
                item.redni_broj_grupe || 0,
                item.naziv_stavke_troskovnik || '',
                item.jedinica_mjere_troskovnik || '',
                item.kolicina_troskovnik || 0,
                item.dobavljac || 'N/A',
                item.izvor || 'N/A',
                isEnhanced ? 'Da' : 'Ne',
                item.price_formula || 'N/A',
                item.weight_used || 0,
                item.price_per_kg || 0,
                new Date().toLocaleDateString('hr-HR')
            ]);
        });
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        // Set column widths
        const wscols = [
            {wch: 12}, {wch: 35}, {wch: 8}, {wch: 15}, {wch: 10}, {wch: 35},
            {wch: 12}, {wch: 10}, {wch: 20}, {wch: 15}, {wch: 10},
            {wch: 30}, {wch: 12}, {wch: 12}, {wch: 15}
        ];
        ws['!cols'] = wscols;
        
        // ENHANCED: Add Excel formulas to calculation columns
        for (let rowIndex = 2; rowIndex <= tablicaRabata.length + 1; rowIndex++) {
            // N: VPC/kg (Cijena / Težina) = D / M
            if (ws[`M${rowIndex}`] && ws[`M${rowIndex}`].v && ws[`M${rowIndex}`].v > 0) {
                const vpcFormula = `D${rowIndex}/M${rowIndex}`;
                ws[`N${rowIndex}`] = createExcelFormulaCell(vpcFormula, ws[`N${rowIndex}`]?.v || 0);
            }
        }
        
        // Add missing RB numbers to G1 cell
        const missingRBs = getMissingRBString();
        if (missingRBs) {
            ws['G1'] = { t: 's', v: missingRBs };
        }
        
        // Add the main worksheet
        XLSX.utils.book_append_sheet(wb, ws, 'Enhanced Tablica Rabata');
        
        // Generate filename using tender header data
        const filenames = generateTenderFilenames('Rabata', 'xlsx');
        const filename = `${filenames.datumPredaje}_${filenames.cleanGrupa}_${filenames.cleanKupac}_Rabata.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);

        // Show success message
        const enhancedCount = tablicaRabata.filter(item => item.calculation_source === 'enhanced_results').length;

        showMessage('success',
            `✅ Enhanced Excel tablica rabata exportana!\n\n` +
            `📁 Datoteka: ${filename}\n` +
            `📊 Stavki: ${tablicaRabata.length}\n` +
            `⚡ Enhanced stavki: ${enhancedCount}\n` +
            `🎯 S direktno unesenim cijenama iz autocomplete`,
            'tablicaRabataStatus'
        );
        
    } catch (error) {
        console.error('❌ XLSX export error:', error);
        alert(`Greška pri XLSX exportu: ${error.message}`);
        
        showMessage('error', 
            `❌ Greška pri XLSX exportu!\n\n` +
            `Greška: ${error.message}\n\n` +
            `Molimo pokušajte ponovno ili koristite CSV export.`, 
            'tablicaRabataStatus'
        );
    }
}

/**
 * NEW: Exports tablica rabata to XML format
 */
function exportTablicaRabataXML() {
    if (!tablicaRabata || tablicaRabata.length === 0) {
        alert('Nema podataka za export!');
        return;
    }
    
    try {
        // Calculate summary data (same as Excel export)
        const enhancedCount = tablicaRabata.filter(item => item.calculation_source === 'enhanced_results').length;
        
        // Create proper Excel XML Spreadsheet format
        let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xmlContent += '<?mso-application progid="Excel.Sheet"?>\n';
        xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xmlContent += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
        xmlContent += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
        xmlContent += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xmlContent += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
        
        // DocumentProperties
        xmlContent += '<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">\n';
        xmlContent += '<Title>Enhanced Tablica Rabata</Title>\n';
        xmlContent += '<Subject>Tablica rabata export</Subject>\n';
        xmlContent += '<Author>Tražilica Proizvoda</Author>\n';
        xmlContent += '<Created>' + new Date().toISOString() + '</Created>\n';
        xmlContent += '</DocumentProperties>\n';
        
        // Styles
        xmlContent += '<Styles>\n';
        xmlContent += '<Style ss:ID="Default" ss:Name="Normal">\n';
        xmlContent += '<Alignment ss:Vertical="Bottom"/>\n';
        xmlContent += '<Borders/>\n';
        xmlContent += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>\n';
        xmlContent += '<Interior/>\n';
        xmlContent += '<NumberFormat/>\n';
        xmlContent += '<Protection/>\n';
        xmlContent += '</Style>\n';
        
        // Header style
        xmlContent += '<Style ss:ID="Header">\n';
        xmlContent += '<Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>\n';
        xmlContent += '<Borders>\n';
        xmlContent += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '</Borders>\n';
        xmlContent += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>\n';
        xmlContent += '<Interior ss:Color="#4472C4" ss:Pattern="Solid"/>\n';
        xmlContent += '</Style>\n';
        
        // Currency style
        xmlContent += '<Style ss:ID="Currency">\n';
        xmlContent += '<Alignment ss:Horizontal="Right" ss:Vertical="Bottom"/>\n';
        xmlContent += '<Borders>\n';
        xmlContent += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '</Borders>\n';
        xmlContent += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>\n';
        xmlContent += '<NumberFormat ss:Format="&quot;€&quot;#,##0.00"/>\n';
        xmlContent += '</Style>\n';
        
        // Number style
        xmlContent += '<Style ss:ID="Number">\n';
        xmlContent += '<Alignment ss:Horizontal="Right" ss:Vertical="Bottom"/>\n';
        xmlContent += '<Borders>\n';
        xmlContent += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '</Borders>\n';
        xmlContent += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>\n';
        xmlContent += '<NumberFormat ss:Format="#,##0.000"/>\n';
        xmlContent += '</Style>\n';
        
        // Text style
        xmlContent += '<Style ss:ID="Text">\n';
        xmlContent += '<Alignment ss:Horizontal="Left" ss:Vertical="Bottom"/>\n';
        xmlContent += '<Borders>\n';
        xmlContent += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '</Borders>\n';
        xmlContent += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>\n';
        xmlContent += '</Style>\n';
        
        // Missing RB style (yellow background)
        xmlContent += '<Style ss:ID="MissingRB">\n';
        xmlContent += '<Alignment ss:Horizontal="Left" ss:Vertical="Bottom"/>\n';
        xmlContent += '<Borders>\n';
        xmlContent += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>\n';
        xmlContent += '</Borders>\n';
        xmlContent += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FF0000" ss:Bold="1"/>\n';
        xmlContent += '<Interior ss:Color="#FFEB3B" ss:Pattern="Solid"/>\n';
        xmlContent += '</Style>\n';
        
        xmlContent += '</Styles>\n';
        
        // Worksheet
        xmlContent += '<Worksheet ss:Name="Tablica Rabata">\n';
        xmlContent += '<Table>\n';
        
        // Define column widths
        xmlContent += '<Column ss:Width="80"/>\n';  // Šifra artikla
        xmlContent += '<Column ss:Width="200"/>\n'; // Naziv artikla
        xmlContent += '<Column ss:Width="40"/>\n';  // J.M.
        xmlContent += '<Column ss:Width="80"/>\n';  // Cijena za tab.
        xmlContent += '<Column ss:Width="60"/>\n';  // RB Grupe
        xmlContent += '<Column ss:Width="200"/>\n'; // Naziv stavke u troškovniku
        xmlContent += '<Column ss:Width="80"/>\n';  // J.M. troškovnik
        xmlContent += '<Column ss:Width="80"/>\n';  // Količina
        xmlContent += '<Column ss:Width="120"/>\n'; // Dobavljač
        xmlContent += '<Column ss:Width="60"/>\n';  // Izvor
        xmlContent += '<Column ss:Width="70"/>\n';  // Enhanced
        xmlContent += '<Column ss:Width="120"/>\n'; // Formula cijene
        xmlContent += '<Column ss:Width="80"/>\n';  // Težina
        xmlContent += '<Column ss:Width="80"/>\n';  // VPC/kg

        // Header row
        const headers = [
            'Šifra artikla', 'Naziv artikla', 'J.M.', 'Cijena za tab. (€)',
            'RB Grupe', 'Naziv stavke u troškovniku', 'J.M. troškovnik', 'Količina',
            'Dobavljač', 'Izvor', 'Enhanced', 'Formula cijene', 'Težina (kg)', 'VPC/kg (€)'
        ];
        
        xmlContent += '<Row>\n';
        headers.forEach(header => {
            xmlContent += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXML(header)}</Data></Cell>\n`;
        });
        xmlContent += '</Row>\n';
        
        // Add missing RB numbers row (equivalent to G1 in Excel)
        const missingRBs = getMissingRBString();
        if (missingRBs) {
            xmlContent += '<Row>\n';
            xmlContent += '<Cell ss:StyleID="MissingRB"><Data ss:Type="String">NEDOSTAJU</Data></Cell>\n'; // A
            xmlContent += '<Cell ss:StyleID="MissingRB"><Data ss:Type="String">RB BROJEVI</Data></Cell>\n'; // B
            xmlContent += '<Cell ss:StyleID="MissingRB"><Data ss:Type="String">IZ</Data></Cell>\n'; // C
            xmlContent += '<Cell ss:StyleID="MissingRB"><Data ss:Type="String">TROŠKOVNIKA:</Data></Cell>\n'; // D
            xmlContent += '<Cell ss:StyleID="MissingRB"><Data ss:Type="String"></Data></Cell>\n'; // E
            xmlContent += '<Cell ss:StyleID="MissingRB"><Data ss:Type="String"></Data></Cell>\n'; // F
            xmlContent += `<Cell ss:StyleID="MissingRB"><Data ss:Type="String">${escapeXML(missingRBs)}</Data></Cell>\n`; // G
            // Fill remaining columns
            for (let i = 7; i < headers.length; i++) {
                xmlContent += '<Cell ss:StyleID="MissingRB"><Data ss:Type="String"></Data></Cell>\n';
            }
            xmlContent += '</Row>\n';
        }
        
        // Data rows
        tablicaRabata.forEach(item => {
            xmlContent += '<Row>\n';
            
            // Šifra artikla
            xmlContent += `<Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXML(item.sifra_artikla || '')}</Data></Cell>\n`;
            
            // Naziv artikla
            xmlContent += `<Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXML(item.naziv_artikla || '')}</Data></Cell>\n`;
            
            // J.M.
            xmlContent += `<Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXML(item.jedinica_mjere || '')}</Data></Cell>\n`;
            
            // Cijena za tab.
            xmlContent += `<Cell ss:StyleID="Currency"><Data ss:Type="Number">${(item.cijena || 0).toFixed(2)}</Data></Cell>\n`;
            
            // RB Grupe
            xmlContent += `<Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXML(item.redni_broj_grupe || '')}</Data></Cell>\n`;
            
            // Naziv stavke u troškovniku
            xmlContent += `<Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXML(item.naziv_stavke_troskovnik || '')}</Data></Cell>\n`;
            
            // J.M. troškovnik
            xmlContent += `<Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXML(item.jedinica_mjere_troskovnik || '')}</Data></Cell>\n`;
            
            // Količina
            xmlContent += `<Cell ss:StyleID="Number"><Data ss:Type="Number">${(item.kolicina_troskovnik || 0).toFixed(3)}</Data></Cell>\n`;

            // Dobavljač
            xmlContent += `<Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXML(item.dobavljac || 'N/A')}</Data></Cell>\n`;
            
            // Izvor
            xmlContent += `<Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXML(item.izvor || 'N/A')}</Data></Cell>\n`;
            
            // Enhanced
            const isEnhanced = item.calculation_source === 'enhanced_results' ? 'Da' : 'Ne';
            xmlContent += `<Cell ss:StyleID="Text"><Data ss:Type="String">${isEnhanced}</Data></Cell>\n`;
            
            // Formula cijene
            xmlContent += `<Cell ss:StyleID="Text"><Data ss:Type="String">${escapeXML(item.price_formula || 'N/A')}</Data></Cell>\n`;
            
            // Težina
            xmlContent += `<Cell ss:StyleID="Number"><Data ss:Type="Number">${(item.weight_used || 0).toFixed(3)}</Data></Cell>\n`;
            
            // VPC/kg
            xmlContent += `<Cell ss:StyleID="Currency"><Data ss:Type="Number">${(item.price_per_kg || 0).toFixed(2)}</Data></Cell>\n`;
            
            xmlContent += '</Row>\n';
        });
        
        xmlContent += '</Table>\n';
        xmlContent += '</Worksheet>\n';
        xmlContent += '</Workbook>\n';
        
        // Create and download Excel XML file
        const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Generate filename using tender header data with proper .xml extension
        const filenames = generateTenderFilenames('Rabata', 'xml');
        const filename = `${filenames.datumPredaje}_${filenames.cleanGrupa}_${filenames.cleanKupac}_Rabata.xml`;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        // Show success message
        showMessage('success',
            `✅ Excel XML tablica rabata exportana!\n` +
            `📁 Datoteka: ${filename}\n` +
            `📊 Stavki: ${tablicaRabata.length}\n` +
            `⚡ Enhanced stavki: ${enhancedCount}\n` +
            `🎯 S direktno unesenim cijenama iz autocomplete\n` +
            `💡 Excel XML format - ERP kompatibilan!`,
            'tablicaRabataStatus'
        );
        
    } catch (error) {
        console.error('❌ XML export error:', error);
        alert(`Greška pri XML exportu: ${error.message}`);
    }
}

/**
 * Helper function to escape HTML special characters
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Helper function to escape XML special characters
 */
function escapeXML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Override postojeće funkcije
window.exportTablicaRabataExcel = exportTablicaRabataExcel;
window.exportTablicaRabataXML = exportTablicaRabataXML;
window.escapeXML = escapeXML;

// console.log('✅ FIXED: XLSX export popravljen');
// console.log('🆕 NEW: XML export dodan s identičnim redosljedom stupaca');