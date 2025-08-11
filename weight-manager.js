/**
 * KOMPLETNI WEIGHT MANAGER WITH GOOGLE SHEETS INTEGRATION
 * Potpuno funkcionalna verzija s Google Sheets real-time sync
 */

// Global weight database
let weightDatabase = new Map();
let pdvDatabase = new Map(); // PDV database for O(1) access to VAT rates
let weightTableData = [];
let currentSortColumn = null;
let currentSortDirection = 'asc';
let weightsSearchFilter = ''; // Search filter for weights table

// Configuration
const WEIGHT_CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzirDW4yrVeqxrH3Y0UN-zDUKEeKMfA9PWUC9hnrBri8Kvb4ZUS1Gm68FArxho0C54X-g/exec',
    SHEET_NAME: 'artiklitezine',
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

/**
 * PDV MAPPING FUNCTION - Maps tarifni broj to PDV stopa
 */
function mapTarifniBrojToPDV(tarifniBroj) {
    if (!tarifniBroj) return 0;
    
    const tb = tarifniBroj.toString().trim();
    
    switch (tb) {
        case '1': return 25;
        case '10':
        case '2':
        case '5':
        case '7':
            return 5;
        case '13': return 13; // Add if needed
        default:
            return 0;
    }
}

/**
 * ENHANCED: Get weight and PDV data for article
 */
function getArticleWeightAndPDV(code, name, unit, source) {
    let weight = 0;
    let tarifniBroj = '';
    let pdvStopa = 0;
    
    // If šifra exists in database, use it
    if (code && weightDatabase.has(code)) {
        weight = weightDatabase.get(code);
        
        // Get PDV data from weightTableData
        const weightData = weightTableData.find(item => item.sifra === code);
        if (weightData) {
            tarifniBroj = weightData.tarifniBroj || '';
            pdvStopa = weightData.pdvStopa || 0;
        }
        
        // // console.log(`🎯 Database data for ${code}: ${weight}kg, TB: ${tarifniBroj}, PDV: ${pdvStopa}%`);
    } else {
        // Fallback to parsing
        weight = window.extractWeight ? window.extractWeight(name, unit) : 0;
        // // console.log(`📝 Parsed weight for ${code}: ${weight}kg (no PDV data)`);
    }
    
    return {
        weight: weight,
        tarifniBroj: tarifniBroj,
        pdvStopa: pdvStopa
    };
}

/**
 * Legacy function for backward compatibility
 */
function getArticleWeight(code, name, unit, source) {
    const data = getArticleWeightAndPDV(code, name, unit, source);
    return data.weight;
}

/**
 * Get PDV stopa (VAT rate) for article code - O(1) access
 */
function getPDVStopa(code) {
    if (!code) return 0;
    return pdvDatabase.has(code) ? pdvDatabase.get(code) : 0;
}

/**
 * GOOGLE SHEETS INTEGRATION - MAIN FUNCTIONS
 */

/**
 * Test Google Sheets connection
 */
