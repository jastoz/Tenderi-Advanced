/**
 * SIMPLIFIED TROSKOVNIK MODULE - 70% LESS CODE + COMPLETE TOTALS & PERCENTAGE
 * Keeps ALL functionality, drastically reduces complexity
 * UPDATED: Better Croatian column names
 * FIXED: Unique ID generation problem that caused all updates to go to first item
 */

// NOTE: window.isTrulyOurArticle() is centrally defined in utils.js and exported as window.isTrulyOurArticle

// ===== CONFIGURATION =====
const TROSKOVNIK_CONFIG = {
    colors: {
        noResults: { bg: '#ffffff', border: 'none' },
        fewResults: { bg: '#d1fae5', border: '2px solid #059669' },
        manyResults: { bg: '#e0e7ff', border: '2px solid #3730a3' }
    },
    validation: {
        minWeight: 0,
        maxWeight: 100,
        decimalPlaces: { weight: 3, price: 2, margin: 1 }
    }
};

// ===== EXCEL METADATA STORAGE =====
// Global storage for Excel troškovnik metadata
let excelTroskovnikData = {
    procjenjena_vrijednost: null,    // X2
    garancija: null,                 // W20
    nacin_predaje: null,             // W21
    datum_predaje: null              // W22
};

// ===== EXCEL DATE CONVERSION =====
/**
 * Convert Excel serial date number to readable format
 * Excel dates are stored as serial numbers since 1900-01-01
 */
