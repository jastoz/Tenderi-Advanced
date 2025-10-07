/**
 * ENHANCED RESULTS MODULE - FIXED COLORS (RED TO PURPLE)
 * Handles results display with direct price input for LAGER/URPD articles
 */

/**
 * Checks if article is "our article" (LAGER or URPD source)
 * OLD LOGIC: Only checks source
 * @param {string} source - Article source
 * @returns {boolean} True if our article
 */
function isOurArticle(source) {
    if (!source) return false;
    const lowerSource = source.toLowerCase();
    return lowerSource.includes('lager') || lowerSource.includes('urpd');
}

/**
 * NEW: Enhanced function to determine if article is truly "ours"
 * @param {string} source - Article source
 * @param {string} code - Article code (optional)
 * @returns {boolean} True if truly our article
 */
function isTrulyOurArticle(source, code) {
    if (!source) {
        console.log('❌ isTrulyOurArticle: NO SOURCE for code:', code);
        return false;
    }

    // PRIORITET 1: LAGER ili URPD source = automatski naš artikl (bez weightDatabase provjere)
    const lowerSource = source.toLowerCase();
    const isLagerOrUrpd = lowerSource.includes('lager') || lowerSource.includes('urpd');

    if (isLagerOrUrpd) {
        console.log('✅ isTrulyOurArticle: TRUE for', code, '| LAGER/URPD source');
        return true; // ✅ LAGER/URPD sheetovi su uvijek naši
    }

    // PRIORITET 2: Direktni Weight Database artikli (ako nisu iz LAGER/URPD)
    const isDirectWeightDbArticle = code &&
                                   typeof window.weightDatabase !== 'undefined' &&
                                   window.weightDatabase.has(code) &&
                                   lowerSource.includes('weight database');

    if (isDirectWeightDbArticle) {
        console.log('✅ isTrulyOurArticle: TRUE for', code, '| Weight DB article');
    } else {
        console.log('❌ isTrulyOurArticle: FALSE for', code, '| source:', source);
    }

    return isDirectWeightDbArticle;
}

/**
 * Validates price input
 * @param {number} price - Price to validate
 * @returns {string} 'valid', 'invalid', or 'empty'
 */
function validatePrice(price) {
    if (!price || price === 0) return 'empty';
    if (price < 0.50 || price > 50.00) return 'invalid';
    return 'valid';
}

/**
 * Format decimal number for Croatian locale
 * @param {number} number - Number to format
 * @returns {string} Formatted number string
 */
function formatDecimalHR(number) {
    if (!number || isNaN(number)) return '0,00';
    return number.toFixed(2).replace('.', ',');
}

/**
 * Updates result item price (€/kom or €/kg) and syncs with troškovnik
 */
function updateResultPrice(resultKey, priceType, value) {
    const [id, rb] = resultKey.split('-');
    const result = results.find(r => r.id == id && r.rb == rb);
    
    if (!result) {
        console.error('Result not found:', resultKey);
        return;
    }
    
    
    
    const newPrice = parseFloat(value) || 0;
    const weight = result.calculatedWeight || result.weight || extractWeight(result.name, result.unit) || 1;
    
    if (priceType === 'pricePerPiece') {
        result.pricePerPiece = newPrice;
        result.pricePerKg = weight > 0 ? newPrice / weight : 0;
    } else if (priceType === 'pricePerKg') {
        result.pricePerKg = newPrice;
        result.pricePerPiece = newPrice * weight;
    }
    
    result.pricePerPiece = Math.round((result.pricePerPiece || 0) * 100) / 100;
    result.pricePerKg = Math.round((result.pricePerKg || 0) * 100) / 100;
    result.hasUserPrice = true;
    result.userPriceType = priceType;
    
    // Sync with troškovnik
    const troskovnikItem = troskovnik.find(t => t.redni_broj == rb);
    if (troskovnikItem) {
        const troskovnikWeight = troskovnikItem.tezina || 1;
        const troskovnikPrice = result.pricePerKg * troskovnikWeight;
        troskovnikItem.izlazna_cijena = Math.round(troskovnikPrice * 100) / 100;
        
        // MISSING RUC/KG CALCULATION FIX: Calculate RUC per kilogram
        // Formula: ruc_per_kg = (izlazna_cijena - nabavna_cijena_1) / tezina
        const ruc = troskovnikItem.izlazna_cijena - troskovnikItem.nabavna_cijena_1;
        const weight = parseFloat(troskovnikItem.tezina) || 0;
        if (weight > 0) {
            troskovnikItem.ruc_per_kg = Math.round((ruc / weight) * 100) / 100; // Round to 2 decimal places
        } else {
            troskovnikItem.ruc_per_kg = 0;
        }
        
        if (typeof updateTroskovnikDisplay === 'function') {
            updateTroskovnikDisplay();
        }
        if (typeof refreshTroskovnikColors === 'function') {
            refreshTroskovnikColors();
        }
    }
    
    updateResultsDisplay();
    showMessage('success', 'Cijena ažurirana za "' + result.name + '"');
}

/**
 * Gets troškovnik item for specific RB
 */
function getTroskovnikItemForRB(rb) {
    if (!troskovnik || troskovnik.length === 0) return null;
    return troskovnik.find(item => item.redni_broj == rb) || null;
}

/**
 * Gets lowest price in a group
 */
function getLowestPriceInGroup(groupItems) {
    if (!groupItems || groupItems.length === 0) return 0;
    
    const prices = groupItems.map(item => {
        if (item.hasUserPrice && item.pricePerPiece > 0) {
            return item.pricePerPiece;
        }
        return item.price || 0;
    }).filter(p => p > 0);
    
    return prices.length > 0 ? Math.min(...prices) : 0;
}

/**
 * Calculates purchasing value for a group
 */
function calculateGroupPurchasingValue(rb, groupItems) {
    const troskovnikItem = getTroskovnikItemForRB(rb);
    if (!troskovnikItem) return 0;
    
    const quantity = troskovnikItem.trazena_kolicina || 1;
    const lowestPrice = getLowestPriceInGroup(groupItems);
    return quantity * lowestPrice;
}

/**
 * Calculates total purchasing value across all groups
 */
