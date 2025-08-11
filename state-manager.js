// === TABLICE RABATA INITIALIZATION ===
if (typeof window.tablicaRabata === 'undefined') {
    window.tablicaRabata = [];
}
let tablicaRabata = window.tablicaRabata;

/**
 * STATE MANAGER MODULE
 * Handles saving and loading.../**
 * STATE MANAGER MODULE
 * Handles saving and loading application state to/from JSON files
 */

/**
 * Serializes the complete application state to JSON
 * @returns {Object} Complete app state object
 */
function serializeAppState() {
    // Get current tab safely
    let currentTab = 'search';
    try {
        if (typeof AppState !== 'undefined' && AppState.currentTab) {
            currentTab = AppState.currentTab;
        } else {
            // Try to detect from active tab
            const activeTab = document.querySelector('.tab.active');
            if (activeTab) {
                const tabText = activeTab.textContent.toLowerCase();
                if (tabText.includes('upload') || tabText.includes('tražilica')) currentTab = 'search';
                else if (tabText.includes('troškovnik')) currentTab = 'troskovnik';
                else if (tabText.includes('rezultati')) currentTab = 'results';
                else if (tabText.includes('preračun')) currentTab = 'preracun';
                else if (tabText.includes('tablica rabata')) currentTab = 'tablicaRabata';
            }
        }
    } catch (error) {
        console.warn('Could not determine current tab:', error);
    }
    
    const state = {
        // Metadata
        timestamp: new Date().toISOString(),
        version: '1.1',
        appName: 'Tražilica Proizvoda & Troškovnik',
        
        // Core data arrays
        articles: (typeof articles !== 'undefined') ? articles : [],
        results: (typeof results !== 'undefined') ? results : [],
        troskovnik: (typeof troskovnik !== 'undefined') ? troskovnik : [],
        preracunResults: (typeof preracunResults !== 'undefined') ? preracunResults : [],
        tablicaRabata: (typeof tablicaRabata !== 'undefined') ? tablicaRabata : [],
        
        // Selected items
        selectedResults: (typeof selectedResults !== 'undefined') ? Array.from(selectedResults) : [],
        
        // Current tab state
        currentTab: currentTab,
        
        // UI input values
        globalSearchInput: document.getElementById('globalSearchInput')?.value || '',
        
        // Troškovnik UI state
        troskovnikTableVisible: !document.getElementById('troskovnikTableContainer')?.classList.contains('hidden'),
        troskovnikUploadVisible: !document.getElementById('troskovnikUpload')?.classList.contains('hidden'),
        
        // Statistics
        stats: {
            articlesCount: (typeof articles !== 'undefined') ? articles.length : 0,
            resultsCount: (typeof results !== 'undefined') ? results.length : 0,
            troskovnikCount: (typeof troskovnik !== 'undefined') ? troskovnik.length : 0,
            preracunCount: (typeof preracunResults !== 'undefined') ? preracunResults.length : 0,
            tablicaRabataCount: (typeof tablicaRabata !== 'undefined') ? tablicaRabata.length : 0,
            selectedCount: (typeof selectedResults !== 'undefined') ? selectedResults.size : 0
        }
    };
    
    // console.log('📦 Serialized app state:', {
    //     articles: state.articles.length,
    //     results: state.results.length,
    //     troskovnik: state.troskovnik.length,
    //     preracun: state.preracunResults.length,
    //     tablicaRabata: state.tablicaRabata.length,
    //     selected: state.selectedResults.length
    // });
    
    return state;
}

/**
 * Serializes MINIMAL application state (only final results) to JSON
 * @returns {Object} Minimal state object with only troskovnik and tablica rabata
 */
