/**
 * ENHANCED MAIN APPLICATION MODULE
 * Initializes the enhanced application with direct price management
 */

/**
 * Initialize the enhanced application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Enhanced safety check for Logger availability
    console.log('DEBUG: Checking Logger...', typeof Logger);
    if (typeof Logger !== 'undefined') {
        console.log('DEBUG: Logger exists, checking LEVELS...', Logger.LEVELS);
    }
    
    if (typeof Logger === 'undefined' || !Logger.LEVELS) {
        console.error('❌ ERROR: Logger not properly initialized');
        console.error('❌ Logger type:', typeof Logger);
        console.error('❌ Logger.LEVELS:', Logger && Logger.LEVELS);
        return;
    }
    
    Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'Pokretanje ENHANCED aplikacije...');
    
    // Initialize article statistics
    updateArticleStats();
    
    // Set initial tab (search tab should be active)
    showTab('search');
    
    // Initialize UI event listeners (including autocomplete)
    initializeUIEventListeners();
    
    // Initialize sticky search autocomplete
    initializeStickySearchAutocomplete();
    
    // Initialize state management if available
    if (typeof initializeStateManager === 'function') {
        initializeStateManager();
        if (Logger && Logger.LEVELS) {
            Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'State management initialized');
        }
    }
    
    // ENHANCED: Initialize results display immediately
    if (typeof updateResultsDisplay === 'function') {
        updateResultsDisplay();
    }
    
    // ENHANCED: Initialize troškovnik display 
    if (typeof updateTroskovnikDisplay === 'function') {
        updateTroskovnikDisplay();
    }
    
    // ENHANCED: Initialize tablica rabata display
    if (typeof updateTablicaRabataDisplay === 'function') {
        updateTablicaRabataDisplay();
    }
    
    // Log startup information
    if (Logger && Logger.LEVELS) {
        Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'ENHANCED aplikacija uspješno pokrenuta!');
        Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'Demo podaci uklonjeni - upload-ajte svoje podatke');
        Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'Aplikacija spremna za enhanced pretragu');
        Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'Autocomplete omogućen - tipkajte 2+ znakova');
        Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'Save/Load funkcionalnost dostupna');
        Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'Sticky search bar aktiviran');
        Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'ENHANCED: Direktno upravljanje cijenama aktivno');
        Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'ENHANCED: Color coding za troškovnik aktivan');
        Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'ENHANCED: Tablica rabata iz rezultata aktivna');
    }
    
    // Show enhanced welcome message
    if (articles.length === 0) { // No demo data
        showMessage('info', 
            '🎉 Dobrodošli u ENHANCED verziju!\n\n' +
            '📊 Demo podaci su uklonjeni\n' +
            '🔍 Glavna tražilica je sada UVIJEK VIDLJIVA na vrhu\n' +
            '🆕 NOVA FUNKCIONALNOST:\n' +
            '• Direktno upravljanje cijenama za LAGER/URPD artikle\n' +
            '• Automatski sync s troškovnikom\n' +
            '• Color coding u troškovniku prema broju rezultata\n' +
            '• Tablica rabata se generira iz rezultata\n' +
            '• Eliminiran "Preračun" tab - sve direktno!\n\n' +
            '📄 Upload-ajte Excel/CSV datoteke za početak rada\n' +
            '💾 Koristite "Save As" za spremanje vašeg rada\n\n' +
            '⌨️ Kratice: Ctrl+S (brzo spremi), Ctrl+Shift+S (odaberi lokaciju), Ctrl+O (učitaj)'
        );
    }
    
    // Additional enhanced initialization
    initializeEnhancedEventListeners();
});

/**
 * Initialize enhanced sticky search bar autocomplete functionality
 */
