/**
 * MISSING FUNCTIONS - Enhanced functionality
 * Functions that need to be added to make the enhanced system work
 */

try {

// ===== ENHANCED ARTICLE IDENTIFICATION FUNCTIONS =====

/**
 * NEW: Enhanced function to determine if article is truly "ours"
 * @param {string} source - Article source
 * @param {string} code - Article code (optional)
 * @returns {boolean} True if truly our article
 */
function isTrulyOurArticle(source, code) {
    if (!source) return false;

    // PRIORITET 1: LAGER ili URPD source = automatski naš artikl (bez weightDatabase provjere)
    const lowerSource = source.toLowerCase();
    const isLagerOrUrpd = lowerSource.includes('lager') || lowerSource.includes('urpd');

    if (isLagerOrUrpd) {
        return true; // ✅ LAGER/URPD sheetovi su uvijek naši
    }

    // PRIORITET 2: Direktni Weight Database artikli (ako nisu iz LAGER/URPD)
    const isDirectWeightDbArticle = code &&
                                   typeof window.weightDatabase !== 'undefined' &&
                                   window.weightDatabase.has(code) &&
                                   lowerSource.includes('weight database');

    return isDirectWeightDbArticle;
}

// ===== TABLICA RABATA ENHANCED FUNCTIONS =====

/**
 * Generates tablica rabata from results with user prices - NOVA GLAVNA FUNKCIJA
 */
function generateFromResults() {
    // ALWAYS LOG - bypass try/catch for critical debugging
    
    // Log first few results for inspection
    if (window.results && window.results.length > 0) {
    }
    
    try {
        
        // Safety checks for required global variables
        if (typeof window.results === 'undefined' || !Array.isArray(window.results)) {
            alert('JEBENO: Nema results! Length: ' + (window.results?.length || 'undefined'));
            showMessage('error', 
                '❌ Nema rezultata pretrage!\n\n' +
                'Molimo dodajte artikle kroz pretragu prije generiranja tablice rabata.', 
                'tablicaRabataStatus'
            );
            return;
        }
        
        if (typeof window.troskovnik === 'undefined' || !Array.isArray(window.troskovnik)) {
            alert('JEBENO: Nema troskovnik! Length: ' + (window.troskovnik?.length || 'undefined'));
            showMessage('error', 
                '❌ Troškovnik nije učitan!\n\n' +
                'Molimo učitajte troškovnik prije generiranja tablice rabata.', 
                'tablicaRabataStatus'
            );
            return;
        }
        
        
        // FORCE LOG every result
        results.forEach((r, i) => {
                name: r.name,
                source: r.source, 
                isFromWeightDatabase: r.isFromWeightDatabase,
                hasUserPrice: r.hasUserPrice,
                pricePerPiece: r.pricePerPiece,
                rb: r.rb
            });
        });
        
        // Debug all results by categories (only in debug mode)
        if (typeof Logger !== 'undefined') {
            const resultsBySource = {};
            results.forEach((r, i) => {
                const source = r.source || 'UNKNOWN';
                if (!resultsBySource[source]) resultsBySource[source] = [];
                resultsBySource[source].push(r);
                
                Logger.debug(`🔍 Result ${i}: ${r.name} | Source: ${source} | Code: ${r.code || 'NO CODE'} | Has Price: ${r.hasUserPrice || false} | Weight DB: ${r.isFromWeightDatabase || false}`);
            });
            
            Logger.debug('📈 Results breakdown by source:');
            Object.entries(resultsBySource).forEach(([source, items]) => {
                Logger.debug(`  • ${source}: ${items.length} artikli`);
            });
        }
    
    // Check if we have results with user prices (ENHANCED: Use izlazna_cijena for Weight database)
    
    const resultsWithPrices = results.filter(r => {
        
        // SPECIAL DEBUG FOR WEIGHT DATABASE ITEMS
        if (r.isFromWeightDatabase === true) {
                name: r.name,
                code: r.code,
                sifra: r.sifra,
                source: r.source,
                rb: r.rb,
                hasUserPrice: r.hasUserPrice,
                pricePerPiece: r.pricePerPiece,
                pricePerKg: r.pricePerKg,
                isFromWeightDatabase: r.isFromWeightDatabase,
                weight: r.weight,
                calculatedWeight: r.calculatedWeight
            });
            
            const troskovnikItem = getTroskovnikItemForRB(r.rb);
            
            // Check BOTH possible price sources:
            const hasTroskovnikPrice = troskovnikItem && troskovnikItem.izlazna_cijena > 0;
            const hasDirectPrice = r.hasUserPrice && r.pricePerPiece > 0;
            const hasValidPrice = hasTroskovnikPrice || hasDirectPrice;
            
            console.log(`  - Troskovnik price: ${hasTroskovnikPrice} (value: ${troskovnikItem?.izlazna_cijena || 0})`);
            console.log(`  - Direct price: ${hasDirectPrice} (value: ${r.pricePerPiece || 0})`);
            console.log(`  - Has valid price: ${hasValidPrice}`);
                hasTroskovnikPrice,
                hasDirectPrice, 
                hasValidPrice,
                troskovnikPrice: troskovnikItem?.izlazna_cijena || 0,
                directPrice: r.pricePerPiece || 0,
                reason: hasValidPrice ? (hasTroskovnikPrice ? 'troškovnik price' : 'direct autocomplete price') : 'no price'
            });
            
            if (hasValidPrice) {
            } else {
            }
            
            return hasValidPrice;
        }
        // For all other articles, use existing logic
        const isValid = r.hasUserPrice && r.pricePerPiece > 0;
        return isValid;
    });
    
    
    // Debug breakdown by type
    const weightDbItems = resultsWithPrices.filter(r => r.isFromWeightDatabase === true);
    const regularItems = resultsWithPrices.filter(r => r.isFromWeightDatabase !== true);
    console.log('  - Weight DB items:', weightDbItems.length, weightDbItems.map(r => r.name));
    console.log('  - Regular items:', regularItems.length, regularItems.map(r => r.name));
    
    
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
    
    
    // ENHANCED LOGIC: Include ALL articles with internal codes (URPD, LAGER, prošlogodišnje cijene, weight database)
    const validArticlesForTablica = resultsWithPrices.filter(item => {
            name: item.name,
            code: item.code,
            sifra: item.sifra,
            source: item.source,
            isFromWeightDatabase: item.isFromWeightDatabase,
            hasUserPrice: item.hasUserPrice,
            pricePerPiece: item.pricePerPiece,
            rb: item.rb
        });
        
        // Skip manual entries - they don't have real article codes needed for robni program
        if (item.isManualEntry) {
            return false;
        }
        
        let includeReason = '';
        
        // PRIORITY 1: Traditional "naši artikli" (LAGER/URPD articles that exist in weight database)
        if (isTrulyOurArticle(item.source, item.code)) {
            includeReason = `Traditional LAGER/URPD article with weight database entry`;
            return true;
        }
        
        // PRIORITY 2: HISTORICAL_LAGER articles (prošlogodišnji + weight database)
        if (item.source === 'HISTORICAL_LAGER') {
            includeReason = `HISTORICAL_LAGER article (from prošlogodišnje cijene + weight database)`;
            return true;
        }
        
        // PRIORITY 3: Direct Weight Database articles (marked with isFromWeightDatabase flag)
        if (item.isFromWeightDatabase === true) {
                code: item.code,
                sifra: item.sifra,
                source: item.source,
                hasCode: !!(item.code || item.sifra),
                codeValue: item.code || item.sifra || 'NO CODE'
            });
            
            includeReason = `Direct Weight Database article`;
            return true;
        }
        
        // PRIORITY 4: Articles with internal codes from prošlogodišnje cijene
        if (item.code && typeof window.getProslogodisnjaCijena === 'function') {
            const historicalPrice = window.getProslogodisnjaCijena(item.code);
            if (historicalPrice && historicalPrice > 0) {
                includeReason = `Article from prošlogodišnje cijene database (€${historicalPrice})`;
                return true;
            }
        }
        
        // PRIORITY 5: Articles with codes extracted from brackets that exist in weight database
        if (item.name && typeof window.extractCodeFromBrackets === 'function') {
            const codeFromBrackets = window.extractCodeFromBrackets(item.name);
            if (codeFromBrackets && typeof window.weightDatabase !== 'undefined' && 
                window.weightDatabase.has(codeFromBrackets)) {
                includeReason = `Article with bracket code from weight database (${codeFromBrackets})`;
                return true;
            }
        }
        
        // PRIORITY 6: LAGER/URPD articles with internal codes (even without weight database)
        if (item.code && item.source) {
            const lowerSource = item.source.toLowerCase();
            if (lowerSource.includes('lager') || lowerSource.includes('urpd')) {
                // Dodatna provjera da nije već uključen kroz isTrulyOurArticle
                const hasWeightDbEntry = typeof window.weightDatabase !== 'undefined' && window.weightDatabase.has(item.code);
                includeReason = hasWeightDbEntry ? 
                    `LAGER/URPD article with weight database entry (${item.code})` :
                    `LAGER/URPD article with internal code (no weight DB entry - ${item.code})`;
                return true;
            }
        }
        
        // PRIORITY 7: External articles with custom PDV that have internal codes
        if (item.code && item.customPdvStopa && !isTrulyOurArticle(item.source, item.code)) {
            includeReason = `External article with custom PDV and internal code (${item.customPdvStopa}%)`;
            if (typeof Logger !== 'undefined') {
                Logger.debug(`✅ INCLUDING: ${item.name} -> ${item.code} (${includeReason})`);
            }
            return true;
        }
        
        // PRIORITY 8: Articles whose code exists directly in weight database HTML table
        // Check both .code and .sifra properties
        const itemCode = item.code || item.sifra || item.Code || item.Sifra;
        
        
        if (itemCode && typeof document !== 'undefined') {
            const weightsTableBody = document.getElementById('weightsTableBody');
            if (weightsTableBody) {
                const tableRows = weightsTableBody.querySelectorAll('tr');
                
                for (const row of tableRows) {
                    const cells = row.cells;
                    if (cells && cells.length > 0) {
                        const cellCode = cells[0].textContent.trim();
                        if (cellCode === itemCode || 
                            cellCode === String(itemCode) || 
                            String(cellCode) === String(itemCode) ||
                            parseInt(cellCode) === parseInt(itemCode)) {
                            includeReason = `Article found in weight database HTML table (${itemCode})`;
                            return true;
                        }
                    }
                }
            } else {
            }
        } else {
        }
        
        // Log excluded articles for debugging
        return false;
    });
    
    
    // Debug breakdown by type for tablica
    const validWeightDbItems = validArticlesForTablica.filter(r => r.isFromWeightDatabase === true);
    const validRegularItems = validArticlesForTablica.filter(r => r.isFromWeightDatabase !== true);
    console.log('  - Valid Weight DB items:', validWeightDbItems.length, validWeightDbItems.map(r => r.name));
    console.log('  - Valid Regular items:', validRegularItems.length, validRegularItems.map(r => r.name));
    
    
    if (validArticlesForTablica.length === 0) {
        showMessage('error', 
            '❌ Nema artikala s internim šiframa za tablicu rabata!\n\n' +
            '🎯 TABLICA RABATA UKLJUČUJE SVE ARTIKLE S INTERNIM ŠIFRAMA:\n' +
            '• 🏠 LAGER/URPD artikle (tradicionalni naši artikli)\n' +
            '• 🏛️ HISTORICAL_LAGER artikle (prošlogodišnji + weight database)\n' +
            '• ⚖️ Direktne artikle iz Weight Database\n' +
            '• 📅 Artikle iz prošlogodišnjih cijena\n' +
            '• 📋 Artikle s šifrom u zagradama "19. (1445)"\n' +
            '• 🔧 Vanjske artikle s custom PDV i internim šiframa\n\n' +
            '⚠️ UVJET: Artikli moraju imati unesene cijene!\n' +
            '⚠️ NAPOMENA: Ručno unesene stavke se ne exportiraju (nemaju prave šifre)\n\n' +
            '💡 RJEŠENJE:\n' +
            '1. Dodajte artikle iz URPD, LAGER, prošlogodišnjih cijena ili weight database\n' +
            '2. Unesite cijene direktno u autocomplete\n' +
            '3. Pokušajte ponovo generirati tablicu', 
            'tablicaRabataStatus'
        );
        return;
    }
    
    // Group by code and take cheapest - ENHANCED for all valid articles
    const groupedByCode = {};
    
    validArticlesForTablica.forEach(item => {
        // ENHANCED: Better code extraction for different article types
        let code = item.code ? item.code.trim() : '';
        
        // For articles with brackets, extract code from brackets if original code is missing
        if (!code && item.name && typeof window.extractCodeFromBrackets === 'function') {
            code = window.extractCodeFromBrackets(item.name);
        }
        
        // For manual entries, use the manual code
        if (!code && item.isManualEntry && item.id) {
            code = item.id.replace('manual-', '').split('-')[0]; // Extract from ID
        }
        
        if (!code) {
            return;
        }
        
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
        uniqueItems.push(cheapest);
    });
    
    // console.log('🎯 Unique items selected:', uniqueItems.length);
    
    // Clear existing tablica rabata
    if (typeof tablicaRabata !== 'undefined') {
        tablicaRabata.length = 0;
    } else {
        window.tablicaRabata = [];
    }
    
    // Generate entries
    uniqueItems.forEach((item, index) => {
        // Get troškovnik item for this RB
        const troskovnikItem = getTroskovnikItemForRB(item.rb);
        
        // ENHANCED LOGIKA: Za Weight database artikle koristi najbolju dostupnu cijenu
        const isWeightDatabaseItem = item.isFromWeightDatabase === true;
        
        // Determine price source priority for weight database items
        let finalPrice, priceSource;
        if (isWeightDatabaseItem) {
            const hasTroskovnikPrice = troskovnikItem && troskovnikItem.izlazna_cijena > 0;
            const hasDirectPrice = item.hasUserPrice && item.pricePerPiece > 0;
            
            if (hasTroskovnikPrice) {
                finalPrice = troskovnikItem.izlazna_cijena;
                priceSource = 'Weight database (izlazna cijena iz troškovnika)';
            } else if (hasDirectPrice) {
                finalPrice = item.pricePerPiece;
                priceSource = 'Weight database (direktno unesena cijena)';
            } else {
                finalPrice = 0;
                priceSource = 'Weight database (nema cijena)';
            }
        } else {
            // For non-weight database items, use original logic
            const shouldUseOutputPrice = troskovnikItem && (troskovnikItem.tezina === 0 || troskovnikItem.tezina <= 0);
            finalPrice = shouldUseOutputPrice ? troskovnikItem.izlazna_cijena : item.pricePerPiece;
            priceSource = shouldUseOutputPrice ? 'troškovnik (bez preračuna)' : 'rezultati pretrage';
        }
        
        // ENHANCED: Better code handling for all article types
        let finalCode = item.code ? item.code.trim() : '';
        
        // Extract code from brackets if needed
        if (!finalCode && item.name && typeof window.extractCodeFromBrackets === 'function') {
            finalCode = window.extractCodeFromBrackets(item.name);
        }
        
        // For manual entries, use RB as fallback code
        if (!finalCode && item.isManualEntry) {
            finalCode = 'MANUAL-' + item.rb;
        }
        
        // ENHANCED: Determine article type and source for better tracking
        let articleType = 'standard';
        let enhancedSource = item.source || 'unknown';
        
        // Priority-based type detection (most specific first)
        if (item.source === 'HISTORICAL_LAGER') {
            articleType = 'historical_lager';
            enhancedSource = 'HISTORICAL_LAGER';
        } else if (item.isFromWeightDatabase === true) {
            articleType = 'weight_database';
            enhancedSource = 'WEIGHT DATABASE';
        } else if (item.name && typeof window.extractCodeFromBrackets === 'function' && 
                   window.extractCodeFromBrackets(item.name) && 
                   typeof window.weightDatabase !== 'undefined' && 
                   window.weightDatabase.has(window.extractCodeFromBrackets(item.name))) {
            articleType = 'bracket_code';
            enhancedSource = 'BAZA TEŽINA (zagrade)';
        } else if (isTrulyOurArticle(item.source, item.code)) {
            articleType = 'our_article';
            enhancedSource = item.source;
        } else if (typeof window.getProslogodisnjaCijena === 'function' && 
                   window.getProslogodisnjaCijena(finalCode)) {
            articleType = 'historical';
            enhancedSource = 'PROŠLOGODIŠNJE CIJENE';
        } else if (item.customPdvStopa) {
            articleType = 'external_pdv';
            enhancedSource = item.source + ' (custom PDV)';
        }

        const rabataEntry = {
            id: index + 1,
            sifra_artikla: finalCode,
            naziv_artikla: item.name,
            jedinica_mjere: item.unit,
            cijena: finalPrice, // Koristi originalnu cijenu iz troškovnika ako je težina = 0
            redni_broj_grupe: item.rb,
            naziv_stavke_troskovnik: troskovnikItem ? troskovnikItem.naziv_artikla : `Stavka ${item.rb}`,
            jedinica_mjere_troskovnik: troskovnikItem ? troskovnikItem.mjerna_jedinica : item.unit,
            kolicina_troskovnik: troskovnikItem ? troskovnikItem.trazena_kolicina : 1,
            
            // Enhanced specific fields
            dobavljac: item.supplier || 'N/A',
            izvor: enhancedSource,
            calculation_source: 'enhanced_results',
            article_type: articleType, // NEW: Track article type
            price_formula: priceSource.includes('troškovnik') ? 
                `Iz troškovnika: €${finalPrice.toFixed(2)} (${priceSource})` :
                `Direktno uneseno: €${finalPrice.toFixed(2)} (${priceSource})`,
            weight_used: item.calculatedWeight || item.weight || 0,
            price_per_kg: (finalPrice > 0 && (item.calculatedWeight || item.weight || 0) > 0) ? 
                (finalPrice / (item.calculatedWeight || item.weight)) : 0
        };
        
        tablicaRabata.push(rabataEntry);
    });
    
    
    // Debug breakdown of final tablica
    const finalWeightDbItems = tablicaRabata.filter(item => item.article_type === 'weight_database');
    const finalOtherItems = tablicaRabata.filter(item => item.article_type !== 'weight_database');
    console.log('  - Weight DB entries:', finalWeightDbItems.length, finalWeightDbItems.map(r => r.naziv_artikla));
    console.log('  - Other entries:', finalOtherItems.length, finalOtherItems.map(r => r.naziv_artikla));
    
    // Sort by RB then by šifra
    tablicaRabata.sort((a, b) => {
        if (a.redni_broj_grupe !== b.redni_broj_grupe) {
            return a.redni_broj_grupe - b.redni_broj_grupe;
        }
        return a.sifra_artikla.localeCompare(b.sifra_artikla);
    });
    
    // Update display
    updateTablicaRabataDisplay();
    
    // Show enhanced success message with breakdown by article type
    const totalValue = tablicaRabata.reduce((sum, item) => sum + (item.cijena * item.kolicina_troskovnik), 0);
    
    // Count articles by type (excluding manual entries)
    const typeBreakdown = {
        our_article: tablicaRabata.filter(item => item.article_type === 'our_article').length,
        historical_lager: tablicaRabata.filter(item => item.article_type === 'historical_lager').length,
        weight_database: tablicaRabata.filter(item => item.article_type === 'weight_database').length,
        bracket_code: tablicaRabata.filter(item => item.article_type === 'bracket_code').length,
        historical: tablicaRabata.filter(item => item.article_type === 'historical').length,
        external_pdv: tablicaRabata.filter(item => item.article_type === 'external_pdv').length
    };
    
    let breakdownText = '';
    if (typeBreakdown.our_article > 0) breakdownText += `🏠 Tradicionalni LAGER/URPD: ${typeBreakdown.our_article}\n`;
    if (typeBreakdown.historical_lager > 0) breakdownText += `🏛️ HISTORICAL_LAGER (prošlogodišnji + weight DB): ${typeBreakdown.historical_lager}\n`;
    if (typeBreakdown.weight_database > 0) breakdownText += `⚖️ Direktno iz Weight Database: ${typeBreakdown.weight_database}\n`;
    if (typeBreakdown.historical > 0) breakdownText += `📅 Iz prošlogodišnjih cijena: ${typeBreakdown.historical}\n`;
    if (typeBreakdown.bracket_code > 0) breakdownText += `📋 Šifre iz zagrada: ${typeBreakdown.bracket_code}\n`;
    if (typeBreakdown.external_pdv > 0) breakdownText += `🔧 Vanjski s PDV: ${typeBreakdown.external_pdv}\n`;
    
    showMessage('success', 
        `✅ ENHANCED Tablica rabata generirana s SVIM artiklima s internim šiframa!\n\n` +
        `📊 Ukupno stavki: ${tablicaRabata.length}\n` +
        `💰 Ukupna vrijednost: €${totalValue.toFixed(2)}\n\n` +
        `🎯 UKLJUČENI TIPOVI ARTIKALA S INTERNIM ŠIFRAMA:\n${breakdownText}\n` +
        `✅ Sada uključuje sve artikle iz:\n` +
        `   • URPD i LAGER (tradicionalni)\n` +
        `   • Prošlogodišnje cijene\n` +
        `   • Weight Database (s cijenama iz troškovnika ILI direktno unesenim)\n` +
        `   • HISTORICAL_LAGER kombinacije\n` +
        `   • Artikle s formatom "19. (šifra)" + direktno unesene cijene\n\n` +
        `⚠️ Ručno unesene stavke se ne exportiraju (nemaju prave šifre)\n` +
        `⚡ Enhanced workflow s poboljšanom logikom completed!`, 
        'tablicaRabataStatus'
    );
    
    // Switch to tablica rabata tab
    showTab('tablicaRabata');
    
    if (typeof Logger !== 'undefined') {
        Logger.debug('✅ Enhanced tablica rabata generation completed:', tablicaRabata.length, 'entries');
    }
    
    } catch (error) {
        if (typeof Logger !== 'undefined') {
            Logger.error('❌ Greška u generateFromResults:', error);
        } else {
            console.error('❌ Greška u generateFromResults:', error);
        }
        
        showMessage('error', 
            `❌ Greška pri generiranju tablice rabata!\n\n` +
            `Razlog: ${error.message || 'Nepoznata greška'}\n\n` +
            `💡 Pokušajte:\n` +
            `1. Provjerite da li imate artikle s cijenama u rezultatima\n` +
            `2. Provjerite da li je troškovnik učitan\n` +
            `3. Osvježite stranicu i pokušajte ponovo`, 
            'tablicaRabataStatus'
        );
    }
}