function serializeMinimalState() {
    // Calculate total values for summary
    function calculateTotalValue() {
        let total = 0;
        try {
            if (typeof troskovnik !== 'undefined') {
                total = troskovnik.reduce((sum, item) => {
                    return sum + (parseFloat(item.izlazna_cijena) || 0);
                }, 0);
            }
        } catch (error) {
            console.warn('Error calculating total:', error);
        }
        return Math.round(total * 100) / 100;
    }

    const state = {
        // Metadata
        timestamp: new Date().toISOString(),
        version: 'minimal-1.0',
        appName: 'Tražilica Proizvoda & Troškovnik - Complete Data',
        
        // ENHANCED: Include results + supporting data for complete workflow
        finalResults: (typeof results !== 'undefined') ? results : [],
        
        finalTroskovnik: (typeof troskovnik !== 'undefined') ? 
            troskovnik.filter(item => item && (parseFloat(item.izlazna_cijena) || 0) > 0) : [],
        
        finalTablicaRabata: (typeof tablicaRabata !== 'undefined') ? 
            tablicaRabata.filter(item => item && (parseFloat(item.cijena_bez_pdv) || 0) > 0) : [],
        
        // CRITICAL: Include supporting databases for offline functionality
        finalProslogodisnjeCijene: (typeof proslogodisnjeCijene !== 'undefined') ? proslogodisnjeCijene : [],
        
        finalWeightDatabase: (typeof weightDatabase !== 'undefined') ? 
            Array.from(weightDatabase.entries()).map(([key, value]) => ({sifra: key, tezina: value})) : [],
        
        finalPdvDatabase: (typeof pdvDatabase !== 'undefined') ? 
            Array.from(pdvDatabase.entries()).map(([key, value]) => ({sifra: key, pdv: value})) : [],
        
        // Compact summary only
        summary: {
            totalResultsItems: (typeof results !== 'undefined') ? results.length : 0,
            totalTroskovnikItems: (typeof troskovnik !== 'undefined') ? troskovnik.length : 0,
            totalTablicaRabataItems: (typeof tablicaRabata !== 'undefined') ? tablicaRabata.length : 0,
            totalProslogodisnjeCijeneItems: (typeof proslogodisnjeCijene !== 'undefined') ? proslogodisnjeCijene.length : 0,
            totalWeightItems: (typeof weightDatabase !== 'undefined') ? weightDatabase.size : 0,
            totalPdvItems: (typeof pdvDatabase !== 'undefined') ? pdvDatabase.size : 0,
            totalValueEUR: calculateTotalValue(),
            generatedAt: new Date().toLocaleString('hr-HR')
        }
    };
    
    console.log('📦 Serialized MINIMAL state:', {
        finalResults: state.finalResults.length,
        finalTroskovnik: state.finalTroskovnik.length,
        finalTablicaRabata: state.finalTablicaRabata.length,
        finalProslogodisnjeCijene: state.finalProslogodisnjeCijene.length,
        finalWeightDatabase: state.finalWeightDatabase.length,
        finalPdvDatabase: state.finalPdvDatabase.length,
        totalValue: state.summary.totalValueEUR
    });
    
    return state;
}

/**
 * Deserializes and restores application state from JSON
 * @param {Object} state - State object to restore
 * @returns {boolean} Success status
 */