function calculateTotalPurchasingValue(groupedResults) {
    let total = 0;
    Object.entries(groupedResults).forEach(([rb, groupItems]) => {
        total += calculateGroupPurchasingValue(parseInt(rb), groupItems);
    });
    return total;
}

/**
 * Updates the results display with enhanced price input functionality
 */
function updateResultsDisplay() {
    const container = document.getElementById('resultsContainer');
    const exportBtn = document.getElementById('exportBtn');
    
    try {
        if (results.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;">' +
                '<div style="font-size: 48px; margin-bottom: 12px;">🔍</div>' +
                '<h3>Nema rezultata</h3>' +
                '<p>Koristite glavnu tražilicu na vrhu stranice za pretragu.</p>' +
                '<div class="info-msg" style="margin-top: 20px; text-align: left;">' +
                '<strong>🆕 NOVA FUNKCIONALNOST - Direktno upravljanje cijenama:</strong><br>' +
                '• Za LAGER/URPD artikle možete upisati izlaznu cijenu direktno ovdje<br>' +
                '• Dva input polja: €/kom i €/kg - unesite bilo koji, drugi se automatski računa<br>' +
                '• Automatska sinkronizacija s troškovnikom<br>' +
                '• Validacija cijena (ljubičasto za nerealne vrijednosti)<br>' +
                '• Eliminiran "Preračun" tab - sve se radi direktno ovdje<br>' +
                '• <strong>⚖️ NOVO: Koriste se točne težine iz baze za naše artikle!</strong><br>' +
                '• <strong>📊 NOVO: VPC/kg kolona pokazuje nabavnu cijenu po kilogramu!</strong><br>' +
                '• <strong>📄 Upload-ajte svoje podatke za početak rada!</strong>' +
                '</div></div>';
            
            if (exportBtn) exportBtn.style.display = 'none';
            if (typeof refreshTroskovnikColors === 'function') {
                refreshTroskovnikColors();
            }
            return;
        }

        if (exportBtn) exportBtn.style.display = 'block';

        // Group results by RB
        const groupedResults = {};
        results.forEach(item => {
            const rb = item.rb || "PENDING";
            if (!groupedResults[rb]) groupedResults[rb] = [];
            groupedResults[rb].push(item);
        });

        const selectedCount = selectedResults.size;
        const totalPurchasingValue = calculateTotalPurchasingValue(groupedResults);
        const ourArticlesCount = results.filter(item => isTrulyOurArticle(item.source, item.code)).length;
        const withUserPricesCount = results.filter(item => item.hasUserPrice).length;
        // Sort groups: PENDING first, then numeric order
        const sortedGroupOrder = Object.keys(groupedResults).sort((a, b) => {
            // PENDING group always first
            if (a === "PENDING") return -1;
            if (b === "PENDING") return 1;
            
            // Numeric sorting for regular RB values
            const aNum = parseInt(a);
            const bNum = parseInt(b);
            return aNum - bNum;
        });

        let html = '<div style="margin-bottom: 20px; padding: 16px; background: #f3f4f6; border-radius: 8px;">' +
            '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">' +
            '<div>' +
            '<strong>Rezultati pretrage (Enhanced):</strong> ' + results.length + ' pronađeno • ' +
            '<strong>Grupe:</strong> ' + Object.keys(groupedResults).length + ' • ' +
            '<strong>Naši artikli:</strong> ' + ourArticlesCount + ' • ' +
            '<strong>S cijenama:</strong> ' + withUserPricesCount +
            '</div>' +
            '<div style="text-align: right;">' +
            '<div style="font-size: 14px; color: #6b7280;">Ukupna nabavna vrijednost</div>' +
            '<div style="font-weight: bold; color: #7c3aed; font-size: 18px;">€' + totalPurchasingValue.toFixed(2) + '</div>' +
            '<div style="font-size: 12px; color: #059669; margin-top: 4px;">🎨 Troškovnik se automatski boji</div>' +
            '</div></div>' +
            '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">' +
            '<div style="display: flex; gap: 12px; align-items: center;">' +
            '<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">' +
            '<input type="checkbox" ' + (selectedCount === results.length && results.length > 0 ? 'checked' : '') + ' onchange="toggleAllResults()" style="transform: scale(1.2);">' +
            '<span>Odaberi sve</span></label>';
            
        if (withUserPricesCount > 0) {
            html += '<button class="btn btn-success" onclick="generateTablicaFromResults()" style="padding: 8px 16px; font-size: 13px;">' +
                '📊 Generiraj tablicu rabata (' + withUserPricesCount + ')</button>';
        }
        
        html += '</div>' +
            '<div style="display: flex; gap: 8px; align-items: center;">' +
            '<button class="btn btn-purple" onclick="clearAllResults()" style="padding: 6px 12px; font-size: 12px;">🗑️ Obriši sve</button>' +
            '<button class="btn btn-purple" onclick="collapseAllGroups()" style="padding: 6px 12px; font-size: 12px;">📁 Skupi grupe</button>' +
            '<button class="btn btn-purple" onclick="expandAllGroups()" style="padding: 6px 12px; font-size: 12px;">📂 Proširi grupe</button>' +
            '</div></div></div>';

        // Generate HTML for each group
        sortedGroupOrder.forEach(rb => {
            const groupItems = groupedResults[rb];
            if (!groupItems || groupItems.length === 0) return;
            
            const isPendingGroup = rb === "PENDING";
            const groupSelectedCount = groupItems.filter(item => selectedResults.has(item.id + '-' + item.rb)).length;
            const allGroupSelected = groupSelectedCount === groupItems.length;
            const groupPurchasingValue = isPendingGroup ? 0 : calculateGroupPurchasingValue(rb, groupItems);
            const groupShare = totalPurchasingValue > 0 ? (groupPurchasingValue / totalPurchasingValue * 100) : 0;
            const troskovnikItem = isPendingGroup ? null : getTroskovnikItemForRB(rb);
            const troskovnikName = isPendingGroup ? "" : getTroskovnikNameForRB(rb);
            const troskovnikQuantity = troskovnikItem ? troskovnikItem.trazena_kolicina || 1 : 1;
            const lowestPrice = getLowestPriceInGroup(groupItems);
            const ourArticlesInGroup = groupItems.filter(item => isTrulyOurArticle(item.source, item.code)).length;
            const withPricesInGroup = groupItems.filter(item => item.hasUserPrice).length;
            
            const sortedItems = groupItems.sort((a, b) => {
                const priceA = a.hasUserPrice ? a.pricePerKg : (a.pricePerKg || 0);
                const priceB = b.hasUserPrice ? b.pricePerKg : (b.pricePerKg || 0);
                return priceA - priceB;
            });
            
            const groupId = 'group-' + rb;
            const isCollapsed = localStorage.getItem(groupId + '-collapsed') === 'true';
            
            if (isPendingGroup) {
                // Special rendering for PENDING group
                html += '<div class="card" id="group-' + rb + '" style="margin-bottom: 8px; border-left: 6px solid #f59e0b; background: #fef3c7; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1px; padding: 8px 12px;">' +
                    '<h3 style="color: #f59e0b; margin: 0; display: flex; align-items: center; gap: 6px; font-size: 18px; font-weight: 700; font-family: \'SF Pro Display\', -apple-system, BlinkMacSystemFont, \'Inter\', sans-serif; letter-spacing: -0.3px; line-height: 1.1;">' +
                    '<label style="cursor: pointer; display: flex; align-items: center; gap: 4px;">' +
                    '<input type="checkbox" ' + (allGroupSelected ? 'checked' : '') + ' onchange="toggleGroupSelection(\'' + rb + '\')" style="transform: scale(1.3);">' +
                    '⚠️ Neklasificirani rezultati (' + groupItems.length + '):</label>' +
                    '<button onclick="toggleGroup(\'' + groupId + '\')" style="background: none; border: none; cursor: pointer; font-size: 16px; color: #f59e0b; margin: 0 2px;" title="Skupi/Proširi grupu">' +
                    (isCollapsed ? '▶️' : '🔽') + '</button></h3>' +
                    '<div style="text-align: right; display: flex; flex-direction: column; gap: 2px;">' +
                    '<div style="font-size: 13px; color: #92400e; font-family: inherit; line-height: 1.0; font-weight: 600;">🟢 ' + ourArticlesInGroup + ' naših • 💰 ' + withPricesInGroup + ' s cijenama</div>' +
                    '<div style="font-size: 12px; color: #92400e; font-weight: 600; font-family: inherit; line-height: 1.0;">⚠️ Ne utječe na troškovnik</div>' +
                    '<div style="display: flex; gap: 4px; align-items: center;">' +
                    '<select id="pending-rb-select" style="padding: 2px 4px; font-size: 11px; border: 1px solid #f59e0b; border-radius: 4px;">' +
                    '<option value="">Odaberite RB</option>';
                    
                // Add RB options from troškovnik
                if (typeof window.troskovnik !== 'undefined' && window.troskovnik.length > 0) {
                    window.troskovnik.forEach(item => {
                        html += '<option value="' + item.redni_broj + '">RB ' + item.redni_broj + ': ' + (item.naziv ? item.naziv.substring(0, 20) : 'Bez naziva') + '...</option>';
                    });
                }
                
                html += '</select>' +
                    '<button class="btn btn-warning" onclick="movePendingToRB()" style="padding: 2px 6px; font-size: 11px; font-family: inherit;" title="Premjesti odabrane u RB">🔄 Premjesti</button>' +
                    '<button class="btn btn-danger" onclick="clearGroup(\'' + rb + '\')" style="padding: 2px 6px; font-size: 11px; font-family: inherit;" title="Obriši sve neklasificirane">🗑️</button>' +
                    '</div></div></div>';
            } else {
                html += '<div class="card" id="group-' + rb + '" style="margin-bottom: 3px; border-left: 6px solid #7c3aed; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">' +
                '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1px; padding: 6px 8px;">' +
                '<h3 style="color: #7c3aed; margin: 0; display: flex; align-items: center; gap: 4px; font-size: 18px; font-weight: 700; font-family: \'SF Pro Display\', -apple-system, BlinkMacSystemFont, \'Inter\', sans-serif; letter-spacing: -0.3px; line-height: 1.1;">' +
                '<label style="cursor: pointer; display: flex; align-items: center; gap: 2px;">' +
                '<input type="checkbox" ' + (allGroupSelected ? 'checked' : '') + ' onchange="toggleGroupSelection(' + rb + ')" style="transform: scale(1.3);">' +
                'Grupa ' + rb + ':</label>' +
                '<button onclick="toggleGroup(\'' + groupId + '\')" style="background: none; border: none; cursor: pointer; font-size: 16px; color: #7c3aed; margin: 0 2px;" title="Skupi/Proširi grupu">' +
                (isCollapsed ? '▶️' : '🔽') + '</button>' + troskovnikName + '</h3>' +
                '<div style="text-align: right; display: flex; flex-direction: column; gap: 0;">' +
                '<div style="font-size: 13px; color: #6b7280; font-family: inherit; line-height: 1.0; font-weight: 600;">' + groupSelectedCount + '/' + groupItems.length + ' odabrano • 🟢 ' + ourArticlesInGroup + ' naših • 💰 ' + withPricesInGroup + ' s cijenama</div>' +
                '<div style="font-size: 13px; color: #7c3aed; font-weight: 700; font-family: inherit; line-height: 1.0;">Nabavna: €' + groupPurchasingValue.toFixed(2) + '</div>' +
                '<div style="font-size: 16px; color: #059669; font-weight: 800; font-family: inherit; line-height: 1.0;">UDIO: ' + groupShare.toFixed(1) + '%</div>' +
                '<div style="font-size: 11px; color: #6b7280; font-family: inherit; line-height: 1.0; font-weight: 500;">' + troskovnikQuantity + ' × €' + lowestPrice.toFixed(2) + '</div>' +
                '<button class="btn btn-purple" onclick="clearGroup(' + rb + ')" style="padding: 1px 3px; font-size: 11px; font-family: inherit; line-height: 1.0;" title="Obriši cijelu grupu">🗑️</button>' +
                '</div></div>' +
                '<div id="' + groupId + '-content" style="display: ' + (isCollapsed ? 'none' : 'block') + ';">';
            }
            
            // Common content for both PENDING and numbered groups
            html +=
                '<div class="table-container"><table class="table" style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 16px; border-spacing: 0; border-collapse: separate; width: 100%;"><thead><tr style="background: #f8fafc;">' +
                '<th style="width: 30px; padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9;">✓</th>' +
                '<th style="width: 35px; padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9;">Rang</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 80px;">Šifra</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 200px;">Naziv</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 40px;">J.M.</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 70px;">VPC</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 80px;">VPC/kg</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 90px;">€/kom</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 90px;">€/kg</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 100px;">Dobavljač</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 60px;">Težina</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 70px;">Lani</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 50px;">PDV</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 70px;">Datum</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 60px;">Izvor</th>' +
                '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 40px;">Del</th>' +
                '</tr></thead><tbody>';

            sortedItems.forEach((item, index) => {
                const resultKey = item.id + '-' + item.rb;
                const isSelected = selectedResults.has(resultKey);
                const isOurArticle = isTrulyOurArticle(item.source, item.code);
                
                let formattedDate = 'N/A';
                try {
                    if (item.date) {
                        formattedDate = new Date(item.date).toLocaleDateString('hr-HR', {
                            day: '2-digit', month: '2-digit', year: 'numeric'
                        });
                    }
                } catch (dateError) {
                    formattedDate = item.date || 'N/A';
                }
                
                // Define row styling based on article type
                let rowStyle = '';
                if (isSelected) {
                    if (item.isManualEntry) {
                        // Manual entries - orange theme
                        rowStyle = 'background: linear-gradient(90deg, #fef3c7 0%, #fffbeb 100%); border-left: 5px solid #f59e0b; line-height: 0.9; height: 35px;';
                    } else if (isOurArticle) {
                        // Our articles - green theme
                        rowStyle = 'background: linear-gradient(90deg, #dcfce7 0%, #f0fdf4 100%); border-left: 5px solid #16a34a; line-height: 0.9; height: 35px;';
                    } else {
                        // External articles - purple theme  
                        rowStyle = 'background: linear-gradient(90deg, #ede9fe 0%, #f3f4f6 100%); border-left: 5px solid #7c3aed; line-height: 0.9; height: 35px;';
                    }
                } else {
                    if (item.isManualEntry) {
                        // Manual entries unselected - light orange
                        rowStyle = 'background: #fffbeb; opacity: 0.8; line-height: 0.9; height: 35px;';
                    } else if (isOurArticle) {
                        // Our articles unselected - light green
                        rowStyle = 'background: #f7fee7; opacity: 0.8; line-height: 0.9; height: 35px;';
                    } else {
                        // External articles unselected - light purple
                        rowStyle = 'background: #faf7ff; opacity: 0.8; line-height: 0.9; height: 35px;';
                    }
                }
                    
                const price = item.price || 0;
                const calculatedWeight = item.calculatedWeight || item.weight || extractWeight(item.name, item.unit) || 0;
                const originalPricePerKg = calculatedWeight > 0 ? price / calculatedWeight : 0;
                const userPricePerPiece = item.pricePerPiece || 0;
                const userPricePerKg = item.pricePerKg || originalPricePerKg;
                
                // Get last year's price for reference
                const lastYearPrice = window.getProslogodisnjaCijena ? window.getProslogodisnjaCijena(item.code) : null;
                
                const pieceValidation = validatePrice(userPricePerPiece);
                const kgValidation = validatePrice(userPricePerKg);
                const pieceClass = isOurArticle ? (pieceValidation === 'valid' ? 'price-input valid' : 
                                           pieceValidation === 'invalid' ? 'price-input invalid' : 'price-input') : '';
                const kgClass = isOurArticle ? (kgValidation === 'valid' ? 'price-input valid' : 
                                        kgValidation === 'invalid' ? 'price-input invalid' : 'price-input') : '';
                
                const isLowestPrice = Math.abs(price - lowestPrice) < 0.01;
                const priceStyle = isLowestPrice ? 'background: #fef3c7; color: #92400e; font-weight: 700; padding: 2px 4px; border-radius: 3px; font-size: 15px;' : 'font-size: 15px; font-weight: 600;';
                
                let rankBadge = '';
                if (index === 0) {
                    rankBadge = '<span style="background: #fbbf24; color: #92400e; padding: 1px 3px; border-radius: 6px; font-size: 11px; font-weight: 700; line-height: 0.9;">🥇1</span>';
                } else if (index === 1) {
                    rankBadge = '<span style="background: #e5e7eb; color: #374151; padding: 1px 3px; border-radius: 6px; font-size: 11px; font-weight: 700; line-height: 0.9;">🥈2</span>';
                } else if (index === 2) {
                    rankBadge = '<span style="background: #fcd34d; color: #92400e; padding: 1px 3px; border-radius: 6px; font-size: 11px; font-weight: 700; line-height: 0.9;">🥉3</span>';
                } else {
                    rankBadge = '<span style="background: #f3f4f6; color: #6b7280; padding: 1px 3px; border-radius: 6px; font-size: 11px; line-height: 0.9;">' + (index + 1) + '</span>';
                }
                
                html += '<tr style="' + rowStyle + '" class="result-row">' +
                    '<td style="padding: 1px; text-align: center; vertical-align: middle;"><input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="toggleResult(\'' + resultKey + '\')" style="transform: scale(1.4); cursor: pointer;"></td>' +
                    '<td style="padding: 1px; text-align: center; vertical-align: middle;">' + rankBadge + '</td>' +
                    '<td style="padding: 1px; font-weight: 700; font-size: 15px; line-height: 0.9; vertical-align: middle;">' + (item.code || '') + '</td>' +
                    '<td style="padding: 1px; max-width: 200px; font-size: 15px; line-height: 0.9; vertical-align: middle;" title="' + (item.name || '') + '">' + (item.name || '') + '</td>' +
                    '<td style="padding: 1px; text-align: center; font-size: 14px; line-height: 0.9; vertical-align: middle;">' + (item.unit || '') + '</td>' +
                    '<td style="padding: 1px; text-align: right; vertical-align: middle;"><span style="' + priceStyle + '">€' + price.toFixed(2) + '</span></td>' +
                    '<td style="padding: 1px; text-align: right; vertical-align: middle;"><span style="font-weight: 700; font-size: 14px; color: #92400e; line-height: 0.9;">€' + originalPricePerKg.toFixed(3) + '/kg</span>' +
                    '<div style="font-size: 11px; color: #6b7280; line-height: 0.8;">Nabavna/kg</div></td>';

                if (isOurArticle) {
                    html += '<td style="padding: 1px; vertical-align: middle;"><div class="price-input-group">' +
                        '<div class="price-input-label" style="font-size: 12px; color: #16a34a; line-height: 0.8; font-weight: 700;">€/kom</div>' +
                        '<input type="number" step="0.01" value="' + userPricePerPiece.toFixed(2) + '" class="' + pieceClass + '" ' +
                        'onchange="updateResultPrice(\'' + resultKey + '\', \'pricePerPiece\', this.value)" onfocus="this.select()" placeholder="0.00" title="Unesite izlaznu cijenu po komadu" ' +
                        'style="width: 80px; padding: 1px; border: 2px solid #16a34a; border-radius: 3px; font-size: 14px; line-height: 0.9; font-weight: 700;">' +
                        '<div class="price-sync-indicator" style="font-size: 10px; color: #16a34a; line-height: 0.8; font-weight: 600;">' + (item.hasUserPrice && item.userPriceType === 'pricePerPiece' ? '✓' : '↻') + '</div></div></td>' +
                        '<td style="padding: 1px; vertical-align: middle;"><div class="price-input-group">' +
                        '<div class="price-input-label" style="font-size: 12px; color: #16a34a; line-height: 0.8; font-weight: 700;">€/kg</div>' +
                        '<input type="number" step="0.01" value="' + userPricePerKg.toFixed(2) + '" class="' + kgClass + '" ' +
                        'onchange="updateResultPrice(\'' + resultKey + '\', \'pricePerKg\', this.value)" onfocus="this.select()" placeholder="0.00" title="Unesite izlaznu cijenu po kilogramu" ' +
                        'style="width: 80px; padding: 1px; border: 2px solid #16a34a; border-radius: 3px; font-size: 14px; line-height: 0.9; font-weight: 700;">' +
                        '<div class="price-sync-indicator" style="font-size: 10px; color: #16a34a; line-height: 0.8; font-weight: 600;">' + (item.hasUserPrice && item.userPriceType === 'pricePerKg' ? '✓' : '↻') + '</div></div></td>';
                } else {
                    html += item.hasUserPrice ?
                        '<td style="padding: 1px; text-align: center; vertical-align: middle;"><div style="color: #7c3aed; font-weight: 700; font-size: 15px; line-height: 0.9;">€' + userPricePerPiece.toFixed(2) + '</div></td>' +
                        '<td style="padding: 1px; text-align: center; vertical-align: middle;"><div style="color: #7c3aed; font-weight: 700; font-size: 15px; line-height: 0.9;">€' + userPricePerKg.toFixed(2) + '</div></td>' :
                        '<td style="padding: 1px; text-align: center; vertical-align: middle;"><div style="color: #9ca3af; font-size: 13px; line-height: 0.9;">-<br><small style="font-size: 10px;">Vanjski</small></div></td>' +
                        '<td style="padding: 1px; text-align: center; vertical-align: middle;"><div style="color: #7c3aed; font-weight: 700; font-size: 13px; line-height: 0.9;">€' + originalPricePerKg.toFixed(2) + '<br><small style="color: #9ca3af; font-size: 10px;">Orig</small></div></td>';
                }
                
                // Last year price cell
                let lastYearCell = '';
                if (lastYearPrice && lastYearPrice > 0) {
                    // Calculate comparison if user has entered a price
                    if (item.hasUserPrice && userPricePerPiece > 0) {
                        const difference = userPricePerPiece - lastYearPrice;
                        const percentChange = ((difference / lastYearPrice) * 100).toFixed(1);
                        const isIncrease = difference > 0;
                        const color = isIncrease ? '#dc2626' : '#059669';
                        const arrow = isIncrease ? '↗️' : '↘️';
                        const sign = isIncrease ? '+' : '';
                        
                        lastYearCell = '<td style="padding: 1px; text-align: center; vertical-align: middle;">' +
                            '<div style="font-weight: 700; color: #64748b; font-size: 13px; line-height: 0.9;">€' + formatDecimalHR(lastYearPrice) + '</div>' +
                            '<div style="font-size: 11px; color: ' + color + '; font-weight: 700; line-height: 0.8;">' +
                            arrow + sign + '€' + formatDecimalHR(Math.abs(difference)) + '</div>' +
                            '<div style="font-size: 10px; color: ' + color + '; line-height: 0.8;">(' + sign + percentChange + '%)</div></td>';
                    } else {
                        lastYearCell = '<td style="padding: 1px; text-align: center; vertical-align: middle;">' +
                            '<div style="font-weight: 700; color: #64748b; font-size: 13px; line-height: 0.9;">€' + formatDecimalHR(lastYearPrice) + '</div>' +
                            '<div style="font-size: 11px; color: #6b7280; line-height: 0.8;">Ref</div></td>';
                    }
                } else {
                    lastYearCell = '<td style="padding: 1px; text-align: center; vertical-align: middle;">' +
                        '<div style="color: #9ca3af; font-size: 13px; line-height: 0.9;">-</div>' +
                        '<div style="font-size: 11px; color: #9ca3af; line-height: 0.8;">Nema</div></td>';
                }
                
                html += '<td style="padding: 1px; font-size: 13px; line-height: 0.9; vertical-align: middle;">' + (item.supplier || '') + '</td>' +
                    '<td style="padding: 1px; vertical-align: middle;"><input type="number" step="0.001" value="' + calculatedWeight.toFixed(3) + '" onchange="updateResultWeight(\'' + resultKey + '\', this.value)" ' +
                    'style="width: 55px; padding: 1px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 13px; line-height: 0.9; font-weight: 600;" title="Kliknite za uređivanje težine"> kg</td>' +
                    lastYearCell;
                
                // Add PDV column with consistent styling
                if (item.isManualEntry) {
                    // Manual entries - editable PDV with orange theme (distinguishable from external)
                    html += '<td style="padding: 1px; text-align: center; vertical-align: middle;">' +
                        '<select onchange="updateCustomArticlePDV(\'' + resultKey + '\', this.value)" ' +
                        'style="width: 45px; padding: 1px; border: 2px solid #f59e0b; border-radius: 3px; font-size: 13px; background: white; color: #f59e0b; font-weight: 700; line-height: 0.9;">' +
                        '<option value="25"' + (item.customPdvStopa === 25 ? ' selected' : '') + '>25%</option>' +
                        '<option value="5"' + (item.customPdvStopa === 5 ? ' selected' : '') + '>5%</option>' +
                        '</select></td>';
                } else if (!isOurArticle) {
                    // All external articles - editable PDV with purple theme
                    html += '<td style="padding: 1px; text-align: center; vertical-align: middle;">' +
                        '<select onchange="updateCustomArticlePDV(\'' + resultKey + '\', this.value)" ' +
                        'style="width: 45px; padding: 1px; border: 2px solid #7c3aed; border-radius: 3px; font-size: 13px; background: white; color: #7c3aed; font-weight: 700; line-height: 0.9;">' +
                        '<option value="25"' + (item.customPdvStopa === 25 ? ' selected' : '') + '>25%</option>' +
                        '<option value="5"' + (item.customPdvStopa === 5 ? ' selected' : '') + '>5%</option>' +
                        '</select></td>';
                } else {
                    // Our articles - show actual PDV percentage if available, otherwise Auto
                    let pdvDisplay = 'Auto';
                    let pdvValue = '-';
                    
                    // Try to get actual PDV percentage for Google Sheets articles
                    if (item.pdvStopa && item.pdvStopa > 0) {
                        pdvDisplay = item.pdvStopa + '%';
                        pdvValue = item.pdvStopa + '%';
                    } else if (item.code && typeof window.getArticleWeightAndPDV === 'function') {
                        const pdvData = window.getArticleWeightAndPDV(item.code, item.name, item.unit, item.source);
                        if (pdvData.pdvStopa > 0) {
                            pdvDisplay = pdvData.pdvStopa + '%';
                            pdvValue = pdvData.pdvStopa + '%';
                        }
                    }
                    
                    html += '<td style="padding: 1px; text-align: center; vertical-align: middle;">' +
                        '<div style="color: #16a34a; font-size: 13px; font-weight: 700; line-height: 0.9;">' + pdvValue + '</div>' +
                        '<div style="font-size: 11px; color: #16a34a; line-height: 0.8;">' + pdvDisplay + '</div></td>';
                }
                
                // DEBUG: Log badge rendering
                const isOur = isTrulyOurArticle(item.source, item.code);
                const badgeClass = getBadgeClass(item.source);
                console.log('🎨 BADGE RENDER:', item.code, '| source:', item.source, '| isOur:', isOur, '| badgeClass:', badgeClass);

                html += '<td style="padding: 1px; font-size: 13px; text-align: center; line-height: 0.9; vertical-align: middle;">' + formattedDate + '</td>' +
                    '<td style="padding: 1px; text-align: center; vertical-align: middle;">' +
                        '<div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">' +
                            '<span class="badge ' + badgeClass + '" style="font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600;">' + (isOur ? '🏠 NAŠ' : '📋 PO CJENIKU') + '</span>' +
                            '<div style="font-size: 9px; color: #6b7280; font-weight: 500; line-height: 1;">' + parseSourceName(item.source) + '</div>' +
                        '</div>' +
                    '</td>' +
                    '<td style="padding: 1px; text-align: center; vertical-align: middle;"><button class="auto-btn" onclick="removeResult(\'' + resultKey + '\')" title="Ukloni rezultat" ' +
                    'style="background: #ef4444; color: white; border: none; padding: 1px 2px; border-radius: 3px; font-size: 12px; cursor: pointer; line-height: 0.9; font-weight: 600;">🗑️</button></td>' +
                    '</tr>';
            });

            html += '</tbody></table></div></div></div>';
        });

        container.innerHTML = html;
        
        document.getElementById('resultsCount').textContent = results.length;
        document.getElementById('resultsCountText').textContent = results.length;
        
        if (exportBtn) {
            exportBtn.textContent = '💾 Export CSV (' + selectedCount + ')';
            exportBtn.disabled = selectedCount === 0;
        }
        
        if (typeof refreshTroskovnikColors === 'function') {
            refreshTroskovnikColors();
        }
        
    } catch (error) {
        console.error('❌ Error in updateResultsDisplay:', error);
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7c3aed;">' +
                '<div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>' +
                '<h3>Greška u prikazu rezultata</h3>' +
                '<p>Molimo osvježite stranicu i pokušajte ponovo.</p></div>';
        }
    }
}

