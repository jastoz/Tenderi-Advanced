/**
 * ENHANCED RESULTS MODULE - FIXED COLORS (RED TO PURPLE)
 * Handles results display with direct price input for LAGER/URPD articles
 */

// NOTE: Article classification is centrally defined in utils.js
// Use window.isTrulyOurArticle(source, code) for all article type checks

// NOVO: Selected groups for "Popratiti" export (tender follow-up tracking)
if (typeof window.selectedGroups === 'undefined') {
    window.selectedGroups = new Set();
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
    // DEBUG: Track display refresh calls for troubleshooting state loading issues
    console.log('🔄 updateResultsDisplay() called - results:', results?.length || 0);

    const container = document.getElementById('resultsContainer');
    const exportBtn = document.getElementById('exportBtn');

    try {
        // NEW: Merge RB from results AND troskovnik to show empty groups
        const allRBs = new Set();

        // Add RB from existing results
        results.forEach(item => {
            const rb = item.rb || "PENDING";
            allRBs.add(rb);
        });

        // Add RB from troskovnik (creates empty groups)
        if (typeof window.troskovnik !== 'undefined' && window.troskovnik && window.troskovnik.length > 0) {
            window.troskovnik.forEach(item => {
                if (item.redni_broj) {
                    allRBs.add(item.redni_broj);
                }
            });
        }

        // Check if we have ANY groups (from results or troskovnik)
        const hasAnyGroups = allRBs.size > 0;

        if (!hasAnyGroups) {
            // Completely empty - no results and no troskovnik
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

        // Group results by RB (including empty groups from troskovnik)
        const groupedResults = {};

        // Initialize all groups (including empty ones from troskovnik)
        allRBs.forEach(rb => {
            groupedResults[rb] = [];
        });

        // Fill groups with existing results
        results.forEach(item => {
            const rb = item.rb || "PENDING";
            if (!groupedResults[rb]) groupedResults[rb] = [];
            groupedResults[rb].push(item);
        });

        const selectedCount = selectedResults.size;
        const totalPurchasingValue = calculateTotalPurchasingValue(groupedResults);

        // VIZUALNI PRIKAZ: Broji LAGER/URPD artikle za prikaz
        const ourArticlesCount = results.filter(item => window.isOurArticleVisual(item.source)).length;
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
            '<div style="display: flex; gap: 12px; align-items: center;">';

        if (withUserPricesCount > 0) {
            html += '<button class="btn btn-success" onclick="generateTablicaFromResults()" style="padding: 8px 16px; font-size: 13px;">' +
                '📊 Generiraj tablicu rabata (' + withUserPricesCount + ')</button>';
        }

        // NOVO: Add Popratiti export button if groups are selected
        const selectedGroupsCount = window.selectedGroups.size;
        if (selectedGroupsCount > 0) {
            html += '<button class="btn btn-success" onclick="exportPopratuToExcel()" style="padding: 8px 16px; font-size: 13px; background: #16a34a; margin-left: 8px;">' +
                '📋 Popratiti (' + selectedGroupsCount + ')</button>';
        }

        html += '</div>' +
            '<div style="display: flex; gap: 8px; align-items: center;">' +
            '<button class="btn btn-purple" onclick="clearAllResults()" style="padding: 6px 12px; font-size: 12px;">🗑️ Obriši sve</button>' +
            '<button class="btn btn-purple" onclick="collapseAllGroups()" style="padding: 6px 12px; font-size: 12px;">📁 Skupi grupe</button>' +
            '<button class="btn btn-purple" onclick="expandAllGroups()" style="padding: 6px 12px; font-size: 12px;">📂 Proširi grupe</button>' +
            '</div></div></div>';

        // Generate HTML for each group
        sortedGroupOrder.forEach(rb => {
            const groupItems = groupedResults[rb] || [];

            // NEW: Skip PENDING group if empty (no unclassified results)
            const isPendingGroup = rb === "PENDING";
            if (isPendingGroup && groupItems.length === 0) return;

            // NEW: For numbered groups, show even if empty (from troskovnik)
            const groupSelectedCount = groupItems.filter(item => selectedResults.has(item.id + '-' + item.rb)).length;
            const allGroupSelected = groupItems.length > 0 && groupSelectedCount === groupItems.length;
            const groupPurchasingValue = isPendingGroup ? 0 : calculateGroupPurchasingValue(rb, groupItems);
            const groupShare = totalPurchasingValue > 0 ? (groupPurchasingValue / totalPurchasingValue * 100) : 0;
            const troskovnikItem = isPendingGroup ? null : getTroskovnikItemForRB(rb);
            const troskovnikName = isPendingGroup ? "" : getTroskovnikNameForRB(rb);
            const troskovnikQuantity = troskovnikItem ? troskovnikItem.trazena_kolicina || 1 : 1;
            const lowestPrice = getLowestPriceInGroup(groupItems);

            // VIZUALNI PRIKAZ: Broji LAGER/URPD artikle u grupi
            const ourArticlesInGroup = groupItems.filter(item => window.isOurArticleVisual(item.source)).length;
            const withPricesInGroup = groupItems.filter(item => item.hasUserPrice).length;

            // Sort: Prvi izbor na vrh, ostali po ID-u (redoslijed dodavanja) - samo ako ima stavki
            const sortedItems = groupItems.length > 0 ? groupItems.sort((a, b) => {
                // Prvi izbor uvijek na vrh
                if (a.isFirstChoice && !b.isFirstChoice) return -1;
                if (!a.isFirstChoice && b.isFirstChoice) return 1;
                // Ostali po ID-u (redoslijed dodavanja)
                return a.id - b.id;
            }) : [];
            
            const groupId = 'group-' + rb;
            const isCollapsed = localStorage.getItem(groupId + '-collapsed') === 'true';
            
            if (isPendingGroup) {
                // Special rendering for PENDING group
                html += '<div class="card" id="group-' + rb + '" style="margin-bottom: 8px; border-left: 6px solid #f59e0b; background: #fef3c7; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1px; padding: 8px 12px;">' +
                    '<h3 style="color: #f59e0b; margin: 0; display: flex; align-items: center; gap: 6px; font-size: 18px; font-weight: 700; font-family: \'SF Pro Display\', -apple-system, BlinkMacSystemFont, \'Inter\', sans-serif; letter-spacing: -0.3px; line-height: 1.1;">' +
                    '⚠️ Neklasificirani rezultati (' + groupItems.length + '):' +
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
                const isGroupSelected = window.selectedGroups.has(rb);
                html += '<div class="card" id="group-' + rb + '" style="margin-bottom: 3px; border-left: 6px solid #7c3aed; font-family: -apple-system, BlinkMacSystemFont, sans-serif; ' + (isGroupSelected ? 'background: #f0fdf4; box-shadow: 0 0 8px rgba(22, 163, 74, 0.3);' : '') + '">' +
                '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1px; padding: 6px 8px;">' +
                '<h3 style="color: #7c3aed; margin: 0; display: flex; align-items: center; gap: 6px; font-size: 18px; font-weight: 700; font-family: \'SF Pro Display\', -apple-system, BlinkMacSystemFont, \'Inter\', sans-serif; letter-spacing: -0.3px; line-height: 1.1;">' +
                'Grupa ' + rb + ':' +
                '<button onclick="toggleGroup(\'' + groupId + '\')" style="background: none; border: none; cursor: pointer; font-size: 16px; color: #7c3aed; margin: 0 2px;" title="Skupi/Proširi grupu">' +
                (isCollapsed ? '▶️' : '🔽') + '</button>' + troskovnikName + '</h3>' +
                '<div style="text-align: right; display: flex; flex-direction: column; gap: 0;">' +
                '<div style="font-size: 13px; color: #6b7280; font-family: inherit; line-height: 1.0; font-weight: 600;">' + groupSelectedCount + '/' + groupItems.length + ' odabrano • 🟢 ' + ourArticlesInGroup + ' naših • 💰 ' + withPricesInGroup + ' s cijenama</div>' +
                '<div style="font-size: 13px; color: #7c3aed; font-weight: 700; font-family: inherit; line-height: 1.0;">Nabavna: €' + groupPurchasingValue.toFixed(2) + '</div>' +
                '<div style="font-size: 16px; color: #059669; font-weight: 800; font-family: inherit; line-height: 1.0;">UDIO: ' + groupShare.toFixed(1) + '%</div>' +
                '<div style="font-size: 11px; color: #6b7280; font-family: inherit; line-height: 1.0; font-weight: 500;">' + troskovnikQuantity + ' × €' + lowestPrice.toFixed(2) + '</div>' +
                '<div style="display: flex; gap: 3px; justify-content: flex-end;">' +
                '<button class="btn ' + (isGroupSelected ? 'btn-success' : 'btn-outline') + '" onclick="toggleGroupSelection(' + rb + ')" style="padding: 1px 6px; font-size: 11px; font-family: inherit; line-height: 1.0; background: ' + (isGroupSelected ? '#16a34a' : '#e5e7eb') + '; color: ' + (isGroupSelected ? 'white' : '#374151') + '; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;" title="Označi grupu za Popratiti">' + (isGroupSelected ? '✅ POPRATITI' : '📍 POPRATITI') + '</button>' +
                '<button class="btn btn-success" onclick="scrollToTroskovnikForRB(' + rb + ')" style="padding: 1px 6px; font-size: 11px; font-family: inherit; line-height: 1.0; background: #059669; color: white;" title="Idi na troškovnik RB ' + rb + '">📋 Trošk.</button>' +
                '<button class="btn btn-warning" onclick="openManualEntryModal(' + rb + ')" style="padding: 1px 6px; font-size: 11px; font-family: inherit; line-height: 1.0; background: #f59e0b; color: white; font-weight: bold;" title="Ručno dodaj stavku u RB ' + rb + '">➕ Dodaj</button>' +
                '<button class="btn btn-purple" onclick="clearGroup(' + rb + ')" style="padding: 1px 3px; font-size: 11px; font-family: inherit; line-height: 1.0;" title="Obriši cijelu grupu">🗑️</button>' +
                '</div></div></div>';
            }

            // Common content for both PENDING and numbered groups
            // Check if group is empty
            if (sortedItems.length === 0) {
                // Empty group - show message
                html += '<div id="' + groupId + '-content" style="display: ' + (isCollapsed ? 'none' : 'block') + '; padding: 20px; text-align: center; background: #fafafa; border-radius: 8px; margin: 10px;">' +
                    '<div style="font-size: 18px; color: #6b7280; margin-bottom: 8px;">📭</div>' +
                    '<div style="font-size: 14px; color: #6b7280; font-weight: 500;">Nema rezultata u ovoj grupi</div>' +
                    '<div style="font-size: 13px; color: #9ca3af; margin-top: 4px;">Kliknite <strong style="color: #f59e0b;">➕ Dodaj</strong> za ručni unos stavke</div>' +
                    '</div></div>';
            } else {
                // Group has items - render table
                html += '<div id="' + groupId + '-content" style="display: ' + (isCollapsed ? 'none' : 'block') + ';">' +
                    '<div class="table-container"><table class="table" style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 16px; border-spacing: 0; border-collapse: separate; width: 100%;"><thead><tr style="background: #f8fafc;">' +
                    '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 80px;">Šifra</th>' +
                    '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 200px;">Naziv</th>' +
                    '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 40px;">J.M.</th>' +
                    '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 70px;">VPC</th>' +
                    '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 80px;">VPC/kg</th>' +
                    '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 90px;">€</th>' +
                    '<th style="padding: 2px; font-size: 14px; font-weight: 700; line-height: 0.9; width: 90px; color: #6b7280;">€/kg<br><small style="font-size: 10px; font-weight: 400;">(auto)</small></th>' +
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

                // VIZUALNI PRIKAZ: Koristi isOurArticleVisual() za zeleno/ljubičasto
                const isOurArticle = window.isOurArticleVisual(item.source);

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
                        // Our articles unselected - STRONGER GREEN (not pale yellow-green)
                        rowStyle = 'background: #dcfce7; opacity: 1.0; line-height: 0.9; height: 35px; border-left: 2px solid #16a34a;';
                    } else {
                        // External articles unselected - light purple
                        rowStyle = 'background: #e9d5ff; opacity: 1.0; line-height: 0.9; height: 35px; border-left: 2px solid #7c3aed;';
                    }
                }

                const price = item.price || 0;
                const calculatedWeight = item.calculatedWeight || item.weight || extractWeight(item.name, item.unit) || 0;
                const originalPricePerKg = calculatedWeight > 0 ? price / calculatedWeight : 0;
                const userPricePerPiece = item.pricePerPiece || 0;

                // CRITICAL FIX: €/kg = Cijena u polju (€) / Težina u editabilnom polju
                // Ako korisnik ima cijenu, trebaj je prati sa težinom
                const userPricePerKg = userPricePerPiece > 0 && calculatedWeight > 0
                    ? Math.round((userPricePerPiece / calculatedWeight) * 100) / 100
                    : originalPricePerKg;

                // ✅ Get last year's price ONLY for "NAŠ" articles (to prevent mixing with external articles)
                const lastYearPrice = (isOurArticle && window.getProslogodisnjaCijena) ?
                    window.getProslogodisnjaCijena(item.code) : null;
                
                const pieceValidation = validatePrice(userPricePerPiece);
                const kgValidation = validatePrice(userPricePerKg);
                const pieceClass = isOurArticle ? (pieceValidation === 'valid' ? 'price-input valid' : 
                                           pieceValidation === 'invalid' ? 'price-input invalid' : 'price-input') : '';
                const kgClass = isOurArticle ? (kgValidation === 'valid' ? 'price-input valid' : 
                                        kgValidation === 'invalid' ? 'price-input invalid' : 'price-input') : '';
                
                // Removed: lowest price highlighting and rank badges
                const priceStyle = 'font-size: 15px; font-weight: 600;';

                // First choice indicator - pokazuje se pored šifre
                const firstChoiceIndicator = item.isFirstChoice === true ?
                    '<span style="background: #059669; color: white; padding: 2px 6px; border-radius: 6px; font-size: 14px; margin-right: 6px; display: inline-block; cursor: default;">⭐</span>' :
                    '<span style="background: #d1d5db; color: #6b7280; padding: 2px 6px; border-radius: 6px; font-size: 14px; margin-right: 6px; display: inline-block; cursor: pointer;" onclick="promoteToFirstChoice(\'' + resultKey + '\')" title="Klikni za postavljanje kao prvi izbor">☆</span>';

                html += '<tr style="' + rowStyle + '" class="result-row">' +
                    '<td style="padding: 1px; font-weight: 700; font-size: 15px; line-height: 0.9; vertical-align: middle;">' +
                    firstChoiceIndicator + (item.code || '') + '</td>' +
                    '<td style="padding: 1px; max-width: 200px; font-size: 15px; line-height: 0.9; vertical-align: middle;" title="' + (item.name || '') + '">' + (item.name || '') + '</td>' +
                    '<td style="padding: 1px; text-align: center; font-size: 14px; line-height: 0.9; vertical-align: middle;">' + (item.unit || '') + '</td>' +
                    '<td style="padding: 1px; text-align: right; vertical-align: middle;"><span style="' + priceStyle + '">€' + price.toFixed(2) + '</span></td>' +
                    '<td style="padding: 1px; text-align: right; vertical-align: middle;"><span style="font-weight: 700; font-size: 14px; color: #92400e; line-height: 0.9;">€' + originalPricePerKg.toFixed(3) + '/kg</span>' +
                    '<div style="font-size: 11px; color: #6b7280; line-height: 0.8;">Nabavna/kg</div></td>';

                if (isOurArticle) {
                    html += '<td style="padding: 1px; vertical-align: middle;"><div class="price-input-group">' +
                        '<div class="price-input-label" style="font-size: 12px; color: #16a34a; line-height: 0.8; font-weight: 700;">€</div>' +
                        '<input type="number" step="0.01" value="' + userPricePerPiece.toFixed(2) + '" class="' + pieceClass + '" ' +
                        'onchange="updateResultPrice(\'' + resultKey + '\', \'pricePerPiece\', this.value)" onfocus="this.select()" placeholder="0.00" title="Unesite izlaznu cijenu" ' +
                        'style="width: 80px; padding: 1px; border: 2px solid #16a34a; background: #ecfdf5; color: #16a34a; border-radius: 3px; font-size: 14px; line-height: 0.9; font-weight: 700;">' +
                        '<div class="price-sync-indicator" style="font-size: 10px; color: #16a34a; line-height: 0.8; font-weight: 600;">' + (item.hasUserPrice && item.userPriceType === 'pricePerPiece' ? '✓' : '↻') + '</div></div></td>' +
                        '<td style="padding: 1px; text-align: center; vertical-align: middle;">' +
                        '<div style="color: #059669; font-weight: 700; font-size: 14px; line-height: 0.9;">€' + userPricePerKg.toFixed(2) + '/kg</div>' +
                        '<div style="font-size: 10px; color: #6b7280; line-height: 0.8;">Auto</div></td>';
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

                // VIZUALNI PRIKAZ: Koristi isOurArticleVisual() za badge
                const isOur = window.isOurArticleVisual(item.source);
                const badgeClass = getBadgeClass(item.source);

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
            } // End of if-else for empty/filled groups
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
    if (result && (!window.isTrulyOurArticle(result.source, result.code) || result.isManualEntry)) {
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
                            window.isTrulyOurArticle(item.source, item.code) ? 'Da' : 'Ne',
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

/**
 * NEW: Re-classify all results after state load or price list load
 * This ensures proper green/purple colors for LAGER/URPD articles
 * IMPROVED: Always sets isOurArticle flag, not just when changed
 */
function reclassifyResultsAfterStateLoad() {
    if (!results || results.length === 0) {
        console.log('⚠️ No results to reclassify');
        return;
    }

    console.log('🔄 Re-classifying', results.length, 'results...');

    let updated = 0;
    let lagerUrpdCount = 0;
    let externalCount = 0;

    results.forEach(result => {
        if (result.source) {
            // Re-evaluate classification using current isTrulyOurArticle logic
            const wasOur = result.isOurArticle || false;
            const isNowOur = window.isTrulyOurArticle(result.source, result.code);

            // IMPROVED: ALWAYS update the flag (not just when changed)
            result.isOurArticle = isNowOur;

            if (wasOur !== isNowOur) {
                updated++;
                console.log(`  ✅ Changed: ${result.name} | ${result.source} | Was: ${wasOur} → Now: ${isNowOur}`);
            }

            // Count for statistics
            if (isNowOur) {
                lagerUrpdCount++;
            } else {
                externalCount++;
            }
        }
    });

    console.log(`✅ Re-classification complete:`);
    console.log(`   - Changed: ${updated} results`);
    console.log(`   - 🏠 NAŠ (LAGER/URPD): ${lagerUrpdCount}`);
    console.log(`   - 📋 PO CJENIKU (external): ${externalCount}`);

    // NOTE: Display refresh removed from here
    // The state-manager.js will call updateResultsDisplay() after all databases are ready (with 100ms delay)
    // This prevents premature display before weightDatabase/pdvDatabase are fully loaded
    console.log('⏳ Display refresh will be triggered by state-manager after all databases are ready');
}

window.reclassifyResultsAfterStateLoad = reclassifyResultsAfterStateLoad;

/**
 * NEW: Opens modal for manual entry into a group
 * @param {number} rb - RB number for the group
 */
function openManualEntryModal(rb) {
    // Check if modal already exists, remove it
    const existingModal = document.getElementById('manualEntryModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Get troskovnik info for this RB
    const troskovnikItem = getTroskovnikItemForRB(rb);
    const troskovnikName = troskovnikItem ? troskovnikItem.naziv_artikla : 'Stavka ' + rb;

    // Check if this will be first or second choice
    const existingResultsInGroup = results.filter(r => r.rb == rb);
    const isFirstChoice = existingResultsInGroup.length === 0;
    const choiceLabel = isFirstChoice ? 'Prvi izbor ⭐' : 'Drugi izbor';

    // Create modal HTML
    const modalHTML = `
        <div id="manualEntryModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 500px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <h2 style="margin: 0 0 8px 0; color: #f59e0b; font-size: 20px; font-weight: 700;">
                    ➕ Ručni unos stavke
                </h2>
                <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
                    RB ${rb}: ${troskovnikName}
                </p>
                <p style="margin: 0 0 20px 0; padding: 8px 12px; background: ${isFirstChoice ? '#dcfce7' : '#fef3c7'}; border-radius: 6px; color: ${isFirstChoice ? '#059669' : '#f59e0b'}; font-size: 13px; font-weight: 600;">
                    ${choiceLabel}${!isFirstChoice ? ' - Prodajna cijena nije obavezna' : ''}
                </p>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; color: #374151;">Naziv artikla <span style="color: #dc2626;">*</span></label>
                    <input type="text" id="manualEntryNaziv" placeholder="Unesite naziv artikla"
                        style="width: 100%; padding: 8px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 14px;" />
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; color: #374151;">Mjerna jedinica <span style="color: #dc2626;">*</span></label>
                    <input type="text" id="manualEntryJM" placeholder="npr. kom, kg, l"
                        style="width: 100%; padding: 8px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 14px;" />
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; color: #374151;">Težina (kg) <span style="color: #dc2626;">*</span></label>
                        <input type="number" step="0.001" id="manualEntryTezina" placeholder="0.000"
                            style="width: 100%; padding: 8px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 14px;" />
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; color: #374151;">PDV stopa <span style="color: #dc2626;">*</span></label>
                        <select id="manualEntryPDV"
                            style="width: 100%; padding: 8px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                            <option value="25">25%</option>
                            <option value="5">5%</option>
                        </select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; color: #374151;">Nabavna cijena (€) <span style="color: #dc2626;">*</span></label>
                        <input type="number" step="0.01" id="manualEntryNabavna" placeholder="0.00"
                            style="width: 100%; padding: 8px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 14px;" />
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; color: #374151;">
                            Prodajna cijena (€) ${isFirstChoice ? '<span style="color: #dc2626;">*</span>' : '<span style="color: #9ca3af;">(opcionalno)</span>'}
                        </label>
                        <input type="number" step="0.01" id="manualEntryProdajna" placeholder="0.00"
                            style="width: 100%; padding: 8px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 14px;" />
                    </div>
                </div>

                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button onclick="closeManualEntryModal()"
                        style="padding: 10px 20px; border: 2px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        Odustani
                    </button>
                    <button onclick="submitManualEntry(${rb})"
                        style="padding: 10px 20px; border: none; background: #f59e0b; color: white; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        ➕ Dodaj stavku
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Focus first input
    setTimeout(() => {
        document.getElementById('manualEntryNaziv').focus();
    }, 100);

    // Add ESC key handler
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeManualEntryModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

/**
 * NEW: Closes manual entry modal
 */
function closeManualEntryModal() {
    const modal = document.getElementById('manualEntryModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * NEW: Submits manual entry form and adds to results
 * @param {number} rb - RB number for the group
 */
function submitManualEntry(rb) {
    // Get form values
    const naziv = document.getElementById('manualEntryNaziv').value.trim();
    const jm = document.getElementById('manualEntryJM').value.trim();
    const tezina = parseFloat(document.getElementById('manualEntryTezina').value) || 0;
    const pdv = parseInt(document.getElementById('manualEntryPDV').value) || 25;
    const nabavna = parseFloat(document.getElementById('manualEntryNabavna').value) || 0;
    const prodajna = parseFloat(document.getElementById('manualEntryProdajna').value) || 0;

    // Check if group already has results
    const existingResultsInGroup = results.filter(r => r.rb == rb);
    const isFirstChoice = existingResultsInGroup.length === 0;

    // Validation
    if (!naziv) {
        alert('Molimo unesite naziv artikla!');
        document.getElementById('manualEntryNaziv').focus();
        return;
    }
    if (!jm) {
        alert('Molimo unesite mjernu jedinicu!');
        document.getElementById('manualEntryJM').focus();
        return;
    }
    if (tezina <= 0) {
        alert('Molimo unesite važeću težinu (veću od 0)!');
        document.getElementById('manualEntryTezina').focus();
        return;
    }
    if (nabavna <= 0) {
        alert('Molimo unesite važeću nabavnu cijenu (veću od 0)!');
        document.getElementById('manualEntryNabavna').focus();
        return;
    }

    // NEW: Prodajna cijena je OBAVEZNA samo za prvi izbor
    if (isFirstChoice && prodajna <= 0) {
        alert('Molimo unesite važeću prodajnu cijenu (veću od 0)!\n\nNapomena: Za prvi izbor prodajna cijena je obavezna.');
        document.getElementById('manualEntryProdajna').focus();
        return;
    }

    // Generate unique ID and code
    const timestamp = Date.now();
    const uniqueID = results.length > 0 ? Math.max(...results.map(r => r.id)) + 1 : 1;
    const code = 'MANUAL-' + timestamp;

    // Calculate pricePerKg (only if prodajna is provided)
    const pricePerKg = prodajna > 0 ? prodajna / tezina : 0;

    // Create manual entry result object
    const manualEntry = {
        id: uniqueID,
        rb: rb,
        code: code,
        name: naziv,
        unit: jm,
        price: nabavna,
        pricePerPiece: prodajna,  // Can be 0 for second choice
        pricePerKg: Math.round(pricePerKg * 100) / 100,
        calculatedWeight: tezina,
        weight: tezina,
        source: 'MANUAL_ENTRY',
        supplier: 'Ručni unos',
        date: new Date().toISOString(),
        hasUserPrice: isFirstChoice && prodajna > 0,  // Only first choice with price has user price
        userPriceType: prodajna > 0 ? 'pricePerPiece' : null,
        isFirstChoice: isFirstChoice,
        isManualEntry: true,
        customPdvStopa: pdv,
        pdvStopa: pdv,
        tarifniBroj: ''
    };

    // Add to results array
    results.push(manualEntry);

    // Add to selected results
    const resultKey = uniqueID + '-' + rb;
    selectedResults.add(resultKey);

    // Update troškovnik if this is first choice
    if (isFirstChoice && typeof window.troskovnik !== 'undefined') {
        const troskovnikItem = troskovnik.find(t => t.redni_broj == rb);
        if (troskovnikItem) {
            troskovnikItem.nabavna_cijena_1 = Math.round(nabavna * 100) / 100;
            troskovnikItem.izlazna_cijena = Math.round(prodajna * 100) / 100;
            troskovnikItem.dobavljac_1 = 'Ručni unos';

            // Calculate RUC/KG
            const ruc = troskovnikItem.izlazna_cijena - troskovnikItem.nabavna_cijena_1;
            const weight = parseFloat(troskovnikItem.tezina) || 0;
            if (weight > 0) {
                troskovnikItem.ruc_per_kg = Math.round((ruc / weight) * 100) / 100;
            } else {
                troskovnikItem.ruc_per_kg = 0;
            }

            // Update troškovnik display
            if (typeof updateTroskovnikDisplay === 'function') {
                updateTroskovnikDisplay();
            }
            if (typeof refreshTroskovnikColors === 'function') {
                refreshTroskovnikColors();
            }
        }
    }

    // Close modal
    closeManualEntryModal();

    // Update results display
    updateResultsDisplay();

    // Show success message
    const choiceText = isFirstChoice ? 'prvi izbor ⭐' : 'drugi izbor';
    showMessage('success', `Dodana ručna stavka "${naziv}" kao ${choiceText} u RB ${rb}`, null, 3000);

    console.log(`✅ Manual entry added: "${naziv}" as ${choiceText} to RB ${rb}`);
}

// Expose new functions globally
window.openManualEntryModal = openManualEntryModal;
window.closeManualEntryModal = closeManualEntryModal;
window.submitManualEntry = submitManualEntry;

/**
 * NEW: Toggles group selection for "Popratiti" export
 * @param {number} rb - RB number to toggle
 */
function toggleGroupSelection(rb) {
    if (window.selectedGroups.has(rb)) {
        window.selectedGroups.delete(rb);
        console.log(`🔓 Grupa ${rb} odznačena za praćenje`);
    } else {
        window.selectedGroups.add(rb);
        console.log(`✅ Grupa ${rb} označena za praćenje (Popratiti)`);
    }
    // Refresh display to show visual feedback
    updateResultsDisplay();
}

/**
 * NEW: Exports selected groups as "popratiti.xlsx" Excel file
 * Used to track which articles to order if tender passes
 * @param {boolean} returnBlob - If true, returns Blob instead of downloading (for ZIP integration)
 */
function exportPopratuToExcel(returnBlob = false) {
    if (window.selectedGroups.size === 0) {
        if (!returnBlob) {
            showMessage('warning', '⚠️ Nema označenih grupa! Molimo označite grupe koje trebate pratiti.');
        }
        return null;
    }

    try {
        // Prepare data for Excel
        const exportData = [];

        window.selectedGroups.forEach(rb => {
            // Get troskovnik item for this RB
            const troskovnikItem = window.troskovnik ? window.troskovnik.find(t => t.redni_broj == rb) : null;

            if (!troskovnikItem) return;

            // Get all results for this RB (SVE rezultate, ne samo prvi izbor!)
            const groupItems = window.results.filter(r => r.rb == rb);

            // NOVO: Eksportiraj SVE rezultate iz grupe
            groupItems.forEach(item => {
                // Use date from item if available, otherwise use current date
                const itemDate = item.date ? new Date(item.date).toLocaleDateString('hr-HR') : new Date().toLocaleDateString('hr-HR');

                // Get J.M. from troskovnik
                const jmTroskovnika = troskovnikItem.mjerna_jedinica || troskovnikItem.jedinica_mjere || '';

                // Calculate price per kilogram for nabavna cijena
                const itemWeight = item.calculatedWeight || item.weight || 0;
                const itemPrice = item.price || 0;
                const pricePerKg = itemWeight > 0 ? itemPrice / itemWeight : 0;

                exportData.push({
                    'RB': rb,
                    'Naziv': troskovnikItem.naziv_artikla || '',
                    'Šifra': item.code || '',
                    'Naziv artikla': item.name || '',
                    'Dobavljač': item.supplier || '',
                    'Nabavna cijena (€)': itemPrice.toFixed(2),
                    'J.M.': jmTroskovnika,
                    'Količina': troskovnikItem.trazena_kolicina || 1,
                    'Količina za narudžbu': '', // Empty field for user to fill
                    'Izvor': item.source || 'Nepoznato',
                    'Datum': itemDate
                });
            });
        });

        if (exportData.length === 0) {
            if (!returnBlob) {
                showMessage('error', '❌ Nema podataka za export!');
            }
            return null;
        }

        // Create workbook and worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Popratiti');

        // Format columns (NOVO: J.M. umjesto Cijena, bez "Cijena (€)" stupca)
        ws['!cols'] = [
            { wch: 6 },   // RB
            { wch: 25 },  // Naziv
            { wch: 12 },  // Šifra
            { wch: 30 },  // Naziv artikla
            { wch: 20 },  // Dobavljač
            { wch: 14 },  // Nabavna cijena
            { wch: 8 },   // J.M.
            { wch: 12 },  // Količina
            { wch: 18 },  // Količina za narudžbu
            { wch: 20 },  // Izvor
            { wch: 12 }   // Datum
        ];

        // Format header row
        const headerStyle = {
            fill: { fgColor: { rgb: 'FF7C3AED' } }, // Purple background
            font: { bold: true, color: { rgb: 'FFFFFFFF' } }, // White text
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
        };

        for (let col = 0; col < 11; col++) {
            const cellAddress = XLSX.utils.encode_col(col) + '1';
            if (ws[cellAddress]) {
                ws[cellAddress].s = headerStyle;
            }
        }

        // If returnBlob is true, return the Excel file as Blob (for ZIP integration)
        if (returnBlob) {
            // Return as array buffer for JSZip
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            return wbout;
        }

        // Otherwise, download directly
        const filenames = generateTenderFilenames('Popratiti', 'xlsx');
        const filename = `${filenames.datumPredaje}_${filenames.cleanGrupa}_${filenames.cleanKupac}_Popratiti.xlsx`;

        // Save file
        XLSX.writeFile(wb, filename);

        showMessage('success',
            `✅ Popratiti Excel file exportan!\n\n` +
            `📁 Datoteka: ${filename}\n` +
            `📊 Stavki: ${exportData.length}\n\n` +
            `💡 Ovaj file koristi za praćenje narudžbi ako prođete natječaj!\n` +
            `✍️ Popunite "Količina za narudžbu" stupac s količinama koje trebate naručiti.`
        );

        console.log(`✅ Popratiti Excel exported: ${filename} (${exportData.length} stavki) - Stupci: RB, Naziv, Šifra, Naziv artikla, Dobavljač, Nabavna cijena, J.M., Količina, Količina za narudžbu, Izvor, Datum`);
        return null;

    } catch (error) {
        console.error('❌ Popratiti export error:', error);
        if (!returnBlob) {
            showMessage('error', `Greška pri exportu: ${error.message}`);
        }
        return null;
    }
}

/**
 * NEW: Promotes a result to first choice with price entry modal
 * @param {string} resultKey - Result key (id-rb)
 */
function promoteToFirstChoice(resultKey) {
    const [id, rb] = resultKey.split('-');
    const newFirstChoice = results.find(r => r.id == id && r.rb == rb);

    if (!newFirstChoice) {
        showMessage('error', 'Rezultat nije pronađen!');
        return;
    }

    if (newFirstChoice.isFirstChoice) {
        showMessage('info', 'Ovaj artikl je već prvi izbor.');
        return;
    }

    // Get troskovnik info for this RB
    const troskovnikItem = getTroskovnikItemForRB(rb);
    if (!troskovnikItem) {
        showMessage('error', 'Grupa nije pronađena u troškovniku!');
        return;
    }

    // Get current first choice to remove price from it
    const currentFirstChoice = results.find(r => r.rb == rb && r.isFirstChoice);

    // Check if modal already exists
    const existingModal = document.getElementById('promoteToFirstChoiceModal');
    if (existingModal) {
        existingModal.remove();
    }

    const troskovnikWeight = parseFloat(troskovnikItem.tezina) || 1;
    const newArticleWeight = newFirstChoice.calculatedWeight || newFirstChoice.weight || 0;

    const modalHTML = `
        <div id="promoteToFirstChoiceModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 500px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <h2 style="margin: 0 0 8px 0; color: #059669; font-size: 20px; font-weight: 700;">
                    ⭐ Postavi kao prvi izbor
                </h2>
                <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
                    Grupa RB ${rb}: ${troskovnikItem.naziv_artikla}
                </p>

                <div style="margin: 0 0 20px 0; padding: 12px; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px;">
                    <div style="font-weight: 600; color: #16a34a; margin-bottom: 4px;">Novi prvi izbor:</div>
                    <div style="font-size: 15px; color: #1f2937; margin-bottom: 2px;">${newFirstChoice.name}</div>
                    <div style="font-size: 13px; color: #6b7280;">Težina: ${newArticleWeight.toFixed(3)}kg</div>
                </div>

                <div style="margin: 0 0 20px 0; padding: 12px; background: #f3f4f6; border-left: 4px solid #6b7280; border-radius: 4px;">
                    <div style="font-weight: 600; color: #6b7280; margin-bottom: 4px;">Tražena težina (Troškovnik):</div>
                    <div style="font-size: 15px; color: #1f2937;">${troskovnikWeight.toFixed(3)}kg</div>
                </div>

                ${currentFirstChoice ? `
                    <div style="margin: 0 0 20px 0; padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                        <div style="font-weight: 600; color: #f59e0b; margin-bottom: 4px;">Stari prvi izbor:</div>
                        <div style="font-size: 13px; color: #6b7280;">Cijena će biti obrisana</div>
                    </div>
                ` : ''}

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; color: #374151;">
                        Unesite cijenu (€) za ${newFirstChoice.unit} <span style="color: #dc2626;">*</span>
                    </label>
                    <input type="number" step="0.01" id="promotePrice" placeholder="0.00" min="0.01" max="50"
                        style="width: 100%; padding: 10px; border: 2px solid #16a34a; border-radius: 6px; font-size: 14px; font-weight: 600;" autofocus />
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                        💡 Unesena cijena će biti automatski preračunata na ${troskovnikWeight.toFixed(3)}kg
                    </div>
                </div>

                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button onclick="closePromoteModal()"
                        style="padding: 10px 20px; border: 2px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        Odustani
                    </button>
                    <button onclick="confirmPromoteToFirstChoice('${resultKey}', ${rb}, ${newArticleWeight}, ${troskovnikWeight})"
                        style="padding: 10px 20px; border: none; background: #059669; color: white; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        ⭐ Postavi
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Focus price input
    setTimeout(() => {
        document.getElementById('promotePrice').focus();
    }, 100);

    // ESC key handler
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closePromoteModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

/**
 * NEW: Closes promote modal
 */
function closePromoteModal() {
    const modal = document.getElementById('promoteToFirstChoiceModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * NEW: Confirms promotion to first choice and applies price
 */
function confirmPromoteToFirstChoice(resultKey, rb, newArticleWeight, troskovnikWeight) {
    const priceInput = document.getElementById('promotePrice').value.trim();
    const price = parseFloat(priceInput);

    // Validation
    if (!price || isNaN(price) || price <= 0) {
        alert('Molimo unesite važeću cijenu (veću od 0)!');
        document.getElementById('promotePrice').focus();
        return;
    }

    if (price < 0.50 || price > 50.00) {
        alert('Cijena mora biti između €0.50 i €50.00!');
        document.getElementById('promotePrice').focus();
        return;
    }

    const [id, rbStr] = resultKey.split('-');
    const newFirstChoice = results.find(r => r.id == id && r.rb == rb);

    if (!newFirstChoice) {
        showMessage('error', 'Rezultat nije pronađen!');
        return;
    }

    // Find current first choice to remove price
    const currentFirstChoice = results.find(r => r.rb == rb && r.isFirstChoice);
    const troskovnikItem = getTroskovnikItemForRB(rb);

    if (!troskovnikItem) {
        showMessage('error', 'Grupa nije pronađena!');
        return;
    }

    // STEP 1: Remove price from old first choice
    if (currentFirstChoice) {
        currentFirstChoice.isFirstChoice = false;
        currentFirstChoice.pricePerPiece = 0;
        currentFirstChoice.pricePerKg = 0;
        currentFirstChoice.hasUserPrice = false;
        currentFirstChoice.userPriceType = null;
    }

    // STEP 2: Calculate price for troškovnik weight
    // Formula: price_for_troskovnik_weight = (user_price / new_article_weight) × troskovnik_weight
    const pricePerKg = price / newArticleWeight;
    const priceFrTroskovnikWeight = pricePerKg * troskovnikWeight;

    // STEP 3: Set new first choice
    newFirstChoice.isFirstChoice = true;
    newFirstChoice.pricePerPiece = Math.round(price * 100) / 100;
    newFirstChoice.pricePerKg = Math.round(pricePerKg * 100) / 100;
    newFirstChoice.hasUserPrice = true;
    newFirstChoice.userPriceType = 'pricePerPiece';

    // STEP 4: Update troškovnik
    troskovnikItem.nabavna_cijena_1 = Math.round(pricePerKg * 100) / 100;
    troskovnikItem.izlazna_cijena = Math.round(priceFrTroskovnikWeight * 100) / 100;
    troskovnikItem.dobavljac_1 = newFirstChoice.supplier || '';

    // Calculate RUC/KG
    const ruc = troskovnikItem.izlazna_cijena - troskovnikItem.nabavna_cijena_1;
    const weight = parseFloat(troskovnikItem.tezina) || 0;
    if (weight > 0) {
        troskovnikItem.ruc_per_kg = Math.round((ruc / weight) * 100) / 100;
    } else {
        troskovnikItem.ruc_per_kg = 0;
    }

    // Close modal
    closePromoteModal();

    // Update displays
    if (typeof updateResultsDisplay === 'function') {
        updateResultsDisplay();
    }
    if (typeof updateTroskovnikDisplay === 'function') {
        updateTroskovnikDisplay();
    }
    if (typeof refreshTroskovnikColors === 'function') {
        refreshTroskovnikColors();
    }

    // Show success message
    const oldOldFirstChoice = currentFirstChoice ? currentFirstChoice.name : 'Bez izbora';
    showMessage('success',
        `✅ "${newFirstChoice.name}" je sada prvi izbor\n💰 Cijena: €${price} (preračunato: €${priceFrTroskovnikWeight.toFixed(2)} za ${troskovnikWeight.toFixed(3)}kg)`,
        null, 4000);

    console.log(`⭐ Promoted "${newFirstChoice.name}" to first choice for RB ${rb}`);
    console.log(`   Original weight: ${newArticleWeight.toFixed(3)}kg`);
    console.log(`   Troškovnik weight: ${troskovnikWeight.toFixed(3)}kg`);
    console.log(`   User price: €${price}`);
    console.log(`   Price for troškovnik: €${priceFrTroskovnikWeight.toFixed(2)}`);
}

// Expose new functions globally
window.promoteToFirstChoice = promoteToFirstChoice;
window.closePromoteModal = closePromoteModal;
window.confirmPromoteToFirstChoice = confirmPromoteToFirstChoice;
window.toggleGroupSelection = toggleGroupSelection;
window.exportPopratuToExcel = exportPopratuToExcel;

// console.log('✅ FIXED Enhanced results module loaded:');
// console.log('🎨 FIXED: All red colors changed to purple (#7c3aed)');
// console.log('💰 FIXED: Nabavna vrijednost color changed to purple');
// console.log('🗑️ FIXED: Delete buttons now use purple background');
// console.log('⚠️ FIXED: Error messages use purple colors');
// console.log('📊 Enhanced price management and VPC/kg column ready');
console.log('✅ NEW: Manual entry functionality added - empty groups now visible with ➕ button');