function deserializeAppState(state) {
    try {
        // console.log('📂 Starting state restoration...');
        
        // Validate state object
        if (!state || typeof state !== 'object') {
            throw new Error('Invalid state object');
        }
        
        if (!state.version || !state.appName) {
            throw new Error('Invalid state format - missing version or app name');
        }
        
        // Detect minimal vs full state format
        const isMinimalFormat = state.version === 'minimal-1.0';
        console.log(`📋 State format detected: ${isMinimalFormat ? 'MINIMAL' : 'FULL'} (version: ${state.version})`);
        
        if (isMinimalFormat) {
            console.log('📦 Loading minimal state:', {
                finalResults: state.finalResults?.length || 0,
                finalTroskovnik: state.finalTroskovnik?.length || 0,
                finalTablicaRabata: state.finalTablicaRabata?.length || 0,
                finalProslogodisnjeCijene: state.finalProslogodisnjeCijene?.length || 0,
                finalWeightDatabase: state.finalWeightDatabase?.length || 0,
                finalPdvDatabase: state.finalPdvDatabase?.length || 0
            });
        }
        
        // console.log('✅ State validation passed:', {
        //     version: state.version,
        //     timestamp: state.timestamp,
        //     articles: state.articles?.length || 0,
        //     results: state.results?.length || 0,
        //     troskovnik: state.troskovnik?.length || 0,
        //     preracun: state.preracunResults?.length || 0,
        //     tablicaRabata: state.tablicaRabata?.length || 0
        // });
        
        // Clear existing data
        clearAllData();
        
        if (isMinimalFormat) {
            // MINIMAL FORMAT: Load only final results
            console.log('🔄 Processing minimal format JSON...');
            
            // Load finalResults → results
            if (state.finalResults && Array.isArray(state.finalResults)) {
                if (typeof results !== 'undefined') {
                    results.push(...state.finalResults);
                    console.log('🎯 Restored results from minimal format:', results.length);
                }
            }
            
            // Load finalTroskovnik → troskovnik
            if (state.finalTroskovnik && Array.isArray(state.finalTroskovnik)) {
                if (typeof troskovnik !== 'undefined') {
                    troskovnik.push(...state.finalTroskovnik);
                    console.log('📋 Restored troškovnik from minimal format:', troskovnik.length);
                }
            }
            
            // Load finalTablicaRabata → tablicaRabata
            if (state.finalTablicaRabata && Array.isArray(state.finalTablicaRabata)) {
                if (typeof tablicaRabata !== 'undefined') {
                    tablicaRabata.push(...state.finalTablicaRabata);
                    console.log('📊 Restored tablica rabata from minimal format:', tablicaRabata.length);
                }
            }
            
            // Load finalProslogodisnjeCijene → proslogodisnjeCijene
            if (state.finalProslogodisnjeCijene && Array.isArray(state.finalProslogodisnjeCijene)) {
                if (typeof proslogodisnjeCijene !== 'undefined') {
                    proslogodisnjeCijene.length = 0; // Clear existing
                    proslogodisnjeCijene.push(...state.finalProslogodisnjeCijene);
                    console.log('📅 Restored prošlogodišnje cijene from minimal format:', proslogodisnjeCijene.length);
                    
                    // Update filtered array if it exists
                    if (typeof filteredProslogodisnjeCijene !== 'undefined') {
                        filteredProslogodisnjeCijene = [...proslogodisnjeCijene];
                    }
                }
            }
            
            // Load finalWeightDatabase → weightDatabase Map
            if (state.finalWeightDatabase && Array.isArray(state.finalWeightDatabase)) {
                if (typeof weightDatabase !== 'undefined') {
                    weightDatabase.clear(); // Clear existing
                    state.finalWeightDatabase.forEach(item => {
                        if (item.sifra && item.tezina) {
                            weightDatabase.set(item.sifra, item.tezina);
                        }
                    });
                    console.log('⚖️ Restored weight database from minimal format:', weightDatabase.size);
                }
            }
            
            // Load finalPdvDatabase → pdvDatabase Map
            if (state.finalPdvDatabase && Array.isArray(state.finalPdvDatabase)) {
                if (typeof pdvDatabase !== 'undefined') {
                    pdvDatabase.clear(); // Clear existing
                    state.finalPdvDatabase.forEach(item => {
                        if (item.sifra && typeof item.pdv === 'number') {
                            pdvDatabase.set(item.sifra, item.pdv);
                        }
                    });
                    console.log('📊 Restored PDV database from minimal format:', pdvDatabase.size);
                }
            }
            
            // CRITICAL: Recreate weightTableData array for UI display
            if (typeof weightTableData !== 'undefined' && typeof weightDatabase !== 'undefined') {
                weightTableData.length = 0; // Clear existing array
                
                // Recreate weightTableData from weightDatabase and pdvDatabase
                for (const [sifra, tezinaKg] of weightDatabase) {
                    const pdvStopa = pdvDatabase.has(sifra) ? pdvDatabase.get(sifra) : 0;
                    const tarifniBroj = pdvStopa === 25 ? '1' : pdvStopa === 5 ? '5' : '';
                    
                    const weightData = {
                        sifra: sifra,
                        podgrupa: '',
                        naziv: '',
                        jedinica: '',
                        tarifniBroj: tarifniBroj,
                        pdvStopa: pdvStopa,
                        dobavljac: '',
                        tezinaKg: tezinaKg,
                        originalTezina: tezinaKg.toString(),
                        isValid: tezinaKg > 0,
                        usageCount: 0
                    };
                    
                    weightTableData.push(weightData);
                }
                
                console.log('🔄 Recreated weightTableData for UI display:', weightTableData.length);
                
                // Update the weights display after recreation
                if (typeof updateWeightsTableDisplay === 'function') {
                    updateWeightsTableDisplay();
                    console.log('✅ Weights table display updated');
                }
            }
            
        } else {
            // FULL FORMAT: Load all data as before
            console.log('🔄 Processing full format JSON...');
            
            // Restore core data arrays safely
            if (state.articles && Array.isArray(state.articles)) {
                if (typeof articles !== 'undefined') {
                    articles.push(...state.articles);
                    // console.log('📊 Restored articles:', articles.length);
                }
            }
            
            if (state.results && Array.isArray(state.results)) {
                if (typeof results !== 'undefined') {
                    results.push(...state.results);
                    // console.log('🎯 Restored results:', results.length);
                }
            }
            
            if (state.troskovnik && Array.isArray(state.troskovnik)) {
                if (typeof troskovnik !== 'undefined') {
                    troskovnik.push(...state.troskovnik);
                    // console.log('📋 Restored troškovnik:', troskovnik.length);
                }
            }
            
            if (state.preracunResults && Array.isArray(state.preracunResults)) {
                if (typeof preracunResults !== 'undefined') {
                    preracunResults.push(...state.preracunResults);
                    // console.log('💰 Restored preračun:', preracunResults.length);
                }
            }
            
            if (state.tablicaRabata && Array.isArray(state.tablicaRabata)) {
                if (typeof tablicaRabata !== 'undefined') {
                    tablicaRabata.push(...state.tablicaRabata);
                    // console.log('📊 Restored tablica rabata:', tablicaRabata.length);
                }
            }
        }
        
        // Restore selected results safely
        if (typeof selectedResults !== 'undefined') {
            selectedResults.clear();
            if (state.selectedResults && Array.isArray(state.selectedResults)) {
                state.selectedResults.forEach(key => selectedResults.add(key));
                // console.log('✅ Restored selected results:', selectedResults.size);
            }
        }
        
        // Restore UI input values
        if (state.globalSearchInput) {
            const globalInput = document.getElementById('globalSearchInput');
            if (globalInput) {
                globalInput.value = state.globalSearchInput;
            }
        }
        
        // Update all displays
        updateAllDisplays();
        
        // Restore UI state
        if (state.troskovnikTableVisible) {
            const container = document.getElementById('troskovnikTableContainer');
            if (container) container.classList.remove('hidden');
        }
        
        if (state.troskovnikUploadVisible) {
            const upload = document.getElementById('troskovnikUpload');
            if (upload) upload.classList.remove('hidden');
        }
        
        // Restore active tab
        if (state.currentTab) {
            showTab(state.currentTab);
        }
        
        // console.log('✅ State restoration completed successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ State restoration failed:', error);
        showMessage('error', `Greška pri učitavanju stanja: ${error.message}`);
        return false;
    }
}

