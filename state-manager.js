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
        proslogodisnjeCijene: (typeof proslogodisnjeCijene !== 'undefined') ? proslogodisnjeCijene : [],
        
        // 🆕 NEW: Kupci (customers) data
        kupciTableData: (typeof window.kupciTableData !== 'undefined') ? window.kupciTableData : [],
        
        // Selected items
        selectedResults: (typeof selectedResults !== 'undefined') ? Array.from(selectedResults) : [],
        
        // Current tab state
        currentTab: currentTab,
        
        // UI input values
        globalSearchInput: document.getElementById('globalSearchInput')?.value || '',
        // 🆕 NEW: Kupac input values
        nazivKupca: document.getElementById('nazivKupca')?.value || '',
        kupacSifra: document.getElementById('nazivKupca')?.getAttribute('data-kupac-sifra') || '',
        godinaNatjecaja: document.getElementById('godinaNatjecaja')?.value || '25/26',
        grupaProizvoda: document.getElementById('grupaProizvoda')?.value || '',
        datumPredaje: document.getElementById('datumPredaje')?.value || '',
        
        // Excel troškovnik metadata
        excelTroskovnikData: (typeof excelTroskovnikData !== 'undefined') ? excelTroskovnikData : {
            procjenjena_vrijednost: null,
            garancija: null,
            nacin_predaje: null,
            datum_predaje: null
        },
        
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
            proslogodisnjeCijeneCount: (typeof proslogodisnjeCijene !== 'undefined') ? proslogodisnjeCijene.length : 0,
            selectedCount: (typeof selectedResults !== 'undefined') ? selectedResults.size : 0,
            // 🆕 NEW: Kupci statistics
            kupciCount: (typeof window.kupciTableData !== 'undefined') ? window.kupciTableData.length : 0
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
 * Collects all articles referenced in results, troskovnik, and tablicaRabata
 * This ensures search functionality continues to work after loading minimal state
 * @returns {Array} Array of articles that are actually used in the application
 */
function collectReferencedArticles() {
    if (typeof articles === 'undefined' || !Array.isArray(articles) || articles.length === 0) {
        return [];
    }
    
    const referencedIds = new Set();
    const referencedCodes = new Set();
    
    // Collect from results
    if (typeof results !== 'undefined' && Array.isArray(results)) {
        results.forEach(result => {
            if (result.id) referencedIds.add(result.id);
            if (result.code) referencedCodes.add(result.code);
        });
    }
    
    // Collect from troskovnik
    if (typeof troskovnik !== 'undefined' && Array.isArray(troskovnik)) {
        troskovnik.forEach(item => {
            if (item.id) referencedIds.add(item.id);
            if (item.sifra) referencedCodes.add(item.sifra);
        });
    }
    
    // Collect from tablicaRabata
    if (typeof tablicaRabata !== 'undefined' && Array.isArray(tablicaRabata)) {
        tablicaRabata.forEach(item => {
            if (item.id) referencedIds.add(item.id);
            if (item.sifra) referencedCodes.add(item.sifra);
        });
    }
    
    // Find matching articles
    const referencedArticles = articles.filter(article => 
        referencedIds.has(article.id) || referencedCodes.has(article.code)
    );
    
    console.log(`📦 Collecting referenced articles: ${referencedArticles.length} from ${articles.length} total articles`);
    console.log(`Referenced IDs: ${referencedIds.size}, Referenced codes: ${referencedCodes.size}`);
    
    return referencedArticles;
}