function initializeStickySearchAutocomplete() {
    const globalSearchInput = document.getElementById('globalSearchInput');
    if (globalSearchInput) {
        // Add event listeners for enhanced autocomplete
        globalSearchInput.addEventListener('input', handleSearchInput);
        globalSearchInput.addEventListener('keydown', handleGlobalSearchKeypress);
        globalSearchInput.addEventListener('blur', () => {
            // Delay hiding to allow click on autocomplete items
            setTimeout(hideAutocomplete, 150);
        });
        
        if (Logger && Logger.LEVELS) {
            Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'Enhanced sticky search autocomplete initialized');
        }
    } else {
        if (Logger && Logger.error) {
            Logger.error('globalSearchInput not found for enhanced autocomplete!');
        } else {
            console.error('❌ ERROR: globalSearchInput not found for enhanced autocomplete!');
        }
    }
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('#globalSearchInput') && 
            !event.target.closest('#autocomplete-dropdown')) {
            hideAutocomplete();
        }
    });
}

/**
 * Initialize enhanced event listeners
 */
function initializeEnhancedEventListeners() {
    // NOTE: isTrulyOurArticle() is centrally defined in utils.js and exported as window.isTrulyOurArticle

    // Enhanced keyboard shortcuts for new functionality
    document.addEventListener('keydown', function(event) {
        // Number keys 1-6 to switch tabs (without modifiers)
        if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
            const tabMap = {
                '1': 'search',
                '2': 'troskovnik',
                '3': 'results',
                '4': 'tablicaRabata',
                '5': 'proslogodisnjeCijene',
                '6': 'weights'
            };

            if (tabMap[event.key]) {
                // Don't switch tabs if user is typing in an input field
                const activeElement = document.activeElement;
                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                    return;
                }

                event.preventDefault();
                if (typeof showTab === 'function') {
                    showTab(tabMap[event.key]);
                }
            }
        }

        // Ctrl+R to refresh troškovnik colors
        if ((event.ctrlKey || event.metaKey) && event.key === 'r' && !event.shiftKey) {
            event.preventDefault();
            if (typeof refreshTroskovnikColors === 'function') {
                refreshTroskovnikColors();
                showMessage('success', '🎨 Troškovnik colors refreshed!');
            }
        }

        // Ctrl+G to generate tablica rabata from results
        if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
            event.preventDefault();
            if (typeof generateFromResults === 'function') {
                generateFromResults();
            }
        }

        // Ctrl+E to export current tab data
        if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
            event.preventDefault();
            handleEnhancedExport();
        }

        // Ctrl+F to focus search in weights tab
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            const currentTab = AppState.currentTab || 'search';
            if (currentTab === 'weights') {
                const searchInput = document.getElementById('weightsSearchInput');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
        }
    });
    
    // Enhanced window resize handler
    window.addEventListener('resize', function() {
        // Hide autocomplete on resize to prevent positioning issues
        if (typeof hideAutocomplete === 'function') {
            hideAutocomplete();
        }
        
        // Refresh displays after resize
        setTimeout(() => {
            if (typeof updateResultsDisplay === 'function') {
                updateResultsDisplay();
            }
        }, 100);
    });
    
    // Enhanced scroll handler for sticky search
    let lastScrollTop = 0;
    window.addEventListener('scroll', function() {
        if (typeof autocompleteVisible !== 'undefined' && autocompleteVisible) {
            if (typeof hideAutocomplete === 'function') {
                hideAutocomplete();
            }
        }
        
        // Enhanced: Ensure sticky search bar always visible
        const stickyBar = document.querySelector('.sticky-search-bar');
        if (stickyBar) {
            stickyBar.style.top = '0px';
        }
    });
    
    // Enhanced beforeunload to ask user about saving
    window.addEventListener('beforeunload', function(event) {
        // Hide autocomplete
        if (typeof hideAutocomplete === 'function') {
            hideAutocomplete();
        }
        
        // Check if user has enhanced work (results with prices)
        const hasEnhancedWork = results.filter(r => r.hasUserPrice).length > 0 || 
                               tablicaRabata.length > 0 ||
                               articles.length > 10 || 
                               troskovnik.length > 0;
        
        if (hasEnhancedWork) {
            const message = 'Imate nespremljan rad. Želite li spremiti prije zatvaranja?';
            event.returnValue = message;
            return message;
        }
    });
    
    if (Logger && Logger.LEVELS) {
        Logger.area('APP_STARTUP', Logger.LEVELS.INFO, 'Enhanced event listeners initialized');
    }
}