/**
 * Clears all application data safely
 */
function clearAllData() {
    // console.log('🗑️ Clearing all application data...');
    
    // Clear global arrays safely
    if (typeof articles !== 'undefined') articles.length = 0;
    if (typeof results !== 'undefined') results.length = 0;
    if (typeof troskovnik !== 'undefined') troskovnik.length = 0;
    if (typeof preracunResults !== 'undefined') preracunResults.length = 0;
    if (typeof tablicaRabata !== 'undefined') tablicaRabata.length = 0;
    if (typeof selectedResults !== 'undefined') selectedResults.clear();
    
    // Clear input fields
    const globalInput = document.getElementById('globalSearchInput');
    if (globalInput) globalInput.value = '';
    
    // console.log('✅ All data cleared');
}

/**
 * Updates all display components
 */
function updateAllDisplays() {
    // console.log('🔄 Updating all displays...');
    
    try {
        // Update statistics
        updateArticleStats();
        
        // Update each tab display if functions exist
        if (typeof updateResultsDisplay === 'function') {
            updateResultsDisplay();
        }
        
        if (typeof updateTroskovnikDisplay === 'function') {
            updateTroskovnikDisplay();
        }
        
        if (typeof updatePreracunDisplay === 'function') {
            updatePreracunDisplay();
        }
        
        if (typeof updateTablicaRabataDisplay === 'function') {
            updateTablicaRabataDisplay();
        }
        
        // Update prošlogodišnje cijene stats if available
        if (typeof updateProslogodisnjeCijeneStats === 'function') {
            updateProslogodisnjeCijeneStats();
        }
        
        // console.log('✅ All displays updated');
        
    } catch (error) {
        console.error('❌ Error updating displays:', error);
    }
}

/**
 * Saves the current application state as a JSON file download
 */
