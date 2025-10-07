/**
 * ENHANCED UTILITY FUNCTIONS MODULE
 * Contains helper functions for text processing, calculations, and enhanced functionality
 */

/**
 * Generates clean filenames from header data for ZIP export
 * @param {string} fileType - Type of file (Stanje, Troskovnik, Rabata)
 * @param {string} extension - File extension (json, xlsx, xml)
 * @returns {object} Object with zipName and internalName
 */
function generateTenderFilenames(fileType, extension) {
    // Get header data
    const nazivKupca = document.getElementById('nazivKupca')?.value || 'Nepoznat_Kupac';
    const grupaProizvoda = document.getElementById('grupaProizvoda')?.value || 'Grupa';
    const datumPredaje = document.getElementById('datumPredaje')?.value || new Date().toISOString().slice(0, 10);
    
    // Clean filename components
    const cleanKupac = cleanFilenameText(nazivKupca);
    const cleanGrupa = cleanFilenameText(grupaProizvoda);
    
    // Generate ZIP filename (main package name)
    const zipName = `${datumPredaje}_${cleanGrupa}_${cleanKupac}.zip`;
    
    // Generate internal filename (inside ZIP)
    const fileTypeMap = {
        'Stanje': '01_Stanje_Aplikacije',
        'Troskovnik': '02_Troskovnik', 
        'Rabata': '03_Tablica_Rabata'
    };
    
    const internalName = `${fileTypeMap[fileType] || fileType}.${extension}`;
    
    return {
        zipName: zipName,
        internalName: internalName,
        cleanKupac: cleanKupac,
        cleanGrupa: cleanGrupa,
        datumPredaje: datumPredaje
    };
}

/**
 * Cleans text for use in filenames
 * Enhanced to better handle Croatian characters while maintaining readability
 * @param {string} text - Text to clean
 * @returns {string} Filename-safe text
 */
function cleanFilenameText(text) {
    if (!text) return 'Nedefinirano';
    
    return text
        .trim()
        // Croatian character transliteration (more comprehensive)
        .replace(/[čćç]/gi, 'c')
        .replace(/[žž]/gi, 'z') 
        .replace(/[šš]/gi, 's')
        .replace(/[đđ]/gi, 'd')
        // Handle additional special characters
        .replace(/[àáâãäå]/gi, 'a')
        .replace(/[èéêë]/gi, 'e')
        .replace(/[ìíîï]/gi, 'i')
        .replace(/[òóôõö]/gi, 'o')
        .replace(/[ùúûü]/gi, 'u')
        .replace(/[ñ]/gi, 'n')
        // Remove problematic characters that cause filename issues
        .replace(/[^\w\s-]/g, '')  // Remove special characters except word chars, spaces, hyphens
        .replace(/\s+/g, ' ')      // Normalize spaces (don't convert to underscore yet)
        .replace(/\s/g, '_')       // Replace spaces with underscores
        .replace(/_+/g, '_')       // Replace multiple underscores with single
        .replace(/^_|_$/g, '')     // Remove leading/trailing underscores
        .substring(0, 35)          // Increased limit for better readability
        .toUpperCase();
}

/**
 * Creates Excel formula cell for XLSX export
 * @param {string} formula - Excel formula (without =)
 * @param {number} value - Fallback numeric value
 * @param {object} style - Optional cell styling
 * @returns {object} XLSX cell object with formula
 */
function createExcelFormulaCell(formula, value = 0, style = {}) {
    return {
        t: 'n',
        f: formula,
        v: value,
        s: style
    };
}

/**
 * Creates Excel cell with numeric value only
 * @param {number} value - Numeric value
 * @param {object} style - Optional cell styling
 * @returns {object} XLSX cell object
 */
function createExcelNumericCell(value, style = {}) {
    return {
        t: 'n',
        v: value,
        s: style
    };
}

/**
 * Fixes Croatian character encoding issues from Google Sheets
 * Converts incorrectly encoded characters back to proper Croatian characters
 * @param {string} text - Text with encoding issues
 * @returns {string} Text with corrected Croatian characters
 */