/**
 * Handles enhanced export based on current tab
 */
function handleEnhancedExport() {
    const currentTab = AppState.currentTab || 'search';
    
    switch (currentTab) {
        case 'results':
            if (typeof exportResults === 'function') {
                exportResults();
            }
            break;
        case 'troskovnik':
            if (typeof exportTroskovnikExcel === 'function') {
                exportTroskovnikExcel();
            }
            break;
        case 'tablicaRabata':
            if (typeof exportTablicaRabataExcel === 'function') {
                exportTablicaRabataExcel();
            }
            break;
        default:
            showMessage('info', 'Prebacite se na Results, Troškovnik ili Tablica Rabata tab za export.');
    }
}

/**
 * Enhanced keyboard shortcuts help
 */
function showEnhancedKeyboardShortcutsHelp() {
    const helpText = 
        '⌨️ ENHANCED KRATICE TIPKOVNICE:\n\n' +
        '🔍 PRETRAGA (STICKY SEARCH BAR):\n' +
        '• Ctrl+/ - Fokus na glavnu tražilicu (uvijek dostupna!)\n' +
        '• Enter - Pokreni pretragu i briši prethodne rezultate\n' +
        '• Escape - Očisti pretragu / zatvori autocomplete\n' +
        '• Ctrl+Shift+R - Vrati sve uklonjene autocomplete artikle\n\n' +
        '💾 SPREMANJE/UČITAVANJE:\n' +
        '• Ctrl+S - Brzo spremi stanje\n' +
        '• Ctrl+Shift+S - Odaberi lokaciju za spremanje\n' +
        '• Ctrl+O - Učitaj stanje iz datoteke\n\n' +
        '🆕 ENHANCED FUNKCIONALNOSTI:\n' +
        '• Ctrl+R - Refresh troškovnik colors\n' +
        '• Ctrl+G - Generiraj tablicu rabata iz rezultata\n' +
        '• Ctrl+E - Export trenutnog tab-a\n\n' +
        '🎯 DIREKTNO UPRAVLJANJE CIJENAMA:\n' +
        '• Za LAGER/URPD artikle unosite cijene direktno u rezultatima\n' +
        '• €/kom ili €/kg - program računa drugu vrijednost\n' +
        '• Automatski sync s troškovnikom\n\n' +
        '🎨 COLOR CODING:\n' +
        '• Troškovnik se boji prema broju rezultata\n' +
        '• Žuto = malo rezultata, Zeleno = dobro, Plavo = puno\n\n' +
        '📊 TABLICA RABATA:\n' +
        '• Generira se direktno iz rezultata s vašim cijenama\n' +
        '• Samo LAGER/URPD stavke s unesenim cijenama\n\n' +
        '🎯 DRAG & DROP:\n' +
        '• Povucite JSON datoteku bilo gdje za učitavanje stanja\n' +
        '• Povucite Excel/CSV datoteke u upload područja';
    
    alert(helpText);
}

/**
 * Enhanced Application state management
 */
