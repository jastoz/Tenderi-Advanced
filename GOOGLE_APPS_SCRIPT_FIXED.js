/**
 * GOOGLE APPS SCRIPT - UPDATED FOR NEW WEIGHT MANAGER
 * ✔ Dodano CORS headers za frontend pristup
 * ✔ Podržava akcije: test, getArticles, updateWeight, updateWeights
 * ✔ Ispravljeno parsiranje decimala u stupcu V (težina: zarez → točka)  
 * ✔ Ostatak (E / M / AO) ostaje kako je dogovoreno
 */

const CONFIG = {
  SPREADSHEET_ID: '1P72_--mz29K5SnSK5eFZIm53rmSVch94zrh1rbIA6QU', // 🆕 NEW: Tenderi app Google Sheet
  SHEET_NAME: 'artiklitezine',
  KUPCI_SHEET_NAME: 'kupci', // 🆕 NEW: Customer sheet name

  COLUMNS: {
    SIFRA: 'A',
    PODGRUPA: 'E',            // obj.podgrupa
    NAZIV: 'F',
    MJ: 'H',
    TARIFNI_BROJ: 'M',        // obj.tarifniBroj
    DOBAVLJAC: 'S',
    SIFRA_DOBAVLJACA: 'R',    // obj.sifra_dobavljaca
    TEZINA: 'V',
    GRUPA: 'AO'
  },

  // 🆕 NEW: Customer sheet columns
  KUPCI_COLUMNS: {
    SIFRA_KUPCA: 'A',        // Customer code
    NAZIV_KUPCA: 'B'         // Customer name
  },

  FIRST_DATA_ROW: 2
};

/* -------------------------------------------------------------------------- */
/*  CORS HEADERS - FIXED FOR FRONTEND ACCESS                                  */
/* -------------------------------------------------------------------------- */
function setCORSHeaders(response) {
  // Google Apps Script doesn't support custom headers in the same way
  // We'll handle CORS in each function individually
  return response;
}

