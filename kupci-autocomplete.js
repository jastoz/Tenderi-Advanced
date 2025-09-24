/**
 * KUPCI (CUSTOMERS) AUTOCOMPLETE MODULE
 * Provides autocomplete functionality for customer name field
 */

// Kupci autocomplete state
let kupciAutocompleteVisible = false;
let kupciAutocompleteResults = [];
let selectedKupciAutocompleteIndex = -1;
let selectedKupac = null; // Currently selected customer

/**
 * Initialize kupci autocomplete functionality
 */
function initializeKupciAutocomplete() {
    const nazivKupcaInput = document.getElementById('nazivKupca');
    if (!nazivKupcaInput) {
        console.warn('❌ nazivKupca input field not found');
        return;
    }

    console.log('🏢 Initializing kupci autocomplete...');

    // Input event for real-time search
    nazivKupcaInput.addEventListener('input', function(event) {
        const query = event.target.value;
        handleKupciSearch(query, event.target);
    });

    // Keydown event for navigation
    nazivKupcaInput.addEventListener('keydown', function(event) {
        if (kupciAutocompleteVisible) {
            handleKupciAutocompleteKeypress(event);
        }
    });

    // Blur event to hide dropdown (with delay to allow clicks)
    nazivKupcaInput.addEventListener('blur', function() {
        setTimeout(() => {
            hideKupciAutocomplete();
        }, 150);
    });

    // Focus event to show dropdown if there are results
    nazivKupcaInput.addEventListener('focus', function(event) {
        const query = event.target.value;
        if (query.length >= 2) {
            handleKupciSearch(query, event.target);
        }
    });

    console.log('✅ Kupci autocomplete initialized');
}

/**
 * Handle kupci search and show autocomplete
 */
function handleKupciSearch(query, inputElement) {
    if (!query || query.trim().length < 2) {
        hideKupciAutocomplete();
        return;
    }

    // Check if kupci data is available
    if (!window.searchKupci) {
        console.warn('❌ searchKupci function not available - load customers first');
        return;
    }

    try {
        const results = window.searchKupci(query);
        if (results && results.length > 0) {
            showKupciAutocomplete(results, inputElement);
        } else {
            hideKupciAutocomplete();
        }
    } catch (error) {
        console.error('❌ Error searching customers:', error);
        hideKupciAutocomplete();
    }
}

/**
 * Show kupci autocomplete dropdown
 */
function showKupciAutocomplete(results, inputElement) {
    // Remove any existing dropdown
    const existingDropdown = document.getElementById('kupci-autocomplete-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    if (!results || results.length === 0) {
        hideKupciAutocomplete();
        return;
    }

    kupciAutocompleteResults = results;
    kupciAutocompleteVisible = true;
    selectedKupciAutocompleteIndex = -1;

    const dropdown = document.createElement('div');
    dropdown.id = 'kupci-autocomplete-dropdown';
    dropdown.className = 'autocomplete-dropdown';
    
    dropdown.style.cssText = `
        position: fixed;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        max-height: 300px;
        overflow-y: auto;
        z-index: 1001;
        max-width: 600px;
    `;

    let html = '';
    results.forEach((kupac, index) => {
        const isSelected = index === selectedKupciAutocompleteIndex;
        html += `
            <div class="autocomplete-item ${isSelected ? 'highlighted' : ''}" 
                 data-index="${index}" 
                 onclick="selectKupac(${index})"
                 style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid #f3f4f6;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    ${isSelected ? 'background: #f9fafb;' : ''}
                 "
                 onmouseover="this.style.background='#f9fafb'"
                 onmouseout="this.style.background='${isSelected ? '#f9fafb' : 'white'}'"
            >
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #374151; font-size: 14px;">
                        ${typeof fixCroatianEncoding === 'function' ? fixCroatianEncoding(kupac.naziv) : kupac.naziv}
                    </div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                        Šifra: ${kupac.sifra}
                    </div>
                </div>
                <div style="margin-left: 16px;">
                    <button class="btn" 
                            style="padding: 4px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer;"
                            onclick="event.stopPropagation(); selectKupac(${index})">
                        Odaberi
                    </button>
                </div>
            </div>
        `;
    });

    dropdown.innerHTML = html;

    // Position dropdown
    const rect = inputElement.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 2) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = Math.max(rect.width, 400) + 'px';

    document.body.appendChild(dropdown);
    console.log(`✅ Kupci autocomplete shown with ${results.length} results`);
}

/**
 * Hide kupci autocomplete dropdown
 */
function hideKupciAutocomplete() {
    const dropdown = document.getElementById('kupci-autocomplete-dropdown');
    if (dropdown) {
        dropdown.remove();
    }
    
    kupciAutocompleteVisible = false;
    kupciAutocompleteResults = [];
    selectedKupciAutocompleteIndex = -1;
}

/**
 * Handle keyboard navigation in kupci autocomplete
 */