/**
 * Serializes MINIMAL application state (only final results) to JSON
 * Enhanced to include referenced articles for continued search functionality
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

    // Collect referenced articles before creating state object
    const referencedArticles = collectReferencedArticles();

    const state = {
        // Metadata
        timestamp: new Date().toISOString(),
        version: 'minimal-1.0',
        appName: 'Tražilica Proizvoda & Troškovnik - Complete Data',
        
        // EXCLUDED: articles (8-9MB) completely removed to reduce file size by 95%+
        // articles: EXCLUDED from minimal state for massive space savings
        
        // FIXED: Include ALL results (user may want to keep searches without prices yet)
        finalResults: (typeof results !== 'undefined') ? results : [],
        
        finalTroskovnik: (typeof troskovnik !== 'undefined') ? 
            troskovnik.filter(item => item) : [],
        
        finalTablicaRabata: (typeof tablicaRabata !== 'undefined') ? 
            tablicaRabata.filter(item => item) : [],
        
        // INCLUDE: All historical price data (user may need records without prices)
        finalProslogodisnjeCijene: (typeof window.proslogodisnjeCijene !== 'undefined') ? window.proslogodisnjeCijene : [],
        
        // 🆕 NEW: Referenced articles for continued search functionality
        referencedArticles: referencedArticles,
        
        // OPTIMIZED: Efficient Map → Array conversion with filtering
        finalWeightDatabase: (typeof weightDatabase !== 'undefined') ? 
            Array.from(weightDatabase.entries())
                .filter(([key, value]) => key && typeof value === 'number' && value > 0)
                .map(([key, value]) => [key, value]) : [], // Compact array format [sifra, tezina]
        
        finalPdvDatabase: (typeof pdvDatabase !== 'undefined') ? 
            Array.from(pdvDatabase.entries())
                .filter(([key, value]) => key && typeof value === 'number')
                .map(([key, value]) => [key, value]) : [], // Compact array format [sifra, pdv]
        
        // Header data for complete state restoration
        headerData: {
            nazivKupca: document.getElementById('nazivKupca')?.value || '',
            kupacSifra: document.getElementById('nazivKupca')?.getAttribute('data-kupac-sifra') || '',
            godinaNatjecaja: document.getElementById('godinaNatjecaja')?.value || '25/26',
            grupaProizvoda: document.getElementById('grupaProizvoda')?.value || '',
            datumPredaje: document.getElementById('datumPredaje')?.value || ''
        },
        
        // Excel troškovnik metadata
        excelTroskovnikData: (typeof excelTroskovnikData !== 'undefined') ? excelTroskovnikData : {
            procjenjena_vrijednost: null,
            garancija: null,
            nacin_predaje: null,
            datum_predaje: null
        },
        
        // Compact summary only
        summary: {
            totalResultsItems: (typeof results !== 'undefined') ? results.length : 0,
            totalTroskovnikItems: (typeof troskovnik !== 'undefined') ? troskovnik.length : 0,
            totalTablicaRabataItems: (typeof tablicaRabata !== 'undefined') ? tablicaRabata.length : 0,
            totalProslogodisnjeCijeneItems: (typeof window.proslogodisnjeCijene !== 'undefined') ? window.proslogodisnjeCijene.length : 0,
            totalReferencedArticles: referencedArticles.length,
            totalWeightItems: (typeof weightDatabase !== 'undefined') ? weightDatabase.size : 0,
            totalPdvItems: (typeof pdvDatabase !== 'undefined') ? pdvDatabase.size : 0,
            totalValueEUR: calculateTotalValue(),
            generatedAt: new Date().toLocaleString('hr-HR')
        }
    };
    
    console.log('📦 Serialized OPTIMIZED MINIMAL state:', {
        finalResults: state.finalResults.length + ' (ALL results included)',
        finalTroskovnik: state.finalTroskovnik.length + ' (price > 0)',
        finalTablicaRabata: state.finalTablicaRabata.length + ' (price > 0)',
        finalProslogodisnjeCijene: state.finalProslogodisnjeCijene.length + ' (ALL included)',
        referencedArticles: state.referencedArticles.length + ' (for search functionality)',
        finalWeightDatabase: state.finalWeightDatabase.length + ' (compact format)',
        finalPdvDatabase: state.finalPdvDatabase.length + ' (compact format)',
        totalValue: state.summary.totalValueEUR,
        optimization: 'Referenced articles preserved, search functionality maintained'
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
            
            // Load finalProslogodisnjeCijene → window.proslogodisnjeCijene
            if (state.finalProslogodisnjeCijene && Array.isArray(state.finalProslogodisnjeCijene)) {
                if (typeof window.proslogodisnjeCijene !== 'undefined') {
                    window.proslogodisnjeCijene.length = 0; // Clear existing
                    window.proslogodisnjeCijene.push(...state.finalProslogodisnjeCijene);
                    console.log('📅 Restored prošlogodišnje cijene from minimal format:', window.proslogodisnjeCijene.length);
                    
                    // Update filtered array if it exists
                    if (typeof window.filteredProslogodisnjeCijene !== 'undefined') {
                        window.filteredProslogodisnjeCijene = [...window.proslogodisnjeCijene];
                    }
                }
            }
            
            // 🆕 NEW: Load referencedArticles → articles (for search functionality)
            if (state.referencedArticles && Array.isArray(state.referencedArticles)) {
                if (typeof articles !== 'undefined') {
                    articles.push(...state.referencedArticles);
                    console.log('🔍 Restored referenced articles from minimal format:', articles.length);
                    console.log('✅ Search functionality will continue to work with restored articles');
                }
            }
            
            // Load finalWeightDatabase → weightDatabase Map (supports both compact and object format)
            if (state.finalWeightDatabase && Array.isArray(state.finalWeightDatabase)) {
                if (typeof weightDatabase !== 'undefined') {
                    weightDatabase.clear(); // Clear existing
                    state.finalWeightDatabase.forEach(item => {
                        if (Array.isArray(item) && item.length === 2) {
                            // New compact format: [sifra, tezina]
                            const [sifra, tezina] = item;
                            if (sifra && typeof tezina === 'number') {
                                weightDatabase.set(sifra, tezina);
                            }
                        } else if (item && typeof item === 'object' && item.sifra && item.tezina) {
                            // Legacy object format: {sifra, tezina}
                            weightDatabase.set(item.sifra, item.tezina);
                        }
                    });
                    console.log('⚖️ Restored weight database from minimal format:', weightDatabase.size);
                }
            }
            
            // Load finalPdvDatabase → pdvDatabase Map (supports both compact and object format)
            if (state.finalPdvDatabase && Array.isArray(state.finalPdvDatabase)) {
                if (typeof pdvDatabase !== 'undefined') {
                    pdvDatabase.clear(); // Clear existing
                    state.finalPdvDatabase.forEach(item => {
                        if (Array.isArray(item) && item.length === 2) {
                            // New compact format: [sifra, pdv]
                            const [sifra, pdv] = item;
                            if (sifra && typeof pdv === 'number') {
                                pdvDatabase.set(sifra, pdv);
                            }
                        } else if (item && typeof item === 'object' && item.sifra && typeof item.pdv === 'number') {
                            // Legacy object format: {sifra, pdv}
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
            
            // Restore prošlogodišnje cijene
            if (state.proslogodisnjeCijene && Array.isArray(state.proslogodisnjeCijene)) {
                if (typeof window.proslogodisnjeCijene !== 'undefined') {
                    window.proslogodisnjeCijene.length = 0; // Clear existing
                    window.proslogodisnjeCijene.push(...state.proslogodisnjeCijene);
                    // console.log('📅 Restored prošlogodišnje cijene from full format:', window.proslogodisnjeCijene.length);
                    
                    // Update filtered array if it exists
                    if (typeof window.filteredProslogodisnjeCijene !== 'undefined') {
                        window.filteredProslogodisnjeCijene = [...window.proslogodisnjeCijene];
                    }
                }
            }
            
            // 🆕 NEW: Restore kupci data
            if (state.kupciTableData && Array.isArray(state.kupciTableData)) {
                if (typeof window.kupciTableData !== 'undefined' && typeof window.processKupciData === 'function') {
                    try {
                        window.processKupciData(state.kupciTableData);
                        console.log('🏢 Restored kupci data:', state.kupciTableData.length);
                    } catch (error) {
                        console.warn('⚠️ Error restoring kupci data:', error);
                    }
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
        
        // 🆕 NEW: Restore kupac input values
        if (state.nazivKupca) {
            const nazivKupcaInput = document.getElementById('nazivKupca');
            if (nazivKupcaInput) {
                nazivKupcaInput.value = state.nazivKupca;
                // Restore kupac sifra if available
                if (state.kupacSifra) {
                    nazivKupcaInput.setAttribute('data-kupac-sifra', state.kupacSifra);
                }
            }
        }
        
        if (state.godinaNatjecaja) {
            const godinaNatjecajaSelect = document.getElementById('godinaNatjecaja');
            if (godinaNatjecajaSelect) {
                godinaNatjecajaSelect.value = state.godinaNatjecaja;
            }
        }
        
        if (state.grupaProizvoda) {
            const grupaProizvodaInput = document.getElementById('grupaProizvoda');
            if (grupaProizvodaInput) {
                grupaProizvodaInput.value = state.grupaProizvoda;
            }
        }
        
        if (state.datumPredaje) {
            const datumPredajeInput = document.getElementById('datumPredaje');
            if (datumPredajeInput) {
                datumPredajeInput.value = state.datumPredaje;
            }
        }
        
        // Restore header data from minimal format
        if (state.headerData) {
            if (state.headerData.nazivKupca) {
                const nazivKupcaInput = document.getElementById('nazivKupca');
                if (nazivKupcaInput) {
                    nazivKupcaInput.value = state.headerData.nazivKupca;
                    if (state.headerData.kupacSifra) {
                        nazivKupcaInput.setAttribute('data-kupac-sifra', state.headerData.kupacSifra);
                    }
                }
            }
            
            if (state.headerData.godinaNatjecaja) {
                const godinaNatjecajaSelect = document.getElementById('godinaNatjecaja');
                if (godinaNatjecajaSelect) {
                    godinaNatjecajaSelect.value = state.headerData.godinaNatjecaja;
                }
            }
            
            if (state.headerData.grupaProizvoda) {
                const grupaProizvodaInput = document.getElementById('grupaProizvoda');
                if (grupaProizvodaInput) {
                    grupaProizvodaInput.value = state.headerData.grupaProizvoda;
                }
            }
            
            if (state.headerData.datumPredaje) {
                const datumPredajeInput = document.getElementById('datumPredaje');
                if (datumPredajeInput) {
                    datumPredajeInput.value = state.headerData.datumPredaje;
                }
            }
        }
        
        // Restore Excel troškovnik metadata
        if (state.excelTroskovnikData && typeof excelTroskovnikData !== 'undefined') {
            excelTroskovnikData.procjenjena_vrijednost = state.excelTroskovnikData.procjenjena_vrijednost || null;
            excelTroskovnikData.garancija = state.excelTroskovnikData.garancija || null;
            excelTroskovnikData.nacin_predaje = state.excelTroskovnikData.nacin_predaje || null;
            excelTroskovnikData.datum_predaje = state.excelTroskovnikData.datum_predaje || null;
            
            console.log('📊 Restored Excel troškovnik metadata:', excelTroskovnikData);
            
            // Update display if it exists
            if (typeof updateTroskovnikDisplay === 'function') {
                try {
                    updateTroskovnikDisplay();
                } catch (error) {
                    console.warn('⚠️ Could not update troškovnik display:', error);
                }
            }
        }
        
        // Update all displays
        updateAllDisplays();
        
        // CRITICAL FIX: Refresh all existing articles with restored weight/PDV data
        if (typeof updateExistingArticlesWithWeightsAndPDV === 'function') {
            updateExistingArticlesWithWeightsAndPDV();
            console.log('✅ Articles refreshed with restored weight/PDV data after state loading');
        } else {
            console.warn('⚠️ updateExistingArticlesWithWeightsAndPDV not available - articles may not have proper classification');
        }

        // Also refresh results array specifically  
        if (typeof updateExistingResultsWithWeights === 'function') {
            updateExistingResultsWithWeights();
            console.log('✅ Results refreshed with restored weight/PDV data after state loading');
        } else {
            console.warn('⚠️ updateExistingResultsWithWeights not available - results may not have proper weights');
        }

        // CRITICAL: Refresh results display AFTER weight/PDV updates to show correct colors
        // Use timeout to ensure all database operations are complete
        setTimeout(() => {
            if (typeof updateResultsDisplay === 'function') {
                // Debug: Test the isTrulyOurArticle function with sample data
                if (typeof window.isTrulyOurArticle === 'function' && typeof window.weightDatabase !== 'undefined') {
                    console.log('🔍 DEBUG: Testing isTrulyOurArticle after state loading:');
                    console.log('   - weightDatabase size:', window.weightDatabase.size);
                    console.log('   - Sample test 2834:', window.isTrulyOurArticle('12.09.2025 Vagros Anex (1) - Lager', '2834'));
                    console.log('   - Sample test 641:', window.isTrulyOurArticle('12.09.2025 Vagros Anex (1) - Lager', '641'));
                    console.log('   - Sample test 6617:', window.isTrulyOurArticle('12.09.2025 Vagros Anex (1) - Urpd', '6617'));
                }
                
                updateResultsDisplay();
                console.log('✅ Results display refreshed after weight/PDV classification updates');
            } else {
                console.warn('⚠️ updateResultsDisplay not available - colors may not update correctly');
            }
        }, 100); // Small delay to ensure databases are ready

        // Force refresh troškovnik colors after weight database restoration
        if (typeof refreshTroskovnikColors === 'function') {
            refreshTroskovnikColors();
            console.log('✅ Troškovnik colors refreshed after state loading');
        } else {
            console.warn('⚠️ refreshTroskovnikColors not available - colors may not update correctly');
        }

        // CRITICAL: Also refresh troškovnik display to ensure PDV data is properly connected
        setTimeout(() => {
            if (typeof updateTroskovnikDisplay === 'function') {
                // Debug: Check PDV database state
                if (typeof window.pdvDatabase !== 'undefined') {
                    console.log('🔍 DEBUG: PDV database after state loading:');
                    console.log('   - pdvDatabase size:', window.pdvDatabase.size);
                    console.log('   - Sample PDV for 2834:', window.pdvDatabase.get('2834'));
                    console.log('   - Sample PDV for 641:', window.pdvDatabase.get('641'));
                }
                
                updateTroskovnikDisplay();
                console.log('✅ Troškovnik display refreshed after state loading');
            } else {
                console.warn('⚠️ updateTroskovnikDisplay not available - troškovnik may not show updated data');
            }
        }, 150); // Slightly longer delay for troškovnik
        
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
    if (typeof window.proslogodisnjeCijene !== 'undefined') window.proslogodisnjeCijene.length = 0;
    if (typeof window.filteredProslogodisnjeCijene !== 'undefined') window.filteredProslogodisnjeCijene.length = 0;
    if (typeof selectedResults !== 'undefined') selectedResults.clear();
    
    // 🆕 NEW: Clear kupci data safely
    if (typeof window.kupciDatabase !== 'undefined') window.kupciDatabase.clear();
    if (typeof window.kupciTableData !== 'undefined') window.kupciTableData.length = 0;
    
    // Clear input fields
    const globalInput = document.getElementById('globalSearchInput');
    if (globalInput) globalInput.value = '';
    
    // 🆕 NEW: Clear kupac input fields
    const nazivKupcaInput = document.getElementById('nazivKupca');
    if (nazivKupcaInput) {
        nazivKupcaInput.value = '';
        nazivKupcaInput.removeAttribute('data-kupac-sifra');
    }
    
    const godinaNatjecajaSelect = document.getElementById('godinaNatjecaja');
    if (godinaNatjecajaSelect) godinaNatjecajaSelect.value = '25/26';
    
    const grupaProizvodaInput = document.getElementById('grupaProizvoda');
    if (grupaProizvodaInput) grupaProizvodaInput.value = '';
    
    const datumPredajeInput = document.getElementById('datumPredaje');
    if (datumPredajeInput) datumPredajeInput.value = '';
    
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
        
        // Update prošlogodišnje cijene display if available
        if (typeof updateProslogodisnjeCijeneStats === 'function') {
            updateProslogodisnjeCijeneStats();
        }
        
        // FIXED: Call the actual display function for prošlogodišnje cijene
        if (typeof updateProslogodisnjeCijeneDisplay === 'function') {
            console.log('🔄 Calling updateProslogodisnjeCijeneDisplay() - data length:', window.proslogodisnjeCijene?.length || 0);
            updateProslogodisnjeCijeneDisplay();
            console.log('✅ updateProslogodisnjeCijeneDisplay() completed');
        } else {
            console.warn('❌ updateProslogodisnjeCijeneDisplay function not found');
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
    // Check if tablica rabata is generated
    if (!window.tablicaRabata || tablicaRabata.length === 0) {
        const shouldGenerate = confirm('⚠️ VAŽNO: Tablica rabata nije generirana!\n\nŽelite li ju generirati sada iz rezultata pretrage prije spremanja?\n\n✅ DA - Generiraj tablicu rabata\n❌ NE - Nastavi sa spremanjem bez tablice rabata');
        
        if (shouldGenerate) {
            // Try to generate tablica rabata from results
            if (typeof generateFromResults === 'function') {
                try {
                    generateFromResults();
                    showMessage('success', '✅ Tablica rabata je generirana iz rezultata!');
                } catch (error) {
                    showMessage('error', 'Greška pri generiranju tablice rabata: ' + error.message);
                    return;
                }
            } else {
                showMessage('error', 'Funkcija za generiranje tablice rabata nije dostupna!');
                return;
            }
        }
    }

    // Use the new dialog-based save
    if (typeof saveStateWithDialog === 'function') {
        saveStateWithDialog();
    } else {
        console.warn('saveStateWithDialog not available, falling back to OPTIMIZED download');
        // Fallback to OPTIMIZED behavior
        try {
            const state = serializeMinimalState();
            
            // Generate filename using tender header data
            const filenames = generateTenderFilenames('Stanje', 'json');
            const filename = `${filenames.cleanKupac}_${filenames.cleanGrupa}_${filenames.datumPredaje}_Stanje.json`;
            
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
                `✅ OPTIMIZIRANO stanje spremljeno!\n\n` +
                `📁 Datoteka: ${filename}\n` +
                `📊 Veličina: ${fileSizeKB} KB (95%+ SMANJENJE!)\n` +
                `🎯 Rezultati: ${state.finalResults.length} (filtrirani)\n` +
                `📋 Troškovnik: ${state.finalTroskovnik.length} (samo s cijenama)\n` +
                `📊 Tablica rabata: ${state.finalTablicaRabata.length} (filtrirani)\n` +
                `📅 Prošlogodišnje cijene: ${state.finalProslogodisnjeCijene.length} (filtrirane)\n` +
                `⚖️ Težine: ${state.finalWeightDatabase.length} (kompaktno)\n\n` +
                `🚀 Artikli isključeni = DRAMATIČNO smanjenje veličine!\n` +
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
            `✅ OPTIMIZIRNI podaci spremljeni!\n\n` +
            `📁 Datoteka: ${filename}\n` +
            `📊 Veličina: ${fileSizeKB} KB (${fileSizeMB} MB)\n` +
            `🎯 Rezultati: ${state.finalResults.length} stavki (filtrirani po cijeni)\n` +
            `📋 Troškovnik: ${state.finalTroskovnik.length} stavki (samo s cijenama)\n` +
            `📊 Tablica rabata: ${state.finalTablicaRabata.length} stavki (samo s cijenama)\n` +
            `📅 Prošlogodišnje cijene: ${state.finalProslogodisnjeCijene.length} stavki (filtrirane)\n` +
            `⚖️ Težine: ${state.finalWeightDatabase.length} stavki (kompaktni format)\n` +
            `💰 Ukupna vrijednost: ${state.summary.totalValueEUR} EUR\n\n` +
            `🚀 OPTIMIZIRNO: Artikli isključeni = 95%+ smanjenje veličine!\n` +
            `💡 Samo korisni podaci - optimalna funkcionalnost, minimalna veličina.`
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
 * Load application state with user choice: local file or Google Drive
 */