/**
 * Enhanced tablica rabata display update
 */
function updateTablicaRabataDisplay() {
    const container = document.getElementById('tablicaRabataContainer');
    const exportCSVBtn = document.getElementById('exportTablicaRabataCSVBtn');
    const exportExcelBtn = document.getElementById('exportTablicaRabataExcelBtn');
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
                    <strong>🎯 ENHANCED - Svi artikli s internim šiframa:</strong><br>
                    • 🏠 LAGER/URPD artikli (traditionalni naši artikli)<br>
                    • 🏛️ HISTORICAL_LAGER artikli (prošlogodišnji + weight database)<br>
                    • ⚖️ Direktni artikli iz Weight Database<br>
                    • 📅 Artikli iz prošlogodišnjih cijena<br>
                    • 📋 Artikli s šiframa u zagradama<br>
                    • 🔧 Vanjski artikli s custom PDV i internim šiframa<br><br>
                    <strong>💡 Kako koristiti:</strong><br>
                    • Dodajte artikle iz bilo kojeg izvora<br>
                    • Unesite cijene direktno u autocomplete<br>
                    • Kliknite "Generiraj iz rezultata"<br>
                    • ⚡ Workflow skraćen na 1 korak!
                </div>
            </div>
        `;
        if (exportCSVBtn) exportCSVBtn.style.display = 'none';
        if (exportExcelBtn) exportExcelBtn.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }
    
    if (exportCSVBtn) exportCSVBtn.style.display = 'block';
    if (exportExcelBtn) exportExcelBtn.style.display = 'block';
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
                    <strong>Enhanced Tablica rabata:</strong> ${tablicaRabata.length} stavki • 
                    <strong>Šifre:</strong> ${uniqueCodes} • 
                    <strong>Grupe:</strong> ${groups} • 
                    <strong>Enhanced:</strong> ${enhancedItems}
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 14px; color: #6b7280;">Ukupna vrijednost</div>
                    <div style="font-weight: bold; color: #059669; font-size: 18px;">€${totalValue.toFixed(2)}</div>
                    <div style="font-size: 10px; color: #7c3aed; margin-top: 2px;">⚡ Direktno iz autocomplete</div>
                </div>
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
                📊 Generirano iz enhanced rezultata s direktno unesenim cijenama
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
                        <th style="width: 80px;">RB Grupe</th>
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
        
        // Enhanced color coding
        const groupColor = getGroupColor(item.redni_broj_grupe);
        const isEnhanced = item.calculation_source === 'enhanced_results';
        const enhancedStyle = isEnhanced ? 'border-left: 3px solid #7c3aed;' : '';
        
        html += `
            <tr style="${rowStyle} ${enhancedStyle}">
                <td>
                    <strong style="color: #7c3aed;">${item.sifra_artikla}</strong>
                    ${isEnhanced ? '<div style="font-size: 8px; color: #7c3aed; font-weight: bold;">⚡ ENHANCED</div>' : ''}
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
                        style="width: 100px; padding: 4px; border: 1px solid ${isEnhanced ? '#7c3aed' : '#d1d5db'}; border-radius: 4px; font-size: 12px; font-weight: bold; ${isEnhanced ? 'background: #f3f4f6; color: #7c3aed;' : ''}"
                        title="Editabilna cijena za tablicu ${isEnhanced ? '(Enhanced)' : ''}"
                    >
                    ${isEnhanced ? '<div style="font-size: 8px; color: #7c3aed;">Direktno uneseno</div>' : ''}
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
    
}