function fixCroatianEncoding(text) {
    if (!text) return '';
    return text
        // Fix Č/č encoding issues
        .replace(/È/g, 'Č')
        .replace(/è/g, 'č')
        // Fix Ć/ć encoding issues - corrected mapping
        .replace(/Ì/g, 'Ć') 
        .replace(/ì/g, 'ć')
        .replace(/Æ/g, 'Ć')  // Additional Ć mapping
        .replace(/æ/g, 'ć')  // Additional ć mapping
        // Fix Š/š encoding issues
        .replace(/Ò/g, 'Š')
        .replace(/ò/g, 'š')
        // Fix Ž/ž encoding issues
        .replace(/Ù/g, 'Ž')
        .replace(/ù/g, 'ž')
        .replace(/Ø/g, 'Ž')  // Additional Ž mapping
        .replace(/ø/g, 'ž')  // Additional ž mapping
        // Fix Đ/đ encoding issues
        .replace(/Ð/g, 'Đ')
        .replace(/ð/g, 'đ')
        // Additional Windows-1252 to UTF-8 fixes
        .replace(/Å /g, 'Š ')  // Š followed by space
        .replace(/Ÿ/g, 'Ž')   // Another Ž variant
        .replace(/ÿ/g, 'ž');   // Another ž variant
}

/**
 * Standardizes text for search comparison
 * @param {string} text - Text to standardize
 * @returns {string} Standardized text
 */
function standardizeText(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/[čćç]/g, 'c')
        .replace(/[žž]/g, 'z')
        .replace(/[šš]/g, 's')
        .replace(/[đđ]/g, 'd')
        .replace(/,/g, '.');
}

/**
 * ENHANCED: Extracts weight from product name and unit with WEIGHT DATABASE PRIORITY
 * @param {string} name - Product name
 * @param {string} unit - Product unit
 * @param {string} code - Article code/šifra
 * @param {string} source - Article source
 * @returns {number} Weight in kilograms
 */
function extractWeight(name, unit, code, source) {
    // PRIORITET 0: WEIGHT DATABASE ZA NAŠE ARTIKLE
    if (code && source && typeof getArticleWeight === 'function') {
        return getArticleWeight(code, name, unit, source);
    }
    
    // Fallback to original parsing logic
    if (!name) return 0;
    const text = name.toLowerCase().replace(/,/g, '.');
    unit = unit?.toLowerCase() || '';

    Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `Extracting weight from: "${name}" (unit: "${unit}")`);

    // Direct unit conversion
    if (unit === 'kg' || unit === 'l' || unit === 'lit') {
        Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `Direct unit conversion: 1.0kg`);
        return 1.0;
    }

    let maxWeight = 0;

    // 🥇 PRIORITET 1: NETO/OCJEDENA format - UVIJEK UZMI VEĆI BROJ (neto masa)
    const netoPattern = /(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\s*(?:g|gr|ml)\b/g;
    let netoMatch;
    while ((netoMatch = netoPattern.exec(text)) !== null) {
        const firstNum = parseFloat(netoMatch[1]);
        const secondNum = parseFloat(netoMatch[2]);
        
        // UVIJEK uzmi VEĆI broj (neto masa)
        const netoMass = Math.max(firstNum, secondNum);
        
        // Convert to kg if in grams
        const weightInKg = netoMass > 100 ? netoMass / 1000 : netoMass;
        
        Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `NETO/OCJEDENA pattern "${netoMatch[0]}": ${firstNum}/${secondNum} → neto masa: ${netoMass} → ${weightInKg}kg`);
        
        if (weightInKg > maxWeight) maxWeight = weightInKg;
    }
    if (maxWeight > 0) {
        Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `Final weight from NETO pattern: ${maxWeight}kg`);
        return maxWeight;
    }

    // 🥈 PRIORITET 2: KUT kalkulacija - masa po komadu × broj komada
    if (unit === 'kut') {
        Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `Processing KUT unit...`);
        
        // Traži masu po komadu (npr. "20g")
        const masaPoKomadMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:g|gr|ml)\b/);
        // Traži broj komada/pakiranje (npr. "120/1")
        const packagingMatch = text.match(/(\d+)\/1\b/);
        
        if (masaPoKomadMatch && packagingMatch) {
            const masaPoKomadGrams = parseFloat(masaPoKomadMatch[1]);
            const brojKomada = parseInt(packagingMatch[1]);
            
            // Ukupna masa = masa po komadu × broj komada
            const ukupnaMasaGrams = masaPoKomadGrams * brojKomada;
            const ukupnaMasaKg = ukupnaMasaGrams / 1000;
            
            Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `KUT calculation: ${masaPoKomadGrams}g × ${brojKomada} komada = ${ukupnaMasaGrams}g = ${ukupnaMasaKg}kg`);
            
            maxWeight = ukupnaMasaKg;
        } else {
            Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `KUT: Could not find masa po komadu or packaging pattern`);
        }
        
        if (maxWeight > 0) {
            Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `Final weight from KUT calculation: ${maxWeight}kg`);
            return maxWeight;
        }
    }

    // 🥉 PRIORITET 3: Standardne težine (direktno navedene) - PRIJE packaging!
    const weightPatterns = [
        { regex: /(\d+(?:\.\d+)?)\s*kg\b/g, multiplier: 1 },
        { regex: /(\d+(?:\.\d+)?)\s*l\b(?![\w])/g, multiplier: 1 },
        { regex: /(\d+(?:\.\d+)?)\s*(?:gr|g)\b(?![\w])/g, multiplier: 0.001 },
        { regex: /(\d+(?:\.\d+)?)\s*ml\b/g, multiplier: 0.001 }
    ];

    for (const pattern of weightPatterns) {
        let match;
        while ((match = pattern.regex.exec(text)) !== null) {
            const weight = parseFloat(match[1]) * pattern.multiplier;
            Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `Standard pattern "${match[0]}": ${weight}kg`);
            if (weight > maxWeight) maxWeight = weight;
        }
    }
    if (maxWeight > 0) {
        Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `Final weight from standard patterns: ${maxWeight}kg`);
        return maxWeight;
    }

    // 🏅 PRIORITET 4: Packaging format (ZADNJI prioritet - samo ako ništa drugo ne postoji)
    const packagingPattern = /(\d+(?:\.\d+)?)\/1\b/g;
    let packagingMatch;
    while ((packagingMatch = packagingPattern.exec(text)) !== null) {
        const packagingWeight = parseFloat(packagingMatch[1]);
        Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `Packaging pattern "${packagingMatch[0]}": ${packagingWeight}kg (FALLBACK)`);
        if (packagingWeight > maxWeight) maxWeight = packagingWeight;
    }

    if (maxWeight > 0) {
        Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `Final weight from packaging pattern (fallback): ${maxWeight}kg`);
    } else {
        Logger.area('WEIGHT_EXTRACTION', Logger.LEVELS.DEBUG, `No weight found in "${name}"`);
    }

    return maxWeight;
}