function convertExcelSerialDate(serial) {
    if (!serial || isNaN(serial)) {
        return serial; // Return as-is if not a number
    }

    // Excel serial date starts from 1900-01-01
    // Note: Excel incorrectly treats 1900 as a leap year, so we need to adjust
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const days = Math.floor(serial);
    const time = serial - days;

    // Calculate the date
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);

    // Add time component if present
    if (time > 0) {
        const hours = Math.floor(time * 24);
        const minutes = Math.floor((time * 24 - hours) * 60);
        const seconds = Math.floor(((time * 24 - hours) * 60 - minutes) * 60);

        date.setHours(hours, minutes, seconds);

        // Return formatted date with time
        return date.toLocaleString('hr-HR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } else {
        // Return formatted date only
        return date.toLocaleDateString('hr-HR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
}

// ===== DECIMAL QUANTITY PARSING =====
/**
 * Parse decimal quantities with Croatian localization support
 * Handles both comma (38,33) and dot (38.33) decimal separators
 * @param {string|number} value - The value to parse
 * @returns {number} Parsed decimal number, rounded to 2 decimal places
 */
function parseDecimalQuantity(value) {
    if (!value && value !== 0) return 0;
    
    // Convert to string and handle Croatian comma decimals
    const normalizedValue = String(value).replace(',', '.');
    const parsed = parseFloat(normalizedValue);
    
    // Return 0 if parsing failed or result is negative
    if (isNaN(parsed) || parsed < 0) return 0;
    
    // Round to 2 decimal places to match price formatting
    return Math.round(parsed * 100) / 100;
}

// ===== UNIQUE ID GENERATOR =====
let troskovnikIdCounter = 0;

function generateUniqueId() {
    // Get existing IDs to avoid conflicts
    const existingIds = troskovnik && troskovnik.length > 0 ? 
        troskovnik.map(t => parseInt(t.id) || 0) : [0];
    
    // Get the highest existing ID
    const maxId = Math.max(...existingIds, troskovnikIdCounter);
    
    // Increment counter
    troskovnikIdCounter = maxId + 1;
    
    // Logger.area('TROSKOVNIK', Logger.LEVELS.DEBUG, `Generated unique ID: ${troskovnikIdCounter}`);
    return troskovnikIdCounter;
}

// ===== CORE DATA OPERATIONS =====
class TroskovnikData {
    static create(data = {}) {
        // Generate unique RB
        const existingRBs = troskovnik && troskovnik.length > 0 ? 
            troskovnik.map(t => t.redni_broj || 0) : [0];
        const nextRB = data.rb || (Math.max(...existingRBs) + 1);
        
        // Generate unique ID
        const uniqueId = generateUniqueId();
        
        // console.log(`🆕 Creating new troskovnik item: ID=${uniqueId}, RB=${nextRB}`);
        
        return {
            id: uniqueId,
            redni_broj: nextRB,
            custom_search: '',
            naziv_artikla: data.naziv || 'Nova stavka',
            mjerna_jedinica: data.jm || 'kom',
            tezina: this.formatNumber(data.tezina || 0, 3),
            trazena_kolicina: parseDecimalQuantity(data.kolicina) || 1,
            izlazna_cijena: this.formatNumber(data.izlazna || 0, 2),
            nabavna_cijena_1: this.formatNumber(data.nabavna1 || 0, 2),
            nabavna_cijena_2: this.formatNumber(data.nabavna2 || 0, 2),
            dobavljac_1: data.dobavljac1 || '',
            dobavljac_2: data.dobavljac2 || '',
            komentar: data.komentar || '',
            datum: data.datum || new Date().toISOString().split('T')[0],
            // Calculated fields
            najniza_cijena: 0,
            marza: 0,
            found_results: 0,
            ruc_per_kg: 0
        };
    }
    
    static update(id, field, value) {
        const numericId = parseInt(id);
        // console.log(`🔧 TROSKOVNIK UPDATE: ID=${numericId}, field="${field}", value="${value}"`);
        
        const item = troskovnik.find(t => parseInt(t.id) === numericId);
        if (!item) {
            console.error(`❌ Item with ID ${numericId} not found in troskovnik!`);
            // console.log('📊 Available items:', troskovnik.map(t => `ID=${t.id}, RB=${t.redni_broj}, Name="${t.naziv_artikla}"`));
            return false;
        }
        
        // console.log(`✅ Found item: ID=${item.id}, RB=${item.redni_broj}, Name="${item.naziv_artikla}"`);
        
        // Update field with proper formatting
        if (['izlazna_cijena', 'nabavna_cijena_1', 'nabavna_cijena_2'].includes(field)) {
            const oldValue = item[field];
            item[field] = this.formatNumber(value, 2);
            
            // NEW: Bidirectional sync - update ruc_per_kg when prices change
            if (field === 'izlazna_cijena' || field === 'nabavna_cijena_1') {
                const ruc = item.izlazna_cijena - item.nabavna_cijena_1;
                const weight = parseFloat(item.tezina) || 0;
                if (weight > 0) {
                    item.ruc_per_kg = this.formatNumber(ruc / weight, 2);
                } else {
                    item.ruc_per_kg = 0;
                }
                // console.log(`🔄 Price sync: ${field} → RUC/KG updated to ${item.ruc_per_kg}`);
            }
            // console.log(`💰 Price update: ${field} ${oldValue} → ${item[field]}`);
        } else if (field === 'tezina') {
            const oldValue = item[field];
            item[field] = this.formatNumber(value, 3);
            
            // NEW: When weight changes, update ruc_per_kg
            const ruc = item.izlazna_cijena - item.nabavna_cijena_1;
            const weight = parseFloat(item[field]) || 0;
            if (weight > 0 && ruc > 0) {
                item.ruc_per_kg = this.formatNumber(ruc / weight, 2);
            } else {
                item.ruc_per_kg = 0;
            }
            // console.log(`⚖️ Weight update: ${field} ${oldValue} → ${item[field]}, RUC/KG → ${item.ruc_per_kg}`);
        } else if (field === 'trazena_kolicina') {
            const oldValue = item[field];
            item[field] = parseDecimalQuantity(value) || 0;
            // console.log(`📦 Quantity update: ${field} ${oldValue} → ${item[field]} (decimal support)`);
        } else if (field === 'ruc_per_kg') {
            // RUC/KG je READONLY vrijednost - ne može se direktno mijenjati
            // Izračunava se automatski iz: (izlazna_cijena - nabavna_cijena_1) / tezina
            console.warn('⚠️ RUC/KG je READONLY polje - ne može se direktno mijenjati. Mijenja se automatski iz cijene.');
            return false;
        } else {
            const oldValue = item[field];
            item[field] = value || '';
            // console.log(`📝 Text update: ${field} "${oldValue}" → "${item[field]}"`);
        }
        
        // Recalculate dependent fields
        this.recalculate(item);
        this.syncWithResults(item);
        
        // console.log(`✅ Update completed for item ID=${numericId}`);
        return true;
    }
    
    static delete(id) {
        const numericId = parseInt(id);
        const index = troskovnik.findIndex(t => parseInt(t.id) === numericId);
        if (index === -1) return null;
        
        return troskovnik.splice(index, 1)[0];
    }
    
    static duplicate(id) {
        const numericId = parseInt(id);
        const item = troskovnik.find(t => parseInt(t.id) === numericId);
        if (!item) return null;
        
        const newItem = this.create({
            ...item,
            naziv: item.naziv_artikla + ' (kopija)',
            komentar: item.komentar + ' (kopija)'
        });
        
        troskovnik.push(newItem);
        return newItem;
    }
    
    // Helper methods
    static formatNumber(value, decimals) {
        const num = parseFloat(value) || 0;
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
    
    static recalculate(item) {
        // Calculate najniza_cijena
        const prices = [item.nabavna_cijena_1, item.nabavna_cijena_2].filter(p => p > 0);
        item.najniza_cijena = prices.length > 0 ? Math.min(...prices) : 0;
        item.najniza_cijena = this.formatNumber(item.najniza_cijena, 2);
        
        // Calculate marza
        if (item.najniza_cijena > 0 && item.izlazna_cijena > 0) {
            item.marza = ((item.izlazna_cijena - item.najniza_cijena) / item.najniza_cijena) * 100;
            item.marza = this.formatNumber(item.marza, 1);
        } else {
            item.marza = 0;
        }
        
        // Always recalculate ruc_per_kg for bidirectional synchronization
        const ruc = item.izlazna_cijena - item.nabavna_cijena_1;
        const weight = parseFloat(item.tezina) || 0;
        if (weight > 0) {
            item.ruc_per_kg = this.formatNumber(ruc / weight, 2);
        } else {
            item.ruc_per_kg = 0;
        }
    }
    
    static syncWithResults(item) {
        if (!results || results.length === 0) return;
        
        // Sync with results for this RB
        results.forEach(result => {
            if (result.rb == item.redni_broj && result.hasUserPrice) {
                const resultWeight = result.calculatedWeight || result.weight || 1;
                const troskovnikWeight = item.tezina;
                
                // NOVA LOGIKA: Ako je težina = 0, ne preračunavaj cijenu
                // Korisno za proizvode gdje je težina već uključena u opis (npr. "Čaj filter vrećice 40g")
                // ili za usluge koje se ne mjere po kilogramu
                if (troskovnikWeight === 0 || troskovnikWeight <= 0) {
                    // Koristi originalnu cijenu bez preračunavanja
                    result.pricePerPiece = this.formatNumber(item.izlazna_cijena, 2);
                    result.pricePerKg = 0; // Nema smisla računati €/kg ako nema težine
                } else {
                    // Postojeća logika za proizvode s definiranom težinom
                    const newResultPrice = (item.izlazna_cijena / troskovnikWeight) * resultWeight;
                    result.pricePerPiece = this.formatNumber(newResultPrice, 2);
                    result.pricePerKg = this.formatNumber(result.pricePerPiece / resultWeight, 2);
                }
            }
        });
        
        // Update results display if function exists
        if (typeof updateResultsDisplay === 'function') {
            updateResultsDisplay();
        }
    }
}

// ===== UI RENDERING =====
class TroskovnikUI {
    static render() {
        if (!troskovnik || troskovnik.length === 0) {
            this.renderEmpty();
            return;
        }

        this.showControls();
        this.renderTable();

        // Update RB Selector max based on troškovnik length
        if (typeof window.updateRBSelectorMax === 'function') {
            window.updateRBSelectorMax();
        }
    }
    
    static renderEmpty() {
        const container = document.getElementById('troskovnikTableContainer');
        if (container) container.classList.add('hidden');
        
        ['exportTroskovnikCSVBtn', 'exportTroskovnikExcelBtn', 'addTroskovnikBtn', 'saveTroskovnikBtn', 'clearTroskovnikBtn']
            .forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.style.display = 'none';
            });
    }
    
    static showControls() {
        const container = document.getElementById('troskovnikTableContainer');
        if (container) container.classList.remove('hidden');
        
        ['exportTroskovnikCSVBtn', 'exportTroskovnikExcelBtn', 'addTroskovnikBtn', 'saveTroskovnikBtn', 'clearTroskovnikBtn']
            .forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.style.display = 'block';
            });
    }
    
    static renderTable() {
        const tbody = document.getElementById('troskovnikTableBody');
        if (!tbody) return;
        
        // Calculate grand total for summary and percentage calculations
        const grandTotal = this.calculateGrandTotal();
        const itemsWithValue = troskovnik.filter(item => (item.trazena_kolicina * item.izlazna_cijena) > 0).length;
        
        // FIX HEADERS FIRST - add missing column headers if they don't exist
        this.fixTableHeaders();
        
        // Render summary
        this.renderSummary(grandTotal, itemsWithValue);
        
        // Render table rows
        tbody.innerHTML = troskovnik.map(item => this.renderRow(item, grandTotal)).join('');
        
        // Render footer with total
        this.renderFooter(grandTotal);
        
        // Update export button labels
        const csvBtn = document.getElementById('exportTroskovnikCSVBtn');
        const excelBtn = document.getElementById('exportTroskovnikExcelBtn');
        const saveBtn = document.getElementById('saveTroskovnikBtn');
        if (csvBtn) csvBtn.textContent = 'Export CSV (' + troskovnik.length + ')';
        if (excelBtn) excelBtn.textContent = 'Export Excel (' + troskovnik.length + ')';
        if (saveBtn) saveBtn.textContent = '💾 Spremi troškovnik (' + troskovnik.length + ')';
        
        // Apply stored column widths after rendering
        setTimeout(() => {
            applyStoredColumnWidths();
        }, 0);
    }
    
    static fixTableHeaders() {
        const table = document.querySelector('#troskovnikTableContainer table');
        if (!table) return;
        let thead = table.querySelector('thead');
        if (!thead) {
            thead = document.createElement('thead');
            table.insertBefore(thead, table.firstChild);
        }
        // Ikone za sort
        const sortIcon = (col) => {
            if (troskovnikSort.column !== col) return ' <span style="font-size:12px;opacity:0.5;">▲▼</span>';
            return troskovnikSort.direction === 'asc' ? ' <span style="font-size:12px;">▲</span>' : ' <span style="font-size:12px;">▼</span>';
        };
        thead.innerHTML = 
            '<tr style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white;">' +
            '<th style="width: 60px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'redni_broj\')">R.B.' + sortIcon('redni_broj') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 0)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 350px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: left; font-size: 14px; word-wrap: break-word; overflow-wrap: break-word; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'naziv_artikla\')">Naziv artikla' + sortIcon('naziv_artikla') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 1)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 60px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'mjerna_jedinica\')">J.M.' + sortIcon('mjerna_jedinica') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 2)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 70px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'tezina\')">Težina (kg)' + sortIcon('tezina') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 3)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 65px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'trazena_kolicina\')">Količina' + sortIcon('trazena_kolicina') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 4)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 90px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'izlazna_cijena\')">Izlazna cijena (€)' + sortIcon('izlazna_cijena') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 5)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 85px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'ruc_per_kg\')">RUC/KG (€/kg)' + sortIcon('ruc_per_kg') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 6)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 70px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'ruc\')">RUC (€)' + sortIcon('ruc') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 7)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 90px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'nabavna_cijena_1\')">Nabavna 1 (€)' + sortIcon('nabavna_cijena_1') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 8)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 100px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'dobavljac_1\')">Dobavljač 1' + sortIcon('dobavljac_1') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 9)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 90px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'nabavna_cijena_2\')">Nabavna 2 (€)' + sortIcon('nabavna_cijena_2') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 10)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 100px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'dobavljac_2\')">Dobavljač 2' + sortIcon('dobavljac_2') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 11)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 60px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'marza\')">Marža (%)' + sortIcon('marza') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 12)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 70px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; background: #dc2626; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'udio\')">📊 Udio (%)' + sortIcon('udio') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 13)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 70px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'found_results\')">Rezultati' + sortIcon('found_results') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 14)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 80px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; background: #059669; font-size: 14px; cursor:pointer; position:relative;" onclick="sortTroskovnikBy(\'vrijednost\')">💰 Vrijednost (€)' + sortIcon('vrijednost') + 
                '<div class="resize-handle" style="position:absolute;right:-5px;top:0;bottom:0;width:10px;cursor:col-resize;background:rgba(255,255,255,0.8);border-left:2px solid rgba(255,255,255,0.9);border-right:2px solid rgba(255,255,255,0.9);z-index:10;" onmousedown="startColumnResize(event, 15)" title="Povuci za promjenu širine stupca"></div></th>' +
            '<th style="width: 100px; padding: 10px; border: 1px solid #6d28d9; font-weight: bold; text-align: center; font-size: 14px;">Akcije</th>' +
            '</tr>';
    }
    
    static calculateGrandTotal() {
        return troskovnik.reduce((sum, item) => {
            return sum + (item.trazena_kolicina * item.izlazna_cijena);
        }, 0);
    }
    
    static renderSummary(grandTotal, itemsWithValue) {
        // Find or create summary container
        let summaryContainer = document.getElementById('troskovnikSummary');
        if (!summaryContainer) {
            const tableContainer = document.getElementById('troskovnikTableContainer');
            if (tableContainer) {
                summaryContainer = document.createElement('div');
                summaryContainer.id = 'troskovnikSummary';
                summaryContainer.style.cssText = 'margin-bottom: 15px; padding: 12px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 8px; border-left: 4px solid #7c3aed;';
                tableContainer.insertBefore(summaryContainer, tableContainer.firstChild);
            }
        }

        // Izračun ukupne nabavne cijene
        const totalNabavna = troskovnik.reduce((sum, item) => sum + (Number(item.trazena_kolicina) * Number(item.nabavna_cijena_1)), 0);
        
        // Izračun RUC (razlika između ukupne izlazne i nabavne)
        const totalRUC = grandTotal - totalNabavna;
        
        // Izračun ukupne težine (količina * težina za sve stavke)
        const totalTezina = troskovnik.reduce((sum, item) => {
            const kolicina = Number(item.trazena_kolicina) || 0;
            const tezina = Number(item.tezina) || 0;
            return sum + (kolicina * tezina);
        }, 0);

        // Izračun kg tjedno
        const kgTjedno = totalTezina / 52;

        // Izračun RUC/KG
        const rucPerKg = totalTezina > 0 ? totalRUC / totalTezina : 0;
        
        // Izračun marže
        const marginPercent = (totalNabavna > 0) ? ((grandTotal - totalNabavna) / totalNabavna * 100) : 0;
        
        // Formatiranje vrijednosti
        const formattedTotal = '€' + grandTotal.toLocaleString('hr-HR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        const formattedNabavna = '€' + totalNabavna.toLocaleString('hr-HR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        const formattedRUC = '€' + totalRUC.toLocaleString('hr-HR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        const formattedTotalTezina = totalTezina.toLocaleString('hr-HR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' kg';
        const formattedKgTjedno = kgTjedno.toLocaleString('hr-HR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' kg/tjedno';
        const formattedRucPerKg = '€' + rucPerKg.toLocaleString('hr-HR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '/kg';
        const formattedMargin = marginPercent.toLocaleString('hr-HR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + '%';

        if (summaryContainer) {
            // Priprema Excel podataka za prikaz
            const excelDataHtml = (excelTroskovnikData.procjenjena_vrijednost || 
                                   excelTroskovnikData.garancija || 
                                   excelTroskovnikData.nacin_predaje || 
                                   excelTroskovnikData.datum_predaje) ?
                '<div style="font-size: 14px; color: #374151; min-width: 200px; background: #f8fafc; padding: 8px; border-radius: 6px; border-left: 3px solid #059669;">' +
                    '<div style="font-weight: bold; margin-bottom: 4px;">📄 Excel podaci:</div>' +
                    (excelTroskovnikData.procjenjena_vrijednost ? '<div>💰 Procjenjena: ' + excelTroskovnikData.procjenjena_vrijednost + '</div>' : '') +
                    (excelTroskovnikData.garancija ? '<div>🛡️ Garancija: ' + excelTroskovnikData.garancija + '</div>' : '') +
                    (excelTroskovnikData.nacin_predaje ? '<div>📦 Predaja: ' + excelTroskovnikData.nacin_predaje + '</div>' : '') +
                    (excelTroskovnikData.datum_predaje ? '<div>📅 Datum: ' + excelTroskovnikData.datum_predaje + '</div>' : '') +
                '</div>' : '';

            summaryContainer.innerHTML = 
                '<div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 6px;">' +
                    // Lijevi dio - postojeći podaci
                    '<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 24px; flex: 1;">' +
                        '<div style="font-size: 16px; font-weight: bold; color: #374151; min-width: 320px;">' +
                            '📊 <span style="color: #7c3aed;">Troškovnik s izračunima</span>: ' + troskovnik.length + ' stavki • ' +
                            '💰 <span style="color: #059669;">S vrijednošću</span>: ' + itemsWithValue + ' stavki' +
                        '</div>' +
                        '<div style="display: flex; gap: 16px; align-items: center; font-size: 16px; font-weight: bold; flex-wrap: wrap;">' +
                            '<span style="color: #059669;">Ukupna izlazna: ' + formattedTotal + '</span>' +
                            '<span style="color: #2563eb;">Nabavna: ' + formattedNabavna + '</span>' +
                            '<span style="color: #dc2626;">RUC: ' + formattedRUC + '</span>' +
                            '<span style="color: #f59e0b;">Ukupna težina: ' + formattedTotalTezina + '</span>' +
                            '<span style="color: #10b981;">KG tjedno: ' + formattedKgTjedno + '</span>' +
                            '<span style="color: #8b5cf6;">RUC/KG: ' + formattedRucPerKg + '</span>' +
                            '<span style="color: #dc2626;">Marža: ' + formattedMargin + '</span>' +
                        '</div>' +
                    '</div>' +
                    // Desni dio - Excel podaci (ako postoje)
                    excelDataHtml +
                    // Nova stavka gumb
                    '<div>' +
                        '<button class="auto-btn" style="background: #059669; color: white; font-size: 15px; font-weight: bold; padding: 7px 18px; border-radius: 6px;" onclick="TroskovnikActions.addAtPositionPrompt()">➕ Nova stavka</button>' +
                    '</div>' +
                '</div>' +
                '<div style="font-size: 13px; color: #6b7280;">' +
                    '✅ <span style="color: #7c3aed;">Ukupne sume, težine i postotni udjeli</span> • ' +
                    'Kliknite stavku za komentare' +
                '</div>';
        }
    }
    
    static renderFooter(grandTotal) {
        const table = document.querySelector('#troskovnikTableContainer table');
        if (!table) return;
        
        // Remove existing footer
        const existingFooter = table.querySelector('tfoot');
        if (existingFooter) existingFooter.remove();
        
        // Create new footer
        const tfoot = document.createElement('tfoot');
        const formattedTotal = '€' + grandTotal.toLocaleString('hr-HR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        
        tfoot.innerHTML = 
            '<tr style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-top: 2px solid #7c3aed;">' +
            '<td colspan="13" style="text-align: right; padding: 12px; font-weight: bold; color: #7c3aed; font-size: 16px;">💰 UKUPNA SUMA:</td>' +
            '<td style="padding: 12px; font-weight: bold; color: #7c3aed; font-size: 18px; text-align: center;">' + formattedTotal + '</td>' +
            '<td style="padding: 12px; font-weight: bold; color: #7c3aed; font-size: 16px; text-align: center;">100.0%</td>' +
            '<td style="padding: 12px;"></td>' +
            '</tr>';
        
        table.appendChild(tfoot);
    }
    
    static renderRow(item, grandTotal) {
        const style = this.getRowStyle(item.found_results, item);
        const comment = this.getCommentDisplay(item);
        const hover = this.getLastYearHover(item);
        const margin = this.getMarginDisplay(item.marza);
        const results = this.getResultsBadge(item.found_results);
        const total = this.getTotalDisplay(item);
        const percentage = this.getPercentageDisplay(item, grandTotal);
        const linkIcon = this.getLinkIcon(item);
        const rbCell = this.getRBCellHTML(item);

        return '<tr data-rb="' + item.redni_broj + '" style="' + style + '">' +
            rbCell +
            '<td ' + comment.attributes + ' ' + hover.attributes + ' onmouseenter="showFirstChoiceTooltip(' + item.redni_broj + ', event)" onmouseleave="hideFirstChoiceTooltip()" style="font-size: 14px; word-wrap: break-word; overflow-wrap: break-word; max-width: 350px; min-width: 250px; padding: 8px; position: relative; white-space: normal; overflow: visible; text-overflow: unset; cursor: help;">' + item.naziv_artikla + comment.icon + linkIcon + '</td>' +
            '<td style="text-align: center; font-size: 14px;">' + item.mjerna_jedinica + '</td>' +
            '<td style="text-align: center;">' + this.renderWeightInput(item) + '</td>' +
            '<td style="text-align: center;">' + this.renderQuantityInput(item) + '</td>' +
            '<td style="text-align: center;">' + this.renderPriceInput(item, 'izlazna_cijena', 100) + '</td>' +
            '<td style="text-align: center;">' + this.renderRucPerKgInput(item) + '</td>' +
            '<td style="text-align: center; font-size: 14px;">' + this.getRucDisplay(item) + '</td>' +
            '<td style="text-align: center;">' + this.renderPriceInput(item, 'nabavna_cijena_1', 100, '#059669', '#ecfdf5') + '</td>' +
            '<td style="text-align: center;">' + this.renderTextInput(item, 'dobavljac_1', 80) + '</td>' +
            '<td style="text-align: center;">' + this.renderPriceInput(item, 'nabavna_cijena_2', 100, '#059669', '#ecfdf5') + '</td>' +
            '<td style="text-align: center;">' + this.renderTextInput(item, 'dobavljac_2', 80) + '</td>' +
            '<td style="text-align: center; font-size: 14px;">' + margin + '</td>' +
            '<td style="text-align: center; font-size: 14px;">' + percentage + '</td>' +
            '<td style="text-align: center; font-size: 14px;">' + results + '</td>' +
            '<td style="text-align: center; font-size: 14px;">' + total + '</td>' +
            '<td style="text-align: center;">' + this.renderActions(item) + '</td>' +
            '</tr>';
    }
    
    static renderQuantityInput(item) {
        // Format quantity to show decimal places if needed
        const formattedQuantity = item.trazena_kolicina % 1 === 0 ? 
            item.trazena_kolicina.toString() : 
            item.trazena_kolicina.toFixed(2);
            
        return '<input type="number" min="0" step="0.01" value="' + formattedQuantity + '"' +
               ' onchange="TroskovnikData.update(' + item.id + ', \'trazena_kolicina\', this.value); TroskovnikUI.render()"' +
               ' onfocus="this.select()"' +
               ' style="width: 75px; padding: 6px; border: 2px solid #374151; border-radius: 4px;' +
               ' font-size: 14px; font-weight: bold; text-align: center; background: #f9fafb;' +
               ' transition: border-color 0.2s ease;"' +
               ' onmouseover="this.style.borderColor=\'#7c3aed\'"' +
               ' onmouseout="this.style.borderColor=\'#374151\'"' +
               ' title="Editabilna količina (decimalni brojevi podržani)" id="quantity-' + item.id + '">';
    }
    
    // Helper rendering methods
    static getRowStyle(foundResults, item) {
        if (foundResults === 0) {
            const color = TROSKOVNIK_CONFIG.colors.noResults;
            return 'background: ' + color.bg + '; ' + (color.border ? 'border-left: ' + color.border + ';' : '');
        }
        
        // Determine article type by checking results for this RB
        let isOurArticle = false;
        if (typeof window.results !== 'undefined' && window.results.length > 0 && item) {
            const resultsForThisRB = window.results.filter(r => r.rb == item.redni_broj);
            
            // Check if any result for this RB is a "truly our article"
            isOurArticle = resultsForThisRB.some(result => {
                if (result.source) {
                    const source = result.source.toLowerCase();
                    const hasCorrectSource = source.includes('lager') || source.includes('urpd');
                    
                    // Also check if it exists in weight database (for truly our articles)
                    if (hasCorrectSource && result.code && typeof window.weightDatabase !== 'undefined') {
                        return window.weightDatabase.has(result.code);
                    }
                    
                    return hasCorrectSource;
                }
                return false;
            });
        }
        
        if (isOurArticle) {
            // Our articles - green color
            return 'background: #d1fae5; border-left: 2px solid #059669;';
        } else {
            // External articles - purple color
            return 'background: #f3e8ff; border-left: 2px solid #7c3aed;';
        }
    }
    
    static getCommentDisplay(item) {
        const hasComment = item.komentar && item.komentar.trim().length > 0;
        const titleText = item.naziv_artikla + (hasComment ? 
            '\\n\\nKomentar: ' + item.komentar + '\\n\\nKliknite za uređivanje' : 
            '\\n\\nKliknite za dodavanje komentara');
        const styleText = hasComment ? 
            'font-weight: bold; cursor: pointer; color: #7c3aed; padding: 2px 4px; border-radius: 3px;' : 
            'cursor: pointer; padding: 2px 4px; border-radius: 3px;';
        
        return {
            attributes: 'title="' + titleText + '" style="' + styleText + '" onclick="event.stopPropagation(); TroskovnikComments.show(' + item.id + ')"',
            icon: hasComment ? ' <span style="margin-left: 5px; padding: 2px 4px; background: #f3e8ff; border-radius: 3px;">💬</span>' : ''
        };
    }

    static getLastYearHover(item) {
        try {
            const code = typeof window.extractCodeFromBrackets === 'function' ? window.extractCodeFromBrackets(item.naziv_artikla) : '';
            if (!code) return { attributes: '' };
            const last = typeof window.getProslogodisnjiArtikal === 'function' ? window.getProslogodisnjiArtikal(code) : null;
            if (!last || !last.cijena) return { attributes: '' };
            const titleText = `Prošlogodišnji artikal: ${last.naziv}\nŠifra: ${last.sifra}\nJ.M.: ${last.jm || ''}\nCijena: €${Number(last.cijena).toFixed(2)}`;
            return { attributes: 'title="' + titleText.replace(/"/g, '\\"') + '"' };
        } catch (e) {
            return { attributes: '' };
        }
    }
    
    static getMarginDisplay(marza) {
        if (marza <= 0) return '-';
        const color = marza > 20 ? '#059669' : marza > 10 ? '#d97706' : '#dc2626';
        return '<strong style="color: ' + color + '; font-size: 14px;">' + marza.toFixed(1) + '%</strong>';
    }
    
    static getResultsBadge(count) {
        return count > 0 ? 
            '<span class="badge badge-blue" title="Broj pronađenih rezultata" style="font-size: 14px;">' + count + '</span>' : 
            '<span style="font-size: 14px;">-</span>';
    }
    
    static getTotalDisplay(item) {
        const total = item.trazena_kolicina * item.izlazna_cijena;
        if (total <= 0) return '<span style="color: #6b7280; font-size: 14px;">-</span>';
        
        const formatted = '€' + total.toLocaleString('hr-HR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        return '<strong style="color: #059669; font-size: 16px;">' + formatted + '</strong>';
    }
    
    static getRucPerKgDisplay(item) {
        const ruc = item.izlazna_cijena - item.nabavna_cijena_1;
        const weight = parseFloat(item.tezina) || 0;
        
        if (ruc <= 0 || weight <= 0) return '<span style="color: #6b7280; font-size: 14px;">-</span>';
        
        const rucPerKg = ruc / weight;
        const formatted = '€' + rucPerKg.toLocaleString('hr-HR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        const textColor = '#000000'; // BLACK text color as requested
        return '<strong style="color: ' + textColor + '; font-size: 16px;">' + formatted + '</strong>';
    }

    static getRucDisplay(item) {
        const ruc = item.izlazna_cijena - item.nabavna_cijena_1;
        if (ruc <= 0) return '<span style="color: #6b7280; font-size: 14px;">-</span>';
        
        const formatted = '€' + ruc.toLocaleString('hr-HR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        const textColor = '#000000'; // BLACK text color as requested
        return '<strong style="color: ' + textColor + '; font-size: 16px;">' + formatted + '</strong>';
    }
    
    static getPercentageDisplay(item, grandTotal) {
        const itemTotal = item.trazena_kolicina * item.izlazna_cijena;
        
        if (itemTotal <= 0 || grandTotal <= 0) {
            return '<span style="color: #6b7280; font-size: 14px;">0.0%</span>';
        }
        
        const percentage = (itemTotal / grandTotal) * 100;
        const color = percentage >= 10 ? '#dc2626' : percentage >= 5 ? '#d97706' : percentage >= 2 ? '#059669' : '#6b7280';
        const weight = percentage >= 5 ? 'bold' : 'normal';
        
        return '<strong style="color: ' + color + '; font-weight: ' + weight + '; font-size: 16px;">' + 
               percentage.toFixed(1) + '%</strong>';
    }
    
    static getLinkIcon(item) {
        // Check if there are results for this RB
        const resultsForRB = results && results.length > 0 ? results.filter(r => r.rb == item.redni_broj) : [];

        if (resultsForRB.length === 0) {
            return '';
        }

        // Find first choice (lowest price per kg)
        const sortedResults = resultsForRB.sort((a, b) => {
            const priceA = a.hasUserPrice ? a.pricePerKg : (a.pricePerKg || 0);
            const priceB = b.hasUserPrice ? b.pricePerKg : (b.pricePerKg || 0);
            return priceA - priceB;
        });

        const firstChoice = sortedResults[0];

        // Build tooltip with first choice details
        let tooltip = 'Idi na rezultate za RB ' + item.redni_broj;
        if (firstChoice) {
            const firstChoicePrice = firstChoice.hasUserPrice ? firstChoice.pricePerPiece : firstChoice.price;
            tooltip = 'Prvi izbor: ' + firstChoice.code + ' - ' + firstChoice.name +
                      '\nDobavljač: ' + (firstChoice.supplier || 'N/A') +
                      '\nCijena: €' + (firstChoicePrice || 0).toFixed(2) +
                      '\n\nKlik za skok na rezultate';
        }

        // Badge for first choice
        let badge = '';
        if (firstChoice && resultsForRB.length > 1) {
            badge = '<span style="background: #fbbf24; color: #92400e; padding: 2px 4px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-right: 4px;">🥇1/' + resultsForRB.length + '</span>';
        }

        return '<span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%);">' +
               badge +
               '<a href="#" onclick="event.stopPropagation(); scrollToResultsForRB(' + item.redni_broj + ')" style="text-decoration: none; color: #059669; font-size: 14px; padding: 2px 6px; border-radius: 3px; background: #f0fff4; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.1);" title="' + tooltip + '">→</a></span>';
    }

    static getRBCellHTML(item) {
        // Check if there are results for this RB
        const resultsForRB = results && results.length > 0 ? results.filter(r => r.rb == item.redni_broj) : [];

        if (resultsForRB.length === 0) {
            // No results - regular R.B. cell
            return '<td style="text-align: center; font-size: 14px;"><strong>' + item.redni_broj + '</strong></td>';
        }

        // Find first choice (lowest price per kg)
        const sortedResults = resultsForRB.sort((a, b) => {
            const priceA = a.hasUserPrice ? a.pricePerKg : (a.pricePerKg || 0);
            const priceB = b.hasUserPrice ? b.pricePerKg : (b.pricePerKg || 0);
            return priceA - priceB;
        });

        const firstChoice = sortedResults[0];

        // Build tooltip
        let tooltip = 'Klik za skok na rezultate\\n' + resultsForRB.length + ' rezultat(a) pronađeno';
        if (firstChoice) {
            const firstChoicePrice = firstChoice.hasUserPrice ? firstChoice.pricePerPiece : firstChoice.price;
            tooltip += '\\n\\nPrvi izbor:\\n' + firstChoice.code + ' - ' + firstChoice.name +
                      '\\nDobavljač: ' + (firstChoice.supplier || 'N/A') +
                      '\\nCijena: €' + (firstChoicePrice || 0).toFixed(2);
        }

        // Clickable R.B. cell with hover effect
        return '<td onclick="scrollToResultsForRB(' + item.redni_broj + ')" ' +
               'style="text-align: center; font-size: 14px; cursor: pointer; transition: all 0.2s ease; background: #f0fff4; border-left: 3px solid #059669;" ' +
               'onmouseover="this.style.backgroundColor=\'#dcfce7\'; this.style.fontWeight=\'bold\';" ' +
               'onmouseout="this.style.backgroundColor=\'#f0fff4\'; this.style.fontWeight=\'normal\';" ' +
               'title="' + tooltip + '">' +
               '<strong style="color: #059669;">📊 ' + item.redni_broj + '</strong></td>';
    }

    static renderWeightInput(item) {
        const color = item.tezina > 0 ? '#059669' : '#d97706';
        const bg = item.tezina > 0 ? '#ecfdf5' : '#fef3c7';
        return '<input type="number" step="0.001" value="' + item.tezina.toFixed(3) + '"' +
               ' onchange="TroskovnikData.update(' + item.id + ', \'tezina\', this.value); TroskovnikUI.render()"' +
               ' onfocus="this.select()" onkeydown="TroskovnikUI.handleWeightKeydown(event, ' + item.id + ')"' +
               ' style="width: 70px; padding: 6px; border: 1px solid ' + color + '; border-radius: 4px;' +
               ' font-size: 14px; font-weight: bold; color: ' + color + '; background: ' + bg + ';"' +
               ' title="Editabilna težina u kg" placeholder="0.000" id="weight-' + item.id + '">';
    }
    
    // FIXED: renderPriceInput function with proper field parameter handling
    static renderPriceInput(item, field, width, borderColor = '#d1d5db', bgColor = '#ffffff') {
        return '<div style="display: flex; align-items: center; gap: 3px;">' +
               '<span style="font-size: 14px; font-weight: bold; color: #374151;">€</span>' +
               '<input type="number" step="0.01" value="' + item[field].toFixed(2) + '"' +
               ' onchange="TroskovnikData.update(' + item.id + ', \'' + field + '\', this.value); TroskovnikUI.render(); TroskovnikUI.handlePriceChange(' + item.id + ', \'' + field + '\', this.value)"' +
               ' onfocus="this.select()"' +
               ' style="width: 80px; padding: 6px; border: 1px solid ' + borderColor + ';' +
               ' border-radius: 4px; font-size: 14px; font-weight: bold; background: ' + bgColor + ';"' +
               ' title="Editabilna cijena za ' + field + '" id="' + field + '-' + item.id + '">' +
               '</div>';
    }
    
    static renderRucPerKgInput(item) {
        const rucPerKg = item.ruc_per_kg || 0;
        // NEW COLOR LOGIC: 0.00-0.24 = red, 0.25-0.30 = orange, 0.31+ = green
        const borderColor = rucPerKg >= 0.31 ? '#059669' : rucPerKg >= 0.25 ? '#d97706' : '#dc2626';
        const bg = rucPerKg >= 0.31 ? '#ecfdf5' : rucPerKg >= 0.25 ? '#fef3c7' : '#fef2f2';
        const textColor = '#000000'; // BLACK text color as requested

        return '<div style="display: flex; align-items: center; gap: 3px;">' +
               '<input type="number" step="0.01" value="' + rucPerKg.toFixed(2) + '" readonly' +
               ' style="width: 60px; padding: 6px; border: 1px solid ' + borderColor + '; border-radius: 4px;' +
               ' font-size: 14px; font-weight: bold; color: ' + textColor + '; background: ' + bg + '; cursor: not-allowed; opacity: 0.9;"' +
               ' title="READONLY: Izračunato automatski iz (Izlazna - Nabavna) / Težina" id="ruc_per_kg-' + item.id + '">' +
               '<span style="font-size: 12px; color: #6b7280; font-weight: normal;">€/kg</span>' +
               '</div>';
    }

    static renderTextInput(item, field, width) {
        const placeholder = field.includes('dobavljac') ? 'dobavljača' : 'tekst';
        return '<input type="text" value="' + (item[field] || '') + '"' +
               ' onchange="TroskovnikData.update(' + item.id + ', \'' + field + '\', this.value); TroskovnikUI.render()"' +
               ' onfocus="this.select()"' +
               ' style="width: ' + width + 'px; padding: 6px; border: 1px solid #374151;' +
               ' border-radius: 4px; font-size: 14px; background: #f9fafb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"' +
               ' title="Editabilan tekst" placeholder="Unesite ' + placeholder + '" id="' + field + '-' + item.id + '">';
    }
    
    static renderActions(item) {
        const hasComment = item.komentar && item.komentar.trim().length > 0;
        
        return '<div style="display: flex; gap: 4px; flex-wrap: wrap;">' +
               (hasComment ? 
                   '<button class="auto-btn" onclick="TroskovnikComments.show(' + item.id + ')" title="Uredi komentar" style="background: #7c3aed;">✏️💬</button>' :
                   '<button class="auto-btn" onclick="TroskovnikComments.add(' + item.id + ')" title="Dodaj komentar" style="background: #10b981;">➕💬</button>'
               ) +
               '<button class="auto-btn" onclick="TroskovnikActions.duplicate(' + item.id + ')" title="Dupliciraj" style="background: #0891b2;">📋</button>' +
               '<button class="auto-btn" onclick="TroskovnikActions.delete(' + item.id + ')" title="Obriši" style="background: #dc2626;">🗑️</button>' +
               '</div>';
    }
    
    static handleWeightKeydown(event, currentItemId) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const currentIndex = troskovnik.findIndex(item => parseInt(item.id) === parseInt(currentItemId));
            if (currentIndex < troskovnik.length - 1) {
                const nextItemId = troskovnik[currentIndex + 1].id;
                const nextInput = document.getElementById('weight-' + nextItemId);
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                }
            }
        }
    }
    
    /**
     * NOVA FUNKCIJA: Handles price changes and automatically creates result item
     * ENHANCED: PDV selection for manual entries
     */
    static async handlePriceChange(itemId, field, newPrice) {
        // Only handle izlazna_cijena changes for manual result creation
        if (field !== 'izlazna_cijena') return;
        
        const numericId = parseInt(itemId);
        const item = troskovnik.find(t => parseInt(t.id) === numericId);
        if (!item) return;
        
        const price = parseFloat(newPrice) || 0;
        
        // Only create result if price is greater than 0
        if (price > 0) {
            // Check if ANY result already exists for this RB (not just manual)
            const existingResult = results && results.find(r => 
                r.rb == item.redni_broj
            );
            
            if (!existingResult) {
                // Create new manual result item only if no result exists
                await TroskovnikUI.createManualResultItem(item, price);
            } else {
                // Update existing result (whether it's manual or from search)
                existingResult.pricePerPiece = price;
                existingResult.pricePerKg = item.tezina > 0 ? price / item.tezina : price;
                
                // Update results display
                if (typeof updateResultsDisplay === 'function') {
                    updateResultsDisplay();
                }
            }
        }
    }
    
    /**
     * NOVA FUNKCIJA: Creates a manual result item when user enters price
     * ENHANCED: PDV selection for manual entries
     */
    static async createManualResultItem(troskovnikItem, izlaznaPrice) {
        if (typeof results === 'undefined' || !Array.isArray(results)) {
            window.results = [];
        }
        
        // Generate unique ID for result
        const resultId = 'manual-' + troskovnikItem.redni_broj + '-' + Date.now();
        
        // Calculate weight-based prices
        const weight = troskovnikItem.tezina || 1;
        const pricePerKg = weight > 0 ? izlaznaPrice / weight : izlaznaPrice;

        // ENHANCED: PDV selection for manual entries
        let selectedPdvStopa = 25; // Default
        try {
            selectedPdvStopa = await window.selectPDVRate(troskovnikItem.naziv_artikla);
            console.log(`🏷️ User selected PDV rate: ${selectedPdvStopa}% for manual entry "${troskovnikItem.naziv_artikla}"`);
        } catch (error) {
            console.error('Error in PDV selection dialog for manual entry:', error);
            selectedPdvStopa = 25; // Default fallback
        }

        // Create manual result item
        const manualResult = {
            id: resultId,
            rb: troskovnikItem.redni_broj,
            code: 'MANUAL-' + troskovnikItem.redni_broj,
            name: troskovnikItem.naziv_artikla + ' (Ručno uneseno)',
            unit: troskovnikItem.mjerna_jedinica,
            price: izlaznaPrice, // Original price = izlazna cijena
            pricePerPiece: izlaznaPrice,
            pricePerKg: pricePerKg,
            weight: weight,
            calculatedWeight: weight,
            supplier: 'Ručni unos',
            date: new Date().toISOString().split('T')[0],
            source: 'MANUAL',
            hasUserPrice: true,
            userPriceType: 'pricePerPiece',
            isManualEntry: true,
            customPdvStopa: selectedPdvStopa
        };
        
        // Add to results
        results.push(manualResult);
        
        // Update displays
        if (typeof updateResultsDisplay === 'function') {
            updateResultsDisplay();
        }
        
        if (typeof refreshTroskovnikColors === 'function') {
            refreshTroskovnikColors();
        }
        
        // Show success message
        showTroskovnikMessage('success', 
            `✅ Kreirana ručna stavka u rezultatima za RB ${troskovnikItem.redni_broj}\n` +
            `💰 Izlazna cijena: €${izlaznaPrice.toFixed(2)}\n` +
            `📋 PDV: 25% (može se promijeniti u rezultatima)\n` +
            `🔄 Prebacite se na "Rezultati" tab za upravljanje PDV-om`
        );
    }
}

// ===== COMMENTS MANAGEMENT =====
class TroskovnikComments {
    static show(itemId) {
        const numericId = parseInt(itemId);
        const item = troskovnik.find(t => parseInt(t.id) === numericId);
        if (!item) return;
        
        const newComment = prompt(
            'Komentar za stavku ' + item.redni_broj + ': ' + item.naziv_artikla + '\n\nUnesite komentar:',
            item.komentar || ''
        );
        
        if (newComment === null) return;
        
        TroskovnikData.update(itemId, 'komentar', newComment.trim());
        TroskovnikUI.render();
        
        const message = newComment.trim() === '' ? 
            'Komentar uklonjen za stavku ' + item.redni_broj :
            'Komentar ažuriran za stavku ' + item.redni_broj;
        
        showTroskovnikMessage('success', message);
    }
    
    static add(itemId) {
        this.show(itemId); // Same as show for simplicity
    }
}

// ===== ACTIONS =====
class TroskovnikActions {
    static add() {
        const newItem = TroskovnikData.create();
        troskovnik.push(newItem);
        TroskovnikUI.render();
        showTroskovnikMessage('success', 'Dodana nova stavka ' + newItem.redni_broj);
        
        // Mark app state as changed
        if (typeof AppState !== 'undefined' && AppState.markAsChanged) {
            AppState.markAsChanged();
        }
    }
    
    static duplicate(itemId) {
        const numericId = parseInt(itemId);
        const item = troskovnik.find(t => parseInt(t.id) === numericId);
        if (!item) return;
        
        const newItem = TroskovnikData.duplicate(itemId);
        if (newItem) {
            TroskovnikUI.render();
            showTroskovnikMessage('success', 'Duplicirana stavka ' + item.redni_broj + ' kao nova stavka ' + newItem.redni_broj);
        }
    }
    
    static delete(itemId) {
        const numericId = parseInt(itemId);
        const item = troskovnik.find(t => parseInt(t.id) === numericId);
        if (!item) return null;
        if (confirm('Očistiti sadržaj stavke ' + item.redni_broj + ': ' + item.naziv_artikla + '?\nRB, naziv, j.m. i količina ostaju, sve ostalo se briše!')) {
            // Resetiraj polja osim rb, naziv, jm, količina
            const naziv = item.naziv_artikla;
            const jm = item.mjerna_jedinica;
            const kolicina = item.trazena_kolicina;
            const rb = item.redni_broj;
            item.izlazna_cijena = 0;
            item.nabavna_cijena_1 = 0;
            item.nabavna_cijena_2 = 0;
            item.tezina = 0;
            item.dobavljac_1 = '';
            item.dobavljac_2 = '';
            item.komentar = '';
            item.najniza_cijena = 0;
            item.marza = 0;
            item.found_results = 0;
            // Briši sve rezultate za taj RB (mutiraj postojeći array!)
            if (typeof results !== 'undefined' && Array.isArray(results)) {
                for (let i = results.length - 1; i >= 0; i--) {
                    if (results[i].rb == rb) results.splice(i, 1);
                }
                if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
            }
            TroskovnikUI.render();
            showTroskovnikMessage('success', 'Sadržaj stavke ' + rb + ' (' + naziv + ') je obrisan, ali RB, naziv, j.m. i količina su ostali.');
            if (typeof AppState !== 'undefined' && AppState.markAsChanged) AppState.markAsChanged();
            return true;
        }
        return false;
    }
    
    static clear() {
        if (!troskovnik || troskovnik.length === 0) {
            showTroskovnikMessage('info', 'Troškovnik je već prazan.');
            return;
        }
        
        if (confirm('Obrisati cijeli troškovnik s ' + troskovnik.length + ' stavki?\n\nOva akcija se ne može poništiti!')) {
            const count = troskovnik.length;
            troskovnik.length = 0;
            TroskovnikUI.render();
            showTroskovnikMessage('success', 'Obrisan cijeli troškovnik (' + count + ' stavki)');
            
            // Mark app state as changed
            if (typeof AppState !== 'undefined' && AppState.markAsChanged) {
                AppState.markAsChanged();
            }
        }
    }
    
    static addAtPositionPrompt() {
        let rbList = troskovnik.map(item => item.redni_broj).sort((a,b) => a-b);
        let msg = 'Iza kojeg RB želite umetnuti novu stavku?\nDostupni RB: ' + rbList.join(', ');
        let afterRb = prompt(msg, rbList[rbList.length-1]);
        if (!afterRb) return;
        afterRb = parseInt(afterRb);
        if (!rbList.includes(afterRb)) {
            alert('Neispravan RB!');
            return;
        }
        // Pronađi index stavke s afterRb
        let idx = troskovnik.findIndex(item => item.redni_broj == afterRb);
        if (idx === -1) idx = troskovnik.length-1;
        // Novi RB je afterRb+1
        let newRb = afterRb+1;
        // Povećaj RB svima >= newRb u troskovniku (od kraja prema početku)
        for (let i = troskovnik.length-1; i > idx; i--) {
            if (troskovnik[i].redni_broj >= newRb) {
                troskovnik[i].redni_broj++;
            }
        }
        // Povećaj RB svima >= newRb u results
        if (typeof results !== 'undefined' && Array.isArray(results)) {
            for (let i = 0; i < results.length; i++) {
                if (results[i].rb >= newRb) {
                    results[i].rb++;
                }
            }
            if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
        }
        // Kreiraj novu stavku
        let newItem = TroskovnikData.create({rb: newRb});
        troskovnik.splice(idx+1, 0, newItem);
        // Prompt za preimenovanje
        let noviNaziv = prompt('Unesite naziv nove stavke:', newItem.naziv_artikla);
        if (noviNaziv !== null && noviNaziv.trim() !== '') {
            newItem.naziv_artikla = noviNaziv.trim();
        }
        TroskovnikUI.render();
        showTroskovnikMessage('success', 'Nova stavka umetnuta kao RB ' + newRb + ' iza RB ' + afterRb);
        if (typeof AppState !== 'undefined' && AppState.markAsChanged) AppState.markAsChanged();
    }
}

// ===== FILE PROCESSING (simplified from original) =====
function processTroskovnikFile(file) {
    // console.log('🔄 Starting troškovnik file processing for:', file.name);
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
        showTroskovnikMessage('error', '❌ Podržavamo CSV i Excel formate za troškovnik.');
        return;
    }
    
    showTroskovnikMessage('info', '🔄 Obrađujem troškovnik ' + file.name + '...');
    
    if (fileExtension === 'csv') {
        processCSVTroskovnik(file);
    } else {
        processExcelTroskovnik(file);
    }
}

function processCSVTroskovnik(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                throw new Error('CSV mora imati header i podatke');
            }
            
            // Debug first few lines
            // console.log('🔍 CSV Debug - First 3 lines:');
            for (let i = 0; i < Math.min(3, lines.length); i++) {
                const values = parseCSVLine(lines[i]);
                // console.log(`Line ${i}:`, values);
            }
            
            const troskovnikItems = [];
            
            // Process each line (skip header)
            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                if (values.length < 2) continue;
                
                const item = createTroskovnikItemFromCSV(values, i);
                if (item) {
                    // console.log(`✅ Created item RB:${item.redni_broj} - ${item.naziv_artikla}`);
                    troskovnikItems.push(item);
                }
            }
            
            finalizeTroskovnikLoading(troskovnikItems, file.name);
            
        } catch (error) {
            showTroskovnikMessage('error', '❌ CSV greška: ' + error.message);
        }
    };
    reader.readAsText(file, 'utf-8');
}

function processExcelTroskovnik(file) {
    if (typeof XLSX === 'undefined') {
        showTroskovnikMessage('error', '❌ XLSX library not loaded!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                blankrows: false
            });
            
            // NOVO: Čitanje Excel metadata iz specifičnih ćelija
            try {
                // X2 - Procjenjena vrijednost
                const x2Cell = worksheet['X2'];
                if (x2Cell && x2Cell.v) {
                    excelTroskovnikData.procjenjena_vrijednost = String(x2Cell.v).trim();
                }
                
                // W20 - Garancija DA/NE
                const w20Cell = worksheet['W20'];
                if (w20Cell && w20Cell.v) {
                    excelTroskovnikData.garancija = String(w20Cell.v).trim();
                }
                
                // W21 - Način predaje
                const w21Cell = worksheet['W21'];
                if (w21Cell && w21Cell.v) {
                    excelTroskovnikData.nacin_predaje = String(w21Cell.v).trim();
                }
                
                // W22 - Datum i sat predaje
                const w22Cell = worksheet['W22'];
                if (w22Cell && w22Cell.v) {
                    // Check if it's a number (Excel serial date) or already formatted text
                    if (typeof w22Cell.v === 'number') {
                        excelTroskovnikData.datum_predaje = convertExcelSerialDate(w22Cell.v);
                    } else {
                        excelTroskovnikData.datum_predaje = String(w22Cell.v).trim();
                    }
                }
                
                // Log učitane Excel podatke
                console.log('📊 Excel metadata učitano:', excelTroskovnikData);
                
            } catch (metaError) {
                console.log('⚠️ Problem s čitanjem Excel metadata:', metaError.message);
                // Nastavi dalje bez metadata - nije kritična greška
            }
            
            // Debug first few rows
            // console.log('🔍 Excel Debug - First 3 rows:');
            for (let i = 0; i < Math.min(3, jsonData.length); i++) {
                const values = jsonData[i].map(v => String(v || '').trim());
                // console.log(`Row ${i}:`, values);
            }
            
            const troskovnikItems = [];
            
            // Process each row (skip header + 1 additional row)
            for (let i = 2; i < jsonData.length; i++) {
                const values = jsonData[i].map(v => String(v || '').trim());
                if (values.length < 2) continue;
                
                const item = createTroskovnikItemFromCSV(values, i);
                if (item) {
                    // console.log(`✅ Created item RB:${item.redni_broj} - ${item.naziv_artikla}`);
                    troskovnikItems.push(item);
                }
            }
            
            finalizeTroskovnikLoading(troskovnikItems, file.name);
            
        } catch (error) {
            showTroskovnikMessage('error', '❌ Excel greška: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

// FIXED: createTroskovnikItemFromCSV with proper unique ID generation
function createTroskovnikItemFromCSV(values, rowNumber) {
    try {
        const naziv = values[1] ? values[1].toString().trim() : '';
        if (!naziv) return null;
        
        // Extract RB from CSV or use row number
        const rb = values[0] && /^\d+$/.test(values[0].toString().trim()) ? 
                   parseInt(values[0]) : rowNumber;
        
        // FIXED: Generate unique ID using our function
        const uniqueId = generateUniqueId();
        
        // console.log(`📊 CSV Row ${rowNumber}: Creating ID=${uniqueId}, RB=${rb}, Name="${naziv}"`);
        
        // Column mapping for basic Excel files (A, B, C, D):
        // A (0): R.B., B (1): Naziv, C (2): J.M., D (3): Količina
        // Weight is left empty (0) and generated later via "Generiraj težine"
        const item = {
            id: uniqueId, // UNIQUE ID!
            redni_broj: rb,
            custom_search: '',
            naziv_artikla: naziv,
            mjerna_jedinica: values[2] || 'kom',
            tezina: 0, // Inicijalno prazno - generirat će se kasnije
            trazena_kolicina: parseDecimalQuantity(values[3]) || 1,
            izlazna_cijena: TroskovnikData.formatNumber(values[4] || 0, 2),
            nabavna_cijena_1: TroskovnikData.formatNumber(values[5] || 0, 2),
            nabavna_cijena_2: TroskovnikData.formatNumber(values[7] || 0, 2),
            dobavljac_1: values[6] || '',
            dobavljac_2: values[8] || '',
            komentar: values[9] || values[6] || '',
            datum: parseSmartDate ? parseSmartDate(values[10] || values[7]) : (values[10] || values[7] || new Date().toISOString().split('T')[0]),
            // Calculated fields
            najniza_cijena: 0,
            marza: 0,
            found_results: 0
        };
        
        // Recalculate dependent fields
        TroskovnikData.recalculate(item);
        
        return item;
        
    } catch (error) {
        console.warn('❌ Error creating troškovnik item from row ' + rowNumber + ':', error);
        return null;
    }
}

function finalizeTroskovnikLoading(troskovnikItems, filename) {
    if (troskovnikItems.length === 0) {
        showTroskovnikMessage('error', '❌ Nema valjanih stavki u datoteci!');
        return;
    }

    // Replace global troškovnik
    troskovnik.length = 0;
    troskovnik.push(...troskovnikItems);

    // Update display
    TroskovnikUI.render();

    // NEW: Update results display to show empty groups from troškovnik
    if (typeof updateResultsDisplay === 'function') {
        updateResultsDisplay();
        console.log('✅ Results display updated with empty groups from troškovnik');
    }

    const itemsWithWeight = troskovnikItems.filter(item => item.tezina > 0).length;
    const itemsWithPrice = troskovnikItems.filter(item => item.izlazna_cijena > 0).length;

    showTroskovnikMessage('success',
        '✅ Troškovnik uspješno učitan!\n' +
        '📊 Ukupno stavki: ' + troskovnikItems.length + '\n' +
        '⚖️ S težinom: ' + itemsWithWeight + '\n' +
        '💰 S cijenom: ' + itemsWithPrice + '\n\n' +
        '💡 Koristite "Generiraj težine" za automatsko popunjavanje!'
    );

    const uploadEl = document.getElementById('troskovnikUpload');
    if (uploadEl) uploadEl.classList.add('hidden');
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.map(val => val.replace(/^"|"$/g, ''));
}

// ===== WEIGHT GENERATION (simplified) =====
function generateWeightsFromNames() {
    if (!troskovnik || troskovnik.length === 0) {
        showTroskovnikMessage('error', '❌ Nema stavki za generiranje težina!');
        return;
    }
    
    let generated = 0;
    
    troskovnik.forEach(item => {
        if (item.tezina === 0 && item.naziv_artikla) {
            // Ako je mjerna jedinica kg, l ili lit, težina je 1
            const jm = (item.mjerna_jedinica || '').toLowerCase();
            if (jm === 'kg' || jm === 'l' || jm === 'lit') {
                item.tezina = 1;
                generated++;
            } else {
                // Use existing extractWeightProfessional if available, fallback to extractWeight
                const extractFunc = window.extractWeightProfessional || window.extractWeight;
                if (extractFunc) {
                    const weight = extractFunc(item.naziv_artikla, item.mjerna_jedinica);
                    if (weight > 0) {
                        item.tezina = TroskovnikData.formatNumber(weight, 3);
                        generated++;
                    }
                }
            }
        }
    });
    
    TroskovnikUI.render();
    showTroskovnikMessage('success', '✅ Generirano ' + generated + ' težina iz naziva!');
}

// FIXED: getDemoTroskovnik with unique IDs
function getDemoTroskovnik() {
    const demoData = [
        {
            naziv: 'Kompot jagoda 3/1',
            jm: 'kom',
            tezina: 3.0,
            kolicina: 10,
            izlazna: 3.50,
            komentar: 'Premium kvaliteta kompota jagoda. Provjeriti dostupnost u sezoni.'
        },
        {
            naziv: 'Kompot kruška 4/1',
            jm: 'kom',
            tezina: 4.0,
            kolicina: 5,
            izlazna: 6.00,
            komentar: ''
        },
        {
            naziv: 'Ulje suncokret 5L',
            jm: 'kom',
            tezina: 5.0,
            kolicina: 2,
            izlazna: 12.00,
            komentar: 'Važno: Provjeriti datum proizvodnje. Ulje mora biti svježe, max 3 mjeseca staro.'
        }
    ];
    
    return demoData.map((data, index) => TroskovnikData.create({
        ...data,
        rb: index + 1
    }));
}

// ===== MAIN INTERFACE FUNCTIONS =====

/**
 * Main update function - replaces complex updateTroskovnikDisplay()
 */
function updateTroskovnikDisplay() {
    TroskovnikUI.render();
}

/**
 * Refresh colors based on current results
 */
function refreshTroskovnikColors() {
    if (!troskovnik || troskovnik.length === 0) return;
    
    // Reset counters
    troskovnik.forEach(item => { 
        item.found_results = 0;
    });
    
    // Count results
    if (results && results.length > 0) {
        results.forEach(result => {
            const item = troskovnik.find(t => t.redni_broj == result.rb);
            if (item) {
                item.found_results++;
            }
        });
    }
    
    TroskovnikUI.render();
    // console.log('✅ Troškovnik colors refreshed');
}

// ===== EXPORT FUNCTIONS =====
function exportTroskovnikCSV() {
    if (!troskovnik || troskovnik.length === 0) {
        alert('Nema podataka za export!');
        return;
    }
    
    // ENHANCED: CSV headers with PDV columns and RUC/KG
    const csvHeaders = [
        'R.B.', 'Naziv artikla', 'J.M.', 'Težina (kg)', 'Količina', 'Izlazna cijena (€)',
        'RUC/KG (€/kg)', 'RUC (€)', 'Nabavna 1 (€)', 'Dobavljač 1', 'Nabavna 2 (€)', 'Dobavljač 2',
        'Naziv artikla 1', 'Šifra artikla 1', 'Naziv artikla 2', 'Šifra artikla 2',
        'Marža (%)', 'Najniža cijena (€)', 'Rezultati', 'Vrijednost (€)', 'Stopa PDV', 'Iznos PDV', 'Udio (%)', 'Komentar', 'Datum'
    ];
    
    const grandTotal = TroskovnikUI.calculateGrandTotal();
    
    // ENHANCED: CSV data with PDV calculations
    const csvData = troskovnik.map(item => {
        const itemTotal = item.trazena_kolicina * item.izlazna_cijena;
        const percentage = grandTotal > 0 ? ((itemTotal / grandTotal) * 100) : 0;
        
        // FIXED: GET PDV DATA by connecting troskovnik -> results -> weight database
        let pdvStopa = '';
        let iznosPdv = '';
        
        // Find corresponding result item(s) for this troskovnik RB
        const correspondingResults = results.filter(result => result.rb == item.redni_broj);
        
        if (correspondingResults.length > 0) {
            // Try each result until we find one with PDV data
            for (const result of correspondingResults) {
                // CORRECTED: Simple PDV lookup - check both properties (same as Excel)
                let pdvValue = 0;
                let pdvSource = '';
                
                // First check customPdvStopa (external articles, manual entries)
                if (result.customPdvStopa && result.customPdvStopa > 0) {
                    pdvValue = result.customPdvStopa;
                    pdvSource = result.isManualEntry ? 'manual entry' : 'external article';
                }
                // Then check pdvStopa (Google Sheets articles)
                else if (result.pdvStopa && result.pdvStopa > 0) {
                    pdvValue = result.pdvStopa;
                    pdvSource = 'Google Sheets';
                }
                
                if (pdvValue > 0) {
                    pdvStopa = pdvValue + '%';
                    iznosPdv = (itemTotal * pdvValue / 100).toFixed(2);
                    console.log(`✅ CSV PDV found (${pdvSource}): RB${item.redni_broj} -> ${result.name} -> ${pdvStopa} = €${iznosPdv}`);
                    break;
                }
                
                // Check if this result is from "our" source (LAGER/URPD) - ENHANCED LOGIC
                const isOurSource = window.isTrulyOurArticle(result.source, result.code);
                
                if (isOurSource) {
                    // Try to get PDV data using the result's code
                    if (typeof window.getArticleWeightAndPDV === 'function') {
                        const pdvData = window.getArticleWeightAndPDV(result.code, result.name, result.unit, result.source);
                        
                        if (pdvData.pdvStopa > 0) {
                            pdvStopa = pdvData.pdvStopa + '%';
                            iznosPdv = (itemTotal * pdvData.pdvStopa / 100).toFixed(2);
                            break;
                        }
                    }
                    
                    // Alternative: Direct check in weightTableData
                    if (!pdvStopa && typeof window.weightTableData !== 'undefined') {
                        const weightData = window.weightTableData.find(w => w.sifra === result.code);
                        if (weightData && weightData.pdvStopa > 0) {
                            pdvStopa = weightData.pdvStopa + '%';
                            iznosPdv = (itemTotal * weightData.pdvStopa / 100).toFixed(2);
                            break;
                        }
                    }
                    
                    // Final fallback: Direct PDV database check
                    if (!pdvStopa && typeof window.pdvDatabase !== 'undefined' && window.pdvDatabase.has(result.code)) {
                        const pdvFromDb = window.pdvDatabase.get(result.code);
                        if (pdvFromDb > 0) {
                            pdvStopa = pdvFromDb + '%';
                            iznosPdv = (itemTotal * pdvFromDb / 100).toFixed(2);
                            break;
                        }
                    }
                }
            }
        }
        
        const ruc = item.izlazna_cijena - item.nabavna_cijena_1;
        const weight = parseFloat(item.tezina) || 0;
        const rucPerKg = (ruc > 0 && weight > 0) ? (ruc / weight) : 0;

        // ENHANCED: Extract article names and codes from results using isFirstChoice flag
        let nazivArtikla1 = '';
        let sifraArtikla1 = '';
        let nazivArtikla2 = '';
        let sifraArtikla2 = '';

        if (correspondingResults.length > 0) {
            // First choice (isFirstChoice = true)
            const artikal1 = correspondingResults.find(r => r.isFirstChoice === true);
            if (artikal1) {
                nazivArtikla1 = artikal1.name || '';
                sifraArtikla1 = artikal1.code || '';
            }

            // Second choice (isFirstChoice = false)
            const artikal2 = correspondingResults.find(r => r.isFirstChoice === false);
            if (artikal2) {
                nazivArtikla2 = artikal2.name || '';
                sifraArtikla2 = artikal2.code || '';
            }
        }

        return [
            item.redni_broj,
            item.naziv_artikla,
            item.mjerna_jedinica,
            item.tezina.toFixed(3),
            item.trazena_kolicina,
            item.izlazna_cijena.toFixed(2),
            item.ruc_per_kg > 0 ? item.ruc_per_kg.toFixed(2) : '', // RUC/KG (€/kg)
            ruc > 0 ? ruc.toFixed(2) : '', // RUC (€)
            item.nabavna_cijena_1.toFixed(2),
            item.dobavljac_1 || '',
            item.nabavna_cijena_2.toFixed(2),
            item.dobavljac_2 || '',
            nazivArtikla1,
            sifraArtikla1,
            nazivArtikla2,
            sifraArtikla2,
            item.marza.toFixed(1),
            item.najniza_cijena.toFixed(2),
            item.found_results || 0,
            itemTotal.toFixed(2), // Vrijednost (€)
            pdvStopa, // Stopa PDV
            iznosPdv, // Iznos PDV
            percentage.toFixed(1), // Udio (%)
            item.komentar || '',
            item.datum || ''
        ];
    });
    
    const filename = 'troskovnik_s_PDV_' + troskovnik.length + '_stavki.csv';
    exportToCSV(csvHeaders, csvData, filename);
    
    // ENHANCED: Show success message with PDV info including manual entries
    const itemsWithPdv = troskovnik.filter(item => {
        const correspondingResults = results.filter(result => result.rb == item.redni_broj);
        
        if (correspondingResults.length > 0) {
            for (const result of correspondingResults) {
                // Check for manual entries with PDV
                if (result.isManualEntry && result.customPdvStopa) {
                    return true;
                }
                
                // Check if this is an external article (not ours) with custom PDV stopa
                if (!window.isTrulyOurArticle(result.source, result.code) && 
                    result.customPdvStopa) {
                    return true;
                }
                
                const isOurSource = window.isTrulyOurArticle(result.source, result.code);
                
                if (isOurSource) {
                    if (typeof window.getArticleWeightAndPDV === 'function') {
                        const pdvData = window.getArticleWeightAndPDV(result.code, result.name, result.unit, result.source);
                        if (pdvData.pdvStopa > 0) return true;
                    }
                    
                    if (typeof window.weightTableData !== 'undefined') {
                        const weightData = window.weightTableData.find(w => w.sifra === result.code);
                        if (weightData && weightData.pdvStopa > 0) return true;
                    }
                }
            }
        }
        return false;
    }).length;
    
    // Count manual entries
    const manualEntries = troskovnik.filter(item => {
        const correspondingResults = results.filter(result => result.rb == item.redni_broj);
        return correspondingResults.some(result => result.isManualEntry);
    }).length;
    
    showTroskovnikMessage('success', 
        `✅ Exportan enhanced CSV s RUC i PDV podacima!\n\n` +
        `📁 ${filename}\n` +
        `📊 Ukupno stavki: ${troskovnik.length}\n` +
        `🏠 Naših stavki s PDV: ${itemsWithPdv}\n` +
        `🟡 Ručno unesenih: ${manualEntries}\n\n` +
        `🆕 NOVI STUPCI:\n` +
        `• RUC (€) - razlika izlazna - nabavna 1\n` +
        `• Stopa PDV (5%, 13%, 25%)\n` +
        `• Iznos PDV (€)\n\n` +
        `🎯 Ručno unesene stavke uključuju PDV!`
    );
}

function exportTroskovnikExcel() {
    console.log('🚀 STARTING EXCEL EXPORT');
    console.log(`📊 Troskovnik has ${troskovnik?.length || 0} items`);
    console.log(`📊 Results has ${results?.length || 0} items`);
    
    if (!troskovnik || troskovnik.length === 0) {
        alert('Nema podataka za export!');
        return;
    }
    
    if (typeof XLSX === 'undefined') {
        alert('XLSX library nije učitana!');
        return;
    }
    
    const grandTotal = TroskovnikUI.calculateGrandTotal();
    
    // ENHANCED: Prepare data for Excel with PDV columns including "Ukupno sa PDV"
    const excelData = [
        ['R.B.', 'Naziv artikla', 'J.M.', 'Težina (kg)', 'Količina', 'Izlazna cijena (€)',
         'RUC (€)', 'Nabavna 1 (€)', 'Dobavljač 1', 'Nabavna 2 (€)', 'Dobavljač 2',
         'Naziv artikla 1', 'Šifra artikla 1', 'Naziv artikla 2', 'Šifra artikla 2',
         'Marža (%)', 'Najniža cijena (€)', 'Rezultati', 'Vrijednost (€)', 'Stopa PDV', 'Iznos PDV', 'Ukupno sa PDV', 'Udio (%)', 'Komentar', 'Datum']
    ];
    
    troskovnik.forEach(item => {
        const itemTotal = item.trazena_kolicina * item.izlazna_cijena;
        const percentage = grandTotal > 0 ? ((itemTotal / grandTotal) * 100) : 0;
        
        // FIXED: GET PDV DATA by connecting troskovnik -> results -> weight database
        let pdvStopa = '';
        let iznosPdv = '';
        
        // Find corresponding result item(s) for this troskovnik RB
        const correspondingResults = results.filter(result => result.rb == item.redni_broj);
        
        // ENHANCED DEBUG: Always log PDV debugging for first 5 items
        if (item.redni_broj <= 5) {
            console.log(`🔍 EXCEL DEBUG for RB ${item.redni_broj}:`);
            console.log(`   📋 Troskovnik item: "${item.naziv_artikla}"`);
            console.log(`   📊 Found ${correspondingResults.length} results`);
            
            if (correspondingResults.length === 0) {
                const allRBs = results.map(r => r.rb).slice(0, 10);
                console.log(`   ❌ NO RESULTS FOUND! Available RBs: [${allRBs.join(', ')}]`);
                console.log(`   ❌ RB types: [${allRBs.map(rb => typeof rb).join(', ')}]`);
            } else {
                correspondingResults.forEach((result, idx) => {
                    console.log(`   ✅ Result ${idx + 1}: "${result.name}"`);
                    console.log(`      - RB: ${result.rb} (${typeof result.rb})`);
                    console.log(`      - pdvStopa: ${result.pdvStopa} (${typeof result.pdvStopa})`);
                    console.log(`      - customPdvStopa: ${result.customPdvStopa} (${typeof result.customPdvStopa})`);
                    console.log(`      - isManualEntry: ${result.isManualEntry}`);
                    console.log(`      - source: ${result.source}`);
                });
            }
        }
        
        if (correspondingResults.length > 0) {
            // Try each result until we find one with PDV data
            for (const result of correspondingResults) {
                console.log(`🔍 Excel checking result: ${result.name} (source: ${result.source}, code: ${result.code}, pdvStopa: ${result.pdvStopa}, customPdvStopa: ${result.customPdvStopa}, isManualEntry: ${result.isManualEntry})`);
                
                // CORRECTED: Simple PDV lookup - check both properties
                let pdvValue = 0;
                let pdvSource = '';
                
                // First check customPdvStopa (external articles, manual entries)
                if (result.customPdvStopa && result.customPdvStopa > 0) {
                    pdvValue = result.customPdvStopa;
                    pdvSource = result.isManualEntry ? 'manual entry' : 'external article';
                }
                // Then check pdvStopa (Google Sheets articles)
                else if (result.pdvStopa && result.pdvStopa > 0) {
                    pdvValue = result.pdvStopa;
                    pdvSource = 'Google Sheets';
                }
                
                if (pdvValue > 0) {
                    pdvStopa = pdvValue + '%';
                    iznosPdv = parseFloat((itemTotal * pdvValue / 100).toFixed(2));
                    console.log(`✅ Excel PDV found (${pdvSource}): RB${item.redni_broj} -> ${result.name} -> ${pdvStopa} = €${iznosPdv}`);
                    break;
                }
                
                // Check if this result is from "our" source (LAGER/URPD) - ENHANCED LOGIC
                const isOurSource = window.isTrulyOurArticle(result.source, result.code);
                
                if (isOurSource) {
                    // Try to get PDV data using the result's code
                    if (typeof window.getArticleWeightAndPDV === 'function') {
                        const pdvData = window.getArticleWeightAndPDV(result.code, result.name, result.unit, result.source);
                        
                        if (pdvData.pdvStopa > 0) {
                            pdvStopa = pdvData.pdvStopa + '%';  // Format: "25%"
                            iznosPdv = parseFloat((itemTotal * pdvData.pdvStopa / 100).toFixed(2)); // Calculate PDV amount
                            // console.log(`💰 PDV found via results: RB${item.redni_broj} -> ${result.code} -> ${pdvStopa} = €${iznosPdv}`);
                            break; // Found PDV, stop searching
                        }
                    }
                    
                    // Alternative: Direct check in weightTableData
                    if (!pdvStopa && typeof window.weightTableData !== 'undefined') {
                        const weightData = window.weightTableData.find(w => w.sifra === result.code);
                        if (weightData && weightData.pdvStopa > 0) {
                            pdvStopa = weightData.pdvStopa + '%';
                            iznosPdv = parseFloat((itemTotal * weightData.pdvStopa / 100).toFixed(2));
                            console.log(`✅ Excel PDV found via weightTableData: RB${item.redni_broj} -> ${result.code} -> ${pdvStopa} = €${iznosPdv}`);
                            break;
                        }
                    }
                    
                    // Final fallback: Direct PDV database check
                    if (!pdvStopa && typeof window.pdvDatabase !== 'undefined' && window.pdvDatabase.has(result.code)) {
                        const pdvFromDb = window.pdvDatabase.get(result.code);
                        if (pdvFromDb > 0) {
                            pdvStopa = pdvFromDb + '%';
                            iznosPdv = parseFloat((itemTotal * pdvFromDb / 100).toFixed(2));
                            console.log(`✅ Excel PDV found via pdvDatabase: RB${item.redni_broj} -> ${result.code} -> ${pdvStopa} = €${iznosPdv}`);
                            break;
                        }
                    }
                }
            }
        }
        
        // CALCULATE "Ukupno sa PDV" = Vrijednost + Iznos PDV
        const ukupnoSaPdv = itemTotal + (iznosPdv ? parseFloat(iznosPdv) : 0);
        
        if (!pdvStopa) {
            // console.log(`ℹ️ No PDV data found for RB${item.redni_broj} (${correspondingResults.length} results found)`);
        }

        const ruc = item.izlazna_cijena - item.nabavna_cijena_1;

        // ENHANCED: Extract article names and codes from results using isFirstChoice flag
        let nazivArtikla1 = '';
        let sifraArtikla1 = '';
        let nazivArtikla2 = '';
        let sifraArtikla2 = '';

        if (correspondingResults.length > 0) {
            // First choice (isFirstChoice = true)
            const artikal1 = correspondingResults.find(r => r.isFirstChoice === true);
            if (artikal1) {
                nazivArtikla1 = artikal1.name || '';
                sifraArtikla1 = artikal1.code || '';
            }

            // Second choice (isFirstChoice = false)
            const artikal2 = correspondingResults.find(r => r.isFirstChoice === false);
            if (artikal2) {
                nazivArtikla2 = artikal2.name || '';
                sifraArtikla2 = artikal2.code || '';
            }
        }

        excelData.push([
            item.redni_broj,
            item.naziv_artikla,
            item.mjerna_jedinica,
            item.tezina,
            item.trazena_kolicina,
            (parseFloat(item.izlazna_cijena) || 0).toFixed(2).replace('.', ','),
            ruc > 0 ? ruc : '', // G: RUC (€) - Excel number or empty
            item.nabavna_cijena_1,
            item.dobavljac_1 || '',
            item.nabavna_cijena_2,
            item.dobavljac_2 || '',
            nazivArtikla1,
            sifraArtikla1,
            nazivArtikla2,
            sifraArtikla2,
            parseFloat(item.marza.toFixed(1)),
            item.najniza_cijena,
            item.found_results || 0,
            itemTotal, // O: Vrijednost (€) - Excel number for calculations
            pdvStopa, // P: Stopa PDV - format "25%" or empty
            iznosPdv, // Q: Iznos PDV - Excel number or empty
            ukupnoSaPdv, // R: Ukupno sa PDV - Excel number (O + Q)
            parseFloat(percentage.toFixed(1)), // S: Udio (%) - Excel number for calculations
            item.komentar || '', // T: Komentar
            item.datum || '' // U: Datum
        ]);
    });
    
    // ENHANCED: Add totals row with PDV calculations
    const totalPdvAmount = troskovnik.reduce((sum, item) => {
        const itemTotal = item.trazena_kolicina * item.izlazna_cijena;
        
        // FIXED: Calculate PDV via results connection
        let pdvStopa = 0;
        
        const correspondingResults = results.filter(result => result.rb == item.redni_broj);
        
        if (correspondingResults.length > 0) {
            for (const result of correspondingResults) {
                const isOurSource = result.source && 
                    (result.source.toLowerCase().includes('lager') || result.source.toLowerCase().includes('urpd'));
                
                if (isOurSource && result.code) {
                    if (typeof window.getArticleWeightAndPDV === 'function') {
                        const pdvData = window.getArticleWeightAndPDV(result.code, result.name, result.unit, result.source);
                        if (pdvData.pdvStopa > 0) {
                            pdvStopa = pdvData.pdvStopa;
                            break;
                        }
                    }
                    
                    if (!pdvStopa && typeof window.weightTableData !== 'undefined') {
                        const weightData = window.weightTableData.find(w => w.sifra === result.code);
                        if (weightData && weightData.pdvStopa > 0) {
                            pdvStopa = weightData.pdvStopa;
                            break;
                        }
                    }
                }
            }
        }
        
        return sum + (itemTotal * pdvStopa / 100);
    }, 0);
    
    // CALCULATE total "Ukupno sa PDV" = grandTotal + totalPdvAmount
    const totalUkupnoSaPdv = grandTotal + totalPdvAmount;
    
    const totalRow = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', grandTotal, '', parseFloat(totalPdvAmount.toFixed(2)), parseFloat(totalUkupnoSaPdv.toFixed(2)), 100.0, '', ''];
    excelData.push(totalRow);
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // ENHANCED: Set column widths including new "RUC" and "Ukupno sa PDV" columns
    const wscols = [
        {wch: 6}, {wch: 35}, {wch: 8}, {wch: 10}, {wch: 10}, {wch: 12},
        {wch: 10}, {wch: 12}, {wch: 18}, {wch: 12}, {wch: 18}, {wch: 10}, {wch: 12},
        {wch: 10}, {wch: 14}, {wch: 12}, {wch: 12}, {wch: 15}, {wch: 10}, {wch: 30}, {wch: 12}
    ];
    ws['!cols'] = wscols;
    
    // ENHANCED: Add Excel formulas for the totals row with all PDV columns
    const lastRow = excelData.length;
    const totalRowIndex = lastRow;
    
    // Make total row bold in Excel - UPDATED for new column positions with RUC
    ws[`O${totalRowIndex}`] = { 
        t: 'n', 
        v: grandTotal, 
        s: { font: { bold: true }, fill: { fgColor: { rgb: "E0E7FF" } } } 
    };
    ws[`Q${totalRowIndex}`] = { 
        t: 'n', 
        v: parseFloat(totalPdvAmount.toFixed(2)), 
        s: { font: { bold: true }, fill: { fgColor: { rgb: "FEF3C7" } } } 
    };
    ws[`R${totalRowIndex}`] = { 
        t: 'n', 
        v: parseFloat(totalUkupnoSaPdv.toFixed(2)), 
        s: { font: { bold: true }, fill: { fgColor: { rgb: "D1FAE5" } } } 
    };
    ws[`S${totalRowIndex}`] = { 
        t: 'n', 
        v: 100.0, 
        s: { font: { bold: true }, fill: { fgColor: { rgb: "E0E7FF" } } } 
    };


    XLSX.utils.book_append_sheet(wb, ws, 'Kompletni Troskovnik');
    
    // Generate filename using tender header data
    const filenames = generateTenderFilenames('Troskovnik', 'xlsx');
    const filename = `${filenames.datumPredaje}_${filenames.cleanGrupa}_${filenames.cleanKupac}_Troskovnik.xlsx`;
    
    XLSX.writeFile(wb, filename);
    
    // ENHANCED: Show success message with PDV info including manual entries
    const itemsWithPdv = troskovnik.filter(item => {
        const correspondingResults = results.filter(result => result.rb == item.redni_broj);
        
        if (correspondingResults.length > 0) {
            for (const result of correspondingResults) {
                // Check for manual entries with PDV
                if (result.isManualEntry && result.customPdvStopa) {
                    return true;
                }
                
                // Check if this is an external article (not ours) with custom PDV stopa
                if (!window.isTrulyOurArticle(result.source, result.code) && 
                    result.customPdvStopa) {
                    return true;
                }
                
                const isOurSource = result.source && 
                    (result.source.toLowerCase().includes('lager') || result.source.toLowerCase().includes('urpd'));
                
                if (isOurSource && result.code) {
                    if (typeof window.getArticleWeightAndPDV === 'function') {
                        const pdvData = window.getArticleWeightAndPDV(result.code, result.name, result.unit, result.source);
                        if (pdvData.pdvStopa > 0) return true;
                    }
                    
                    if (typeof window.weightTableData !== 'undefined') {
                        const weightData = window.weightTableData.find(w => w.sifra === result.code);
                        if (weightData && weightData.pdvStopa > 0) return true;
                    }
                }
            }
        }
        return false;
    }).length;
    
    // Count manual entries for Excel report
    const manualEntries = troskovnik.filter(item => {
        const correspondingResults = results.filter(result => result.rb == item.redni_broj);
        return correspondingResults.some(result => result.isManualEntry);
    }).length;
    
    showTroskovnikMessage('success', 
        `✅ Exportan enhanced troškovnik s RUC i PDV podacima!\n\n` +
        `📁 Datoteka: ${filename}\n` +
        `📊 Ukupno stavki: ${troskovnik.length}\n` +
        `🏠 Naših stavki s PDV: ${itemsWithPdv}\n` +
        `🟡 Ručno unesenih: ${manualEntries}\n` +
        `💰 Ukupna vrijednost: €${grandTotal.toFixed(2)}\n` +
        `📋 Ukupan PDV: €${totalPdvAmount.toFixed(2)}\n` +
        `💵 Ukupno sa PDV: €${totalUkupnoSaPdv.toFixed(2)}\n\n` +
        `🆕 NOVI STUPCI:\n` +
        `• G: RUC (€) - razlika izlazna - nabavna 1\n` +
        `• P: Stopa PDV (5%, 13%, 25%)\n` +
        `• Q: Iznos PDV (€)\n` +
        `• R: Ukupno sa PDV (€)\n\n` +
        `🎯 Ručno unesene stavke uključuju PDV!\n` +
        `💡 Uključuje kalkulabilne ukupne sume, RUC i PDV!`
    );
}

// ===== FIX EXISTING IDS FUNCTION =====
function fixExistingTroskovnikIds() {
    if (!troskovnik || troskovnik.length === 0) {
        // console.log('❌ No troskovnik items to fix');
        return;
    }
    
    // console.log('🔧 FIXING EXISTING IDs - Before:', troskovnik.map(t => ({id: t.id, rb: t.redni_broj})));
    
    // Reset counter to start fresh
    troskovnikIdCounter = 0;
    
    // Assign new unique IDs to all items
    troskovnik.forEach((item, index) => {
        item.id = generateUniqueId();
        // console.log(`✅ Fixed item ${index}: RB=${item.redni_broj}, New ID=${item.id}`);
    });
    
    // console.log('✅ FIXED IDs - After:', troskovnik.map(t => ({id: t.id, rb: t.redni_broj})));
    
    // Refresh display
    if (typeof updateTroskovnikDisplay === 'function') {
        updateTroskovnikDisplay();
    }
    
    // Show success message
    const message = `✅ FIXED! Svi ID-jevi su sada jedinstveni (${troskovnik.length} stavki). Probajte sada mijenjanje cijena.`;
    alert(message);
    // console.log(message);
}

// ===== FIRST CHOICE TOOLTIP (NEW) =====
/**
 * Shows tooltip with first choice result info when hovering over troškovnik naziv
 * @param {number} rb - RB number
 * @param {Event} event - Mouse event for positioning
 */
function showFirstChoiceTooltip(rb, event) {
    // Check if results array exists
    if (typeof window.results === 'undefined' || !window.results) {
        return;
    }

    // Find first choice for this RB
    const firstChoice = window.results.find(r => r.rb == rb && r.isFirstChoice === true);

    // If no first choice found, don't show tooltip
    if (!firstChoice) {
        return;
    }

    // Remove existing tooltip if any
    hideFirstChoiceTooltip();

    // Determine article type and colors
    let bgColor, borderColor, badgeText, badgeColor;
    const isOurArticle = window.isOurArticleVisual ? window.isOurArticleVisual(firstChoice.source) : false;

    if (firstChoice.isManualEntry) {
        // Manual entry - orange theme
        bgColor = '#fef3c7';
        borderColor = '#f59e0b';
        badgeText = '🔧 RUČNI UNOS';
        badgeColor = '#f59e0b';
    } else if (isOurArticle) {
        // Our articles - green theme
        bgColor = '#dcfce7';
        borderColor = '#16a34a';
        badgeText = '🏠 NAŠ ARTIKL';
        badgeColor = '#16a34a';
    } else {
        // External articles - purple theme
        bgColor = '#ede9fe';
        borderColor = '#7c3aed';
        badgeText = '📋 PO CJENIKU';
        badgeColor = '#7c3aed';
    }

    // Calculate VPC/kg
    const weight = firstChoice.calculatedWeight || firstChoice.weight || 0;
    const vpcPerKg = weight > 0 ? (firstChoice.price / weight) : 0;

    // Format date
    let formattedDate = 'N/A';
    try {
        if (firstChoice.date) {
            formattedDate = new Date(firstChoice.date).toLocaleDateString('hr-HR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        }
    } catch (e) {
        formattedDate = firstChoice.date || 'N/A';
    }

    // Get PDV stopa
    let pdvStopa = 'Auto';
    if (firstChoice.customPdvStopa) {
        pdvStopa = firstChoice.customPdvStopa + '%';
    } else if (firstChoice.pdvStopa && firstChoice.pdvStopa > 0) {
        pdvStopa = firstChoice.pdvStopa + '%';
    } else if (firstChoice.code && typeof window.getArticleWeightAndPDV === 'function') {
        const pdvData = window.getArticleWeightAndPDV(firstChoice.code, firstChoice.name, firstChoice.unit, firstChoice.source);
        if (pdvData.pdvStopa > 0) {
            pdvStopa = pdvData.pdvStopa + '%';
        }
    }

    // Create tooltip HTML
    const tooltipHTML = `
        <div id="firstChoiceTooltip" style="
            position: fixed;
            left: ${event.clientX + 15}px;
            top: ${event.clientY + 15}px;
            background: ${bgColor};
            border: 3px solid ${borderColor};
            border-radius: 8px;
            padding: 12px 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.25);
            z-index: 99999;
            min-width: 320px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 13px;
            line-height: 1.6;
            pointer-events: none;
            animation: tooltipFadeIn 0.15s ease-out;
        ">
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 8px; color: ${badgeColor}; border-bottom: 2px solid ${borderColor}; padding-bottom: 6px;">
                ⭐ PRVI IZBOR - ${badgeText}
            </div>
            <div style="display: grid; gap: 4px;">
                <div><strong>🏷️ Šifra:</strong> ${firstChoice.code || 'N/A'}</div>
                <div><strong>📦 Naziv:</strong> ${firstChoice.name || 'N/A'}</div>
                <div><strong>🏪 Dobavljač:</strong> ${firstChoice.supplier || 'N/A'}</div>
                <div><strong>💰 Nabavna cijena:</strong> €${(firstChoice.price || 0).toFixed(2)}</div>
                <div><strong>💵 Prodajna cijena:</strong> €${(firstChoice.pricePerPiece || 0).toFixed(2)}</div>
                <div><strong>⚖️ Težina:</strong> ${weight.toFixed(3)} kg</div>
                <div><strong>📊 VPC/kg:</strong> €${vpcPerKg.toFixed(3)}/kg</div>
                <div><strong>🧾 PDV stopa:</strong> ${pdvStopa}</div>
                <div><strong>📂 Izvor:</strong> ${firstChoice.source || 'N/A'}</div>
                <div><strong>📅 Datum:</strong> ${formattedDate}</div>
            </div>
        </div>
        <style>
            @keyframes tooltipFadeIn {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    `;

    // Add tooltip to body
    document.body.insertAdjacentHTML('beforeend', tooltipHTML);

    // Adjust position if tooltip goes off-screen
    const tooltip = document.getElementById('firstChoiceTooltip');
    if (tooltip) {
        const rect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Adjust horizontal position if off-screen
        if (rect.right > viewportWidth) {
            tooltip.style.left = (event.clientX - rect.width - 15) + 'px';
        }

        // Adjust vertical position if off-screen
        if (rect.bottom > viewportHeight) {
            tooltip.style.top = (event.clientY - rect.height - 15) + 'px';
        }
    }
}

/**
 * Hides the first choice tooltip
 */
function hideFirstChoiceTooltip() {
    const tooltip = document.getElementById('firstChoiceTooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// ===== EXPORT GLOBAL FUNCTIONS (maintain compatibility) =====
window.updateTroskovnikDisplay = updateTroskovnikDisplay;
window.refreshTroskovnikColors = refreshTroskovnikColors;
window.generateWeightsFromNames = generateWeightsFromNames;
window.processTroskovnikFile = processTroskovnikFile;
window.exportTroskovnikCSV = exportTroskovnikCSV;
window.exportTroskovnikExcel = exportTroskovnikExcel;
window.getDemoTroskovnik = getDemoTroskovnik;
window.fixExistingTroskovnikIds = fixExistingTroskovnikIds;
window.parseDecimalQuantity = parseDecimalQuantity;
window.showFirstChoiceTooltip = showFirstChoiceTooltip;
window.hideFirstChoiceTooltip = hideFirstChoiceTooltip;

// Legacy compatibility functions - FIXED TO USE PROPER UPDATE FUNCTION
window.updateTroskovnikItem = function(id, field, value) {
    // console.log(`🔧 LEGACY updateTroskovnikItem called: ID=${id}, field="${field}", value="${value}"`);
    
    // Call the fixed TroskovnikData.update function
    const success = TroskovnikData.update(id, field, value);
    
    if (success) {
        TroskovnikUI.render();
        
        // Mark app state as changed
        if (typeof AppState !== 'undefined' && AppState.markAsChanged) {
            AppState.markAsChanged();
        }
    }
    
    return success;
};

window.addNewTroskovnikItem = TroskovnikActions.add;
window.duplicateTroskovnikItem = TroskovnikActions.duplicate;
window.deleteTroskovnikItem = TroskovnikActions.delete;
window.clearAllTroskovnik = TroskovnikActions.clear;
window.showArticleComment = TroskovnikComments.show;
window.addComment = TroskovnikComments.add;
window.handleWeightKeydown = TroskovnikUI.handleWeightKeydown;

// Export classes for advanced usage
window.TroskovnikData = TroskovnikData;
window.TroskovnikUI = TroskovnikUI;
window.TroskovnikActions = TroskovnikActions;
window.TroskovnikComments = TroskovnikComments;
window.generateUniqueId = generateUniqueId;

// Export new functions for manual entry
window.createManualResultItem = TroskovnikUI.createManualResultItem;
window.handlePriceChange = TroskovnikUI.handlePriceChange;

// Function to scroll to results for specific RB
function scrollToResultsForRB(rb) {
    // console.log(`🔍 Scrolling to RB ${rb}`);
    
    // Switch to Rezultati tab - correct tab name
    const resultsTab = document.querySelector('button[onclick="showTab(\'results\', event)"]');
    if (resultsTab) {
        // console.log(`✅ Found results tab, clicking...`);
        resultsTab.click();
    } else {
        console.error('❌ Results tab not found');
    }
    
    // Wait for tab to load, then scroll to specific RB group
    setTimeout(() => {
        const rbGroup = document.getElementById('group-' + rb);
        // console.log(`🔍 Looking for group-${rb}:`, rbGroup);
        
        if (rbGroup) {
            // console.log(`✅ Found group-${rb}, scrolling...`);
            rbGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Highlight the group briefly
            rbGroup.style.backgroundColor = '#fef3c7';
            rbGroup.style.border = '2px solid #f59e0b';
            rbGroup.style.borderRadius = '8px';
            rbGroup.style.padding = '10px';
            rbGroup.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                rbGroup.style.backgroundColor = '';
                rbGroup.style.border = '';
                rbGroup.style.borderRadius = '';
                rbGroup.style.padding = '';
                rbGroup.style.transition = '';
            }, 3000);
        } else {
            console.error(`❌ Group-${rb} not found in results`);
            // Try alternative selectors
            const alternativeGroup = document.querySelector(`[data-rb="${rb}"]`);
            if (alternativeGroup) {
                // console.log(`✅ Found alternative group for RB ${rb}`);
                alternativeGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, 300);
}

window.scrollToResultsForRB = scrollToResultsForRB;

// DEBUGGING FUNCTIONS
window.debugTroskovnikUpdate = function() {
    // console.log('🔍 DEBUGGING TROŠKOVNIK UPDATE:');
    // console.log('📊 Current troskovnik items:', troskovnik.length);
    troskovnik.forEach((item, index) => {
        // console.log(`  ${index}: ID=${item.id}, RB=${item.redni_broj}, Name="${item.naziv_artikla}"`);
    });
    
    // Check for duplicate IDs
    const ids = troskovnik.map(t => parseInt(t.id));
    const uniqueIds = [...new Set(ids)];
    
    if (ids.length !== uniqueIds.length) {
        console.error('❌ DUPLICATE IDs FOUND!');
        // console.log('🔧 Run fixExistingTroskovnikIds() to fix this');
    } else {
        // console.log('✅ All IDs are unique');
    }
    
    // Test update function
    if (troskovnik.length > 0) {
        // console.log('🧪 Testing update function with first item...');
        const testItem = troskovnik[0];
        // console.log('📝 Test item:', {
        //     id: testItem.id,
        //     rb: testItem.redni_broj,
        //     izlazna_cijena: testItem.izlazna_cijena
        // });
    }
};

// AUTO-FIX ON PAGE LOAD
document.addEventListener('DOMContentLoaded', function() {
    // Auto-fix IDs if we detect duplicates
    setTimeout(() => {
        if (troskovnik && troskovnik.length > 0) {
            const ids = troskovnik.map(t => parseInt(t.id));
            const uniqueIds = [...new Set(ids)];
            
            if (ids.length !== uniqueIds.length) {
                // console.log('🔧 AUTO-FIXING duplicate IDs detected on page load...');
                fixExistingTroskovnikIds();
            }
        }
    }, 1000);
});

// console.log('✅ FIXED KOMPLETNI Troškovnik module loaded!');
// console.log('🔧 GLAVNA ISPRAVKA: Unique ID generation implemented');
// console.log('🔢 NOVA ISPRAVKA: Decimal quantity support (38,33kg → 38.33)');
// console.log('⚖️ NOVA ISPRAVKA: Weight import fixed - now starts at 0 instead of random values');
// console.log('📊 Classes: TroskovnikData, TroskovnikUI, TroskovnikActions, TroskovnikComments');
// console.log('💰 STUPCI: "Vrijednost (€)" i "Udio (%)" s ukupnim sumama');
// console.log('📈 ZNAČAJKE: Sažetak zaglavlja, ukupne sume u podnožju, Excel formule, obojeni postotci');
// console.log('🔧 Sve legacy funkcije zadržane za kompatibilnost');
// console.log('🐛 ISPRAVKA: Unique ID generation riješava problem s updateom');
// console.log('🔢 ISPRAVKA: parseDecimalQuantity() podržava hrvatske decimale (zapez)');
// console.log('⚖️ ISPRAVKA: Weight no longer reads from column I - stays empty for manual/auto generation');
// console.log('⚡ Auto-fix funkcionalnost: automatski popravlja duplicate ID-jeve');
// console.log('🛠️ Debug funkcije: debugTroskovnikUpdate(), fixExistingTroskovnikIds()');
// console.log('✅ Problem s ažuriranjem prvi stavke RIJEŠEN!');
// console.log('✅ Problem s decimal količinama RIJEŠEN!');
// console.log('✅ Problem s nepotrebnim težinama RIJEŠEN!');

// ===== SORT STATE =====
let troskovnikSort = {
    column: null, // 'redni_broj' ili 'udio'
    direction: 'asc' // 'asc' ili 'desc'
};

function sortTroskovnikBy(column) {
    // Prevent sort if we just finished resizing
    if (columnResizeData.wasResizing) {
        return;
    }
    
    if (troskovnikSort.column === column) {
        troskovnikSort.direction = troskovnikSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        troskovnikSort.column = column;
        troskovnikSort.direction = 'asc';
    }
    
    const sortDirection = troskovnikSort.direction === 'asc' ? 1 : -1;
    
    troskovnik.sort((a, b) => {
        let aVal, bVal;
        
        switch(column) {
            case 'redni_broj':
                return sortDirection * (a.redni_broj - b.redni_broj);
                
            case 'naziv_artikla':
                aVal = (a.naziv_artikla || '').toString().toLowerCase();
                bVal = (b.naziv_artikla || '').toString().toLowerCase();
                return sortDirection * aVal.localeCompare(bVal, 'hr-HR');
                
            case 'mjerna_jedinica':
                aVal = (a.mjerna_jedinica || '').toString().toLowerCase();
                bVal = (b.mjerna_jedinica || '').toString().toLowerCase();
                return sortDirection * aVal.localeCompare(bVal, 'hr-HR');
                
            case 'tezina':
                aVal = parseFloat(a.tezina) || 0;
                bVal = parseFloat(b.tezina) || 0;
                return sortDirection * (aVal - bVal);
                
            case 'trazena_kolicina':
                aVal = parseFloat(a.trazena_kolicina) || 0;
                bVal = parseFloat(b.trazena_kolicina) || 0;
                return sortDirection * (aVal - bVal);
                
            case 'izlazna_cijena':
                aVal = parseFloat(a.izlazna_cijena) || 0;
                bVal = parseFloat(b.izlazna_cijena) || 0;
                return sortDirection * (aVal - bVal);
                
            case 'ruc_per_kg':
                aVal = parseFloat(a.ruc_per_kg) || 0;
                bVal = parseFloat(b.ruc_per_kg) || 0;
                return sortDirection * (aVal - bVal);
                
            case 'ruc':
                aVal = (parseFloat(a.izlazna_cijena) || 0) - (parseFloat(a.nabavna_cijena_1) || 0);
                bVal = (parseFloat(b.izlazna_cijena) || 0) - (parseFloat(b.nabavna_cijena_1) || 0);
                return sortDirection * (aVal - bVal);
                
            case 'nabavna_cijena_1':
                aVal = parseFloat(a.nabavna_cijena_1) || 0;
                bVal = parseFloat(b.nabavna_cijena_1) || 0;
                return sortDirection * (aVal - bVal);
                
            case 'dobavljac_1':
                aVal = (a.dobavljac_1 || '').toString().toLowerCase();
                bVal = (b.dobavljac_1 || '').toString().toLowerCase();
                return sortDirection * aVal.localeCompare(bVal, 'hr-HR');
                
            case 'nabavna_cijena_2':
                aVal = parseFloat(a.nabavna_cijena_2) || 0;
                bVal = parseFloat(b.nabavna_cijena_2) || 0;
                return sortDirection * (aVal - bVal);
                
            case 'dobavljac_2':
                aVal = (a.dobavljac_2 || '').toString().toLowerCase();
                bVal = (b.dobavljac_2 || '').toString().toLowerCase();
                return sortDirection * aVal.localeCompare(bVal, 'hr-HR');
                
            case 'marza':
                aVal = parseFloat(a.marza) || 0;
                bVal = parseFloat(b.marza) || 0;
                return sortDirection * (aVal - bVal);
                
            case 'udio':
                const grandTotal = TroskovnikUI.calculateGrandTotal();
                aVal = grandTotal > 0 ? (a.trazena_kolicina * a.izlazna_cijena) / grandTotal : 0;
                bVal = grandTotal > 0 ? (b.trazena_kolicina * b.izlazna_cijena) / grandTotal : 0;
                return sortDirection * (aVal - bVal);
                
            case 'found_results':
                aVal = parseInt(a.found_results) || 0;
                bVal = parseInt(b.found_results) || 0;
                return sortDirection * (aVal - bVal);
                
            case 'vrijednost':
                aVal = (parseFloat(a.trazena_kolicina) || 0) * (parseFloat(a.izlazna_cijena) || 0);
                bVal = (parseFloat(b.trazena_kolicina) || 0) * (parseFloat(b.izlazna_cijena) || 0);
                return sortDirection * (aVal - bVal);
                
            default:
                return 0;
        }
    });
    
    TroskovnikUI.render();
}

// Column resize functionality
let columnResizeData = {
    isResizing: false,
    columnIndex: null,
    startX: 0,
    startWidth: 0,
    table: null,
    wasResizing: false // Flag to prevent sort after resize
};

// Store custom column widths
let columnWidths = {};

function startColumnResize(event, columnIndex) {
    event.preventDefault();
    event.stopPropagation();
    
    columnResizeData.isResizing = true;
    columnResizeData.wasResizing = true;
    columnResizeData.columnIndex = columnIndex;
    columnResizeData.startX = event.clientX;
    columnResizeData.table = document.querySelector('#troskovnikTableContainer table');
    
    if (columnResizeData.table) {
        const th = columnResizeData.table.querySelectorAll('th')[columnIndex];
        columnResizeData.startWidth = th.offsetWidth;
        
        document.addEventListener('mousemove', handleColumnResize);
        document.addEventListener('mouseup', endColumnResize);
        
        // Add visual feedback
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        // Prevent any clicks on the header during resize
        setTimeout(() => {
            columnResizeData.wasResizing = false;
        }, 200);
    }
}

function handleColumnResize(event) {
    if (!columnResizeData.isResizing || !columnResizeData.table) return;
    
    const deltaX = event.clientX - columnResizeData.startX;
    const newWidth = Math.max(30, columnResizeData.startWidth + deltaX);
    
    // Store the new width
    columnWidths[columnResizeData.columnIndex] = newWidth;
    
    // Update all cells in this column (header and body)
    applyColumnWidth(columnResizeData.columnIndex, newWidth);
}

function applyColumnWidth(columnIndex, width) {
    const table = document.querySelector('#troskovnikTableContainer table');
    if (!table) return;
    
    const headers = table.querySelectorAll('th');
    const rows = table.querySelectorAll('tbody tr, tfoot tr');
    
    if (headers[columnIndex]) {
        headers[columnIndex].style.width = width + 'px';
        headers[columnIndex].style.minWidth = width + 'px';
        headers[columnIndex].style.maxWidth = width + 'px';
    }
    
    // Update corresponding cells in all rows
    rows.forEach(row => {
        const cells = row.children;
        if (cells[columnIndex]) {
            cells[columnIndex].style.width = width + 'px';
            cells[columnIndex].style.minWidth = width + 'px';
            cells[columnIndex].style.maxWidth = width + 'px';
        }
    });
}

function endColumnResize(event) {
    if (columnResizeData.isResizing && event) {
        // Store final width
        const deltaX = event.clientX - columnResizeData.startX;
        const finalWidth = Math.max(30, columnResizeData.startWidth + deltaX);
        columnWidths[columnResizeData.columnIndex] = finalWidth;
    }
    
    columnResizeData.isResizing = false;
    columnResizeData.columnIndex = null;
    
    document.removeEventListener('mousemove', handleColumnResize);
    document.removeEventListener('mouseup', endColumnResize);
    
    // Remove visual feedback
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
}

// Apply stored column widths after table render
function applyStoredColumnWidths() {
    Object.keys(columnWidths).forEach(columnIndex => {
        applyColumnWidth(parseInt(columnIndex), columnWidths[columnIndex]);
    });
}