/**
 * Gets color for group based on redni broj
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

// ===== ENHANCED SEARCH HELPER FUNCTIONS =====

/**
 * Adds new missing function - getTroskovnikNameForRB if not exists
 */
if (typeof getTroskovnikNameForRB === 'undefined') {
    function getTroskovnikNameForRB(rb) {
        if (!troskovnik || troskovnik.length === 0) {
            return `Stavka ${rb}`;
        }
        
        const troskovnikItem = troskovnik.find(t => t.redni_broj == rb);
        if (troskovnikItem) {
            const details = [];
            details.push(troskovnikItem.naziv_artikla);
            
            if (troskovnikItem.tezina > 0) {
                details.push(`${troskovnikItem.tezina.toFixed(2)}kg`);
            }
            
            if (troskovnikItem.mjerna_jedinica && troskovnikItem.trazena_kolicina) {
                details.push(`${troskovnikItem.trazena_kolicina} ${troskovnikItem.mjerna_jedinica}`);
            }
            
            return `${rb}. ${details.join(', ')}`;
        }
        
        return `Stavka ${rb}`;
    }
    
    window.getTroskovnikNameForRB = getTroskovnikNameForRB;
}

/**
 * Enhanced addNewTroskovnikItem if missing
 */
if (typeof addNewTroskovnikItem === 'undefined') {
    function addNewTroskovnikItem() {
        if (!troskovnik) {
            window.troskovnik = [];
        }
        
        const newRB = Math.max(...troskovnik.map(t => t.redni_broj), 0) + 1;
        const newId = Math.max(...troskovnik.map(t => t.id), 0) + 1;
        
        const newItem = {
            id: newId,
            redni_broj: newRB,
            custom_search: '',
            naziv_artikla: 'Nova stavka',
            mjerna_jedinica: 'kom',
            tezina: 0.000,
            trazena_kolicina: 1,
            izlazna_cijena: 0.00,
            marza: 0,
            nabavna_cijena_1: 0.00,
            nabavna_cijena_2: 0.00,
            najniza_cijena: 0.00,
            dobavljac_1: '',
            dobavljac_2: '',
            found_results: 0,
            komentar: '',
            datum: new Date().toISOString().split('T')[0]
        };
        
        troskovnik.push(newItem);
        
        if (typeof updateTroskovnikDisplay === 'function') {
            updateTroskovnikDisplay();
        }
        
        showMessage('success', `Dodana nova stavka ${newRB}. Molimo uredite podatke.`, 'troskovnikStatus');
    }
    
    window.addNewTroskovnikItem = addNewTroskovnikItem;
}