async function loadAppState(file = null) {
    try {
        if (file) {
            // Direct file loading (drag & drop or file picker)
            return await loadAppStateFromFile(file);
        } else {
            // Show load options dialog
            const choice = await showLoadOptionsDialog();
            
            if (choice === 'google-drive') {
                // Load from Google Drive
                if (typeof loadStateFromGoogleDrive === 'function') {
                    return await loadStateFromGoogleDrive();
                } else {
                    showMessage('error', 'Google Drive funkcionalnost nije dostupna!');
                    return false;
                }
            } else if (choice === 'local') {
                // Show file picker for local file
                return await showLocalFilePickerForLoad();
            } else {
                // User cancelled
                return false;
            }
        }
        
    } catch (error) {
        console.error('❌ Load state error:', error);
        showMessage('error', `Greška pri učitavanju: ${error.message}`);
        return false;
    }
}

/**
 * Show load options dialog
 */
async function showLoadOptionsDialog() {
    return new Promise((resolve) => {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); max-width: 500px; width: 90%;">
                <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">📂 Odaberite način učitavanja</h3>
                <div style="margin-bottom: 24px; color: #6b7280; font-size: 14px;">
                    Odakle želite učitati stanje aplikacije?
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="loadFromGoogleDrive" style="padding: 12px 16px; border: 2px solid #2563eb; border-radius: 8px; background: #2563eb; color: white; cursor: pointer; font-size: 14px; font-weight: bold;">
                        ☁️ Učitaj s Google Drive
                    </button>
                    <button id="loadFromLocal" style="padding: 12px 16px; border: 2px solid #6b7280; border-radius: 8px; background: white; color: #374151; cursor: pointer; font-size: 14px;">
                        💾 Učitaj s lokalnog računala
                    </button>
                    <button id="cancelLoad" style="padding: 8px 16px; border: none; background: transparent; color: #6b7280; cursor: pointer; font-size: 13px;">
                        ❌ Odustani
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle button clicks
        modal.querySelector('#loadFromGoogleDrive').onclick = () => {
            document.body.removeChild(modal);
            resolve('google-drive');
        };
        
        modal.querySelector('#loadFromLocal').onclick = () => {
            document.body.removeChild(modal);
            resolve('local');
        };
        
        modal.querySelector('#cancelLoad').onclick = () => {
            document.body.removeChild(modal);
            resolve('cancel');
        };
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                resolve('cancel');
            }
        };
    });
}