/**
 * Gets troškovnik name for RB
 */
function getTroskovnikNameForRB(rb) {
    if (!troskovnik || troskovnik.length === 0) {
        return 'Stavka ' + rb;
    }
    
    const troskovnikItem = troskovnik.find(t => t.redni_broj == rb);
    if (troskovnikItem) {
        const details = [];
        details.push(troskovnikItem.naziv_artikla);
        
        if (troskovnikItem.tezina > 0) {
            details.push(troskovnikItem.tezina.toFixed(2) + 'kg');
        }
        
        if (troskovnikItem.mjerna_jedinica && troskovnikItem.trazena_kolicina) {
            details.push(troskovnikItem.trazena_kolicina + ' ' + troskovnikItem.mjerna_jedinica);
        }
        
        return rb + '. ' + details.join(', ');
    }
    
    return 'Stavka ' + rb;
}

/**
 * Toggles selection of a single result
 */
function toggleResult(resultKey) {
    try {
        if (selectedResults.has(resultKey)) {
            selectedResults.delete(resultKey);
        } else {
            selectedResults.add(resultKey);
        }
        updateResultsDisplay();
    } catch (error) {
        console.error('❌ Error toggling result:', error);
    }
}

/**
 * Toggles selection of all results in a group
 */
function toggleGroupSelection(rb) {
    const groupItems = results.filter(item => item.rb == rb);
    const allSelected = groupItems.every(item => selectedResults.has(item.id + '-' + item.rb));
    
    groupItems.forEach(item => {
        const resultKey = item.id + '-' + item.rb;
        if (allSelected) {
            selectedResults.delete(resultKey);
        } else {
            selectedResults.add(resultKey);
        }
    });
    
    updateResultsDisplay();
}