/**
 * Enhanced clearAllTroskovnik if missing
 */
if (typeof clearAllTroskovnik === 'undefined') {
    function clearAllTroskovnik() {
        if (!troskovnik || troskovnik.length === 0) {
            showMessage('info', 'Troškovnik je već prazan.', 'troskovnikStatus');
            return;
        }
        
        if (confirm(`Obrisati cijeli troškovnik s ${troskovnik.length} stavki?\n\nOva akcija se ne može poništiti!`)) {
            const count = troskovnik.length;
            troskovnik.length = 0;
            
            if (typeof updateTroskovnikDisplay === 'function') {
                updateTroskovnikDisplay();
            }
            
            showMessage('success', `Obrisan cijeli troškovnik (${count} stavki).`, 'troskovnikStatus');
        }
    }
    
    window.clearAllTroskovnik = clearAllTroskovnik;
}

// ===== GLOBAL VARIABLE INITIALIZATION =====

// Ensure tablicaRabata exists
if (typeof window.tablicaRabata === 'undefined') {
    window.tablicaRabata = [];
}
let tablicaRabata = window.tablicaRabata;

// Ensure other global variables exist
if (typeof window.troskovnik === 'undefined') {
    window.troskovnik = [];
}
let troskovnik = window.troskovnik;

if (typeof window.results === 'undefined') {
    window.results = [];
}
let results = window.results;