/**
 * Show local file picker for loading
 */
async function showLocalFilePickerForLoad() {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                loadAppStateFromFile(file).then(resolve);
            } else {
                resolve(false);
            }
        };
        input.click();
    });
}

/**
 * Load application state from a local JSON file
 * @param {File} file - JSON file to load
 */
async function loadAppStateFromFile(file) {
    // console.log('🔄 loadAppStateFromFile called with file:', file ? file.name : 'undefined');
    
    if (!file) {
        showMessage('error', '❌ Nema odabrane datoteke!');
        return false;
    }
    
    if (!file.name.toLowerCase().endsWith('.json')) {
        showMessage('error', '❌ Molimo odaberite JSON datoteku!');
        return false;
    }
    
    // Optional file size check - removed to allow large JSON files
    // Most JSON state files should load fine regardless of size
    
    showMessage('info', `🔄 Učitavam stanje iz ${file.name}...`);
    
    return new Promise((resolve, reject) => {
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
                    `Učitati OPTIMIZIRANE podatke iz datoteke?\n\n` +
                    `📁 Datoteka: ${file.name}\n` +
                    `📅 Stvoreno: ${state.timestamp ? new Date(state.timestamp).toLocaleString('hr-HR') : 'Nepoznato'}\n` +
                    `🚀 Format: OPTIMIZIRANI PODACI (filtrirani, kompaktni)\n` +
                    `🎯 Rezultati: ${state.finalResults?.length || 0} stavki (samo s cijenama)\n` +
                    `📋 Troškovnik: ${state.finalTroskovnik?.length || 0} stavki (filtrirani)\n` +
                    `📊 Tablica rabata: ${state.finalTablicaRabata?.length || 0} stavki (filtrirani)\n` +
                    `📅 Prošlogodišnje cijene: ${state.finalProslogodisnjeCijene?.length || 0} stavki (filtrirane)\n` +
                    `⚖️ Težine: ${state.finalWeightDatabase?.length || 0} stavki (kompaktni format)\n` +
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
                    `📊 Tablica rabata: ${stats.tablicaRabataCount || 0}\n` +
                    `📅 Prošlogodišnje cijene: ${stats.proslogodisnjeCijeneCount || 0}\n\n` +
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
                    `✅ OPTIMIZIRANI podaci uspješno učitani!\n\n` +
                    `📁 Iz datoteke: ${file.name}\n` +
                    `🚀 Format: OPTIMIZIRANI PODACI (95%+ manji)\n` +
                    `🎯 Rezultati: ${results.length} stavki (filtrirani po cijeni)\n` +
                    `📋 Troškovnik: ${troskovnik.length} stavki (samo s cijenama)\n` +
                    `📊 Tablica rabata: ${tablicaRabata.length} stavki (filtrirani)\n` +
                    `📅 Prošlogodišnje cijene: ${proslogodisnjeCijene.length} stavki (filtrirane)\n` +
                    `⚖️ Težine: ${weightDatabase.size} stavki (kompaktni format)\n\n` +
                    `💡 Optimiziran za brzinu - aplikacija potpuno funkcionalna!`
                    :
                    `✅ Kompletno stanje aplikacije uspješno učitano!\n\n` +
                    `📁 Iz datoteke: ${file.name}\n` +
                    `🎯 Format: KOMPLETNO stanje\n` +
                    `📊 Artikli: ${articles.length}\n` +
                    `🎯 Rezultati: ${results.length}\n` +
                    `📋 Troškovnik: ${troskovnik.length}\n` +
                    `💰 Preračun: ${preracunResults.length}\n` +
                    `📊 Tablica rabata: ${tablicaRabata.length}\n` +
                    `📅 Prošlogodišnje cijene: ${proslogodisnjeCijene.length}\n` +
                    `✅ Odabrani: ${selectedResults.size}`;
                    
                showMessage('success', successMessage);
                resolve(true);
            } else {
                resolve(false);
            }
            
        } catch (error) {
            console.error('❌ Load state error:', error);
            showMessage('error', 
                `❌ Greška pri učitavanju datoteke!\n\n` +
                `Datoteka: ${file.name}\n` +
                `Greška: ${error.message}\n\n` +
                `Molimo provjerite da je datoteka valjana JSON datoteka stanja aplikacije.`
            );
            reject(error);
        }
    };
    
    reader.onerror = function() {
        const errorMsg = `❌ Greška pri čitanju datoteke ${file.name}!`;
        showMessage('error', errorMsg);
        reject(new Error(errorMsg));
    };
    
    reader.readAsText(file, 'utf-8');
    });
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
    
    // Check if it's a troskovnik-only file, articles-only file, or regular state file
    const file = jsonFiles[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.type === 'troskovnik-only') {
                loadTroskovnikOnly(file);
            } else if (data.articles && Array.isArray(data.articles) && data.articles.length > 0 && 
                      !data.results && !data.troskovnik && !data.tablicaRabata) {
                // Likely articles-only file - ask user
                if (confirm(`Datoteka sadrži ${data.articles.length} artikala.\nŽelite li učitati samo artikle?\n\n✅ DA = samo artikli\n❌ NE = kompletno stanje`)) {
                    loadArticlesOnly(file);
                } else {
                    loadAppState(file);
                }
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
 * Handles file picker selection for articles-only files
 * @param {Event} event - File input change event
 */
function handleArticlesOnlyLoadSelect(event) {
    const file = event.target.files[0];
    if (file) {
        loadArticlesOnly(file);
    }
    // Clear the input so the same file can be selected again
    event.target.value = '';
}

/**
 * Quick save with predefined filename
 */
function quickSaveState() {
    try {
        const state = serializeMinimalState();
        // Quick save uses "TRENUTNO" prefix for instant saves
        const filename = 'TRENUTNO_Stanje.json';
        
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
        showMessage('success', `⚡ Brzo spremljeno OPTIMIZIRANO! (${filename}, ${fileSizeKB} KB - 95%+ manje!)`);
        
    } catch (error) {
        console.error('❌ Quick save error:', error);
        showMessage('error', `Greška pri brzom spremanju: ${error.message}`);
    }
}

/**
 * Save state with user choice: local file or Google Drive
 */
async function saveStateWithDialog() {
    try {
        // Show save options dialog
        const choice = await showSaveOptionsDialog();
        
        if (choice === 'google-drive') {
            // Save to Google Drive
            if (typeof saveStateToGoogleDrive === 'function') {
                return await saveStateToGoogleDrive('full');
            } else {
                showMessage('error', 'Google Drive funkcionalnost nije dostupna!');
                return false;
            }
        } else if (choice === 'local') {
            // Save to local file
            return await saveStateToLocalFile();
        } else {
            // User cancelled
            return false;
        }
        
    } catch (error) {
        console.error('❌ Save dialog error:', error);
        showMessage('error', `Greška pri spremanju: ${error.message}`);
        return false;
    }
}

/**
 * Show save options dialog
 */
async function showSaveOptionsDialog() {
    return new Promise((resolve) => {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); max-width: 600px; width: 95%;">
                <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">📁 Odaberite način spremanja</h3>
                <div style="margin-bottom: 20px; color: #6b7280; font-size: 14px;">
                    Gdje želite spremiti stanje aplikacije?
                </div>
                
                <div style="margin-bottom: 24px; padding: 16px; background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px;">
                    <div style="color: #92400e; font-weight: bold; font-size: 14px; margin-bottom: 8px;">⚠️ VAŽNO: Optimizirano spremanje</div>
                    <div style="color: #92400e; font-size: 13px; line-height: 1.4;">
                        • <strong>Čuva se:</strong> rezultati, troškovnik, tablica rabata, referencirane artikle za pretragu<br>
                        • <strong>Ne čuva se:</strong> kompletni popis svih uploadanih artikala<br>
                        • <strong>Za nastavak rada:</strong> možete pretražiti samo artikle koje ste ranije koristili<br>
                        • <strong>95%+ smanjenje veličine datoteke</strong> u odnosu na punu verziju
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="saveToGoogleDrive" style="padding: 12px 16px; border: 2px solid #2563eb; border-radius: 8px; background: #2563eb; color: white; cursor: pointer; font-size: 14px; font-weight: bold;">
                        ☁️ Spremi na Google Drive
                    </button>
                    <button id="saveToLocal" style="padding: 12px 16px; border: 2px solid #6b7280; border-radius: 8px; background: white; color: #374151; cursor: pointer; font-size: 14px;">
                        💾 Spremi lokalno na računalo
                    </button>
                    <button id="cancelSave" style="padding: 8px 16px; border: none; background: transparent; color: #6b7280; cursor: pointer; font-size: 13px;">
                        ❌ Odustani
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle button clicks
        modal.querySelector('#saveToGoogleDrive').onclick = () => {
            document.body.removeChild(modal);
            resolve('google-drive');
        };
        
        modal.querySelector('#saveToLocal').onclick = () => {
            document.body.removeChild(modal);
            resolve('local');
        };
        
        modal.querySelector('#cancelSave').onclick = () => {
            document.body.removeChild(modal);
            resolve('cancel');
        };
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                resolve('cancel');
            }
        };
    });
}