/**
 * Enhanced smart date parsing from various text formats
 * @param {string|number} dateInput - Date in any format
 * @returns {string} Date in YYYY-MM-DD format or empty string if parsing fails
 */
function parseSmartDate(dateInput) {
    if (!dateInput) return '';

    const dateStr = dateInput.toString().trim();
    if (!dateStr) return '';

    // Skip obvious non-date values (text headers, long numbers that are clearly codes, supplier names)
    if (dateStr.length > 20 || /^[A-Za-z\s]+$/.test(dateStr)) {
        // This is likely a header text or supplier name, not a date - fail silently
        return '';
    }

    Logger.area('FILE_PROCESSING', Logger.LEVELS.DEBUG, `Parsing date: "${dateStr}"`);

    try {
        // 1. Check if already in ISO format (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const testDate = new Date(dateStr);
            if (!isNaN(testDate.getTime()) && testDate.getFullYear() > 1950 && testDate.getFullYear() < 2050) {
                Logger.area('FILE_PROCESSING', Logger.LEVELS.DEBUG, `Already ISO format: ${dateStr}`);
                return dateStr;
            }
        }

        // 2. Check if Excel serial number
        const serialNumber = parseFloat(dateStr);
        if (!isNaN(serialNumber) && serialNumber > 25000 && serialNumber < 80000) {
            const excelDate = new Date((serialNumber - 25569) * 86400 * 1000);
            if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() > 1950 && excelDate.getFullYear() < 2050) {
                const result = excelDate.toISOString().split('T')[0];
                Logger.area('FILE_PROCESSING', Logger.LEVELS.DEBUG, `Excel serial ${serialNumber} → ${result}`);
                return result;
            }
        }

        // 3. DMY format (European) - priority
        const dmyMatch = dateStr.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})$/);
        if (dmyMatch) {
            let day = parseInt(dmyMatch[1]);
            let month = parseInt(dmyMatch[2]);
            let year = parseInt(dmyMatch[3]);

            if (year < 100) {
                year += year < 50 ? 2000 : 1900;
            }

            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year > 1950 && year < 2050) {
                const testDate = new Date(year, month - 1, day);
                if (testDate.getFullYear() === year && testDate.getMonth() === (month - 1) && testDate.getDate() === day) {
                    const result = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    Logger.area('FILE_PROCESSING', Logger.LEVELS.DEBUG, `DMY format "${dateStr}" → ${result}`);
                    return result;
                }
            }
        }

        // 4. MDY format fallback
        const mdyMatch = dateStr.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})$/);
        if (mdyMatch) {
            let month = parseInt(mdyMatch[1]);
            let day = parseInt(mdyMatch[2]);
            let year = parseInt(mdyMatch[3]);

            if (year < 100) {
                year += year < 50 ? 2000 : 1900;
            }

            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year > 1950 && year < 2050) {
                const testDate = new Date(year, month - 1, day);
                if (testDate.getFullYear() === year && testDate.getMonth() === (month - 1) && testDate.getDate() === day) {
                    const result = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    Logger.area('FILE_PROCESSING', Logger.LEVELS.DEBUG, `MDY format "${dateStr}" → ${result}`);
                    return result;
                }
            }
        }

        // 5. YMD format
        const ymdMatch = dateStr.match(/^(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})$/);
        if (ymdMatch) {
            const year = parseInt(ymdMatch[1]);
            const month = parseInt(ymdMatch[2]);
            const day = parseInt(ymdMatch[3]);

            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year > 1950 && year < 2050) {
                const testDate = new Date(year, month - 1, day);
                if (testDate.getFullYear() === year && testDate.getMonth() === (month - 1) && testDate.getDate() === day) {
                    const result = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    Logger.area('FILE_PROCESSING', Logger.LEVELS.DEBUG, `YMD format "${dateStr}" → ${result}`);
                    return result;
                }
            }
        }

        // 6. JavaScript Date parser as last option
        const jsDate = new Date(dateStr);
        if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() > 1950 && jsDate.getFullYear() < 2050) {
            const result = jsDate.toISOString().split('T')[0];
            Logger.area('FILE_PROCESSING', Logger.LEVELS.DEBUG, `JavaScript parser "${dateStr}" → ${result}`);
            return result;
        }

        // Only log at DEBUG level, not ERROR - many non-date values are expected
        Logger.area('FILE_PROCESSING', Logger.LEVELS.DEBUG, `Could not parse date: "${dateStr}"`);
        return '';

    } catch (error) {
        Logger.area('FILE_PROCESSING', Logger.LEVELS.DEBUG, `Date parsing error for "${dateStr}":`, error);
        return '';
    }
}