if (typeof window.selectedResults === 'undefined') {
    window.selectedResults = new Set();
}
let selectedResults = window.selectedResults;

// ===== EXPOSE ALL ENHANCED FUNCTIONS GLOBALLY =====

// Tablica Rabata Enhanced Functions
window.generateFromResults = generateFromResults;

// Test function to verify this file is loaded
window.testEnhancedFunctionsLoaded = function() {
    return true;
};
window.updateTablicaRabataDisplay = updateTablicaRabataDisplay;
window.updateTablicaRabataItem = updateTablicaRabataItem;
window.removeTablicaRabataItem = removeTablicaRabataItem;
window.exportTablicaRabataCSV = exportTablicaRabataCSV;
window.exportTablicaRabataExcel = exportTablicaRabataExcel;
window.clearTablicaRabata = clearTablicaRabata;
window.getGroupColor = getGroupColor;

// Enhanced keyboard handlers
if (typeof window.handlePriceKeydown === 'undefined') {
    async function handlePriceKeydown(event, articleId, targetRB, isOurArticle) {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation(); // FIXED: Prevent event bubbling

            const priceInput = event.target;
            const hasPrice = priceInput.value && priceInput.value.trim() !== '';

            console.log(`🔑 FALLBACK Enter pressed in price input: articleId=${articleId}, targetRB=${targetRB}, hasPrice=${hasPrice}`);

            // Visual feedback
            priceInput.style.boxShadow = '0 0 10px #10b981';
            setTimeout(() => {
                priceInput.style.boxShadow = '';
            }, 300);

            if (hasPrice) {
                await addWithPriceFromAutocomplete(articleId, targetRB, isOurArticle);
                // Close autocomplete after successful addition
                if (typeof forceCloseAutocomplete === 'function') {
                    setTimeout(() => {
                        forceCloseAutocomplete();
                    }, 100);
                }
            } else {
                if (typeof addWithoutPriceFromAutocomplete === 'function') {
                    addWithoutPriceFromAutocomplete(articleId, targetRB);
                }
            }
        }
    }

    window.handlePriceKeydown = handlePriceKeydown;
}

