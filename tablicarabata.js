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
    const totalValue = tablicaRabata.reduce((sum, item) => sum + (item.cijena * item.kolicina_troskovnik), 0);
    const uniqueCodes = new Set(tablicaRabata.map(item => item.sifra_artikla)).size;
    const groups = new Set(tablicaRabata.map(item => item.redni_broj_grupe)).size;
    const enhancedItems = tablicaRabata.filter(item => item.calculation_source === 'enhanced_results').length;
    
    let html = `
        <div style="margin-bottom: 20px; padding: 16px; background: #f3f4f6; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>PROŠIRENA Tablica rabata:</strong> ${tablicaRabata.length} stavki • 
                    <strong>Šifre:</strong> ${uniqueCodes} • 
                    <strong>Grupe:</strong> ${groups} • 
                    <strong>Svi tipovi:</strong> ${enhancedItems}
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 14px; color: #6b7280;">Ukupna vrijednost</div>
                    <div style="font-weight: bold; color: #059669; font-size: 18px;">€${totalValue.toFixed(2)}</div>
                    <div style="font-size: 10px; color: #7c3aed; margin-top: 2px;">⚡ Direktno iz autocomplete</div>
                </div>
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
                        <th style="width: 100px;">Ukupno (€)</th>
                        <th style="width: 120px;">Dobavljač</th>
                        <th style="width: 100px;">Izvor</th>
                        <th style="width: 80px;">Akcije</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    tablicaRabata.forEach((item, index) => {
        const ukupno = item.cijena * item.kolicina_troskovnik;
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
                <td><strong style="color: #059669;">€${ukupno.toFixed(2)}</strong></td>
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
        'Ukupno (€)', 'Dobavljač', 'Izvor', 'Enhanced', 'Formula cijene'
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
        (item.cijena * item.kolicina_troskovnik).toFixed(2),
        item.dobavljac || 'N/A',
        item.izvor || 'N/A',
        item.calculation_source === 'enhanced_results' ? 'Da' : 'Ne',
        item.price_formula || 'N/A'
    ]);
    
    const filename = `enhanced_tablica_rabata_${tablicaRabata.length}_stavki.csv`;
    exportToCSV(csvHeaders, csvData, filename);
    
    const totalValue = tablicaRabata.reduce((sum, item) => sum + (item.cijena * item.kolicina_troskovnik), 0);
    const enhancedCount = tablicaRabata.filter(item => item.calculation_source === 'enhanced_results').length;
    
    showMessage('success', 
        `✅ Enhanced tablica rabata exportana!\n` +
        `📁 ${filename}\n` +
        `📊 Stavki: ${tablicaRabata.length}\n` +
        `⚡ Enhanced: ${enhancedCount}\n` +
        `💰 Ukupna vrijednost: €${totalValue.toFixed(2)}`, 
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
         'Ukupno (€)', 'Dobavljač', 'Izvor', 'Enhanced', 'Formula cijene', 'Težina (kg)', 'VPC/kg (€)']
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
            item.cijena * item.kolicina_troskovnik,
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
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Enhanced Tablica Rabata');
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const filename = `Enhanced_Tablica_Rabata_${timestamp}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
    
    const totalValue = tablicaRabata.reduce((sum, item) => sum + (item.cijena * item.kolicina_troskovnik), 0);
    const enhancedCount = tablicaRabata.filter(item => item.calculation_source === 'enhanced_results').length;
    
    showMessage('success', 
        `✅ Enhanced Excel tablica rabata exportana!\n` +
        `📁 Datoteka: ${filename}\n` +
        `📊 Stavki: ${tablicaRabata.length}\n` +
        `⚡ Enhanced stavki: ${enhancedCount}\n` +
        `💰 Ukupna vrijednost: €${totalValue.toFixed(2)}\n` +
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

/**
 * NEW: Enhanced function to determine if article is truly "ours" 
 * ENHANCED LOGIC: Must have correct source AND exist in weight database
 * @param {string} source - Article source
 * @param {string} code - Article code
 * @returns {boolean} True if truly our article
 */
function isTrulyOurArticle(source, code) {
    if (!source || !code) return false;
    
    // First check: source must be LAGER or URPD
    const lowerSource = source.toLowerCase();
    const hasCorrectSource = lowerSource.includes('lager') || lowerSource.includes('urpd');
    
    if (!hasCorrectSource) {
        return false;
    }
    
    // Second check: code must exist in weight database
    const existsInWeightDb = typeof window.weightDatabase !== 'undefined' && 
                            window.weightDatabase.has(code);
    
    return existsInWeightDb;
}

/**
 * Generates tablica rabata from results with user prices
 */
function generateFromResults() {
    console.log('🚨🚨🚨 STARA FUNKCIJA IZ TABLICARABATA.JS SE POZIVA!!!');
    console.log('🚨🚨🚨 Ovo znači da se nova funkcija iz enhanced-functions.js NE KORISTI!');
    console.log('🎯 Generating tablica rabata from enhanced results...');
    
    // DEBUG: Prikaži sve results
    console.log('🔥🔥🔥 SVIH RESULTS UKUPNO:', results?.length || 0);
    if (results && results.length > 0) {
        console.log('🔥🔥🔥 SVI RESULTS:');
        results.forEach((r, index) => {
            console.log(`  [${index}] ${r.name} | isFromWeightDatabase: ${r.isFromWeightDatabase} | hasUserPrice: ${r.hasUserPrice} | pricePerPiece: ${r.pricePerPiece} | source: ${r.source}`);
        });
        
        // Posebno prikaži Weight Database artikle
        const weightDbResults = results.filter(r => r.isFromWeightDatabase === true);
        console.log('🔥🔥🔥 WEIGHT DATABASE RESULTS:', weightDbResults.length);
        weightDbResults.forEach((r, index) => {
            console.log(`  [${index}] WEIGHT DB: ${r.name} | hasUserPrice: ${r.hasUserPrice} | pricePerPiece: ${r.pricePerPiece}`);
        });
    }
    
    // Check if we have results with user prices OR Weight Database articles
    console.log('🔥🔥🔥 FILTERING FOR RESULTS WITH PRICES (INCLUDING WEIGHT DATABASE)...');
    const resultsWithPrices = results.filter(r => {
        // NOVA LOGIKA: Uključi Weight Database artikle čak i bez cijene
        const isWeightDatabaseArticle = r.isFromWeightDatabase === true;
        const hasRegularPrice = r.hasUserPrice && r.pricePerPiece > 0;
        
        // Provjeri troškovnik cijenu za Weight Database artikle
        let hasTroskovnikPrice = false;
        if (isWeightDatabaseArticle && r.rb) {
            const troskovnikItem = getTroskovnikItemForRB(r.rb);
            hasTroskovnikPrice = troskovnikItem && troskovnikItem.izlazna_cijena > 0;
        }
        
        const shouldInclude = hasRegularPrice || (isWeightDatabaseArticle && (hasRegularPrice || hasTroskovnikPrice));
        
        if (!shouldInclude) {
            console.log(`❌ FILTERED OUT: ${r.name} | hasUserPrice: ${r.hasUserPrice} | pricePerPiece: ${r.pricePerPiece} | isFromWeightDatabase: ${r.isFromWeightDatabase} | hasTroskovnikPrice: ${hasTroskovnikPrice}`);
        } else {
            console.log(`✅ INCLUDED: ${r.name} | hasUserPrice: ${r.hasUserPrice} | pricePerPiece: ${r.pricePerPiece} | isFromWeightDatabase: ${r.isFromWeightDatabase} | hasTroskovnikPrice: ${hasTroskovnikPrice} | reason: ${isWeightDatabaseArticle ? 'Weight Database' : 'Regular price'}`);
        }
        return shouldInclude;
    });
    
    console.log('🔥🔥🔥 RESULTS WITH PRICES UKUPNO:', resultsWithPrices.length);
    
    if (resultsWithPrices.length === 0) {
        showMessage('error', 
            '❌ Nema rezultata s unesenim cijenama!\n\n' +
            'Za generiranje tablice rabata potrebno je:\n' +
            '1. Dodati rezultate pretrage\n' +
            '2. Upisati cijene za LAGER/URPD artikle\n' +
            '3. Pokušati ponovo\n\n' +
            '💡 Tip: Koristite direktno upisivanje cijena u autocomplete!', 
            'tablicaRabataStatus'
        );
        return;
    }
    
    // console.log('📊 Found results with prices:', resultsWithPrices.length);
    
    // Filter only our articles (LAGER/URPD) AND Weight Database articles - ENHANCED LOGIC
    console.log('🔥🔥🔥 FILTERING FOR VALID ARTICLES FOR TABLICA...');
    const ourArticlesWithPrices = resultsWithPrices.filter(item => {
        const isOurArticle = isTrulyOurArticle(item.source, item.code);
        const isWeightDatabaseArticle = item.isFromWeightDatabase === true;
        
        const shouldInclude = isOurArticle || isWeightDatabaseArticle;
        
        if (shouldInclude) {
            console.log(`✅ VALID FOR TABLICA: ${item.name} | source: ${item.source} | isFromWeightDatabase: ${item.isFromWeightDatabase} | reason: ${isWeightDatabaseArticle ? 'Weight Database article' : 'Our article (LAGER/URPD)'}`);
        } else {
            console.log(`❌ NOT VALID FOR TABLICA: ${item.name} | source: ${item.source} | isFromWeightDatabase: ${item.isFromWeightDatabase}`);
        }
        
        return shouldInclude;
    });
    
    if (ourArticlesWithPrices.length === 0) {
        showMessage('error', 
            '❌ Nema LAGER/URPD/WEIGHT DATABASE artikala s cijenama!\n\n' +
            'Tablica rabata se može generirati iz:\n' +
            '• 🏠 LAGER/URPD artikala s unesenom cijenom\n' +
            '• ⚖️ WEIGHT DATABASE artikala s kodom u zagradi (1995)\n' +
            '• 📝 Artikala s šifrom i izvorom\n\n' +
            '💡 Tip: Upisujte cijene za zeleno označene artikle u autocomplete ili dodajte artikle iz Tablice težina!', 
            'tablicaRabataStatus'
        );
        return;
    }
    
    // Group by code and take cheapest
    const groupedByCode = {};
    
    ourArticlesWithPrices.forEach(item => {
        const code = item.code ? item.code.trim() : '';
        if (!code) return;
        
        if (!groupedByCode[code]) {
            groupedByCode[code] = [];
        }
        groupedByCode[code].push(item);
    });
    
    // Select cheapest per code
    const uniqueItems = [];
    Object.entries(groupedByCode).forEach(([code, items]) => {
        items.sort((a, b) => a.pricePerPiece - b.pricePerPiece);
        const cheapest = items[0];
        // console.log(`💰 Code ${code}: Selected cheapest - €${cheapest.pricePerPiece.toFixed(2)}`);
        uniqueItems.push(cheapest);
    });
    
    // console.log('🎯 Unique items selected:', uniqueItems.length);
    
    // Clear existing tablica rabata
    tablicaRabata.length = 0;
    
    // Generate entries
    uniqueItems.forEach((item, index) => {
        // Get troškovnik item for this RB
        const troskovnikItem = getTroskovnikItemForRB(item.rb);
        
        const rabataEntry = {
            id: index + 1,
            sifra_artikla: item.code.trim(),
            naziv_artikla: item.name,
            jedinica_mjere: item.unit,
            cijena: item.pricePerPiece, // Use user-entered price
            redni_broj_grupe: item.rb,
            naziv_stavke_troskovnik: troskovnikItem ? troskovnikItem.naziv_artikla : `Stavka ${item.rb}`,
            jedinica_mjere_troskovnik: troskovnikItem ? troskovnikItem.mjerna_jedinica : item.unit,
            kolicina_troskovnik: troskovnikItem ? troskovnikItem.trazena_kolicina : 1,
            
            // Enhanced specific fields
            dobavljac: item.supplier,
            izvor: item.source,
            calculation_source: 'enhanced_results',
            price_formula: `Direktno uneseno: €${item.pricePerPiece.toFixed(2)}`,
            weight_used: item.calculatedWeight || item.weight || 0,
            price_per_kg: item.pricePerKg || 0
        };
        
        tablicaRabata.push(rabataEntry);
        // console.log(`✅ Added enhanced entry ${index + 1}: ${rabataEntry.sifra_artikla} - ${rabataEntry.naziv_artikla}`);
    });
    
    // Sort by RB then by šifra
    tablicaRabata.sort((a, b) => {
        if (a.redni_broj_grupe !== b.redni_broj_grupe) {
            return a.redni_broj_grupe - b.redni_broj_grupe;
        }
        return a.sifra_artikla.localeCompare(b.sifra_artikla);
    });
    
    // Update display
    updateTablicaRabataDisplay();
    
    // Show success message
    const totalValue = tablicaRabata.reduce((sum, item) => sum + (item.cijena * item.kolicina_troskovnik), 0);
    
    showMessage('success', 
        `✅ Tablica rabata generirana iz enhanced rezultata!\n\n` +
        `📊 Ukupno stavki: ${tablicaRabata.length}\n` +
        `💰 Ukupna vrijednost: €${totalValue.toFixed(2)}\n` +
        `🏠 Naši artikli (LAGER/URPD/WEIGHT DATABASE)\n` +
        `🎯 S direktno unesenim cijenama\n` +
        `⚡ Workflow completed!`, 
        'tablicaRabataStatus'
    );
    
    // Switch to tablica rabata tab
    showTab('tablicaRabata');
    
    // console.log('✅ Enhanced tablica rabata generation completed:', tablicaRabata.length, 'entries');
}

/**
 * Get troškovnik item for RB
 */
function getTroskovnikItemForRB(rb) {
    if (!troskovnik || troskovnik.length === 0) return null;
    return troskovnik.find(item => item.redni_broj == rb) || null;
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
// EKSPLICITNO BRISANJE STARE FUNKCIJE - koristimo novu iz enhanced-functions.js
console.log('🔥🔥🔥🔥🔥 TABLICARABATA.JS SE UČITAVA - BRIŠEM STARU FUNKCIJU!');
console.log('🔥🔥🔥🔥🔥 generateFromResults type PRIJE brisanja:', typeof window.generateFromResults);

// Provjeri je li to naša nova funkcija s debug kodom
if (typeof window.generateFromResults !== 'undefined') {
    const funcStr = window.generateFromResults.toString();
    if (funcStr.includes('JEBENI KRITIČNI DEBUG')) {
        console.log('🔥🔥🔥🔥🔥 NOVA FUNKCIJA JE VEĆ UČITANA - NE BRIŠEM!');
    } else {
        console.log('🔥🔥🔥🔥🔥 PRONAŠAO STARU FUNKCIJU - BRIŠEM JU...');
        delete window.generateFromResults;
        console.log('🔥🔥🔥🔥🔥 generateFromResults type NAKON brisanja:', typeof window.generateFromResults);
    }
}

// window.generateFromResults = generateFromResults; // COMMENTED OUT: Using enhanced version from enhanced-functions.js
window.getGroupColor = getGroupColor;
window.getTroskovnikItemForRB = getTroskovnikItemForRB;
window.showMissingRBs = showMissingRBs;

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
            'Ukupno (€)', 'Dobavljač', 'Izvor', 'Enhanced', 'Formula cijene', 
            'Težina (kg)', 'VPC/kg (€)', 'Datum generiranja'
        ]);
        
        // Add data rows
        tablicaRabata.forEach(item => {
            const ukupno = item.cijena * item.kolicina_troskovnik;
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
                parseFloat(ukupno.toFixed(2)),
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
            {wch: 12}, {wch: 10}, {wch: 12}, {wch: 20}, {wch: 15}, {wch: 10}, 
            {wch: 30}, {wch: 12}, {wch: 12}, {wch: 15}
        ];
        ws['!cols'] = wscols;
        
        // ENHANCED: Add Excel formulas to calculation columns
        for (let rowIndex = 2; rowIndex <= tablicaRabata.length + 1; rowIndex++) {
            // I: Ukupno (Cijena × Količina) = D × H
            const ukupnoFormula = `D${rowIndex}*H${rowIndex}`;
            ws[`I${rowIndex}`] = createExcelFormulaCell(ukupnoFormula, ws[`I${rowIndex}`]?.v || 0);
            
            // O: VPC/kg (Cijena / Težina) = D / N
            if (ws[`N${rowIndex}`] && ws[`N${rowIndex}`].v && ws[`N${rowIndex}`].v > 0) {
                const vpcFormula = `D${rowIndex}/N${rowIndex}`;
                ws[`O${rowIndex}`] = createExcelFormulaCell(vpcFormula, ws[`O${rowIndex}`]?.v || 0);
            }
        }
        
        // Add the main worksheet
        XLSX.utils.book_append_sheet(wb, ws, 'Enhanced Tablica Rabata');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const filename = `Enhanced_Tablica_Rabata_${timestamp}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
        
        // Show success message
        const totalValue = tablicaRabata.reduce((sum, item) => sum + (item.cijena * item.kolicina_troskovnik), 0);
        const enhancedCount = tablicaRabata.filter(item => item.calculation_source === 'enhanced_results').length;
        
        showMessage('success', 
            `✅ Enhanced Excel tablica rabata exportana!\n\n` +
            `📁 Datoteka: ${filename}\n` +
            `📊 Stavki: ${tablicaRabata.length}\n` +
            `⚡ Enhanced stavki: ${enhancedCount}\n` +
            `💰 Ukupna vrijednost: €${totalValue.toFixed(2)}\n` +
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
        const totalValue = tablicaRabata.reduce((sum, item) => sum + (item.cijena * item.kolicina_troskovnik), 0);
        const enhancedCount = tablicaRabata.filter(item => item.calculation_source === 'enhanced_results').length;
        
        // Use simple HTML table format that Excel can open directly
        let htmlContent = '<!DOCTYPE html>\n';
        htmlContent += '<html>\n';
        htmlContent += '<head>\n';
        htmlContent += '<meta charset="utf-8">\n';
        htmlContent += '<title>Enhanced Tablica Rabata</title>\n';
        htmlContent += '<style>\n';
        htmlContent += 'table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; }\n';
        htmlContent += 'th { background-color: #4472C4; color: white; font-weight: bold; padding: 8px; border: 1px solid #000; text-align: center; }\n';
        htmlContent += 'td { padding: 6px; border: 1px solid #000; }\n';
        htmlContent += '.currency { text-align: right; }\n';
        htmlContent += '.number { text-align: right; }\n';
        htmlContent += '.text { text-align: left; }\n';
        htmlContent += '</style>\n';
        htmlContent += '</head>\n';
        htmlContent += '<body>\n';
        htmlContent += '<table>\n';
        
        // Header row (identical to Excel export)
        htmlContent += '<tr>\n';
        const headers = [
            'Šifra artikla', 'Naziv artikla', 'J.M.', 'Cijena za tab. (€)',
            'RB Grupe', 'Naziv stavke u troškovniku', 'J.M. troškovnik', 'Količina', 
            'Ukupno (€)', 'Dobavljač', 'Izvor', 'Enhanced', 'Formula cijene', 'Težina (kg)', 'VPC/kg (€)'
        ];
        
        headers.forEach(header => {
            htmlContent += `<th>${escapeHTML(header)}</th>\n`;
        });
        htmlContent += '</tr>\n';
        
        // Data rows (identical structure to Excel export)
        tablicaRabata.forEach(item => {
            htmlContent += '<tr>\n';
            
            // Šifra artikla
            htmlContent += `<td class="text">${escapeHTML(item.sifra_artikla || '')}</td>\n`;
            
            // Naziv artikla
            htmlContent += `<td class="text">${escapeHTML(item.naziv_artikla || '')}</td>\n`;
            
            // J.M.
            htmlContent += `<td class="text">${escapeHTML(item.jedinica_mjere || '')}</td>\n`;
            
            // Cijena za tab.
            htmlContent += `<td class="currency">€${(item.cijena || 0).toFixed(2)}</td>\n`;
            
            // RB Grupe
            htmlContent += `<td class="text">${item.redni_broj_grupe || ''}</td>\n`;
            
            // Naziv stavke u troškovniku
            htmlContent += `<td class="text">${escapeHTML(item.naziv_stavke_troskovnik || '')}</td>\n`;
            
            // J.M. troškovnik
            htmlContent += `<td class="text">${escapeHTML(item.jedinica_mjere_troskovnik || '')}</td>\n`;
            
            // Količina
            htmlContent += `<td class="number">${(item.kolicina_troskovnik || 0).toFixed(3)}</td>\n`;
            
            // Ukupno
            const ukupno = (item.cijena || 0) * (item.kolicina_troskovnik || 0);
            htmlContent += `<td class="currency">€${ukupno.toFixed(2)}</td>\n`;
            
            // Dobavljač
            htmlContent += `<td class="text">${escapeHTML(item.dobavljac || 'N/A')}</td>\n`;
            
            // Izvor
            htmlContent += `<td class="text">${escapeHTML(item.izvor || 'N/A')}</td>\n`;
            
            // Enhanced
            const isEnhanced = item.calculation_source === 'enhanced_results' ? 'Da' : 'Ne';
            htmlContent += `<td class="text">${isEnhanced}</td>\n`;
            
            // Formula cijene
            htmlContent += `<td class="text">${escapeHTML(item.price_formula || 'N/A')}</td>\n`;
            
            // Težina
            htmlContent += `<td class="number">${(item.weight_used || 0).toFixed(3)}</td>\n`;
            
            // VPC/kg
            htmlContent += `<td class="currency">€${(item.price_per_kg || 0).toFixed(2)}</td>\n`;
            
            htmlContent += '</tr>\n';
        });
        
        htmlContent += '</table>\n';
        htmlContent += '</body>\n';
        htmlContent += '</html>\n';
        
        // Create and download HTML file that Excel can open
        const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const filename = `Enhanced_Tablica_Rabata_${timestamp}.xls`;  // .xls extension for Excel compatibility
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        // Show success message (identical to Excel export)
        showMessage('success', 
            `✅ Enhanced Excel tablica rabata exportana!\n` +
            `📁 Datoteka: ${filename}\n` +
            `📊 Stavki: ${tablicaRabata.length}\n` +
            `⚡ Enhanced stavki: ${enhancedCount}\n` +
            `💰 Ukupna vrijednost: €${totalValue.toFixed(2)}\n` +
            `🎯 S direktno unesenim cijenama iz autocomplete\n` +
            `💡 HTML format - otvorit će se direktno u Excelu kao tablica!`, 
            'tablicaRabataStatus'
        );
        
    } catch (error) {
        console.error('❌ Excel export error:', error);
        alert(`Greška pri Excel exportu: ${error.message}`);
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