/**
 * Gets source color based on source name - ENHANCED FOR OUR ARTICLES
 * @param {string} source - Source name
 * @returns {string} CSS color value
 */
function getSourceColor(source) {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('lager')) return '#d1fae5';
    if (lowerSource.includes('urpd')) return '#e9d5ff';
    return '#dbeafe';
}

/**
 * Gets badge CSS class based on source name - ENHANCED FOR OUR ARTICLES
 * @param {string} source - Source name
 * @returns {string} CSS class name
 */
function getBadgeClass(source) {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('lager')) return 'badge-green';
    if (lowerSource.includes('urpd')) return 'badge-green'; // FIXED: URPD is also "our article" - green badge
    return 'badge-blue';
}

/**
 * ENHANCED: Parses source information to extract meaningful source name for display
 * Prioritizes sheet name over filename for Excel files
 * @param {string} source - Full source string (e.g., "Cjenik_Mikado - Sheet1", "Lager lista")
 * @returns {string} User-friendly source name (e.g., "SHEET1", "LAGER", "URPD")
 */
function parseSourceName(source) {
    if (!source) return 'NEPOZNAT';
    
    // First, check if this is Excel format with sheet name (filename - sheetname)
    const parts = source.split(' - ');
    if (parts.length === 2) {
        // This is an Excel file with sheet name
        const filename = parts[0].toLowerCase();
        const sheetName = parts[1].trim();
        
        // For LAGER/URPD, show the type regardless of sheet name
        if (filename.includes('lager')) {
            return sheetName.toUpperCase(); // Show sheet name for LAGER
        }
        if (filename.includes('urpd')) {
            return sheetName.toUpperCase(); // Show sheet name for URPD
        }
        
        // For other Excel files, show sheet name
        return sheetName.toUpperCase();
    }
    
    // For single part sources (CSV files or simple names)
    const lowerSource = source.toLowerCase();
    
    // Handle LAGER sources
    if (lowerSource.includes('lager')) {
        return 'LAGER';
    }
    
    // Handle URPD sources
    if (lowerSource.includes('urpd')) {
        return 'URPD';
    }
    
    // For other sources, clean up the name
    let cleanSource = source
        .replace(/\.(xlsx?|csv)$/i, '') // Remove file extensions
        .replace(/[_\s]+/g, ' ') // Replace underscores and multiple spaces with single space
        .trim()
        .toUpperCase();
    
    // Limit length for display
    if (cleanSource.length > 15) {
        cleanSource = cleanSource.substring(0, 15) + '...';
    }
    
    return cleanSource || 'VANJSKI';
}