if (typeof window.handleWeightKeydownAutocomplete === 'undefined') {
    function handleWeightKeydownAutocomplete(event, articleId, targetRB) {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation(); // FIXED: Prevent event bubbling

            console.log(`🔑 FALLBACK Enter pressed in weight input: articleId=${articleId}, targetRB=${targetRB}`);

            // Focus on price input
            const priceInput = document.getElementById(`price-${articleId}-${targetRB}`);
            if (priceInput) {
                priceInput.focus();
                priceInput.select();
            }
        }
    }

    window.handleWeightKeydownAutocomplete = handleWeightKeydownAutocomplete;
}

// Enhanced article stats update
if (typeof window.updateArticleStats === 'undefined') {
    function updateArticleStats() {
        try {
            const elements = {
                'articlesCount': articles ? articles.length : 0,
                'lagerCount': articles ? articles.filter(a => a.source && a.source.toLowerCase().includes('lager')).length : 0,
                'urpdCount': articles ? articles.filter(a => a.source && a.source.toLowerCase().includes('urpd')).length : 0,
                'cjeniciCount': articles ? articles.filter(a => a.source && !a.source.toLowerCase().includes('lager') && !a.source.toLowerCase().includes('urpd')).length : 0,
                'resultsCount': results ? results.length : 0,
                'resultsCountText': results ? results.length : 0,
                'troskovnikCount': troskovnik ? troskovnik.length : 0,
                'troskovnikCountText': troskovnik ? troskovnik.length : 0,
                'tablicaRabataCount': tablicaRabata ? tablicaRabata.length : 0,
                'weightsCount': typeof weightDatabase !== 'undefined' ? weightDatabase.size : 0,
                'weightsDbCount': typeof weightDatabase !== 'undefined' ? weightDatabase.size : 0
            };
            
            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
        } catch (error) {
            console.warn('⚠️ Stats update error:', error.message);
        }
    }
    
    window.updateArticleStats = updateArticleStats;
}

