/**
 * FIXED: Process CSV files from Google Sheets export - PROPER CSV PARSER
 */
function processCSVFile(file) {
    // console.log('📄 Processing CSV file:', file.name);
    showMessage('info', '📄 Obrađujem CSV datoteku...');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            // console.log('🔍 First 200 chars of CSV:', csvText.substring(0, 200));
            
            const lines = csvText.split('\n').filter(line => line.trim());
            // console.log('📊 CSV has', lines.length, 'lines');
            
            // Debug first line to see separator
            if (lines.length > 1) {
                // console.log('🔍 Sample line:', lines[1]);
                // console.log('🔍 Line length:', lines[1].length);
            }
            
            const allArticles = [];
            let processedCount = 0;
            let skippedCount = 0;
            
            // Skip header row, process data rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // PROPER CSV PARSING - handle quotes correctly
                const columns = parseCSVLineProperly(line);
                
                // Debug first few rows
                if (i <= 5) {
                    // console.log(`🔍 Row ${i} parsed into ${columns.length} columns:`);
                    // console.log(`   [0] šifra: "${columns[0] || ''}"`);
                    // console.log(`   [5] naziv: "${columns[5] || ''}"`);
                    // console.log(`   [7] jm: "${columns[7] || ''}"`);
                    // console.log(`   [18] dobavljač: "${columns[18] || ''}"`);
                }
                
                // Extract data based on your CSV structure
                const code = (columns[0] || '').toString().trim();
                const name = (columns[5] || '').toString().trim();
                const unit = (columns[7] || '').toString().trim() || 'kom';
                const supplier = (columns[18] || '').toString().trim() || 'Unknown';
                
                // Clean up name (remove leading dots and spaces)
                const cleanName = name.replace(/^[\.\s]+/, '').trim();
                
                // Skip if no code or name
                if (!code || !cleanName || cleanName.length < 3) {
                    // console.log(`   ❌ Skipping row ${i}: code="${code}" name="${cleanName}"`);
                    skippedCount++;
                    continue;
                }
                
                // Set price to 0 for now
                const price = 0;
                const date = new Date().toISOString().split('T')[0];
                
                // Extract weight
                const weight = extractWeight(cleanName, unit, code, file.name);
                const pricePerKg = 0;
                
                const article = {
                    id: 0,
                    source: file.name.replace('.csv', ''),
                    code: code,
                    name: cleanName,
                    unit: unit,
                    price: price,
                    supplier: supplier,
                    date: date,
                    comment: 'CSV import',
                    weight: weight,
                    pricePerKg: pricePerKg,
                    row: i
                };
                
                allArticles.push(article);
                processedCount++;
                
                if (processedCount <= 5) {
                    // console.log(`✅ Added article ${processedCount}: ${code} - ${cleanName}`);
                }
            }
            
            if (allArticles.length === 0) {
                showMessage('error', '❌ Nema važećih artikala u CSV datoteci!\n\nProvjerite format CSV datoteke.');
                return;
            }
            
            // Add to global articles
            const oldCount = articles.length;
            addArticles(allArticles);
            const newCount = articles.length;
            
            updateArticleStats();
            
            showMessage('success', 
                `✅ CSV uspješno učitan!\n\n` +
                `📁 ${file.name}\n` +
                `📊 Obrađeno redova: ${processedCount}\n` +
                `❌ Preskočeno: ${skippedCount}\n` +
                `📦 Ukupno artikala: ${newCount}\n\n` +
                `💡 Napomena: Cijene su postavljene na 0\n` +
                `Možete ih ažurirati kroz pretragu ili troškovnik.\n\n` +
                `🔍 Možete sada pretražiti učitane artikle!`
            );
            
        } catch (error) {
            console.error('❌ CSV ERROR:', error);
            showMessage('error', '❌ CSV greška: ' + error.message + '\n\nProvjerite format CSV datoteke.');
        }
    };
    
    reader.readAsText(file, 'utf-8');
}

/**
 * PROPER CSV LINE PARSER - handles quotes and commas correctly
 */
function parseCSVLineProperly(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        const nextChar = i + 1 < line.length ? line[i + 1] : '';
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote - add one quote and skip next
                current += '"';
                i += 2;
                continue;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
                continue;
            }
        }
        
        if (char === ',' && !inQuotes) {
            // End of field
            result.push(current.trim());
            current = '';
            i++;
            continue;
        }
        
        // Regular character
        current += char;
        i++;
    }
    
    // Add last field
    result.push(current.trim());
    
    return result;
}