/**
 * ENHANCED: Checks if article is "our article" (LAGER or URPD source)
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

/**
 * ENHANCED: Validates price input for our articles
 * @param {number} price - Price to validate
 * @returns {string} 'valid', 'invalid', or 'empty'
 */
function validatePrice(price) {
    if (!price || price === 0) return 'empty';
    if (price < 0.50 || price > 50.00) return 'invalid'; // Validation range
    return 'valid';
}

/**
 * ENHANCED: Formats price for display with proper currency
 * @param {number} price - Price to format
 * @param {string} currency - Currency symbol (default: €)
 * @returns {string} Formatted price
 */
function formatPrice(price, currency = '€') {
    if (!price || price === 0) return `${currency}0.00`;
    return `${currency}${price.toFixed(2)}`;
}

/**
 * ENHANCED: Calculates price per kg from piece price and weight
 * @param {number} pricePerPiece - Price per piece
 * @param {number} weight - Weight in kg
 * @returns {number} Price per kg
 */
function calculatePricePerKg(pricePerPiece, weight) {
    if (!pricePerPiece || !weight || weight === 0) return 0;
    return Math.round((pricePerPiece / weight) * 100) / 100;
}

/**
 * ENHANCED: Calculates piece price from price per kg and weight
 * @param {number} pricePerKg - Price per kg
 * @param {number} weight - Weight in kg
 * @returns {number} Price per piece
 */
function calculatePricePerPiece(pricePerKg, weight) {
    if (!pricePerKg || !weight) return 0;
    return Math.round((pricePerKg * weight) * 100) / 100;
}

/**
 * Shows a message to the user
 * @param {string} type - Message type: 'success', 'error', or 'info'
 * @param {string} message - Message text
 * @param {string} containerId - Container element ID (default: 'uploadStatus')
 */
function showMessage(type, message, containerId = 'uploadStatus') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const className = type === 'success' ? 'success-msg' : 
                     type === 'error' ? 'error-msg' : 'info-msg';
    container.innerHTML = `<div class="${className}">${message}</div>`;
    
    if (type !== 'info') {
        setTimeout(() => container.innerHTML = '', 5000);
    }
}

/**
 * Shows a message in the troškovnik section
 * @param {string} type - Message type
 * @param {string} message - Message text
 */
function showTroskovnikMessage(type, message) {
    showMessage(type, message, 'troskovnikStatus');
}

/**
 * Generates CSV content from data array
 * @param {Array} headers - CSV headers
 * @param {Array} data - Data rows
 * @returns {string} CSV content
 */
function generateCSV(headers, data) {
    const csvData = [headers, ...data];
    return csvData
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
}

/**
 * Downloads a blob as a file
 * @param {Blob} blob - File content as blob
 * @param {string} filename - Download filename
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Extracts article code present inside brackets anywhere in the name.
 * Supports (), [] and {}. Returns the last bracketed token if multiple exist.
 * @param {string} articleName - Full article name
 * @returns {string} Extracted code or empty string
 */
function extractCodeFromBrackets(articleName) {
    if (!articleName) return '';
    const text = String(articleName);
    const pattern = /[\(\[\{]([A-Za-z0-9]+)[\)\]\}]/g;
    let match;
    let lastToken = '';
    while ((match = pattern.exec(text)) !== null) {
        lastToken = match[1];
    }
    return lastToken;
}

/**
 * Creates and downloads a CSV file
 * @param {Array} headers - CSV headers
 * @param {Array} data - CSV data rows
 * @param {string} filename - Download filename
 */
function exportToCSV(headers, data, filename) {
    const csvContent = generateCSV(headers, data);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadBlob(blob, filename);
}

/**
 * ENHANCED: Refreshes troškovnik colors based on current results
 * This function updates troškovnik item colors based on whether they have results
 */