function saveAppState() {
    // Use the new dialog-based save
    if (typeof saveStateWithDialog === 'function') {
        saveStateWithDialog();
    } else {
        console.warn('saveStateWithDialog not available, falling back to direct download');
        // Fallback to old behavior
        try {
            const state = serializeAppState();
            
            // Generate filename with timestamp
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
            const filename = `Trazilica-Stanje-${timestamp}.json`;
            
            // Create and download JSON file
            const jsonString = JSON.stringify(state, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            // Show success message with file info
            const fileSizeKB = Math.round(blob.size / 1024);
            showMessage('success', 
                `✅ Stanje aplikacije spremljeno!\n\n` +
                `📁 Datoteka: ${filename}\n` +
                `📊 Veličina: ${fileSizeKB} KB\n` +
                `📦 Artikli: ${state.stats.articlesCount}\n` +
                `🎯 Rezultati: ${state.stats.resultsCount}\n` +
                `📋 Troškovnik: ${state.stats.troskovnikCount}\n` +
                `💰 Preračun: ${state.stats.preracunCount}\n` +
                `📊 Tablica rabata: ${state.stats.tablicaRabataCount}\n\n` +
                `💡 Povucite datoteku natrag u aplikaciju za vraćanje stanja!`
            );
            
            // Mark as saved
            if (typeof AppState !== 'undefined' && AppState.markAsSaved) {
                AppState.markAsSaved();
            }
            
        } catch (error) {
            console.error('❌ Save state error:', error);
            showMessage('error', `Greška pri spremanju: ${error.message}`);
        }
    }
}

// CRITICAL: Expose saveAppState immediately after definition
window.saveAppState = saveAppState;

/**
 * Saves COMPLETE working data (results + final data + supporting databases) as a JSON file download
 */
function saveMinimalAppState() {
    try {
        const state = serializeMinimalState();
        
        // Generate filename with timestamp
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const filename = `Trazilica-Complete-Data-${timestamp}.json`;
        
        // Create and download JSON file
        const jsonString = JSON.stringify(state, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        // Show success message with file info
        const fileSizeKB = Math.round(blob.size / 1024);
        const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
        
        showMessage('success', 
            `✅ Kompletni podaci spremljeni!\n\n` +
            `📁 Datoteka: ${filename}\n` +
            `📊 Veličina: ${fileSizeKB} KB (${fileSizeMB} MB)\n` +
            `🎯 Rezultati: ${state.finalResults.length} stavki\n` +
            `📋 Troškovnik: ${state.finalTroskovnik.length} stavki\n` +
            `📊 Tablica rabata: ${state.finalTablicaRabata.length} stavki\n` +
            `📅 Prošlogodišnje cijene: ${state.finalProslogodisnjeCijene.length} stavki\n` +
            `⚖️ Težine: ${state.finalWeightDatabase.length} stavki\n` +
            `💰 Ukupna vrijednost: ${state.summary.totalValueEUR} EUR\n\n` +
            `🎯 Kompletni podaci - još uvijek 95%+ manji od full backup!\n` +
            `💡 Ovaj file omogućava potpunu offline funkcionalnost.`
        );
        
        console.log(`✅ Minimal state saved: ${filename} (${fileSizeKB} KB)`);
        
    } catch (error) {
        console.error('❌ Error saving minimal state:', error);
        showMessage('error', 
            `❌ Greška pri spremanju minimalnih rezultata!\n\n${error.message}`
        );
    }
}

// Expose minimal save function globally
window.saveMinimalAppState = saveMinimalAppState;

/**
 * Loads application state from a JSON file
 * @param {File} file - JSON file to load
 */
function loadAppState(file) {
    // console.log('🔄 loadAppState called with file:', file ? file.name : 'undefined');
    
    if (!file) {
        showMessage('error', '❌ Nema odabrane datoteke!');
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.json')) {
        showMessage('error', '❌ Molimo odaberite JSON datoteku!');
        return;
    }
    
    // Optional file size check - removed to allow large JSON files
    // Most JSON state files should load fine regardless of size
    
    showMessage('info', `🔄 Učitavam stanje iz ${file.name}...`);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonContent = e.target.result;
            
            // Validate JSON content
            if (!jsonContent || jsonContent.trim() === '') {
                throw new Error('Datoteka je prazna');
            }
            
            const state = JSON.parse(jsonContent);
            
            // Validate state structure
            if (!state || typeof state !== 'object') {
                throw new Error('Neispravna struktura JSON datoteke');
            }
            
            // Confirm with user before loading
            const isMinimal = state.version === 'minimal-1.0';
            let confirmMessage;
            
            if (isMinimal) {
                // Minimal format confirmation
                const summary = state.summary || {};
                confirmMessage = 
                    `Učitati kompletne podatke iz datoteke?\n\n` +
                    `📁 Datoteka: ${file.name}\n` +
                    `📅 Stvoreno: ${state.timestamp ? new Date(state.timestamp).toLocaleString('hr-HR') : 'Nepoznato'}\n` +
                    `🎯 Format: KOMPLETNI PODACI (bez artikala)\n` +
                    `🎯 Rezultati: ${state.finalResults?.length || 0} stavki\n` +
                    `📋 Troškovnik: ${state.finalTroskovnik?.length || 0} stavki\n` +
                    `📊 Tablica rabata: ${state.finalTablicaRabata?.length || 0} stavki\n` +
                    `📅 Prošlogodišnje cijene: ${state.finalProslogodisnjeCijene?.length || 0} stavki\n` +
                    `⚖️ Težine: ${state.finalWeightDatabase?.length || 0} stavki\n` +
                    `💰 Ukupno: ${summary.totalValueEUR || 0} EUR\n\n` +
                    `⚠️ Ovo će zamijeniti trenutno stanje aplikacije!`;
            } else {
                // Full format confirmation
                const stats = state.stats || {};
                confirmMessage = 
                    `Učitati kompletno stanje aplikacije iz datoteke?\n\n` +
                    `📁 Datoteka: ${file.name}\n` +
                    `📅 Stvoreno: ${state.timestamp ? new Date(state.timestamp).toLocaleString('hr-HR') : 'Nepoznato'}\n` +
                    `🎯 Format: KOMPLETNO stanje\n` +
                    `📊 Artikli: ${stats.articlesCount || 0}\n` +
                    `🎯 Rezultati: ${stats.resultsCount || 0}\n` +
                    `📋 Troškovnik: ${stats.troskovnikCount || 0}\n` +
                    `💰 Preračun: ${stats.preracunCount || 0}\n` +
                    `📊 Tablica rabata: ${stats.tablicaRabataCount || 0}\n\n` +
                    `⚠️ Ovo će zamijeniti trenutno stanje aplikacije!`;
            }
                
            if (!confirm(confirmMessage)) {
                showMessage('info', 'Učitavanje otkazano.');
                return;
            }
            
            // Load the state
            const success = deserializeAppState(state);
            
            if (success) {
                const successMessage = isMinimal ? 
                    `✅ Kompletni podaci uspješno učitani!\n\n` +
                    `📁 Iz datoteke: ${file.name}\n` +
                    `🎯 Format: KOMPLETNI PODACI (~200KB file)\n` +
                    `🎯 Rezultati: ${results.length} stavki\n` +
                    `📋 Troškovnik: ${troskovnik.length} stavki\n` +
                    `📊 Tablica rabata: ${tablicaRabata.length} stavki\n` +
                    `📅 Prošlogodišnje cijene: ${proslogodisnjeCijene.length} stavki\n` +
                    `⚖️ Težine: ${weightDatabase.size} stavki\n\n` +
                    `💡 Svi podaci učitani - aplikacija je potpuno funkcionalna offline!`
                    :
                    `✅ Kompletno stanje aplikacije uspješno učitano!\n\n` +
                    `📁 Iz datoteke: ${file.name}\n` +
                    `🎯 Format: KOMPLETNO stanje\n` +
                    `📊 Artikli: ${articles.length}\n` +
                    `🎯 Rezultati: ${results.length}\n` +
                    `📋 Troškovnik: ${troskovnik.length}\n` +
                    `💰 Preračun: ${preracunResults.length}\n` +
                    `📊 Tablica rabata: ${tablicaRabata.length}\n` +
                    `✅ Odabrani: ${selectedResults.size}`;
                    
                showMessage('success', successMessage);
            }
            
        } catch (error) {
            console.error('❌ Load state error:', error);
            showMessage('error', 
                `❌ Greška pri učitavanju datoteke!\n\n` +
                `Datoteka: ${file.name}\n` +
                `Greška: ${error.message}\n\n` +
                `Molimo provjerite da je datoteka valjana JSON datoteka stanja aplikacije.`
            );
        }
    };
    
    reader.onerror = function() {
        showMessage('error', `❌ Greška pri čitanju datoteke ${file.name}!`);
    };
    
    reader.readAsText(file, 'utf-8');
}