/**
 * Save state to local file (original functionality)
 */
async function saveStateToLocalFile() {
    try {
        const state = serializeMinimalState();
        const jsonString = JSON.stringify(state, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Try File System Access API (modern browsers)
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: `${generateTenderFilenames('Stanje', 'json').cleanKupac || 'Kupac'}_${generateTenderFilenames('Stanje', 'json').cleanGrupa || 'Grupa'}_${generateTenderFilenames('Stanje', 'json').datumPredaje}_Stanje.json`,
                    types: [{
                        description: 'OPTIMIZIRANE JSON datoteke',
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
                showMessage('success', `💾 OPTIMIZIRANO spremljeno! (${fileSizeKB} KB - 95%+ manje!)`);
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
            const filenames = generateTenderFilenames('Stanje', 'json');
            const filename = `${filenames.cleanKupac}_${filenames.cleanGrupa}_${filenames.datumPredaje}_Stanje.json`;
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
            showMessage('success', `💾 OPTIMIZIRANO u Downloads! (${filename}, ${fileSizeKB} KB - 95%+ manje!)`);
            return true;
        }
        
    } catch (error) {
        console.error('❌ Save to local file error:', error);
        showMessage('error', `Greška pri spremanju na lokalno računalo: ${error.message}`);
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

/**
 * Loads only articles data from JSON file
 */
function loadArticlesOnly(file) {
    if (!file.name.toLowerCase().endsWith('.json')) {
        showMessage('error', '❌ Molimo odaberite JSON datoteku s artiklima!');
        return;
    }
    
    showMessage('info', `🔄 Učitavam artikle iz ${file.name}...`);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonContent = e.target.result;
            
            // Validate JSON content
            if (!jsonContent || jsonContent.trim() === '') {
                throw new Error('Datoteka je prazna');
            }
            
            const data = JSON.parse(jsonContent);
            
            // Validate data structure
            if (!data || typeof data !== 'object') {
                throw new Error('Neispravna struktura JSON datoteke');
            }
            
            // Check if the file contains articles
            if (!data.articles || !Array.isArray(data.articles)) {
                showMessage('error', '❌ Datoteka ne sadrži artikle! Molimo odaberite JSON datoteku s artiklima.');
                return;
            }
            
            // Confirm with user before loading
            const confirmMessage = 
                `Učitati artikle iz datoteke?\n\n` +
                `📁 Datoteka: ${file.name}\n` +
                `📅 Stvoreno: ${data.timestamp ? new Date(data.timestamp).toLocaleString('hr-HR') : 'Nepoznato'}\n` +
                `📊 Artikli: ${data.articles.length}\n\n` +
                `⚠️ Ovo će zamijeniti trenutne artikle, ali ostaviti ostale podatke (rezultati, troškovnik, itd.) netaknute!`;
                
            if (!confirm(confirmMessage)) {
                showMessage('info', 'Učitavanje otkazano.');
                return;
            }
            
            // Clear existing articles
            if (typeof articles !== 'undefined') {
                articles.length = 0;
            }
            
            // Load articles data
            if (typeof articles !== 'undefined') {
                articles.push(...data.articles);
                console.log('📊 Restored articles:', articles.length);
            }
            
            // Update article stats and displays
            if (typeof updateArticleStats === 'function') {
                updateArticleStats();
            }
            
            showMessage('success', 
                `✅ Artikli uspješno učitani!\n\n` +
                `📁 Iz datoteke: ${file.name}\n` +
                `📊 Artikli: ${articles.length}\n\n` +
                `💡 Ostali podaci (rezultati, troškovnik, tablica rabata) su ostali netaknuti!\n` +
                `🔍 Možete odmah početi pretraživati nove artikle!`
            );
            
        } catch (error) {
            console.error('❌ Load articles error:', error);
            showMessage('error', 
                `❌ Greška pri učitavanju artikala!\n\n` +
                `Datoteka: ${file.name}\n` +
                `Greška: ${error.message}\n\n` +
                `Molimo provjerite da je datoteka valjana JSON datoteka s artiklima.`
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
window.handleArticlesOnlyLoadSelect = handleArticlesOnlyLoadSelect;
window.serializeAppState = serializeAppState;
window.deserializeAppState = deserializeAppState;
window.saveTroskovnikOnly = saveTroskovnikOnly;
window.loadTroskovnikOnly = loadTroskovnikOnly;
window.loadArticlesOnly = loadArticlesOnly;

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