/**
 * ENHANCED - Processes uploaded file WITH CSV FIX FOR GOOGLE SHEETS EXPORT
 */
function processFile(file) {
    // console.log('🔄 PROCESSING STARTED:', file.name);
    
    // Show immediate feedback
    showMessage('info', '🔄 Čitam ' + file.name + '...');
    
    // Check for JSON state files
    if (file.name.toLowerCase().endsWith('.json')) {
        if (typeof loadAppState === 'function') {
            loadAppState(file);
        } else {
            showMessage('error', '❌ State management not loaded!');
        }
        return;
    }
    
    // HANDLE CSV FILES SPECIFICALLY (Google Sheets export fix)
    if (file.name.toLowerCase().endsWith('.csv')) {
        processCSVFile(file);
        return;
    }
    
    // FORCE DIRECT EXCEL PROCESSING - NO DEPENDENCIES
    if (typeof XLSX === 'undefined') {
        showMessage('error', '❌ XLSX library not loaded! Refresh page.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // console.log('📊 FileReader loaded, processing...');
            showMessage('info', '📊 Obrađujem Excel podatke...');
            
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // console.log('📋 Available sheets:', workbook.SheetNames);
            showMessage('info', '📋 Pronašao ' + workbook.SheetNames.length + ' sheetova...');
            
            const allArticles = [];
            let totalProcessedRows = 0;
            
            // PROCESS ALL SHEETS
            workbook.SheetNames.forEach((sheetName, sheetIndex) => {
                // console.log('📄 Processing sheet ' + (sheetIndex + 1) + '/' + workbook.SheetNames.length + ': ' + sheetName);
                
                const worksheet = workbook.Sheets[sheetName];
                
                // Get all data as array
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: '',
                    blankrows: false
                });
                
                // console.log('📊 Sheet "' + sheetName + '" has ' + jsonData.length + ' rows');
                
                if (jsonData.length < 2) {
                    // console.log('⏭️ Skipping sheet "' + sheetName + '" - not enough data');
                    return;
                }
                
                // Process each row (skip header)
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length < 2) continue;
                    
                    // FORCE EXTRACT DATA FROM YOUR STRUCTURE:
                    // 0: redni broj, 1: product/naziv, 2: j.m, 3: cijena, 4: dobavljač, 5: datum
                    const code = row[0] ? row[0].toString() : sheetName + '_ROW' + i;
                    const name = row[1] ? row[1].toString().trim() : '';
                    const unit = row[2] ? row[2].toString() : 'kom';
                    const priceStr = row[3] ? row[3].toString() : '0';
                    const supplier = row[4] ? row[4].toString() : 'Unknown';
                    const dateStr = row[5] ? row[5].toString() : '';
                    
                    if (!name || name === '') continue;
                    
                    // Parse price - univerzalno za sve HR/EU/EN formate
                    let priceNum = priceStr;
                    let parsedPrice = 0;
                    if (typeof priceNum === 'number') {
                        parsedPrice = priceNum;
                    } else if (typeof priceNum === 'string') {
                        priceNum = priceNum.replace(/\s/g, ''); // makni razmake
                        priceNum = priceNum.replace(/,/g, '.'); // zamijeni sve zareze s točkom
                        priceNum = priceNum.replace(/[^\d.\-]/g, ''); // makni sve osim brojeva, točke i minusa
                        parsedPrice = parseFloat(priceNum) || 0;
                    }
                    const price = Math.round(parsedPrice * 100) / 100; // Force exactly 2 decimals
                    if (price <= 0) continue;
                    
                    // Parse quantity (stupac D, index 3) - HR/EU/EN decimale
                    let quantityStr = row[3] ? row[3].toString() : '0';
                    let parsedQuantity = 0;
                    if (typeof quantityStr === 'number') {
                        parsedQuantity = quantityStr;
                    } else if (typeof quantityStr === 'string') {
                        quantityStr = quantityStr.replace(/\s/g, '');
                        quantityStr = quantityStr.replace(/,/g, '.');
                        quantityStr = quantityStr.replace(/[^\d.\-]/g, '');
                        parsedQuantity = parseFloat(quantityStr) || 0;
                    }
                    
                    // Create temporary article source for weight lookup
                    const tempSource = file.name.replace(/\.(xlsx|xls)$/i, '') + ' - ' + sheetName;
                    
                    // ENHANCED: Extract weight with database priority
                    const weight = extractWeight(name, unit, code, tempSource);
                    
                    // NOVO: Koristi parseSmartDate funkciju za datum
                    const date = parseSmartDate(dateStr) || new Date().toISOString().split('T')[0];
                    
                    // console.log(`📅 Row ${i}: "${dateStr}" → "${date}"`);
                    
                    // Calculate price per kg - FORCE 2 DECIMALS
                    const pricePerKg = weight > 0 ? Math.round((price / weight) * 100) / 100 : 0;
                    
                    const article = {
                        id: 0, // Will be set by addArticles
                        source: tempSource,
                        code: code,
                        name: name,
                        unit: unit,
                        price: price,        // Already rounded to 2 decimals
                        supplier: supplier,
                        date: date,
                        comment: 'Sheet: ' + sheetName,
                        weight: weight,
                        pricePerKg: pricePerKg,  // Already rounded to 2 decimals
                        row: i,
                        quantity: parsedQuantity // Dodano: količina s decimalama
                    };
                    
                    allArticles.push(article);
                    totalProcessedRows++;
                }
                
                // console.log('✅ Sheet "' + sheetName + '" processed: ' + (allArticles.length - (totalProcessedRows - (jsonData.length - 1))) + ' articles added');
            });
            
            // console.log('✅ ALL SHEETS PROCESSED:', allArticles.length, 'total articles');
            // console.log('📝 SAMPLE ARTICLES:', allArticles.slice(0, 3));
            
            if (allArticles.length === 0) {
                showMessage('error', '❌ Nema valjanih podataka ni u jednom sheetu!');
                return;
            }
            
            // ADD TO GLOBAL ARTICLES ARRAY
            const oldCount = articles.length;
            addArticles(allArticles);
            const newCount = articles.length;
            
            // console.log('📊 BEFORE:', oldCount, 'AFTER:', newCount);
            
            // UPDATE DISPLAY
            updateArticleStats();
            
            // GROUP BY SHEET FOR SUMMARY
            const sheetSummary = {};
            allArticles.forEach(article => {
                const sheetName = article.source.split(' - ')[1] || 'Unknown';
                sheetSummary[sheetName] = (sheetSummary[sheetName] || 0) + 1;
            });
            
            let summaryText = '';
            Object.entries(sheetSummary).forEach(([sheet, count]) => {
                summaryText += '📄 ' + sheet + ': ' + count + ' artikala\n';
            });
            
            // Count successful date conversions
            const successfulDates = allArticles.filter(article => 
                article.date && article.date !== new Date().toISOString().split('T')[0]
            ).length;
            
            // Enhanced article identification function
            function isTrulyOurArticle(source, code) {
                if (!source || !code) return false;
                
                // First check: source must be LAGER or URPD
                const lowerSource = source.toLowerCase();
                const hasCorrectSource = lowerSource.includes('lager') || lowerSource.includes('urpd');
                
                if (!hasCorrectSource) {
                    return false;
                }
                
                // Second check: code must exist in weight database
                const existsInWeightDb = typeof window.weightDatabase !== 'undefined' && 
                                        window.weightDatabase.has(code);
                
                return existsInWeightDb;
            }

            // Count weight database usage
            const weightDbUsage = allArticles.filter(article => {
                const isOur = isTrulyOurArticle(article.source, article.code);
                return isOur && weightDatabase && weightDatabase.has(article.code);
            }).length;
            
            // SHOW SUCCESS WITH ENHANCED INFO
            showMessage('success', 
                '✅ USPJEH! Učitano ' + allArticles.length + ' artikala iz ' + workbook.SheetNames.length + ' sheetova!\n\n' +
                summaryText +
                '📊 Ukupno u bazi: ' + newCount + '\n' +
                '📅 Uspješno parsirani datumi: ' + successfulDates + '/' + allArticles.length + '\n' +
                '⚖️ Težine iz baze: ' + weightDbUsage + ' artikala\n' +
                '💰 Sve cijene forsirane na 2 decimale\n' +
                '🔍 Sada možete pretraživati!\n\n' +
                '💡 Tip: Koristite "💾 Save As" da spremite trenutno stanje s učitanim podacima!'
            );
            
        } catch (error) {
            console.error('❌ PROCESSING ERROR:', error);
            showMessage('error', '❌ GREŠKA: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        showMessage('error', '❌ Greška pri čitanju datoteke!');
    };
    
    reader.readAsArrayBuffer(file);
}