/* -------------------------------------------------------------------------- */
/*  GET                                                                      */
/* -------------------------------------------------------------------------- */
function doGet(e) {
  try {
    const action = e.parameter.action || 'test';

    let result;
    switch (action) {
      case 'test':
        result = {
          status: 'ok',
          message: 'Google Apps Script radi s ispravnim stupcima (E, M, AO) i proširenjem na R & V + kupci sheet!',
          version: '2.2',
          features: ['getArticles', 'getKupci', 'getGroupCriteria', 'updateWeight', 'updateWeights', 'updatePodgrupa', 'updateTarifniBroj', 'updateGrupa'],
          cors: 'enabled'
        };
        break;

      case 'getArticles':
        const sheetName = e.parameter.sheet || CONFIG.SHEET_NAME;
        const articles = getArticles(sheetName);
        result = { 
          success: true,
          articles: articles 
        };
        break;

      case 'getKupci':
        const kupci = getKupci();
        result = { 
          success: true,
          kupci: kupci 
        };
        break;

      case 'getGroupCriteria':
        const criteria = getGroupCriteria(e.parameter);
        result = { criteria };
        break;

      default:
        result = { error: 'Nepoznata akcija: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
        
  } catch (error) {
    console.error('doGet error:', error);
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* -------------------------------------------------------------------------- */
/*  POST                                                                     */
/* -------------------------------------------------------------------------- */
function doPost(e) {
  try {
    const action = e.parameter.action;
    const sheetName = e.parameter.sheet || CONFIG.SHEET_NAME;

    let result;
    switch (action) {
      case 'updateWeight': // Individual weight update
        // Improved decimal number handling
        let tezinaValue = e.parameter.tezina || '0';
        
        // Ensure it's a string and normalize decimal separator
        tezinaValue = String(tezinaValue).trim();
        
        // Replace comma with dot for decimal separator
        tezinaValue = tezinaValue.replace(',', '.');
        
        // Parse as float and ensure it's a valid number
        const parsedTezina = parseFloat(tezinaValue);
        
        if (isNaN(parsedTezina)) {
          result = { 
            success: false, 
            error: `Neispravna težina: "${e.parameter.tezina}" → "${tezinaValue}" → ${parsedTezina}` 
          };
        } else {
          // console.log(`🔄 Updating weight: "${e.parameter.tezina}" → "${tezinaValue}" → ${parsedTezina}`);
          
          result = updateColumnInSheet(
            sheetName,
            e.parameter.sifra,
            CONFIG.COLUMNS.TEZINA,
            parsedTezina
          );
          
          // Set format for the weight column to ensure proper decimal display
          if (result.success) {
            setColumnFormat(sheetName, CONFIG.COLUMNS.TEZINA, '0.000');
          }
        }
        break;

      case 'updateWeights': // Bulk weight update
        result = updateBulkWeights(sheetName, e.parameter);
        break;

      case 'updatePodgrupa': // E
        result = updateColumnInSheet(
          sheetName,
          e.parameter.sifra,
          CONFIG.COLUMNS.PODGRUPA,
          e.parameter.podgrupa
        );
        break;

      case 'updateTarifniBroj': // M
        result = updateColumnInSheet(
          sheetName,
          e.parameter.sifra,
          CONFIG.COLUMNS.TARIFNI_BROJ,
          e.parameter.tarifniBroj
        );
        break;

      case 'updateGrupa': // AO
        result = updateColumnInSheet(
          sheetName,
          e.parameter.sifra,
          CONFIG.COLUMNS.GRUPA,
          e.parameter.grupa
        );
        break;

      case 'saveGroupCriteria':
        result = saveGroupCriteria(e.parameter);
        break;

      case 'deleteGroupCriteria':
        result = deleteGroupCriteria(e.parameter);
        break;

      case 'setWeightColumnFormat':
        // Set format for the entire weight column
        const formatResult = setColumnFormat(sheetName, CONFIG.COLUMNS.TEZINA, '0.000');
        result = {
          success: formatResult,
          message: formatResult ? 'Weight column format set to 0.000' : 'Failed to set weight column format'
        };
        break;

      default:
        result = { error: 'Nepoznata POST akcija: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
        
  } catch (error) {
    console.error('doPost error:', error);
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* -------------------------------------------------------------------------- */
/*  OPTIONS - FOR CORS PREFLIGHT REQUESTS                                     */
/* -------------------------------------------------------------------------- */
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/* -------------------------------------------------------------------------- */
/*  READ ARTICLES                                                            */
/* -------------------------------------------------------------------------- */
function getArticles(sheetName = CONFIG.SHEET_NAME) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet "' + sheetName + '" ne postoji');

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < CONFIG.FIRST_DATA_ROW) return [];

    const values = sheet
      .getRange(CONFIG.FIRST_DATA_ROW, 1, lastRow - CONFIG.FIRST_DATA_ROW + 1, lastCol)
      .getValues();

    const articles = [];

    values.forEach((row, idx) => {
      const actualRow = idx + CONFIG.FIRST_DATA_ROW;
      const sifra = getCellValue(row, CONFIG.COLUMNS.SIFRA);
      const naziv = getCellValue(row, CONFIG.COLUMNS.NAZIV);

      if (!sifra || !naziv) return; // preskoči prazne

      /* ---------- NOVO: šifra dobavljača (R) ---------- */
      const sifraDobavljaca = getCellValue(row, CONFIG.COLUMNS.SIFRA_DOBAVLJACA) || '';

      /* ---------- Ispravno parsiranje težine (V) ------- */
      const tezinaRaw = getCellValue(row, CONFIG.COLUMNS.TEZINA);
      let tezina = 0;
      if (tezinaRaw) {
        const normalized = String(tezinaRaw).trim().replace(',', '.');
        tezina = parseFloat(normalized) || 0;
      }

      /* ---------- Kreiraj objekt artikla --------------- */
      const article = {
        id: actualRow,
        sifra,
        podgrupa: getCellValue(row, CONFIG.COLUMNS.PODGRUPA),
        naziv,
        mjernaJedinica: getCellValue(row, CONFIG.COLUMNS.MJ) || 'KOM',
        tarifniBroj: getCellValue(row, CONFIG.COLUMNS.TARIFNI_BROJ),
        dobavljac: getCellValue(row, CONFIG.COLUMNS.DOBAVLJAC),
        sifra_dobavljaca: sifraDobavljaca, // 🆕
        tezina,
        grupa: getCellValue(row, CONFIG.COLUMNS.GRUPA)
      };

      articles.push(article);
    });

    // console.log(
    //   `✅ Učitano ${articles.length} artikala (E, M, AO + R & decimal fix za V)`
    // );
    return articles;
  } catch (error) {
    console.error('getArticles error:', error);
    throw new Error('Greška pri čitanju artikala: ' + error.toString());
  }
}

/* -------------------------------------------------------------------------- */
/*  BULK WEIGHT UPDATE                                                       */
/* -------------------------------------------------------------------------- */
function updateBulkWeights(sheetName, params) {
  try {
    // console.log('🔄 Bulk weight update started...');
    
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet "' + sheetName + '" ne postoji');

    const updates = params.updates || [];
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    updates.forEach(update => {
      try {
        // Improved decimal number handling for bulk updates
        let tezinaValue = update.tezina || update.weight || '0';
        
        // Ensure it's a string and normalize decimal separator
        tezinaValue = String(tezinaValue).trim();
        
        // Replace comma with dot for decimal separator
        tezinaValue = tezinaValue.replace(',', '.');
        
        // Parse as float and ensure it's a valid number
        const parsedTezina = parseFloat(tezinaValue);
        
        if (isNaN(parsedTezina)) {
          errorCount++;
          errors.push(`${update.sifra || update.code}: Neispravna težina "${update.tezina || update.weight}" → "${tezinaValue}" → ${parsedTezina}`);
        } else {
          // console.log(`🔄 Bulk update: ${update.sifra || update.code} → "${update.tezina || update.weight}" → "${tezinaValue}" → ${parsedTezina}`);
          
          const result = updateColumnInSheet(
            sheetName,
            update.sifra || update.code,
            CONFIG.COLUMNS.TEZINA,
            parsedTezina
          );
          
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`${update.sifra || update.code}: ${result.error}`);
          }
        }
      } catch (error) {
        errorCount++;
        errors.push(`${update.sifra || update.code}: ${error.toString()}`);
      }
    });

    // Set format for the entire weight column after bulk update
    setColumnFormat(sheetName, CONFIG.COLUMNS.TEZINA, '0.000');

    return {
      success: true,
      message: `Bulk update completed: ${successCount} success, ${errorCount} errors`,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error('updateBulkWeights error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  SET COLUMN FORMAT                                                         */
/* -------------------------------------------------------------------------- */
function setColumnFormat(sheetName, columnLetter, format) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet "' + sheetName + '" ne postoji');

    const columnNumber = columnLetterToNumber(columnLetter);
    const lastRow = sheet.getLastRow();
    
    if (lastRow >= CONFIG.FIRST_DATA_ROW) {
      const range = sheet.getRange(CONFIG.FIRST_DATA_ROW, columnNumber, lastRow - CONFIG.FIRST_DATA_ROW + 1, 1);
      range.setNumberFormat(format);
      // console.log(`✅ Set format "${format}" for column ${columnLetter} (rows ${CONFIG.FIRST_DATA_ROW}-${lastRow})`);
    }
    
    return true;
  } catch (error) {
    console.error('setColumnFormat error:', error);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*  UPDATE COLUMN IN SHEET                                                   */
/* -------------------------------------------------------------------------- */
function updateColumnInSheet(sheetName, sifra, columnLetter, newValue) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet "' + sheetName + '" ne postoji');

    const rowNumber = findRowBySifra(sheet, sifra);
    if (!rowNumber) {
      return {
        success: false,
        error: `Šifra "${sifra}" nije pronađena u sheet-u "${sheetName}"`
      };
    }

    const columnNumber = columnLetterToNumber(columnLetter);
    const cell = sheet.getRange(rowNumber, columnNumber);
    
    // Set the value
    cell.setValue(newValue);
    
    // Explicitly set the cell format to decimal number with 3 decimal places
    // This prevents Google Sheets from auto-formatting and rounding
    cell.setNumberFormat('0.000');
    
    // console.log(`✅ Updated ${columnLetter}${rowNumber} = ${newValue} (format: 0.000)`);

    return {
      success: true,
      message: `Updated ${columnLetter}${rowNumber} = ${newValue}`,
      row: rowNumber,
      column: columnLetter,
      value: newValue
    };

  } catch (error) {
    console.error('updateColumnInSheet error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  UTILITY FUNCTIONS                                                        */
/* -------------------------------------------------------------------------- */
function getCellValue(row, columnLetter) {
  const columnIndex = columnLetterToNumber(columnLetter) - 1;
  return row[columnIndex] || '';
}

function columnLetterToNumber(letter) {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result *= 26;
    result += letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1;
  }
  return result;
}

function findRowBySifra(sheet, sifra) {
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.FIRST_DATA_ROW) return null;

  const sifraColumn = columnLetterToNumber(CONFIG.COLUMNS.SIFRA);
  const values = sheet.getRange(CONFIG.FIRST_DATA_ROW, sifraColumn, lastRow - CONFIG.FIRST_DATA_ROW + 1, 1).getValues();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(sifra).trim()) {
      return i + CONFIG.FIRST_DATA_ROW;
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  GROUP CRITERIA FUNCTIONS (PLACEHOLDER)                                   */
/* -------------------------------------------------------------------------- */
function getGroupCriteria(params) {
  // Placeholder - implement if needed
  return [];
}

function saveGroupCriteria(params) {
  // Placeholder - implement if needed
  return { success: true, message: 'Group criteria saved' };
}

function deleteGroupCriteria(params) {
  // Placeholder - implement if needed
  return { success: true, message: 'Group criteria deleted' };
}

/* -------------------------------------------------------------------------- */
/*  KUPCI (CUSTOMERS) FUNCTIONS - NEW                                        */
/* -------------------------------------------------------------------------- */

/**
 * Get customers from 'kupci' sheet
 * Sheet format: Column A = Customer Code, Column B = Customer Name
 */
function getKupci(sheetName = CONFIG.KUPCI_SHEET_NAME) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    // If kupci sheet doesn't exist, return empty array
    if (!sheet) {
      console.warn(`Sheet "${sheetName}" ne postoji - vraćam prazan niz kupaca`);
      return [];
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < CONFIG.FIRST_DATA_ROW) return [];

    const values = sheet
      .getRange(CONFIG.FIRST_DATA_ROW, 1, lastRow - CONFIG.FIRST_DATA_ROW + 1, Math.max(lastCol, 2))
      .getValues();

    const kupci = [];

    values.forEach((row, idx) => {
      const actualRow = idx + CONFIG.FIRST_DATA_ROW;
      const sifraKupca = getCellValue(row, CONFIG.KUPCI_COLUMNS.SIFRA_KUPCA);
      const nazivKupca = getCellValue(row, CONFIG.KUPCI_COLUMNS.NAZIV_KUPCA);

      // Skip empty rows
      if (!sifraKupca || !nazivKupca) return;

      const kupac = {
        id: actualRow,
        sifra: String(sifraKupca).trim(),
        naziv: String(nazivKupca).trim(),
        searchText: (String(sifraKupca).trim() + ' ' + String(nazivKupca).trim()).toLowerCase()
      };

      kupci.push(kupac);
    });

    console.log(`✅ Učitano ${kupci.length} kupaca iz sheet-a "${sheetName}"`);
    return kupci;
    
  } catch (error) {
    console.error('getKupci error:', error);
    // Instead of throwing, return empty array to prevent frontend crashes
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*  TEST FUNCTION                                                            */
/* -------------------------------------------------------------------------- */
function runTests() {
  // console.log('🧪 Running Google Apps Script tests...');
  
  try {
    const articles = getArticles();
    // console.log(`✅ Test passed: Found ${articles.length} articles`);
    
    // Test kupci functionality
    const kupci = getKupci();
    // console.log(`✅ Test passed: Found ${kupci.length} kupci`);
    
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error.toString()}`);
    return false;
  }
} 