/**
 * Toggles selection of all results
 */
function toggleAllResults() {
    if (selectedResults.size === results.length && results.length > 0) {
        selectedResults.clear();
    } else {
        results.forEach(item => {
            selectedResults.add(item.id + '-' + item.rb);
        });
    }
    updateResultsDisplay();
}

/**
 * Updates result weight and recalculates price per kg
 */
function updateResultWeight(resultKey, newWeight) {
    const [id, rb] = resultKey.split('-');
    const result = results.find(r => r.id == id && r.rb == rb);
    
    if (result) {
        const weight = parseFloat(newWeight) || 0;
        result.calculatedWeight = weight;
        result.weight = weight;
        // Mark that user has manually modified the weight
        result.hasUserWeight = true;
        
        if (result.hasUserPrice) {
            if (result.userPriceType === 'pricePerPiece') {
                result.pricePerKg = weight > 0 ? result.pricePerPiece / weight : 0;
            } else if (result.userPriceType === 'pricePerKg') {
                result.pricePerPiece = result.pricePerKg * weight;
            }
            
            result.pricePerPiece = Math.round((result.pricePerPiece || 0) * 100) / 100;
            result.pricePerKg = Math.round((result.pricePerKg || 0) * 100) / 100;
        } else {
            result.pricePerKg = weight > 0 ? result.price / weight : 0;
        }
        
        updateResultsDisplay();
    }
}