async function testGoogleSheetsConnection() {
    try {
        // // console.log('🔍 Testing Google Sheets connection...');
        
        const response = await fetch(`${WEIGHT_CONFIG.GOOGLE_SCRIPT_URL}?action=test`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        // // console.log('✅ Google Sheets connection test result:', result);
        
        if (result.status === 'ok') {
            return {
                success: true,
                message: 'Google Sheets connection working',
                config: result.config
            };
        } else {
            throw new Error('Google Sheets test failed: ' + result.message);
        }
        
    } catch (error) {
        console.error('❌ Google Sheets connection test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Import weights from Google Sheets
 */
async function importFromGoogleSheets() {
    console.log('🔥🔥🔥 JEBENI DEBUG: importFromGoogleSheets POČINJE!');
    
    try {
        console.log('🔥 JEBENI DEBUG: Testiram Google Sheets vezu...');
        // First test the connection
        showMessage('info', '🔍 Testiram Google Sheets vezu...', 'weightsStatus');
        
        const connectionTest = await testGoogleSheetsConnection();
        console.log('🔥 JEBENI DEBUG: Connection test result:', connectionTest);
        
        if (!connectionTest.success) {
            console.log('🔥 JEBENI DEBUG: Connection test FAILED!');
            throw new Error(`Connection test failed: ${connectionTest.error}`);
        }
        
        console.log('🔥 JEBENI DEBUG: Dohvaćam artikle iz Google Sheets...');
        // Fetch articles data
        showMessage('info', '📊 Dohvaćam artikle iz Google Sheets...', 'weightsStatus');
        
        console.log('🔥 JEBENI DEBUG: Pokrećem fetch...');
        const response = await fetch(`${WEIGHT_CONFIG.GOOGLE_SCRIPT_URL}?action=getArticles&sheet=${WEIGHT_CONFIG.SHEET_NAME}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        console.log('🔥 JEBENI DEBUG: Fetch završen, response:', response);
        
        if (!response.ok) {
            console.log('🔥 JEBENI DEBUG: Response NOT OK!');
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('🔥 JEBENI DEBUG: Parsing JSON...');
        const result = await response.json();
        console.log('🔥 JEBENI DEBUG: JSON parsed:', result);
        
        if (result.error) {
            console.log('🔥 JEBENI DEBUG: Result has error!');
            throw new Error(`Google Sheets error: ${result.error}`);
        }
        
        if (!result.success || !Array.isArray(result.articles)) {
            console.log('🔥 JEBENI DEBUG: Invalid response format!');
            throw new Error('Invalid response format from Google Sheets');
        }
        
        console.log('🔥 JEBENI DEBUG: Processing data...');
        // Process the data
        processGoogleSheetsData(result.articles);
        
        console.log('🔥 JEBENI DEBUG: importFromGoogleSheets ZAVRŠAVA USPJEŠNO!');
        return {
            success: true,
            count: result.articles.length
        };
        
    } catch (error) {
        console.error('🔥 JEBENI DEBUG: Import ERROR:', error);
        console.error('❌ Google Sheets import error:', error);
        
        showMessage('error', 
            `❌ Greška pri učitavanju iz Google Sheets:\n\n` +
            `${error.message}\n\n` +
            `🔧 Mogući uzroci:\n` +
            `• Google Script nije deployed\n` +
            `• Neispravni spreadsheet ID\n` +
            `• Nema dozvola za pristup\n` +
            `• Internet veza\n\n` +
            `💡 Koristite CSV upload kao alternativu!`, 
            'weightsStatus'
        );
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Process Google Sheets data
 */
function processGoogleSheetsData(articles) {
    console.log('🔥🔥🔥 JEBENI DEBUG: processGoogleSheetsData POČINJE!');
    console.log('🔥 Articles length:', articles.length);
    console.log('🔥 First 3 articles:', articles.slice(0, 3));
    
    // Clear existing data
    weightDatabase.clear();
    pdvDatabase.clear();
    weightTableData = [];
    
    let processedCount = 0;
    let skippedCount = 0;
    let pdvProcessedCount = 0;
    
    console.log('🔥 JEBENI DEBUG: Starting article processing loop...');
    
    articles.forEach((article, index) => {
        try {
            // Extract data from Google Sheets format
            const sifra = article.sifra ? article.sifra.toString().trim() : '';
            const podgrupa = article.podgrupa ? article.podgrupa.toString().trim() : '';
            const naziv = article.naziv ? article.naziv.toString().trim() : '';
            const jedinica = article.mjernaJedinica ? article.mjernaJedinica.toString().trim() : '';
            const tarifniBroj = article.tarifniBroj ? article.tarifniBroj.toString().trim() : '';
            const dobavljac = article.dobavljac ? article.dobavljac.toString().trim() : '';
            const tezinaRaw = article.tezina;
            
            // Calculate PDV stopa from tarifni broj
            const pdvStopa = mapTarifniBrojToPDV(tarifniBroj);
            if (tarifniBroj) pdvProcessedCount++;
            
            // // console.log(`Row ${index + 1}: šifra="${sifra}", naziv="${naziv}", TB="${tarifniBroj}", PDV=${pdvStopa}%, težina="${tezinaRaw}"`);
            
            // Skip if no šifra
            if (!sifra) {
                skippedCount++;
                return;
            }
            
            // Parse weight
            let tezinaKg = 0;
            if (tezinaRaw !== undefined && tezinaRaw !== null) {
                const parsedWeight = parseFloat(tezinaRaw);
                
                if (!isNaN(parsedWeight) && parsedWeight >= 0) {
                    tezinaKg = parsedWeight;
                    
                    // Store in database
                    weightDatabase.set(sifra, tezinaKg);
                    processedCount++;
                    
                    // // console.log(`✅ ${sifra}: ${tezinaRaw}kg, TB: ${tarifniBroj}, PDV: ${pdvStopa}%`);
                }
            }
            
            // Store PDV data if šifra exists (independent of weight)
            if (sifra && pdvStopa > 0) {
                pdvDatabase.set(sifra, pdvStopa);
            }
            
            // Create table data with PDV
            const weightData = {
                sifra: sifra,
                podgrupa: podgrupa,
                naziv: naziv,
                jedinica: jedinica,
                tarifniBroj: tarifniBroj,
                pdvStopa: pdvStopa,
                dobavljac: dobavljac,
                tezinaKg: tezinaKg,
                originalTezina: tezinaRaw ? tezinaRaw.toString() : '',
                isValid: tezinaKg > 0,
                usageCount: 0
            };
            
            weightTableData.push(weightData);
            
        } catch (error) {
            console.error(`❌ Error processing article ${index}:`, error);
            skippedCount++;
        }
    });
    
    // // console.log(`Processed: ${processedCount}, PDV: ${pdvProcessedCount}, Skipped: ${skippedCount}, Total DB: ${weightDatabase.size}`);
    
    // Update existing articles with weights and PDV
    updateExistingArticlesWithWeightsAndPDV();
    
    // FORCE update of all existing articles with Google Sheets weights
    if (window.articles && window.articles.length > 0) {
        let forceUpdatedCount = 0;
        window.articles.forEach(article => {
            if (article.code && weightDatabase.has(article.code)) {
                const dbWeight = weightDatabase.get(article.code);
                article.weight = dbWeight;
                article.calculatedWeight = dbWeight;
                
                if (dbWeight > 0 && article.price > 0) {
                    article.pricePerKg = Math.round((article.price / dbWeight) * 100) / 100;
                }
                forceUpdatedCount++;
            }
        });
        // // console.log(`🔄 Force updated ${forceUpdatedCount} articles with Google Sheets weights`);
    }
    
    // Update display
    updateWeightsTableDisplay();
    
    // Update Google Sheets status
    updateGoogleSheetsStatus(true);
    
    // Start auto-refresh if weights were loaded
    if (processedCount > 0) {
        startAutoRefreshIfNeeded();
    }
    
    // Show result
    if (processedCount === 0) {
        showMessage('error', 
            `❌ Nema važećih težina iz Google Sheets!\n\n` +
            `📊 Redova: ${articles.length}\n` +
            `✅ Važećih: ${processedCount}\n` +
            `🆕 PDV stavki: ${pdvProcessedCount}`, 
            'weightsStatus'
        );
    } else {
        showMessage('success', 
            `✅ Google Sheets podaci uspješno učitani!\n\n` +
            `📊 Redova: ${articles.length}\n` +
            `✅ Važećih težina: ${processedCount}\n` +
            `🆕 PDV stavki: ${pdvProcessedCount}\n` +
            `❌ Preskočeno: ${skippedCount}\n` +
            `🎯 U bazi težina: ${weightDatabase.size}\n` +
            `💰 U PDV bazi: ${pdvDatabase.size}\n\n` +
            `🔄 Real-time sync omogućen!\n` +
            `⚡ Težine i PDV stope automatski primijenjene!\n` +
            `🔄 Auto-refresh pokrenut (60s)\n` +
            `🟢 Zelene težine = iz Google Sheets baze`, 
            'weightsStatus'
        );
    }
    
    console.log('🔥🔥🔥 JEBENI DEBUG: processGoogleSheetsData ZAVRŠAVA USPJEŠNO!');
}

/**
 * Update single weight in Google Sheets
 */
async function updateWeightInGoogleSheets(sifra, newWeight) {
    try {
        // Ensure weight is properly formatted as a decimal number
        const formattedWeight = typeof newWeight === 'number' ? newWeight.toFixed(3) : String(newWeight || '0');
        
        // // console.log(`🔄 Sending weight to Google Sheets: ${sifra} = ${newWeight} → ${formattedWeight}`);
        
        // Build URL with parameters for POST request
        const url = new URL(WEIGHT_CONFIG.GOOGLE_SCRIPT_URL);
        url.searchParams.append('action', 'updateWeight');
        url.searchParams.append('sheet', WEIGHT_CONFIG.SHEET_NAME);
        url.searchParams.append('sifra', sifra);
        url.searchParams.append('tezina', formattedWeight);
        
        const response = await fetch(url.toString(), {
            method: 'POST',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        // // console.log('✅ Google Sheets weight update result:', result);
        
        if (result.error) {
            throw new Error(`Google Sheets error: ${result.error}`);
        }
        
        return result.success;
        
    } catch (error) {
        console.error('❌ Google Sheets weight update error:', error);
        return false;
    }
}

/**
 * Bulk update weights in Google Sheets
 */
async function bulkUpdateWeightsInGoogleSheets(updates) {
    try {
        // Ensure all weights are properly formatted
        const formattedUpdates = updates.map(update => ({
            sifra: update.sifra || update.code,
            tezina: typeof update.weight === 'number' ? update.weight.toFixed(3) : String(update.weight || '0')
        }));
        
        // // console.log(`🔄 Sending bulk updates to Google Sheets:`, formattedUpdates);
        
        // Build URL with parameters for POST request
        const url = new URL(WEIGHT_CONFIG.GOOGLE_SCRIPT_URL);
        url.searchParams.append('action', 'updateWeights');
        url.searchParams.append('sheet', WEIGHT_CONFIG.SHEET_NAME);
        url.searchParams.append('updates', JSON.stringify(formattedUpdates));
        
        const response = await fetch(url.toString(), {
            method: 'POST',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        // // console.log('✅ Google Sheets bulk update result:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ Google Sheets bulk update error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Export all weights to Google Sheets
 */
async function exportWeightsToGoogleSheets() {
    if (weightTableData.length === 0) {
        showMessage('info', 'Nema podataka za export u Google Sheets!', 'weightsStatus');
        return;
    }
    
    showMessage('info', '🔄 Exportiram težine u Google Sheets...', 'weightsStatus');
    
    try {
        // Prepare updates array
        const updates = weightTableData
            .filter(item => item.sifra && item.tezinaKg >= 0)
            .map(item => ({
                code: item.sifra,
                weight: item.tezinaKg
            }));
        
        if (updates.length === 0) {
            showMessage('error', 'Nema važećih težina za export!', 'weightsStatus');
            return;
        }
        
        // // console.log(`📊 Exporting ${updates.length} weights to Google Sheets...`);
        
        // Perform bulk update
        const result = await bulkUpdateWeightsInGoogleSheets(updates);
        
        if (result.success) {
            showMessage('success', 
                `✅ Težine uspješno exportirane u Google Sheets!\n\n` +
                `📊 Exportirano: ${result.successCount || updates.length} težina\n` +
                `❌ Greške: ${result.errorCount || 0}`, 
                'weightsStatus'
            );
        } else {
            showMessage('error', 
                `❌ Greška pri exportu u Google Sheets:\n\n` +
                `${result.error || 'Nepoznata greška'}`, 
                'weightsStatus'
            );
        }
        
    } catch (error) {
        console.error('❌ Export to Google Sheets error:', error);
        showMessage('error', 
            `❌ Greška pri exportu u Google Sheets:\n\n` +
            `${error.message}`, 
            'weightsStatus'
        );
    }
}

/**
 * CSV FILE PROCESSING
 */

/**
 * Process uploaded weight CSV file - SAME FORMAT AS GOOGLE SHEETS
 */
function processWeightFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showMessage('error', 'Molimo upload-ajte CSV datoteku!', 'weightsStatus');
        return;
    }
    
    showMessage('info', 'Čitam CSV: ' + file.name + '...', 'weightsStatus');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            const lines = csvText.split('\n').filter(line => line.trim());
            
            // // console.log('CSV lines:', lines.length);
            
            // Clear data
            weightDatabase.clear();
            pdvDatabase.clear();
            weightTableData = [];
            
            let processedCount = 0;
            let skippedCount = 0;
            let pdvProcessedCount = 0;
            
            // Process each line (skip header row 0)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // Split by semicolon (Croatian CSV standard)
                const columns = line.split(';');
                
                // Ensure we have enough columns
                while (columns.length < 50) {
                    columns.push('');
                }
                
                // Get data from specific columns (same as Google Sheets)
                const sifra = columns[0] ? columns[0].trim() : '';           // A = column 0
                const podgrupa = columns[4] ? columns[4].trim() : '';        // E = column 4
                const naziv = columns[5] ? columns[5].trim() : '';           // F = column 5
                const jedinica = columns[7] ? columns[7].trim() : '';        // H = column 7
                const tarifniBroj = columns[12] ? columns[12].trim() : '';   // M = column 12
                const dobavljac = columns[18] ? columns[18].trim() : '';     // S = column 18
                const tezinaStr = columns[21] ? columns[21].trim() : '';     // V = column 21
                
                // Calculate PDV stopa from tarifni broj
                const pdvStopa = mapTarifniBrojToPDV(tarifniBroj);
                if (tarifniBroj) pdvProcessedCount++;
                
                // // console.log(`Row ${i}: šifra="${sifra}", naziv="${naziv}", TB="${tarifniBroj}", PDV=${pdvStopa}%, V="${tezinaStr}"`);
                
                // Skip if no sifra
                if (!sifra) {
                    skippedCount++;
                    continue;
                }
                
                // Parse weight from V column
                let tezinaKg = 0;
                if (tezinaStr) {
                    // Clean and parse weight
                    const cleanWeight = tezinaStr.replace(/[^\d.,]/g, '').replace(',', '.');
                    const parsedWeight = parseFloat(cleanWeight);
                    
                    if (!isNaN(parsedWeight) && parsedWeight >= 0) {
                        // Convert to kg if needed (assume grams if > 50)
                        tezinaKg = parsedWeight > 50 ? parsedWeight / 1000 : parsedWeight;
                        
                        // Store in database
                        weightDatabase.set(sifra, tezinaKg);
                        processedCount++;
                        
                        // // console.log(`✅ ${sifra}: ${tezinaStr} → ${tezinaKg}kg, TB: ${tarifniBroj}, PDV: ${pdvStopa}%`);
                    }
                }
                
                // Store PDV data if šifra exists (independent of weight)
                if (sifra && pdvStopa > 0) {
                    pdvDatabase.set(sifra, pdvStopa);
                }
                
                // Create table data with PDV
                const weightData = {
                    sifra: sifra,
                    podgrupa: podgrupa,
                    naziv: naziv,
                    jedinica: jedinica,
                    tarifniBroj: tarifniBroj,
                    pdvStopa: pdvStopa,
                    dobavljac: dobavljac,
                    tezinaKg: tezinaKg,
                    originalTezina: tezinaStr,
                    isValid: tezinaKg > 0,
                    usageCount: 0
                };
                
                weightTableData.push(weightData);
            }
            
            // // console.log(`Processed: ${processedCount}, PDV: ${pdvProcessedCount}, Skipped: ${skippedCount}, Total DB: ${weightDatabase.size}`);
            
            // Update existing articles with weights and PDV
            updateExistingArticlesWithWeightsAndPDV();
            
            // FORCE update of all existing articles with CSV weights
            if (window.articles && window.articles.length > 0) {
                let forceUpdatedCount = 0;
                window.articles.forEach(article => {
                    if (article.code && weightDatabase.has(article.code)) {
                        const dbWeight = weightDatabase.get(article.code);
                        article.weight = dbWeight;
                        article.calculatedWeight = dbWeight;
                        
                        if (dbWeight > 0 && article.price > 0) {
                            article.pricePerKg = Math.round((article.price / dbWeight) * 100) / 100;
                        }
                        forceUpdatedCount++;
                    }
                });
                // // console.log(`🔄 Force updated ${forceUpdatedCount} articles with CSV weights`);
            }
            
            // Update display
            updateWeightsTableDisplay();
            
            // Update status (CSV mode)
            updateGoogleSheetsStatus(false);
            
            // Start auto-refresh if weights were loaded
            if (processedCount > 0) {
                startAutoRefreshIfNeeded();
            }
            
            // Show result
            if (processedCount === 0) {
                showMessage('error', 
                    `❌ Nema važećih težina!\n\n` +
                    `📁 ${file.name}\n` +
                    `📊 Redova: ${weightTableData.length}\n` +
                    `✅ Važećih: ${processedCount}\n` +
                    `🆕 PDV stavki: ${pdvProcessedCount}`, 
                    'weightsStatus'
                );
            } else {
                            showMessage('success', 
                `✅ CSV težine i PDV stope učitane!\n\n` +
                `📁 ${file.name}\n` +
                `📊 Redova: ${weightTableData.length}\n` +
                `✅ Važećih težina: ${processedCount}\n` +
                `🆕 PDV stavki: ${pdvProcessedCount}\n` +
                `❌ Preskočeno: ${skippedCount}\n` +
                `🎯 U bazi težina: ${weightDatabase.size}\n` +
                `💰 U PDV bazi: ${pdvDatabase.size}\n\n` +
                `📋 Format: A=šifre, M=TB, V=težine\n` +
                `⚡ Težine i PDV stope automatski primijenjene!\n` +
                `🔄 Auto-refresh pokrenut (60s)\n` +
                `🟢 Zelene težine = iz CSV baze`, 
                'weightsStatus'
            );
            }
            
        } catch (error) {
            console.error('CSV Error:', error);
            showMessage('error', 'CSV greška: ' + error.message, 'weightsStatus');
        }
    };
    
    reader.readAsText(file, 'utf-8');
}

/**
 * UI AND DISPLAY FUNCTIONS
 */

/**
 * Update Google Sheets status indicator
 */
function updateGoogleSheetsStatus(isActive) {
    const statusElement = document.getElementById('googleSheetsStatus');
    if (statusElement) {
        if (isActive) {
            statusElement.textContent = 'Google Sheets aktivno';
            statusElement.className = 'status-active';
        } else {
            statusElement.textContent = 'CSV fallback aktivno';
            statusElement.className = 'status-fallback';
        }
    }
}

/**
 * Update weights table display
 */
function updateWeightsTableDisplay() {
    const container = document.getElementById('weightsTableContainer');
    const tbody = document.getElementById('weightsTableBody');
    const countSpan = document.getElementById('weightsTableCount');
    const statusSpan = document.getElementById('weightsStatus2');
    const applyBtn = document.getElementById('applyWeightsBtn');
    const exportBtn = document.getElementById('exportWeightsBtn');
    const exportToGoogleSheetsBtn = document.getElementById('exportToGoogleSheetsBtn');
    
    if (!weightTableData || weightTableData.length === 0) {
        if (container) container.style.display = 'none';
        if (countSpan) countSpan.textContent = '0';
        if (statusSpan) statusSpan.textContent = 'Neaktivno';
        if (applyBtn) applyBtn.style.display = 'none';
        if (exportBtn) exportBtn.style.display = 'none';
        if (exportToGoogleSheetsBtn) exportToGoogleSheetsBtn.style.display = 'none';
        return;
    }
    
    if (container) container.style.display = 'block';
    if (applyBtn) applyBtn.style.display = 'block';
    if (exportBtn) exportBtn.style.display = 'block';
    if (exportToGoogleSheetsBtn) exportToGoogleSheetsBtn.style.display = 'block';
    
    // Update counters with PDV stats
    const validCount = weightTableData.filter(item => item.isValid).length;
    const pdvCount = weightTableData.filter(item => item.tarifniBroj && item.pdvStopa > 0).length;
    
    // Calculate filtered counts
    let filteredData = [...weightTableData];
    if (weightsSearchFilter.trim()) {
        const searchTerms = weightsSearchFilter.toLowerCase().split(' ').filter(term => term.trim());
        filteredData = weightTableData.filter(item => {
            const searchableText = [
                item.sifra || '',
                item.podgrupa || '',
                item.naziv || '',
                item.jedinica || '',
                item.tarifniBroj || '',
                item.dobavljac || '',
                item.tezinaKg.toString(),
                item.originalTezina || ''
            ].join(' ').toLowerCase();
            
            return searchTerms.every(term => searchableText.includes(term));
        });
    }
    
    const filteredValidCount = filteredData.filter(item => item.isValid).length;
    const filteredPdvCount = filteredData.filter(item => item.tarifniBroj && item.pdvStopa > 0).length;
    
    if (countSpan) {
        if (weightsSearchFilter.trim()) {
            countSpan.textContent = `${filteredData.length}/${weightTableData.length} (${filteredValidCount} važećih, ${filteredPdvCount} s PDV)`;
        } else {
            countSpan.textContent = `${weightTableData.length} (${validCount} važećih, ${pdvCount} s PDV)`;
        }
    }
    
    if (statusSpan) {
        const totalValid = weightsSearchFilter.trim() ? filteredValidCount : validCount;
        statusSpan.textContent = totalValid > 0 ? `Aktivno (${totalValid} + ${weightsSearchFilter.trim() ? filteredPdvCount : pdvCount} PDV)` : 'Neaktivno';
        statusSpan.style.color = totalValid > 0 ? '#059669' : '#dc2626';
    }
    
    // Update search count display
    const searchCountSpan = document.getElementById('weightsSearchCount');
    if (searchCountSpan) {
        if (weightsSearchFilter.trim()) {
            searchCountSpan.textContent = `Prikazano: ${filteredData.length} od ${weightTableData.length}`;
            searchCountSpan.style.color = '#2563eb';
            searchCountSpan.style.fontWeight = 'bold';
        } else {
            searchCountSpan.textContent = 'Sve težine';
            searchCountSpan.style.color = '#6b7280';
            searchCountSpan.style.fontWeight = 'normal';
        }
    }
    
    // Update usage counts
    updateWeightUsageCounts();
    
    // Ensure table structure exists
    ensureTableStructure(container);
    
    // Generate table content
    const newTbody = document.getElementById('weightsTableBody');
    if (newTbody) {
        generateTableContent(newTbody);
    }
    
    // // console.log('Weight table updated:', weightTableData.length, 'items');
}

/**
 * Ensure table structure exists
 */
function ensureTableStructure(container) {
    const tableContainer = container.querySelector('.table-container');
    if (tableContainer && !tableContainer.querySelector('table')) {
        const tableHTML = 
            '<table class="table">' +
                '<thead>' +
                    '<tr>' +
                        '<th style="width: 100px; cursor: pointer;" onclick="sortWeightTable(\'sifra\')" title="Kliknite za sortiranje">Šifra artikla <span id="sort-sifra"></span></th>' +
                        '<th style="width: 100px;">Podgrupa (E)</th>' +
                        '<th style="width: 250px;">Naziv artikla (F)</th>' +
                        '<th style="width: 80px;">J.M. (H)</th>' +
                        '<th style="width: 80px;">🆕 TB (M)</th>' +
                        '<th style="width: 80px;">🆕 PDV %</th>' +
                        '<th style="width: 150px;">Dobavljač (S)</th>' +
                        '<th style="width: 100px; cursor: pointer;" onclick="sortWeightTable(\'tezinaKg\')" title="Kliknite za sortiranje">Težina (V) <span id="sort-tezinaKg"></span></th>' +
                        '<th style="width: 100px;">Status korištenja</th>' +
                        '<th style="width: 200px;">Povezani artikli</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody id="weightsTableBody"></tbody>' +
            '</table>';
        tableContainer.innerHTML = tableHTML;
    }
}

/**
 * Generate table content
 */
function generateTableContent(tbody) {
    let html = '';
    
    // Sort data if needed
    let sortedData = [...weightTableData];
    if (currentSortColumn) {
        sortedData = sortWeightTableData(sortedData, currentSortColumn, currentSortDirection);
    }
    
    // Apply search filter
    if (weightsSearchFilter.trim()) {
        const searchTerms = weightsSearchFilter.toLowerCase().split(' ').filter(term => term.trim());
        sortedData = sortedData.filter(item => {
            const searchableText = [
                item.sifra || '',
                item.podgrupa || '',
                item.naziv || '',
                item.jedinica || '',
                item.tarifniBroj || '',
                item.dobavljac || '',
                item.tezinaKg.toString(),
                item.originalTezina || ''
            ].join(' ').toLowerCase();
            
            return searchTerms.every(term => searchableText.includes(term));
        });
    }
    
    // Update sort indicators
    updateSortIndicators();
    
    sortedData.forEach((item, index) => {
        const rowStyle = !item.isValid ? 
            'background: #fef2f2; opacity: 0.7;' : 
            (item.usageCount > 0 ? 'background: #d1fae5;' : '');
            
        // Weight input with color coding
        const weightColor = item.isValid ? '#059669' : '#f59e0b';
        const weightBackground = item.isValid ? '#ecfdf5' : '#fefbf2';
        const weightTitle = item.isValid ? 
            'Težina iz Google Sheets baze - automatski sync' : 
            'Težina parsirana iz naziva - editabilna';
        
        const weightDisplay = 
            '<input type="number" step="0.001" value="' + item.tezinaKg.toFixed(3) + '"' +
            ' onchange="updateWeightValue(\'' + item.sifra + '\', this.value)"' +
            ' onblur="this.style.borderColor=\'#059669\'; this.style.background=\'#ecfdf5\'"' +
            ' onfocus="this.style.borderColor=\'#2563eb\'; this.style.background=\'#eff6ff\'"' +
            ' style="width: 80px; padding: 4px; border: 2px solid ' + weightColor + '; border-radius: 4px; font-weight: bold; color: ' + weightColor + '; background: ' + weightBackground + '; cursor: pointer;"' +
            ' title="' + weightTitle + '">';
             
        // PDV stopa display with color coding
        let pdvDisplay;
        if (item.pdvStopa === 25) {
            pdvDisplay = '<span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">25%</span>';
        } else if (item.pdvStopa === 13) {
            pdvDisplay = '<span style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">13%</span>';
        } else if (item.pdvStopa === 5) {
            pdvDisplay = '<span style="background: #059669; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">5%</span>';
        } else {
            pdvDisplay = '<span style="color: #6b7280; font-size: 11px;">-</span>';
        }
            
        // Tarifni broj display
        const tbDisplay = item.tarifniBroj ? 
            '<span style="background: #7c3aed; color: white; padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;">' +
                item.tarifniBroj +
             '</span>' :
            '<span style="color: #6b7280; font-size: 11px;">-</span>';
            
        const usageDisplay = item.usageCount > 0 ?
            '<span style="background: #059669; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">✅ ' + item.usageCount + '</span>' :
            '<span style="color: #6b7280; font-size: 11px;">-</span>';
            
        const connectedArticles = getConnectedArticleNames(item.sifra);
        const articlesDisplay = connectedArticles.length > 0 ?
            '<div title="' + connectedArticles.join(', ') + '" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">' +
                connectedArticles.slice(0, 2).join(', ') + (connectedArticles.length > 2 ? '... (+' + (connectedArticles.length - 2) + ')' : '') +
             '</div>' :
            '<span style="color: #6b7280;">-</span>';
        
        // Highlight search terms if search is active
        const highlightSearchTerms = (text) => {
            if (!weightsSearchFilter.trim() || !text) return text;
            
            const searchTerms = weightsSearchFilter.toLowerCase().split(' ').filter(term => term.trim());
            let highlightedText = text;
            
            searchTerms.forEach(term => {
                const regex = new RegExp(`(${term})`, 'gi');
                highlightedText = highlightedText.replace(regex, '<span class="weights-search-highlight">$1</span>');
            });
            
            return highlightedText;
        };
        
        html += 
            '<tr style="' + rowStyle + '">' +
                '<td><strong style="color: #7c3aed;">' + highlightSearchTerms(item.sifra) + '</strong></td>' +
                '<td>' + highlightSearchTerms(item.podgrupa || '-') + '</td>' +
                '<td title="' + item.naziv + '" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis;">' +
                    highlightSearchTerms(item.naziv || '-') +
                '</td>' +
                '<td>' + highlightSearchTerms(item.jedinica || '-') + '</td>' +
                '<td>' + tbDisplay + '</td>' +
                '<td>' + pdvDisplay + '</td>' +
                '<td title="' + item.dobavljac + '" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;">' +
                    highlightSearchTerms(item.dobavljac || '-') +
                '</td>' +
                '<td>' + weightDisplay + '</td>' +
                '<td>' + usageDisplay + '</td>' +
                '<td>' + articlesDisplay + '</td>' +
            '</tr>';
    });
    
    tbody.innerHTML = html;
}

/**
 * HELPER FUNCTIONS
 */

/**
 * Update usage counts
 */
function updateWeightUsageCounts() {
    if (!weightTableData || !articles) return;
    
    weightTableData.forEach(item => {
        item.usageCount = 0;
    });
    
    articles.forEach(article => {
        if (article.code && weightDatabase.has(article.code)) {
            const isOurSource = article.source && (
                article.source.toLowerCase().includes('lager') || 
                article.source.toLowerCase().includes('urpd')
            );
            
            if (isOurSource) {
                const weightItem = weightTableData.find(item => item.sifra === article.code);
                if (weightItem) {
                    weightItem.usageCount++;
                }
            }
        }
    });
}

/**
 * Get connected article names
 */
function getConnectedArticleNames(sifra) {
    if (!articles) return [];
    return articles
        .filter(article => {
            const hasMatchingCode = article.code === sifra;
            const isOurSource = article.source && (
                article.source.toLowerCase().includes('lager') || 
                article.source.toLowerCase().includes('urpd')
            );
            return hasMatchingCode && isOurSource;
        })
        .map(article => `${article.name} (${article.source})`)
        .slice(0, 5);
}

/**
 * Set weight column format in Google Sheets
 */
async function setWeightColumnFormat() {
    try {
        // // console.log('🔄 Setting weight column format in Google Sheets...');
        
        // Build URL with parameters for POST request
        const url = new URL(WEIGHT_CONFIG.GOOGLE_SCRIPT_URL);
        url.searchParams.append('action', 'setWeightColumnFormat');
        url.searchParams.append('sheet', WEIGHT_CONFIG.SHEET_NAME);
        
        const response = await fetch(url.toString(), {
            method: 'POST',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        // // console.log('✅ Weight column format result:', result);
        
        if (result.success) {
            showMessage('success', '✅ Format stupca težina postavljen na 3 decimalna mjesta!', 'weightsStatus');
        } else {
            showMessage('error', `❌ Greška pri postavljanju formata: ${result.error || result.message}`, 'weightsStatus');
        }
        
        return result.success;
        
    } catch (error) {
        console.error('❌ Set weight column format error:', error);
        showMessage('error', `❌ Greška pri postavljanju formata: ${error.message}`, 'weightsStatus');
        return false;
    }
}

/**
 * Update weight value when user edits it in table
 */
async function updateWeightValue(sifra, newValue) {
    const newWeight = parseFloat(newValue) || 0;
    
    // // console.log(`🔄 Updating weight for ${sifra}: ${newValue} → ${newWeight}kg`);
    
    // Update in weightDatabase
    if (newWeight >= 0) {
        weightDatabase.set(sifra, newWeight);
        // // console.log(`✅ Weight ${newWeight}kg stored in database for ${sifra}`);
    } else {
        weightDatabase.delete(sifra);
        // // console.log(`❌ Negative weight removed from database for ${sifra}`);
    }
    
    // Update in weightTableData
    const weightItem = weightTableData.find(item => item.sifra === sifra);
    if (weightItem) {
        weightItem.tezinaKg = newWeight;
        weightItem.isValid = newWeight > 0;
        weightItem.originalTezina = newWeight >= 0 ? newWeight.toString() : '';
        
        // // console.log(`📊 Updated weightTableData for ${sifra}: weight=${newWeight}kg, valid=${weightItem.isValid}`);
    }
    
    // Update existing articles
    updateExistingArticlesWithWeightsAndPDV();
    
    // Refresh display
    updateWeightsTableDisplay();
    
    // Try to update in Google Sheets (optional)
    try {
        const googleUpdateSuccess = await updateWeightInGoogleSheets(sifra, newWeight);
        if (googleUpdateSuccess) {
            // // console.log(`✅ Google Sheets updated: ${sifra} → ${newWeight}kg`);
            updateGoogleSheetsStatus(true);
        } else {
            // // console.log(`⚠️ Google Sheets update failed for: ${sifra} (continuing with local update)`);
        }
    } catch (error) {
        // // console.log(`⚠️ Google Sheets update error for ${sifra} (continuing with local update):`, error);
    }
    
    // Show success message
    const status = newWeight > 0 ? 'važeća' : newWeight === 0 ? 'nula (editabilna)' : 'uklonjena';
    const message = `Težina ažurirana: ${sifra} = ${newWeight}kg (${status})`;
    
    showMessage('success', message);
    
    // // console.log(`🎉 Weight update completed for ${sifra}`);
}

/**
 * Update existing articles with weights AND PDV data
 */
function updateExistingArticlesWithWeightsAndPDV() {
    if (!articles || articles.length === 0) return;
    
    let updatedCount = 0;
    let pdvUpdatedCount = 0;
    let zeroWeightCount = 0;
    
    articles.forEach(article => {
        if (article.code) {
            const data = getArticleWeightAndPDV(article.code, article.name, article.unit, article.source);
            
            if (data.weight >= 0) {
                article.weight = data.weight;
                article.calculatedWeight = data.weight;
                
                if (data.weight > 0 && article.price > 0) {
                    article.pricePerKg = Math.round((article.price / data.weight) * 100) / 100;
                } else if (data.weight === 0) {
                    article.pricePerKg = 0;
                    zeroWeightCount++;
                }
                
                updatedCount++;
            }
            
            // Add PDV data to articles
            if (data.tarifniBroj) {
                article.tarifniBroj = data.tarifniBroj;
                article.pdvStopa = data.pdvStopa;
                pdvUpdatedCount++;
            }
        }
    });
    
    if (updatedCount > 0 || pdvUpdatedCount > 0) {
        // // console.log(`Enhanced update: ${updatedCount} weights (${zeroWeightCount} with 0kg), ${pdvUpdatedCount} PDV data`);
        
        if (typeof updateArticleStats === 'function') updateArticleStats();
        if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
        if (typeof updateTroskovnikDisplay === 'function') updateTroskovnikDisplay();
    }
}

/**
 * SORTING FUNCTIONS
 */

function sortWeightTable(column) {
    // // console.log(`🔀 Sorting by column: ${column}`);
    
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    updateWeightsTableDisplay();
    
    const direction = currentSortDirection === 'asc' ? 'rastući' : 'opadajući';
    const columnName = column === 'sifra' ? 'Šifra' : 'Težina';
    showMessage('info', `📊 Tablica sortirana po: ${columnName} (${direction})`);
}

function sortWeightTableData(data, column, direction) {
    return data.sort((a, b) => {
        let valueA, valueB;
        
        switch (column) {
            case 'sifra':
                valueA = (a.sifra || '').toString().toLowerCase();
                valueB = (b.sifra || '').toString().toLowerCase();
                break;
            case 'tezinaKg':
                valueA = a.tezinaKg || 0;
                valueB = b.tezinaKg || 0;
                break;
            default:
                return 0;
        }
        
        if (column === 'tezinaKg') {
            return direction === 'asc' ? valueA - valueB : valueB - valueA;
        } else {
            return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        }
    });
}

function updateSortIndicators() {
    const indicators = ['sort-sifra', 'sort-tezinaKg'];
    indicators.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '';
        }
    });
    
    if (currentSortColumn) {
        const indicator = document.getElementById(`sort-${currentSortColumn}`);
        if (indicator) {
            const arrow = currentSortDirection === 'asc' ? '↑' : '↓';
            const color = currentSortDirection === 'asc' ? '#059669' : '#dc2626';
            indicator.innerHTML = `<span style="color: ${color}; font-weight: bold; margin-left: 4px;">${arrow}</span>`;
        }
    }
}

/**
 * SEARCH FUNCTIONS
 */

/**
 * Handle weights search input
 */
function handleWeightsSearch(searchTerm) {
    weightsSearchFilter = searchTerm;
    // // console.log(`🔍 Weights search: "${searchTerm}"`);
    
    // Update table display with filtered results
    updateWeightsTableDisplay();
    
    // Show search feedback
    if (searchTerm.trim()) {
        const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.trim());
        // // console.log(`🔍 Search terms: [${searchTerms.join(', ')}]`);
        
        // Find matching items for feedback
        const matchingItems = weightTableData.filter(item => {
            const searchableText = [
                item.sifra || '',
                item.podgrupa || '',
                item.naziv || '',
                item.jedinica || '',
                item.tarifniBroj || '',
                item.dobavljac || '',
                item.tezinaKg.toString(),
                item.originalTezina || ''
            ].join(' ').toLowerCase();
            
            return searchTerms.every(term => searchableText.includes(term));
        });
        
        // // console.log(`✅ Found ${matchingItems.length} matching items`);
        
        // Show quick feedback for first few matches
        if (matchingItems.length > 0 && matchingItems.length <= 5) {
            const examples = matchingItems.slice(0, 3).map(item => 
                `${item.sifra}: ${item.naziv} (${item.tezinaKg}kg)`
            ).join(', ');
            
            // // console.log(`📋 Examples: ${examples}`);
        }
    }
}

/**
 * Clear weights search
 */
function clearWeightsSearch() {
    weightsSearchFilter = '';
    // // console.log('🗑️ Weights search cleared');
    
    // Clear search input
    const searchInput = document.getElementById('weightsSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Update table display
    updateWeightsTableDisplay();
}

/**
 * OTHER FUNCTIONS
 */

function applyWeightsToArticles() {
    updateExistingArticlesWithWeightsAndPDV();
    updateWeightsTableDisplay();
    
    const updatedCount = articles ? articles.filter(a => a.code && weightDatabase.has(a.code)).length : 0;
    const pdvCount = articles ? articles.filter(a => a.tarifniBroj && a.pdvStopa > 0).length : 0;
    
    showMessage('success', 
        `✅ Težine i PDV stope primijenjene!\n\n` +
        `🎯 Ažurirano težina: ${updatedCount} artikala\n` +
        `🆕 Ažurirano PDV: ${pdvCount} artikala\n` +
        `📊 Dostupno: ${weightDatabase.size} težina`, 
        'weightsStatus'
    );
}

function clearWeightDatabase() {
    const count = weightDatabase.size;
    weightDatabase.clear();
    weightTableData = [];
    
    updateWeightsTableDisplay();
    updateGoogleSheetsStatus(false);
    
    showMessage('success', `Obrisano ${count} težina i PDV podataka`, 'weightsStatus');
}

function getWeightDatabaseStats() {
    const weights = Array.from(weightDatabase.values());
    const pdvItems = weightTableData.filter(item => item.tarifniBroj && item.pdvStopa > 0);
    
    return {
        totalWeights: weightDatabase.size,
        totalRows: weightTableData.length,
        pdvItems: pdvItems.length,
        avgWeight: weights.length > 0 ? 
            weights.reduce((sum, w) => sum + w, 0) / weights.length : 0
    };
}

function exportWeightDatabase() {
    if (weightTableData.length === 0) {
        showMessage('info', 'Nema podataka za export!', 'weightsStatus');
        return;
    }
    
    // Generate CSV that preserves original structure + PDV
    let csvContent = '';
    
    // Add header row
    const headers = [];
    for (let i = 0; i < 50; i++) {
        if (i === 0) headers.push('A');
        else if (i === 4) headers.push('E');
        else if (i === 5) headers.push('F');
        else if (i === 7) headers.push('H');
        else if (i === 12) headers.push('M');
        else if (i === 18) headers.push('S');
        else if (i === 21) headers.push('V');
        else headers.push(`Col${i}`);
    }
    csvContent += headers.join(';') + '\n';
    
    // Add data rows
    weightTableData.forEach(item => {
        const row = [];
        for (let i = 0; i < 50; i++) {
            if (i === 0) row.push(item.sifra || '');
            else if (i === 4) row.push(item.podgrupa || '');
            else if (i === 5) row.push(item.naziv || '');
            else if (i === 7) row.push(item.jedinica || '');
            else if (i === 12) row.push(item.tarifniBroj || '');
            else if (i === 18) row.push(item.dobavljac || '');
            else if (i === 21) row.push(item.tezinaKg >= 0 ? item.tezinaKg.toString() : '');
            else row.push('');
        }
        csvContent += row.join(';') + '\n';
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kompletni_tezine_pdv_${weightTableData.length}_stavki.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    const stats = getWeightDatabaseStats();
    showMessage('success', 
        `💾 CSV export završen!\n\n` +
        `📁 Datoteka: kompletni_tezine_pdv_${weightTableData.length}_stavki.csv\n` +
        `📊 Redova: ${weightTableData.length}\n` +
        `✅ Važećih težina: ${stats.totalWeights}\n` +
        `🆕 PDV stavki: ${stats.pdvItems}`, 
        'weightsStatus'
    );
}

// Expose functions globally
window.processWeightFile = processWeightFile;
window.updateWeightsTableDisplay = updateWeightsTableDisplay;
window.updateWeightValue = updateWeightValue;
window.getArticleWeight = getArticleWeight;
window.getArticleWeightAndPDV = getArticleWeightAndPDV;
window.getPDVStopa = getPDVStopa;
window.mapTarifniBrojToPDV = mapTarifniBrojToPDV;
window.applyWeightsToArticles = applyWeightsToArticles;
window.clearWeightDatabase = clearWeightDatabase;
window.getWeightDatabaseStats = getWeightDatabaseStats;
window.exportWeightDatabase = exportWeightDatabase;
window.sortWeightTable = sortWeightTable;
window.weightDatabase = weightDatabase;
window.pdvDatabase = pdvDatabase;
window.weightTableData = weightTableData;

// Search functions
window.handleWeightsSearch = handleWeightsSearch;
window.clearWeightsSearch = clearWeightsSearch;

// Google Sheets integration functions
window.importFromGoogleSheets = importFromGoogleSheets;
window.testGoogleSheetsConnection = testGoogleSheetsConnection;
window.updateWeightInGoogleSheets = updateWeightInGoogleSheets;
window.bulkUpdateWeightsInGoogleSheets = bulkUpdateWeightsInGoogleSheets;
window.exportWeightsToGoogleSheets = exportWeightsToGoogleSheets;
window.setWeightColumnFormat = setWeightColumnFormat;

// // console.log('✅ KOMPLETNI Weight Manager loaded with Google Sheets integration:');
// // console.log('🔗 Google Sheets URL:', WEIGHT_CONFIG.GOOGLE_SCRIPT_URL);
// // console.log('📊 CSV i Google Sheets koriste isti format (A=šifra, M=TB, V=težina)');
// // console.log('🆕 JSON API komunikacija s Google Apps Script');
// // console.log('🔄 Real-time sync omogućen');
// // console.log('💡 CSV fallback ako Google Sheets ne radi');
// // console.log('⚡ Google Sheets uvijek prioritet za težine');
// // console.log('🟢 Zelene težine = iz baze, 🟡 Žute težine = parsirane');
// // console.log('⚡ KOMPLETNO FUNKCIONALAN!');

// Initialize status
updateGoogleSheetsStatus(false);

// ===== AUTO-REFRESH SYSTEM =====
let autoRefreshInterval = null;
let autoRefreshEnabled = true;

/**
 * Start automatic weight refresh
 */
function startAutoRefresh(intervalSeconds = 60) {
    if (!autoRefreshEnabled) return;
    
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        if (weightDatabase.size > 0 && articles && articles.length > 0) {
            // // console.log('🔄 Auto-refresh: primjenjujem težine...');
            updateExistingArticlesWithWeightsAndPDV();
            
            // Update displays if needed
            if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
            if (typeof updateTroskovnikDisplay === 'function') updateTroskovnikDisplay();
        }
    }, intervalSeconds * 1000);
    
    // // console.log(`✅ Auto-refresh pokrenut: svakih ${intervalSeconds} sekundi`);
}

/**
 * Stop automatic weight refresh
 */
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        // // console.log('⏹️ Auto-refresh zaustavljen');
    }
}

/**
 * Toggle auto-refresh
 */
function toggleAutoRefresh() {
    autoRefreshEnabled = !autoRefreshEnabled;
    
    if (autoRefreshEnabled) {
        startAutoRefresh();
        // // console.log('✅ Auto-refresh omogućen');
    } else {
        stopAutoRefresh();
        // // console.log('⏹️ Auto-refresh onemogućen');
    }
    
    // Update button status
    updateAutoRefreshButtonStatus();
}

/**
 * Update auto-refresh button status
 */
function updateAutoRefreshButtonStatus() {
    const btn = document.getElementById('autoRefreshBtn');
    if (btn) {
        if (autoRefreshEnabled) {
            btn.textContent = '🔄 Auto-refresh ON';
            btn.style.background = '#059669';
            btn.title = 'Auto-refresh je omogućen (svakih 60s) - kliknite za isključivanje';
        } else {
            btn.textContent = '⏹️ Auto-refresh OFF';
            btn.style.background = '#6b7280';
            btn.title = 'Auto-refresh je isključen - kliknite za uključivanje';
        }
    }
}

// Start auto-refresh when weight database is loaded
function startAutoRefreshIfNeeded() {
    if (weightDatabase.size > 0 && autoRefreshEnabled) {
        startAutoRefresh();
    }
}

// Expose auto-refresh functions globally
window.startAutoRefresh = startAutoRefresh;
window.stopAutoRefresh = stopAutoRefresh;
window.toggleAutoRefresh = toggleAutoRefresh;
window.startAutoRefreshIfNeeded = startAutoRefreshIfNeeded;

// Initialize auto-refresh button status
setTimeout(() => {
    updateAutoRefreshButtonStatus();
}, 100);