/**
 * UI MODULE - UPDATED WITH WEIGHT UPLOAD AND AUTOMATIC DATE PARSING + CSV FIX
 * Handles user interface interactions and tab management
 */

/**
 * Shows a specific tab and updates active state
 */
function showTab(tabName, event) {
    if (typeof hideAutocomplete === 'function') {
        hideAutocomplete();
    }
    
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Find and activate the correct tab when called programmatically
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            if (tab.textContent.toLowerCase().includes(tabName.toLowerCase())) {
                tab.classList.add('active');
            }
        });
    }
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }
    
    // Update AppState if available
    if (typeof AppState !== 'undefined') {
        AppState.setCurrentTab(tabName);
    }
}

/**
 * Handles drag over events for upload areas
 */
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

/**
 * Handles drag leave events for upload areas
 */
function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
}

/**
 * Handles file drop events for main upload area
 */
function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    
    // Check if it's a JSON state file first
    const jsonFiles = files.filter(file => file.name.toLowerCase().endsWith('.json'));
    if (jsonFiles.length > 0) {
        // Handle as state file
        if (typeof handleStateFileDrop === 'function') {
            handleStateFileDrop(event);
        }
        return;
    }
    
    // Handle as regular data file
    if (files.length > 0) {
        processFile(files[0]);
    }
}