/**
 * Updates PDV stopa for external articles and manual entries
 */
function updateCustomArticlePDV(resultKey, newPdvStopa) {
    const [id, rb] = resultKey.split('-');
    const result = results.find(r => r.id == id && r.rb == rb);
    
    // Allow PDV changes for external articles OR manual entries
    if (result && (!isTrulyOurArticle(result.source, result.code) || result.isManualEntry)) {
        result.customPdvStopa = parseInt(newPdvStopa) || 25;
        
        // Show success message
        if (typeof showMessage === 'function') {
            const entryType = result.isManualEntry ? 'ručno unesenu stavku' : 'vanjski artikl';
            showMessage('success', 
                `PDV stopa ažurirana za ${entryType} "${result.name}": ${result.customPdvStopa}%`, 
                'resultsStatus'
            );
        }
        
        // console.log(`📋 PDV stopa ažurirana za ${result.name}: ${result.customPdvStopa}%`);
    }
}

/**
 * Removes a single result with first choice promotion logic
 */
function removeResult(resultKey) {
    const [id, rb] = resultKey.split('-');
    const index = results.findIndex(r => r.id == id && r.rb == rb);
    
    if (index !== -1) {
        const removedItem = results.splice(index, 1)[0];
        selectedResults.delete(resultKey);
        
        // Check if removed item was first choice
        if (removedItem.isFirstChoice) {
            // Find second article in same RB group
            const secondArticle = results.find(r => r.rb == rb && !r.isFirstChoice);
            
            if (secondArticle) {
                // Promote second article to first choice
                secondArticle.isFirstChoice = true;
                
                // Update troškovnik with new first choice
                const troskovnikItem = troskovnik.find(t => t.redni_broj == rb);
                if (troskovnikItem) {
                    // Update prices in troškovnik
                    if (secondArticle.hasUserPrice) {
                        const troskovnikWeight = troskovnikItem.tezina || 1;
                        const troskovnikPrice = secondArticle.pricePerKg * troskovnikWeight;
                        troskovnikItem.izlazna_cijena = Math.round(troskovnikPrice * 100) / 100;
                        troskovnikItem.nabavna_cijena_1 = Math.round(secondArticle.pricePerKg * 100) / 100;
                        troskovnikItem.dobavljac_1 = secondArticle.supplier || '';
                        
                        // MISSING RUC/KG CALCULATION FIX: Calculate RUC per kilogram
                        // Formula: ruc_per_kg = (izlazna_cijena - nabavna_cijena_1) / tezina
                        const ruc = troskovnikItem.izlazna_cijena - troskovnikItem.nabavna_cijena_1;
                        const weight = parseFloat(troskovnikItem.tezina) || 0;
                        if (weight > 0) {
                            troskovnikItem.ruc_per_kg = Math.round((ruc / weight) * 100) / 100; // Round to 2 decimal places
                        } else {
                            troskovnikItem.ruc_per_kg = 0;
                        }
                    }
                }
                
                // Show warning to user
                showMessage('warning', 
                    `⚠️ Artikl 2 je postavljen kao prvi izbor za RB ${rb}. Molimo odredite izlaznu cijenu!`,
                    null, 8000);
            }
        }
        
        updateResultsDisplay();
        showMessage('success', 'Uklonjen rezultat: ' + removedItem.name);
    }
}