const AppState = {
    currentTab: 'search',
    isSearching: false,
    isUploading: false,
    autocompleteEnabled: true,
    lastSaved: null,
    hasUnsavedChanges: false,
    excludedArticlesCount: 0,
    enhancedMode: true, // NEW: Enhanced mode flag
    directPriceManagement: true, // NEW: Direct price management active
    
    setCurrentTab: function(tabName) {
        this.currentTab = tabName;
        // Hide autocomplete when switching tabs
        if (typeof hideAutocomplete === 'function') {
            hideAutocomplete();
        }
        this.markAsChanged();
        
        // Enhanced: Refresh displays when switching tabs
        this.refreshCurrentTabDisplay();
    },
    
    refreshCurrentTabDisplay: function() {
        const currentTab = this.currentTab;
        setTimeout(() => {
            switch (currentTab) {
                case 'results':
                    if (typeof updateResultsDisplay === 'function') {
                        updateResultsDisplay();
                    }
                    break;
                case 'troskovnik':
                    if (typeof updateTroskovnikDisplay === 'function') {
                        updateTroskovnikDisplay();
                    }
                    if (typeof refreshTroskovnikColors === 'function') {
                        refreshTroskovnikColors();
                    }
                    break;
                case 'tablicaRabata':
                    if (typeof updateTablicaRabataDisplay === 'function') {
                        updateTablicaRabataDisplay();
                    }
                    break;
            }
        }, 100);
    },
    
    setSearching: function(status) {
        this.isSearching = status;
        this.updateUI();
        if (status) this.markAsChanged();
    },
    
    setUploading: function(status) {
        this.isUploading = status;
        this.updateUI();
        if (status) this.markAsChanged();
    },
    
    toggleAutocomplete: function() {
        this.autocompleteEnabled = !this.autocompleteEnabled;
        if (!this.autocompleteEnabled) {
            if (typeof hideAutocomplete === 'function') {
                hideAutocomplete();
            }
        }
        if (Logger && Logger.LEVELS) {
            Logger.area('UI_EVENTS', Logger.LEVELS.DEBUG, 'Enhanced autocomplete', this.autocompleteEnabled ? 'enabled' : 'disabled');
        }
        this.markAsChanged();
    },
    
    updateExcludedCount: function(count) {
        this.excludedArticlesCount = count;
        this.markAsChanged();
    },
    
    markAsChanged: function() {
        this.hasUnsavedChanges = true;
        this.updateSaveButtonStates();
    },
    
    markAsSaved: function() {
        this.hasUnsavedChanges = false;
        this.lastSaved = new Date();
        this.updateSaveButtonStates();
    },
    
    updateSaveButtonStates: function() {
        // Enhanced: Update save button appearances based on unsaved changes
        const quickSaveBtn = document.querySelector('.btn-quick-save');
        const saveAsBtn = document.querySelector('.btn-save-as');
        
        if (this.hasUnsavedChanges) {
            if (quickSaveBtn) {
                quickSaveBtn.style.background = '#f59e0b'; // Orange for unsaved changes
                quickSaveBtn.title = 'Brzo spremi ENHANCED - imate nespreljene promjene!';
            }
            if (saveAsBtn) {
                saveAsBtn.style.background = '#dc2626'; // Red for unsaved changes
                saveAsBtn.title = 'Save As ENHANCED - imate nespreljene promjene!';
            }
        } else {
            if (quickSaveBtn) {
                quickSaveBtn.style.background = '#10b981'; // Green when saved
                quickSaveBtn.title = 'Brzo spremi trenutno ENHANCED stanje';
            }
            if (saveAsBtn) {
                saveAsBtn.style.background = '#7c3aed'; // Purple when saved
                saveAsBtn.title = 'Spremi ENHANCED stanje aplikacije s timestampom';
            }
        }
    },
    
    updateUI: function() {
        // Enhanced: Update UI based on current state
        const searchButtons = document.querySelectorAll('.btn-primary');
        searchButtons.forEach(btn => {
            if (btn.textContent.includes('Pretraži')) {
                btn.disabled = this.isSearching;
                btn.textContent = this.isSearching ? 'Pretražujem...' : 'Pretraži';
            }
        });
        
        // Update search inputs state
        const searchInputs = document.querySelectorAll('.search-input, .sticky-search-input');
        searchInputs.forEach(input => {
            input.disabled = this.isSearching || this.isUploading;
        });
        
        this.updateSaveButtonStates();
    },
    
    // Enhanced: Get enhanced statistics
    getEnhancedStats: function() {
        const resultsWithPrices = results.filter(r => r.hasUserPrice).length;
        const ourArticles = results.filter(r => window.isTrulyOurArticle(r.source, r.code)).length;
        const troskovnikWithResults = troskovnik.filter(t => t.found_results > 0).length;
        
        return {
            articles: articles.length,
            results: results.length,
            resultsWithPrices: resultsWithPrices,
            ourArticles: ourArticles,
            troskovnik: troskovnik.length,
            troskovnikWithResults: troskovnikWithResults,
            tablicaRabata: tablicaRabata.length,
            selected: selectedResults.size,
            currentTab: this.currentTab,
            hasUnsavedChanges: this.hasUnsavedChanges,
            excludedArticles: this.excludedArticlesCount,
            enhancedMode: this.enhancedMode,
            directPriceManagement: this.directPriceManagement
        };
    }
};