// CRITICAL: Expose loadAppState immediately after definition
window.loadAppState = loadAppState;

/**
 * Handles drag and drop events for state files
 * @param {DragEvent} event - Drop event
 */
function handleStateFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const files = Array.from(event.dataTransfer.files);
    const jsonFiles = files.filter(file => file.name.toLowerCase().endsWith('.json'));
    
    if (jsonFiles.length === 0) {
        showMessage('info', '💡 Za učitavanje stanja povucite JSON datoteku stanja aplikacije ili troškovnika.');
        return;
    }
    
    if (jsonFiles.length > 1) {
        showMessage('error', '❌ Molimo povucite samo jednu JSON datoteku!');
        return;
    }
    
    // Check if it's a troskovnik-only file or regular state file
    const file = jsonFiles[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.type === 'troskovnik-only') {
                loadTroskovnikOnly(file);
            } else {
                // Regular state file
                loadAppState(file);
            }
        } catch (error) {
            // If parsing fails, treat as regular state file
            loadAppState(file);
        }
    };
    reader.readAsText(file);
}

/**
 * Handles file picker selection for state files
 * @param {Event} event - File input change event
 */
function handleStateFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        loadAppState(file);
    }
    // Clear the input so the same file can be selected again
    event.target.value = '';
}

/**
 * Handles file picker selection for troskovnik files
 * @param {Event} event - File input change event
 */
function handleTroskovnikLoadSelect(event) {
    const file = event.target.files[0];
    if (file) {
        loadTroskovnikOnly(file);
    }
    // Clear the input so the same file can be selected again
    event.target.value = '';
}

/**
 * Quick save with predefined filename
 */