/**
 * Clears entire group
 */
function clearGroup(rb) {
    const groupItems = results.filter(item => item.rb == rb);
    
    if (groupItems.length === 0) return;
    
    if (confirm('Obrisati cijelu grupu ' + rb + ' (' + groupItems.length + ' stavki)?')) {
        groupItems.forEach(item => {
            selectedResults.delete(item.id + '-' + item.rb);
        });
        
        results = results.filter(item => item.rb != rb);
        updateResultsDisplay();
        showMessage('success', 'Obrisana grupa ' + rb + ' (' + groupItems.length + ' stavki)');
    }
}

/**
 * Clears all results
 */
function clearAllResults() {
    if (results.length === 0) return;
    
    if (confirm('Obrisati sve rezultate (' + results.length + ' stavki)?')) {
        const count = results.length;
        results = [];
        selectedResults.clear();
        updateResultsDisplay();
        showMessage('success', 'Obrisano ' + count + ' rezultata.');
    }
}

/**
 * Toggles group collapse/expand
 */
function toggleGroup(groupId) {
    const content = document.getElementById(groupId + '-content');
    const button = event.target;
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        button.textContent = '🔽';
        localStorage.setItem(groupId + '-collapsed', 'false');
    } else {
        content.style.display = 'none';
        button.textContent = '▶️';
        localStorage.setItem(groupId + '-collapsed', 'true');
    }
}