function refreshTroskovnikColors() {
    if (!troskovnik || troskovnik.length === 0) return;
    
    Logger.info('Refreshing troškovnik colors...');
    
    // Reset all found_results counters
    troskovnik.forEach(item => {
        item.found_results = 0;
    });
    
    // Count results for each troškovnik item
    if (results && results.length > 0) {
        results.forEach(result => {
            const troskovnikItem = troskovnik.find(t => t.redni_broj == result.rb);
            if (troskovnikItem) {
                troskovnikItem.found_results++;
            }
        });
    }
    
    // Update troškovnik display if function exists
    if (typeof updateTroskovnikDisplay === 'function') {
        updateTroskovnikDisplay();
    }
    
    Logger.info('Troškovnik colors refreshed');
}

/**
 * ENHANCED: Debounce function for input handling
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * ENHANCED: Throttle function for performance
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * PDV Selection Dialog for non-"NAŠ" articles
 * Prompts user to select between 25% (default) and 5% PDV rate
 * @param {string} articleName - Name of the article being added
 * @returns {Promise<number>} Selected PDV rate (25 or 5)
 */
function selectPDVRate(articleName) {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
        `;

        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            text-align: center;
        `;

        dialog.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #374151; font-size: 18px;">
                🏷️ Odabir PDV stope
            </h3>
            <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px; line-height: 1.4;">
                <strong>Artikel:</strong> ${articleName}<br>
                <em>Ovaj artikel nije iz našeg šifarnika. Molimo odaberite PDV stopu:</em>
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="pdv25Btn" style="
                    background: #059669;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 14px;
                    min-width: 120px;
                " onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">
                    ✅ 25% PDV (default)
                </button>
                <button id="pdv5Btn" style="
                    background: #7c3aed;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 14px;
                    min-width: 120px;
                " onmouseover="this.style.background='#6d28d9'" onmouseout="this.style.background='#7c3aed'">
                    🍎 5% PDV
                </button>
            </div>
            <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                ESC za zatvaranje (default: 25%)
            </p>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Handle button clicks
        const pdv25Btn = dialog.querySelector('#pdv25Btn');
        const pdv5Btn = dialog.querySelector('#pdv5Btn');

        function closeDialog(pdvRate) {
            document.body.removeChild(overlay);
            resolve(pdvRate);
        }

        pdv25Btn.addEventListener('click', () => closeDialog(25));
        pdv5Btn.addEventListener('click', () => closeDialog(5));

        // Handle ESC key (default to 25%)
        function handleKeydown(event) {
            if (event.key === 'Escape') {
                document.removeEventListener('keydown', handleKeydown);
                closeDialog(25);
            }
        }

        document.addEventListener('keydown', handleKeydown);

        // Auto-focus the default button
        pdv25Btn.focus();

        // Click outside to close (default to 25%)
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeDialog(25);
            }
        });
    });
}

// Expose functions globally
window.fixCroatianEncoding = fixCroatianEncoding;
window.standardizeText = standardizeText;
window.extractWeight = extractWeight;
window.parseSmartDate = parseSmartDate;
window.getSourceColor = getSourceColor;
window.getBadgeClass = getBadgeClass;
window.parseSourceName = parseSourceName;
window.isOurArticle = isOurArticle;
window.validatePrice = validatePrice;
window.formatPrice = formatPrice;
window.calculatePricePerKg = calculatePricePerKg;
window.calculatePricePerPiece = calculatePricePerPiece;
window.showMessage = showMessage;
window.showTroskovnikMessage = showTroskovnikMessage;
window.generateCSV = generateCSV;
window.downloadBlob = downloadBlob;
window.exportToCSV = exportToCSV;
window.refreshTroskovnikColors = refreshTroskovnikColors;
window.debounce = debounce;
window.throttle = throttle;
window.extractCodeFromBrackets = extractCodeFromBrackets;
window.selectPDVRate = selectPDVRate;

Logger.info('Enhanced utils module loaded with weight database integration');
Logger.debug('Priority 0: Weight Database (za naše artikle)');
Logger.debug('Priority 1: NETO/OCJEDENA (veći broj)');
Logger.debug('Priority 2: KUT calculation (masa × broj)');
Logger.debug('Priority 3: Standard weights');
Logger.debug('Priority 4: Packaging (fallback only)');
Logger.debug('Enhanced: Price validation, calculation helpers, our article detection');