/**
 * Enhanced global error handler
 */
window.addEventListener('error', function(event) {
    if (Logger && Logger.error) {
        Logger.error('Enhanced aplikacijska greška:', event.error);
    } else {
        console.error('❌ ERROR: Enhanced aplikacijska greška:', event.error);
    }
    
    // Hide autocomplete on errors to prevent UI issues
    if (typeof hideAutocomplete === 'function') {
        hideAutocomplete();
    }
    
    // Only show user message for serious errors, not minor issues
    if (event.error && event.error.message && 
        !event.filename?.includes('favicon') &&
        !event.filename?.includes('pageProvider') &&
        !event.error.message.includes('favicon')) {
        if (typeof showMessage === 'function') {
            showMessage('error', 
                'Došlo je do neočekivane greške u ENHANCED verziji. Molimo osvježite stranicu.\n\n' +
                '💡 Tip: Koristite "💾 Save As" prije osvježavanja da ne izgubite enhanced rad!'
            );
        }
    }
    
    // Enhanced logging
    if (Logger && Logger.warn) {
        Logger.warn('Enhanced error handled:', {
            message: event.error?.message,
            filename: event.filename,
            line: event.lineno,
            enhancedMode: AppState.enhancedMode
        });
    }
});

/**
 * Enhanced unhandled promise rejections handler
 * Only log critical errors, suppress common background operation failures
 */
window.addEventListener('unhandledrejection', function(event) {
    // Check if this is a network/fetch error that we can ignore
    const isNetworkError = event.reason && (
        event.reason.name === 'TypeError' ||
        event.reason.message?.includes('fetch') ||
        event.reason.message?.includes('Network') ||
        event.reason.message?.includes('Failed to fetch') ||
        event.reason.name === 'AbortError'
    );
    
    // Only log non-network errors to avoid spam
    if (!isNetworkError) {
        if (Logger && Logger.error) {
            Logger.error('Neobrađena enhanced greška promise:', event.reason);
        } else {
            console.error('❌ ERROR: Neobrađena enhanced greška promise:', event.reason);
        }
        
        if (Logger && Logger.warn) {
            Logger.warn('Enhanced promise rejection handled:', event.reason);
        }
    } else {
        // Silently handle network errors in debug mode only
        if (Logger && typeof Logger.getConfig === 'function' && Logger.getConfig().developmentMode) {
            Logger.debug('🌐 Network error silently handled:', event.reason.message);
        }
    }
    
    event.preventDefault();
    
    // Only hide autocomplete for critical errors, not network errors
    if (!isNetworkError && typeof hideAutocomplete === 'function') {
        hideAutocomplete();
    }
});

/**
 * Enhanced cleanup function for page unload - removed auto-save
 * User will be prompted through beforeunload event above
 */
window.addEventListener('beforeunload', function() {
    if (typeof hideAutocomplete === 'function') {
        hideAutocomplete();
    }
    // Auto-save removed - user will be prompted to save manually
});