/**
 * Collapses all groups
 */
function collapseAllGroups() {
    const groups = document.querySelectorAll('[id$="-content"]');
    groups.forEach(group => {
        group.style.display = 'none';
        const groupId = group.id.replace('-content', '');
        localStorage.setItem(groupId + '-collapsed', 'true');
    });
    
    const buttons = document.querySelectorAll('button[onclick^="toggleGroup"]');
    buttons.forEach(button => {
        button.textContent = '▶️';
    });
}

/**
 * Expands all groups
 */
function expandAllGroups() {
    const groups = document.querySelectorAll('[id$="-content"]');
    groups.forEach(group => {
        group.style.display = 'block';
        const groupId = group.id.replace('-content', '');
        localStorage.setItem(groupId + '-collapsed', 'false');
    });
    
    const buttons = document.querySelectorAll('button[onclick^="toggleGroup"]');
    buttons.forEach(button => {
        button.textContent = '🔽';
    });
}

/**
 * Generates tablica rabata from results with user-entered prices
 */
function generateTablicaFromResults() {
    if (typeof generateFromResults === 'function') {
        generateFromResults();
    } else {
        console.error('generateFromResults function not available');
        showMessage('error', 'Funkcija za generiranje tablice nije dostupna.');
    }
}

/**
 * Exports selected results to CSV
 */