/**
 * Handles file upload via input field
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

/**
 * WEIGHT UPLOAD HANDLERS
 */

/**
 * Handles weight file upload
 */
function handleWeightUpload(event) {
    const file = event.target.files[0];
    if (file) {
        processWeightFile(file);
        updateWeightDatabaseDisplay();
    }
    event.target.value = '';
}

/**
 * Handles weight file drop
 */
function handleWeightDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    const csvFiles = files.filter(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (csvFiles.length > 0) {
        processWeightFile(csvFiles[0]);
        updateWeightDatabaseDisplay();
    } else {
        showMessage('error', '❌ Molimo povucite CSV datoteku s težinama!', 'weightStatus');
    }
}

/**
 * Updates weight database display
 */
function updateWeightDatabaseDisplay() {
    const stats = getWeightDatabaseStats();
    const infoDiv = document.getElementById('weightDatabaseInfo');
    const countSpan = document.getElementById('weightCount');
    const avgSpan = document.getElementById('avgWeight');
    
    if (stats.totalWeights > 0) {
        if (infoDiv) infoDiv.classList.remove('hidden');
        if (countSpan) countSpan.textContent = stats.totalWeights;
        if (avgSpan) avgSpan.textContent = stats.avgWeight.toFixed(3);
    } else {
        if (infoDiv) infoDiv.classList.add('hidden');
    }
}

/**
 * Initialize UI event listeners - ENHANCED WITH STATE MANAGEMENT AND WEIGHT UPLOAD
 */
function initializeUIEventListeners() {
    // console.log('🔧 Initializing UI event listeners...');
    
    // Enhanced keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Ctrl+S / Cmd+S for quick save (prevent browser save)
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            if (typeof quickSaveState === 'function') {
                quickSaveState();
            }
        }
        
        // Ctrl+Shift+S / Cmd+Shift+S for Save As
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
            event.preventDefault();
            if (typeof saveAppState === 'function') {
                saveAppState();
            }
        }
        
        // Ctrl+O / Cmd+O for load state
        if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
            event.preventDefault();
            const fileInput = document.getElementById('stateFileInput');
            if (fileInput) {
                fileInput.click();
            }
        }
        
        // Ctrl+W for weight upload
        if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
            event.preventDefault();
            const weightInput = document.getElementById('weightFileInput');
            if (weightInput) {
                weightInput.click();
            }
        }
    });
    
    // Initialize weight database display on page load
    setTimeout(() => {
        updateWeightDatabaseDisplay();
    }, 1000);
    
    // console.log('✅ UI event listeners initialized with weight upload and state management');
    // console.log('⌨️ Keyboard shortcuts: Ctrl+S (Quick Save), Ctrl+Shift+S (Save As), Ctrl+O (Load), Ctrl+W (Weight Upload)');
    // console.log('📅 Automatic date parsing enabled for DMY format');
    // console.log('💰 All prices automatically forced to 2 decimals');
    // console.log('⚖️ Weight database integration active');
    // console.log('📄 CSV Google Sheets export fix applied');
}

// Export functions globally
window.showTab = showTab;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.handleFileUpload = handleFileUpload;
window.processFile = processFile;
window.processCSVFile = processCSVFile;
window.parseCSVLineProperly = parseCSVLineProperly;
window.initializeUIEventListeners = initializeUIEventListeners;
window.handleWeightUpload = handleWeightUpload;
window.handleWeightDrop = handleWeightDrop;
window.updateWeightDatabaseDisplay = updateWeightDatabaseDisplay;

// console.log('✅ UI module updated with PROPER CSV parser that handles quotes correctly');