function quickSaveState() {
    try {
        const state = serializeAppState();
        const filename = 'Trazilica-Trenutno-Stanje.json';
        
        const jsonString = JSON.stringify(state, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        // Mark as saved for quick save too
        if (typeof AppState !== 'undefined' && AppState.markAsSaved) {
            AppState.markAsSaved();
        }
        
        const fileSizeKB = Math.round(blob.size / 1024);
        showMessage('success', `⚡ Brzo spremljeno! (${filename}, ${fileSizeKB} KB)`);
        
    } catch (error) {
        console.error('❌ Quick save error:', error);
        showMessage('error', `Greška pri brzom spremanju: ${error.message}`);
    }
}

/**
 * Save state with user file picker dialog
 */
async function saveStateWithDialog() {
    try {
        const state = serializeAppState();
        const jsonString = JSON.stringify(state, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Try File System Access API (modern browsers)
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: `Trazilica-Stanje-${new Date().toISOString().slice(0, 10)}.json`,
                    types: [{
                        description: 'JSON datoteke',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                
                // Mark as saved
                if (typeof AppState !== 'undefined' && AppState.markAsSaved) {
                    AppState.markAsSaved();
                }
                
                const fileSizeKB = Math.round(blob.size / 1024);
                showMessage('success', `💾 Uspješno spremljeno! (${fileSizeKB} KB)`);
                return true;
                
            } catch (err) {
                if (err.name === 'AbortError') {
                    showMessage('info', 'Spremanje je prekinuto.');
                    return false;
                }
                throw err;
            }
        } else {
            // Fallback to traditional download
            const filename = `Trazilica-Stanje-${new Date().toISOString().slice(0, 10)}.json`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            // Mark as saved
            if (typeof AppState !== 'undefined' && AppState.markAsSaved) {
                AppState.markAsSaved();
            }
            
            const fileSizeKB = Math.round(blob.size / 1024);
            showMessage('success', `💾 Spremljeno u Downloads! (${filename}, ${fileSizeKB} KB)`);
            return true;
        }
        
    } catch (error) {
        console.error('❌ Save dialog error:', error);
        showMessage('error', `Greška pri spremanju: ${error.message}`);
        return false;
    }
}

// CRITICAL: Expose save functions immediately after definition
window.quickSaveState = quickSaveState;
window.saveStateWithDialog = saveStateWithDialog;

/**
 * Saves only troškovnik data (much smaller file)
 */
function saveTroskovnikOnly() {
    try {
        const troskovnikData = {
            // Metadata
            timestamp: new Date().toISOString(),
            version: '1.0',
            appName: 'Troškovnik Data',
            type: 'troskovnik-only',
            
            // Only troskovnik data
            troskovnik: (typeof troskovnik !== 'undefined') ? troskovnik : [],
            
            // Statistics
            stats: {
                troskovnikCount: (typeof troskovnik !== 'undefined') ? troskovnik.length : 0
            }
        };
        
        // Generate filename with timestamp
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const filename = `Troskovnik-${timestamp}.json`;
        
        // Create and download JSON file
        const jsonString = JSON.stringify(troskovnikData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        // Show success message with file info
        const fileSizeKB = Math.round(blob.size / 1024);
        showMessage('success', 
            `✅ Troškovnik spremljen!\n\n` +
            `📁 Datoteka: ${filename}\n` +
            `📊 Veličina: ${fileSizeKB} KB\n` +
            `📋 Stavki: ${troskovnikData.stats.troskovnikCount}\n\n` +
            `💡 Povucite datoteku natrag u aplikaciju za učitavanje troškovnika!`
        );
        
        // console.log('💾 Troškovnik saved:', filename, `${fileSizeKB} KB`);
        
    } catch (error) {
        console.error('❌ Save troskovnik error:', error);
        showMessage('error', `Greška pri spremanju troškovnika: ${error.message}`);
    }
}

/**
 * Loads only troškovnik data from JSON file
 */
function loadTroskovnikOnly(file) {
    if (!file.name.toLowerCase().endsWith('.json')) {
        showMessage('error', '❌ Molimo odaberite JSON datoteku troškovnika!');
        return;
    }
    
    showMessage('info', `🔄 Učitavam troškovnik iz ${file.name}...`);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonContent = e.target.result;
            const data = JSON.parse(jsonContent);
            
            // Validate it's a troskovnik file
            if (data.type !== 'troskovnik-only') {
                showMessage('error', '❌ Ovo nije datoteka troškovnika! Molimo koristite opću datoteku stanja.');
                return;
            }
            
            // Confirm with user before loading
            const stats = data.stats || {};
            const confirmMessage = 
                `Učitati troškovnik iz datoteke?\n\n` +
                `📁 Datoteka: ${file.name}\n` +
                `📅 Stvoreno: ${data.timestamp ? new Date(data.timestamp).toLocaleString('hr-HR') : 'Nepoznato'}\n` +
                `📋 Stavki: ${stats.troskovnikCount || 0}\n\n` +
                `⚠️ Ovo će zamijeniti trenutni troškovnik!`;
                
            if (!confirm(confirmMessage)) {
                showMessage('info', 'Učitavanje otkazano.');
                return;
            }
            
            // Clear existing troskovnik
            if (typeof troskovnik !== 'undefined') {
                troskovnik.length = 0;
            }
            
            // Load troskovnik data
            if (data.troskovnik && Array.isArray(data.troskovnik)) {
                if (typeof troskovnik !== 'undefined') {
                    troskovnik.push(...data.troskovnik);
                    // console.log('📋 Restored troškovnik:', troskovnik.length);
                }
            }
            
            // Update displays
            updateAllDisplays();
            
            showMessage('success', 
                `✅ Troškovnik uspješno učitano!\n\n` +
                `📁 Iz datoteke: ${file.name}\n` +
                `📋 Stavki: ${troskovnik.length}\n\n` +
                `💡 Troškovnik je spreman za korištenje!`
            );
            
        } catch (error) {
            console.error('❌ Load troskovnik error:', error);
            showMessage('error', 
                `❌ Greška pri učitavanju troškovnika!\n\n` +
                `Datoteka: ${file.name}\n` +
                `Greška: ${error.message}`
            );
        }
    };
    
    reader.onerror = function() {
        showMessage('error', `❌ Greška pri čitanju datoteke ${file.name}!`);
    };
    
    reader.readAsText(file, 'utf-8');
}

// Expose remaining functions globally
window.handleStateFileDrop = handleStateFileDrop;
window.handleStateFileSelect = handleStateFileSelect;
window.handleTroskovnikLoadSelect = handleTroskovnikLoadSelect;
window.serializeAppState = serializeAppState;
window.deserializeAppState = deserializeAppState;
window.saveTroskovnikOnly = saveTroskovnikOnly;
window.loadTroskovnikOnly = loadTroskovnikOnly;

// console.log('✅ State Manager module loaded - Save/Load functionality ready with Tablica Rabata support!');
// console.log('💾 CRITICAL: saveAppState, quickSaveState, and loadAppState are now available globally!');
// console.log('💾 CRITICAL: All save/load functions are exposed immediately after definition!');

// CRITICAL: Verify functions are available
// console.log('🔍 VERIFICATION: saveAppState available:', typeof window.saveAppState === 'function');
// console.log('🔍 VERIFICATION: quickSaveState available:', typeof window.quickSaveState === 'function');
// console.log('🔍 VERIFICATION: loadAppState available:', typeof window.loadAppState === 'function');

/**
 * Initialize state manager events and drop zones
 */
function initializeStateManager() {
    // Ensure AppState is available
    if (typeof window.AppState === 'undefined') {
        console.warn('⚠️ AppState not available yet, creating minimal version');
        window.AppState = {
            currentTab: 'search',
            hasUnsavedChanges: false,
            markAsSaved: function() { this.hasUnsavedChanges = false; },
            markAsChanged: function() { this.hasUnsavedChanges = true; }
        };
    }
    
    let dragDropOverlay = null;
    
    // Create drag drop overlay element
    function createDragDropOverlay() {
        if (dragDropOverlay) return dragDropOverlay;
        
        dragDropOverlay = document.createElement('div');
        dragDropOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(124, 58, 237, 0.1);
            border: 3px dashed #7c3aed;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: #7c3aed;
            pointer-events: none;
            backdrop-filter: blur(2px);
        `;
        dragDropOverlay.innerHTML = `
            <div style="text-align: center; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                <div style="font-size: 48px; margin-bottom: 12px;">📂</div>
                <div>Povucite JSON datoteku ovdje</div>
                <div style="font-size: 16px; color: #6b7280; margin-top: 8px;">Za učitavanje stanja aplikacije ili troškovnika</div>
            </div>
        `;
        
        return dragDropOverlay;
    }
    
    // Show drag drop overlay
    function showDragDropOverlay() {
        const overlay = createDragDropOverlay();
        if (!document.body.contains(overlay)) {
            document.body.appendChild(overlay);
        }
    }
    
    // Hide drag drop overlay
    function hideDragDropOverlay() {
        if (dragDropOverlay && document.body.contains(dragDropOverlay)) {
            document.body.removeChild(dragDropOverlay);
        }
    }
    
    // Drag over handler
    document.addEventListener('dragover', function(e) {
        const dt = e.dataTransfer;
        if (!dt || !dt.files) return;
        
        const files = Array.from(dt.files);
        const hasJsonFile = files.some(file => 
            file.type === 'application/json' || 
            file.name.toLowerCase().endsWith('.json')
        );
        
        if (hasJsonFile) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            showDragDropOverlay();
        }
    });
    
    // Drag leave handler
    document.addEventListener('dragleave', function(e) {
        // Only hide when leaving the document completely
        if (e.clientX === 0 && e.clientY === 0) {
            hideDragDropOverlay();
        }
    });
    
    // Drop handler
    document.addEventListener('drop', function(e) {
        hideDragDropOverlay();
        
        const files = Array.from(e.dataTransfer.files || []);
        const jsonFiles = files.filter(file => 
            file.type === 'application/json' || 
            file.name.toLowerCase().endsWith('.json')
        );
        
        if (jsonFiles.length > 0) {
            e.preventDefault();
            handleStateFileDrop(e);
        }
    });
    
    // console.log('🎯 State Manager drag & drop initialized with visual feedback');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStateManager);
} else {
    initializeStateManager();
}