function exportResults() {
    const selectedItems = results.filter(item => 
        selectedResults.has(item.id + '-' + item.rb)
    );
    
    if (selectedItems.length === 0) {
        alert('Nema odabranih rezultata za export!');
        return;
    }

    const csvHeaders = [
        'R.B.', 'Šifra', 'Naziv', 'J.M.', 'Orig. VPC (€)', 'VPC/kg (€)', 'Izlazna €/kom', 'Izlazna €/kg',
        'Dobavljač', 'Težina (kg)', 'Datum', 'Izvor', 'Naš artikl', 'Ima korisničku cijenu'
    ];
    
    const csvData = selectedItems.map(item => {
        const calculatedWeight = item.calculatedWeight || item.weight || 0;
        const vpcPerKg = calculatedWeight > 0 ? item.price / calculatedWeight : 0;
        
        return [
            item.rb,
            item.code || '',
            item.name || '',
            item.unit || '',
            item.price.toFixed(2),
            vpcPerKg.toFixed(3),
            (item.pricePerPiece || 0).toFixed(2),
            (item.pricePerKg || 0).toFixed(2),
            item.supplier || '',
            calculatedWeight.toFixed(3),
            item.date || '',
            item.source || '',
                            isTrulyOurArticle(item.source, item.code) ? 'Da' : 'Ne',
            item.hasUserPrice ? 'Da' : 'Ne'
        ];
    });

    const filename = 'rezultati_enhanced_VPC_kg_' + selectedItems.length + '_stavki.csv';
    exportToCSV(csvHeaders, csvData, filename);
    
    showMessage('success', 'Exportano ' + selectedItems.length + ' rezultata s VPC/kg u ' + filename);
}

/**
 * Move PENDING results to selected RB
 */
function movePendingToRB() {
    const selectElement = document.getElementById('pending-rb-select');
    if (!selectElement || !selectElement.value) {
        alert('Molimo odaberite RB za premještanje!');
        return;
    }
    
    const targetRB = parseInt(selectElement.value);
    if (!targetRB || targetRB <= 0) {
        alert('Neispravni RB!');
        return;
    }
    
    // Check if RB exists in troškovnik
    const troskovnikItem = getTroskovnikItemForRB(targetRB);
    if (!troskovnikItem) {
        alert(`RB ${targetRB} ne postoji u troškovniku!`);
        return;
    }
    
    // Get selected PENDING results
    const pendingResults = results.filter(r => r.rb === "PENDING");
    const selectedPendingResults = pendingResults.filter(r => selectedResults.has(r.id + '-PENDING'));
    
    if (selectedPendingResults.length === 0) {
        alert('Molimo odaberite rezultate za premještanje!');
        return;
    }
    
    // Move selected results to target RB
    selectedPendingResults.forEach(result => {
        // Remove from selectedResults with old key
        selectedResults.delete(result.id + '-PENDING');
        
        // Update RB
        result.rb = targetRB;
        
        // Add to selectedResults with new key
        selectedResults.add(result.id + '-' + targetRB);
    });
    
    // Reset dropdown
    selectElement.value = '';
    
    // Refresh display
    updateResultsDisplay();
    
    // Show success message
    const message = `Premješteno ${selectedPendingResults.length} rezultata u RB ${targetRB}: ${troskovnikItem.naziv}`;
    showMessage('success', message);
    
    console.log(`🔄 Moved ${selectedPendingResults.length} PENDING results to RB ${targetRB}`);
}

// Expose functions globally
window.updateResultsDisplay = updateResultsDisplay;
window.updateResultPrice = updateResultPrice;
window.toggleResult = toggleResult;
window.toggleGroupSelection = toggleGroupSelection;
window.toggleAllResults = toggleAllResults;
window.updateResultWeight = updateResultWeight;
window.updateCustomArticlePDV = updateCustomArticlePDV;
window.removeResult = removeResult;
window.clearGroup = clearGroup;
window.clearAllResults = clearAllResults;
window.toggleGroup = toggleGroup;
window.collapseAllGroups = collapseAllGroups;
window.expandAllGroups = expandAllGroups;
window.generateTablicaFromResults = generateTablicaFromResults;
window.exportResults = exportResults;
window.getTroskovnikItemForRB = getTroskovnikItemForRB;
window.getLowestPriceInGroup = getLowestPriceInGroup;
window.calculateGroupPurchasingValue = calculateGroupPurchasingValue;
window.calculateTotalPurchasingValue = calculateTotalPurchasingValue;
window.isOurArticle = isOurArticle;
window.validatePrice = validatePrice;
window.movePendingToRB = movePendingToRB;

// console.log('✅ FIXED Enhanced results module loaded:');
// console.log('🎨 FIXED: All red colors changed to purple (#7c3aed)');
// console.log('💰 FIXED: Nabavna vrijednost color changed to purple');
// console.log('🗑️ FIXED: Delete buttons now use purple background');
// console.log('⚠️ FIXED: Error messages use purple colors');
// console.log('📊 Enhanced price management and VPC/kg column ready');