// Show enhanced keyboard shortcuts
if (typeof window.showEnhancedKeyboardShortcutsHelp === 'undefined') {
    function showEnhancedKeyboardShortcutsHelp() {
        const helpText = 
            '⌨️ ENHANCED KRATICE s direktnim upravljanjem cijenama:\n\n' +
            '🔍 PRETRAGA (STICKY SEARCH BAR):\n' +
            '• Ctrl+/ - Fokus na glavnu tražilicu (uvijek dostupna!)\n' +
            '• Enter u autocomplete - Dodaj s cijenom\n' +
            '• Tab u autocomplete - Prebaci između polja (po cjeniku artikli)\n' +
            '• Escape - Očisti pretragu / zatvori autocomplete\n' +
            '• Ctrl+Shift+R - Vrati sve uklonjene autocomplete artikle\n\n' +
            '💾 SPREMANJE/UČITAVANJE:\n' +
            '• Ctrl+S - Brzo spremi stanje\n' +
            '• Ctrl+Shift+S - Save As s timestampom\n' +
            '• Ctrl+O - Učitaj stanje iz datoteke\n\n' +
            '🆕 ENHANCED FUNKCIONALNOSTI:\n' +
            '• Ctrl+R - Refresh troškovnik colors\n' +
            '• Ctrl+G - Generiraj tablicu rabata iz rezultata\n' +
            '• Ctrl+E - Export trenutnog tab-a\n\n' +
            '🎯 DIREKTNO UPRAVLJANJE CIJENAMA:\n' +
            '• 🏠 Za LAGER/URPD artikle: Samo cijena (zeleni okvir)\n' +
            '• 📋 Za po cjeniku artikle: Cijena + težina (ljubičasti okvir)\n' +
            '• ✅ Button ili Enter za dodavanje\n' +
            '• ✅ Zeleni checkmark za dodavanje bez cijene\n' +
            '• Automatski sync s troškovnikom\n\n' +
            '🎨 COLOR CODING:\n' +
            '• Troškovnik se boji prema broju rezultata\n' +
            '• Žuto = malo rezultata, Zeleno = dobro, Ljubičasto = puno\n\n' +
            '📊 TABLICA RABATA:\n' +
            '• Generira se direktno iz rezultata s vašim cijenama\n' +
            '• Samo LAGER/URPD stavke s unesenim cijenama\n' +
            '• ⚡ Workflow skraćen s 4 koraka na 1 korak!\n\n' +
            '🎯 DRAG & DROP:\n' +
            '• Povucite JSON datoteku bilo gdje za učitavanje stanja\n' +
            '• Povucite Excel/CSV datoteke u upload područja';
        
        alert(helpText);
    }
    
    window.showEnhancedKeyboardShortcutsHelp = showEnhancedKeyboardShortcutsHelp;
}