function handleKupciAutocompleteKeypress(event) {
    if (!kupciAutocompleteVisible || kupciAutocompleteResults.length === 0) {
        return;
    }

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            selectedKupciAutocompleteIndex = Math.min(
                selectedKupciAutocompleteIndex + 1, 
                kupciAutocompleteResults.length - 1
            );
            updateKupciAutocompleteHighlight();
            break;

        case 'ArrowUp':
            event.preventDefault();
            selectedKupciAutocompleteIndex = Math.max(
                selectedKupciAutocompleteIndex - 1, 
                0
            );
            updateKupciAutocompleteHighlight();
            break;

        case 'Enter':
            event.preventDefault();
            if (selectedKupciAutocompleteIndex >= 0) {
                selectKupac(selectedKupciAutocompleteIndex);
            }
            break;

        case 'Escape':
            event.preventDefault();
            hideKupciAutocomplete();
            break;
    }
}

/**
 * Update visual highlight in kupci autocomplete
 */
function updateKupciAutocompleteHighlight() {
    const dropdown = document.getElementById('kupci-autocomplete-dropdown');
    if (!dropdown) return;

    const items = dropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
        if (index === selectedKupciAutocompleteIndex) {
            item.classList.add('highlighted');
            item.style.background = '#f9fafb';
        } else {
            item.classList.remove('highlighted');
            item.style.background = 'white';
        }
    });
}

/**
 * Select a customer from autocomplete
 */
function selectKupac(index) {
    if (index < 0 || index >= kupciAutocompleteResults.length) {
        console.error('❌ Invalid customer index:', index);
        return;
    }

    const kupac = kupciAutocompleteResults[index];
    selectedKupac = kupac;

    // Update input field
    const nazivKupcaInput = document.getElementById('nazivKupca');
    if (nazivKupcaInput) {
        nazivKupcaInput.value = kupac.naziv;
    }

    // Store customer code in a hidden field or data attribute
    nazivKupcaInput.setAttribute('data-kupac-sifra', kupac.sifra);

    // Hide autocomplete
    hideKupciAutocomplete();

    // Show success message
    console.log(`✅ Selected customer: ${kupac.naziv} (${kupac.sifra})`);

    // Visual feedback
    nazivKupcaInput.style.borderColor = '#059669';
    nazivKupcaInput.style.background = '#ecfdf5';
    setTimeout(() => {
        nazivKupcaInput.style.borderColor = '#e5e7eb';
        nazivKupcaInput.style.background = 'white';
    }, 2000);

    // Trigger custom event
    const event = new CustomEvent('kupacSelected', {
        detail: { kupac: kupac }
    });
    document.dispatchEvent(event);
}

/**
 * Get currently selected customer
 */
function getSelectedKupac() {
    return selectedKupac;
}

/**
 * Get customer data from input field
 */
function getKupacFromInput() {
    const nazivKupcaInput = document.getElementById('nazivKupca');
    if (!nazivKupcaInput) return null;

    const naziv = nazivKupcaInput.value.trim();
    const sifra = nazivKupcaInput.getAttribute('data-kupac-sifra');

    if (!naziv) return null;

    return {
        sifra: sifra || '',
        naziv: naziv
    };
}

/**
 * Clear customer selection
 */
function clearKupacSelection() {
    const nazivKupcaInput = document.getElementById('nazivKupca');
    if (nazivKupcaInput) {
        nazivKupcaInput.value = '';
        nazivKupcaInput.removeAttribute('data-kupac-sifra');
        nazivKupcaInput.style.borderColor = '#e5e7eb';
        nazivKupcaInput.style.background = 'white';
    }
    
    selectedKupac = null;
    hideKupciAutocomplete();
}

/**
 * Load customers from Google Sheets and initialize autocomplete
 */
async function initializeKupciFromGoogleSheets() {
    try {
        if (window.loadKupciFromGoogleSheets) {
            console.log('🏢 Loading customers from Google Sheets...');
            const result = await window.loadKupciFromGoogleSheets();
            
            if (result.success) {
                console.log(`✅ Customers loaded successfully: ${result.count} customers`);
                
                // Show success message
                const statusMsg = document.createElement('div');
                statusMsg.className = 'success-msg';
                statusMsg.textContent = `✅ Učitano ${result.count} kupaca iz Google Sheets`;
                statusMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1002; padding: 12px; border-radius: 6px; max-width: 300px;';
                document.body.appendChild(statusMsg);
                
                setTimeout(() => {
                    if (statusMsg.parentNode) {
                        statusMsg.parentNode.removeChild(statusMsg);
                    }
                }, 4000);
                
                return true;
            } else {
                console.warn('⚠️ Failed to load customers:', result.error);
                return false;
            }
        } else {
            console.warn('⚠️ loadKupciFromGoogleSheets function not available');
            return false;
        }
    } catch (error) {
        console.error('❌ Error loading customers:', error);
        return false;
    }
}

// Global exposure
window.initializeKupciAutocomplete = initializeKupciAutocomplete;
window.selectKupac = selectKupac;
window.getSelectedKupac = getSelectedKupac;
window.getKupacFromInput = getKupacFromInput;
window.clearKupacSelection = clearKupacSelection;
window.initializeKupciFromGoogleSheets = initializeKupciFromGoogleSheets;
window.hideKupciAutocomplete = hideKupciAutocomplete;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Delay initialization to ensure all other modules are loaded
    setTimeout(() => {
        initializeKupciAutocomplete();
        console.log('✅ Kupci autocomplete module loaded and initialized');
    }, 500);
});

console.log('📦 Kupci autocomplete module loaded');