/**
 * Shows a dialog asking user if they want to save before exiting
 */
function showExitSaveDialog() {
    // Create confirmation dialog
    const shouldSave = confirm(
        'Imate nespremljan rad koji će biti izgubljen.\n\n' +
        'Kliknite OK da odaberete lokaciju za spremanje,\n' +
        'ili Cancel da zatvorite bez spremanja.'
    );
    
    if (shouldSave) {
        // User wants to save - show file dialog
        if (typeof saveStateWithDialog === 'function') {
            saveStateWithDialog().then((saved) => {
                if (saved) {
                    // Successfully saved, user can now exit
                    showMessage('success', 'Rad je uspješno spremljen. Možete zatvoriti aplikaciju.');
                }
            }).catch((error) => {
                console.error('Save dialog error:', error);
                showMessage('error', 'Greška pri spremanju. Rad nije spremljen.');
            });
        } else {
            // Fallback to quick save
            if (typeof quickSaveState === 'function') {
                quickSaveState();
                showMessage('success', 'Rad je spremljen u Downloads mapu. Možete zatvoriti aplikaciju.');
            }
        }
    }
    // If user clicked Cancel, they can exit without saving
}

// Export enhanced AppState for use in other modules
window.AppState = AppState;
window.showExitSaveDialog = showExitSaveDialog;

// Enhanced development helpers (only in development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.EnhancedDevHelpers = {
        ...window.DevHelpers, // Inherit existing helpers
        
        // Enhanced specific helpers
        refreshColors: function() {
            if (typeof refreshTroskovnikColors === 'function') {
                refreshTroskovnikColors();
                // console.log('🎨 Troškovnik colors refreshed manually');
            }
        },
        
        generateRabata: function() {
            if (typeof generateFromResults === 'function') {
                generateFromResults();
                // console.log('📊 Tablica rabata generated from results');
            }
        },
        
        getEnhancedStats: function() {
            return AppState.getEnhancedStats();
        },
        
        testPriceInput: function(resultId, priceType = 'pricePerPiece', value = 5.00) {
            if (typeof updateResultPrice === 'function') {
                const resultKey = `${resultId}-1`; // Assume RB 1
                updateResultPrice(resultKey, priceType, value.toString());
                // console.log(`💰 Test price ${priceType} set to €${value} for result ${resultId}`);
            }
        },
        
        simulateEnhancedWorkflow: function() {
            // console.log('🧪 Simulating enhanced workflow...');
            
            // 1. Load demo troškovnik
            if (typeof loadDemoTroskovnik === 'function') {
                loadDemoTroskovnik();
            }
            
            // 2. Perform search
            setTimeout(() => {
                if (typeof setSearchQuery === 'function') {
                    setSearchQuery('1. kompot');
                    if (typeof performGlobalSearch === 'function') {
                        performGlobalSearch();
                    }
                }
            }, 500);
            
            // 3. Add price to first result
            setTimeout(() => {
                this.testPriceInput(1, 'pricePerPiece', 3.50);
            }, 1000);
            
            // 4. Generate tablica rabata
            setTimeout(() => {
                this.generateRabata();
            }, 1500);
            
            // console.log('✅ Enhanced workflow simulation completed');
        }
    };
    
    // Merge with existing DevHelpers
    window.DevHelpers = { ...window.DevHelpers, ...window.EnhancedDevHelpers };
    
    // console.log('🛠️ Enhanced development helpers available:');
    // console.log('  DevHelpers.refreshColors() - Refresh troškovnik colors');
    // console.log('  DevHelpers.generateRabata() - Generate tablica rabata');
    // console.log('  DevHelpers.getEnhancedStats() - Get enhanced statistics');
    // console.log('  DevHelpers.testPriceInput(id, type, value) - Test price input');
    // console.log('  DevHelpers.simulateEnhancedWorkflow() - Full workflow simulation');
}

// console.log('✅ Enhanced Application initialized with direct price management and advanced features');