// Ensure autocomplete variables exist
if (typeof window.autocompleteResults === 'undefined') {
    window.autocompleteResults = [];
}
let autocompleteResults = window.autocompleteResults;

// console.log('🎯 Main functions available:');
// console.log('  - generateFromResults() - Generate tablica from enhanced results');
// console.log('  - addWithPriceFromAutocomplete() - Direct price input workflow');
// console.log('  - addWithoutPriceFromAutocomplete() - NEW: Add without price option');
// console.log('  - updateTablicaRabataDisplay() - Enhanced display with enhanced marking');
// console.log('  - Enhanced keyboard shortcuts and validation');
// console.log('🎨 FIXED: All red colors changed to purple (#7c3aed)');
// console.log('📐 FIXED: Price and weight inputs are now side by side');
// console.log('📋 FIXED: "Tuđi" changed to "Po cjeniku"');
// console.log('🔧 FIXED: Autocomplete no longer closes when editing input fields');
// console.log('⚡ Workflow skraćen s 4 koraka na 1 korak - READY!');

// ===== HELPER FUNCTIONS FOR CUSTOM ARTICLES =====

/**
 * Helper function to check if article is custom
 */
function isCustomArticle(article) {
    return article && article.isCustomArticle === true;
}

/**
 * Helper function to get custom PDV stopa from article
 */
function getCustomPdvStopa(article) {
    if (isCustomArticle(article) && article.customPdvStopa) {
        return article.customPdvStopa;
    }
    return null;
}

/**
 * Helper function to identify first choice custom article in results
 */
function getFirstChoiceCustomArticle(rb) {
    if (typeof window.results === 'undefined' || !window.results) return null;
    
    const groupResults = results.filter(r => r.rb === rb);
    if (groupResults.length === 0) return null;
    
    // Sort by price and find first custom article
    const sorted = groupResults.sort((a, b) => {
        const priceA = a.hasUserPrice ? a.pricePerPiece : a.price;
        const priceB = b.hasUserPrice ? b.pricePerPiece : b.price;
        return priceA - priceB;
    });
    
    return sorted.find(r => isCustomArticle(r)) || null;
}

/**
 * Helper function to get badge class for custom articles
 */
function getBadgeClassForCustom(article) {
    if (isCustomArticle(article)) {
        return 'badge-custom';
    }
    return getBadgeClass(article.source);
}

/**
 * Helper function to format custom article name for display
 */
function formatCustomArticleName(article) {
    if (isCustomArticle(article)) {
        return `${article.name} (Po cjeniku)`;
    }
    return article.name;
}

/**
 * Helper function to count custom articles in results
 */
function countCustomArticles() {
    if (typeof window.results === 'undefined' || !window.results) return 0;
    return results.filter(r => isCustomArticle(r)).length;
}

// Export helper functions
window.isCustomArticle = isCustomArticle;
window.getCustomPdvStopa = getCustomPdvStopa;
window.getFirstChoiceCustomArticle = getFirstChoiceCustomArticle;
window.getBadgeClassForCustom = getBadgeClassForCustom;
window.formatCustomArticleName = formatCustomArticleName;
window.countCustomArticles = countCustomArticles;

// JEBENA TEST FUNKCIJA - pozovite iz konzole
window.testJebeniResults = function() {
    console.log('window.results:', window.results);
    console.log('results length:', window.results?.length);
    console.log('window.troskovnik:', window.troskovnik?.length);
    console.log('generateFromResults function exists:', typeof window.generateFromResults);
    
    if (window.results && window.results.length > 0) {
        
        // Test weight database results
        const weightDbResults = window.results.filter(r => r.isFromWeightDatabase === true);
        weightDbResults.forEach((r, i) => {
            console.log(`  WDB ${i}:`, {
                name: r.name,
                source: r.source,
                isFromWeightDatabase: r.isFromWeightDatabase,
                hasUserPrice: r.hasUserPrice,
                pricePerPiece: r.pricePerPiece
            });
        });
    }
    
    return 'Test completed - check logs above';
};


} catch (error) {
    console.error('🚨🚨🚨 GREŠKA U ENHANCED-FUNCTIONS.JS:', error);
    console.error('🚨🚨🚨 Stack trace:', error.stack);
}