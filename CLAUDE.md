# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

This is a Croatian procurement/tender application called "Tražilica Proizvoda & Troškovnik" (Product Search & Cost Calculator) that helps with article search, price management, and cost calculation with Google Sheets integration.

## Core Architecture

### Module Structure
The application follows a modular JavaScript architecture with these key files:

- `index.html` - Main application interface with sticky search, tabs, and responsive design
- `app.js` - Main application initialization and coordination
- `data.js` - Core data structures and article management
- `enhanced-search.js` - Advanced search with autocomplete and direct price input
- `enhanced-results.js` - Results display and management
- `enhanced-functions.js` - **NEW**: Enhanced tablica rabata generation and direct price workflow
- `weight-manager.js` - Google Sheets integration for weight/PDV data
- `troskovnik.js` - Cost calculation and management
- `tablicarabata.js` - Discount table generation
- `proslogodisnje-cijene.js` - **NEW**: Historical price data management and comparison
- `ui.js` - UI utilities and event handling
- `state-manager.js` - Application state save/load functionality
- `utils.js` - General utility functions
- `logger.js` - Application logging and debugging utilities

### Key Features
- **Enhanced Search**: Autocomplete with direct price input and range search (e.g., "Ajvar 300-1000" for 300-1000g products)
- **Google Sheets Integration**: Real-time sync with Google Apps Script for weight/PDV data
- **Dual Article Types**: "Our articles" (LAGER/URPD sources, classified regardless of weight database) vs "External articles" (manual price+weight)
- **Enhanced Tablica Rabata**: **NEW**: Direct generation from search results with user-entered prices
- **Historical Price Data**: **NEW**: Import and compare last year's prices for better pricing decisions
- **State Management**: Quick save/load functionality with JSON serialization
- **Multi-format Export**: CSV, Excel, and XML export capabilities

## Development Commands

Since this is a client-side JavaScript application without a build system:

### Running the Application
```bash
# Using npm scripts (recommended)
npm start                    # Start Python server on port 8000
npm run serve               # Alternative command for same server

# Or manually
open index.html             # Direct browser opening
python -m http.server 8000  # Then open http://localhost:8000
```

### Testing
```bash
# Run all tests with Playwright
npm test                    # Headless test execution
npm run test:headed        # Run tests with browser UI visible
npm run test:ui            # Run tests with Playwright UI for debugging
```

### Deployment
```bash
# Vercel deployment
npm run vercel-build        # Prepare for Vercel deployment (no actual build needed)
# Vercel configuration in vercel.json
```

### No Build Process
This application runs directly in the browser without compilation, transpilation, or bundling. All JavaScript files are loaded as ES6 modules directly in the browser.

## Testing Infrastructure

### Playwright Setup
- **Configuration**: `playwright.config.ts` defines test settings
- **Test Directory**: `/tests/` contains test specifications
- **Auto Server**: Tests automatically start Python server on port 8000
- **Multi-browser**: Tests run on Chrome, Firefox, and Safari
- **Base URL**: `http://localhost:8000` for local testing

### Running Tests
- Tests are written in TypeScript using Playwright Test framework
- HTML reporter generates detailed test results in `playwright-report/`
- Trace collection on first retry for debugging failures
- Parallel execution supported (disabled in CI for stability)

## Google Sheets Integration

### Configuration
The application integrates with Google Apps Script for weight data management:

- **Script URL**: Configured in `weight-manager.js` at `WEIGHT_CONFIG.GOOGLE_SCRIPT_URL`
- **Script File**: `GOOGLE_APPS_SCRIPT_FIXED.js` contains the Apps Script code
- **Sheet Format**: Uses specific column mapping (A=Šifra, V=Težina, M=Tarifni broj, etc.)

### Setup Process
1. Deploy `GOOGLE_APPS_SCRIPT_FIXED.js` as Google Apps Script Web App
2. Update `CONFIG.SPREADSHEET_ID` in the script
3. Set deployment permissions to "Anyone"
4. Update URL in `weight-manager.js` if needed

### Supported Actions
- `getArticles` - Fetch article data from Google Sheets
- `updateWeight` - Update individual weight values
- `updateWeights` - Bulk weight updates
- `test` - Connection testing

## Data Architecture

### Article Data Structure
```javascript
{
    sifra: string,      // Article code (šifra)
    naziv: string,      // Article name
    jm: string,         // Unit of measure (jedinica mjere)
    source: string,     // Data source (LAGER, URPD, or external)
    dobavljac: string   // Supplier name
}
```

### Results Data Structure
```javascript
{
    code: string,           // Article code
    name: string,           // Article name
    source: string,         // Source (determines "our" vs "external")
    dobavljac: string,      // Supplier
    hasUserPrice: boolean,  // User entered price directly
    pricePerPiece: number,  // User-entered price (if any)
    weight: number,         // Weight in kg
    isFromWeightDatabase: boolean,  // Weight from Google Sheets vs parsed
    rb: number             // Row number in results table
}
```

### Weight Database
- Uses Map structure for O(1) lookups
- Keys: article codes (šifra)
- Values: weight in kilograms
- Includes PDV (VAT) mapping via tarifni broj
- Synchronized with Google Sheets in real-time

### State Management
- Application state serialized to JSON
- Includes: articles, results, troskovnik, weights, settings
- Quick save (Ctrl+S) and full save (Ctrl+Shift+S) available
- State files use `.json` extension

## Key Workflows

### 1. Enhanced Article Search
- Type in sticky search bar (always visible at top)
- Autocomplete shows matching articles with prices/weights
- Direct price input for "our articles" (LAGER/URPD)
- Price + weight input for external articles

### 2. Weight Management
- Import from Google Sheets or CSV files
- Automatic weight lookup for internal articles
- Manual weight parsing from article names as fallback
- Real-time synchronization with Google Sheets

### 3. Cost Calculation (Troškovnik)
- Automatic addition from search results
- Weight-based calculations (€/kg columns)
- Color coding based on result count
- Professional weight generation from names

### 4. Enhanced Tablica Rabata Generation (NEW)
- Direct generation from search results with user-entered prices
- Uses `generateFromResults()` function from `enhanced-functions.js`
- Processes all LAGER/URPD articles (source-based classification, weight database optional)
- Automatically selects cheapest price per article code
- One-step workflow (reduced from 4 steps to 1)

### 5. Historical Price Management (NEW)
- Import CSV, Excel, or XML files with last year's prices
- Search and filter historical price data
- Compare current prices with historical data
- Support for multiple file formats with flexible parsing

## Important Implementation Notes

### Article Classification
The application distinguishes between:
- **"Our Articles"**: Source contains "LAGER" or "URPD" (regardless of weight database)
  - Enhanced with `isTrulyOurArticle()` function for accurate classification
  - Classified as "ours" based on source alone - weight database NOT required
  - Enables direct price input workflow in autocomplete
  - Always displays with green color coding and "🏠 NAŠ" badge
- **"External Articles"**: All other articles (sources not containing LAGER/URPD)
  - Shows purple pricing inputs for both price and weight
  - Marked as "📋 PO CJENIKU" (external catalog) articles

### PDV (VAT) Mapping
Automatic PDV calculation based on tarifni broj:
- "1" → 25%
- "10", "2", "5", "7" → 5%  
- Others → 0%

### File Handling
- Supports Excel (.xlsx, .xls) and CSV files
- Uses SheetJS library for Excel processing
- Drag & drop support for all file inputs
- JSON state files for save/load functionality

### Error Handling
- Google Sheets connectivity issues fall back to CSV data
- Graceful degradation when modules fail to load
- User-friendly error messages in Croatian

### Enhanced Functionality (NEW)
- **Direct Price Input**: Autocomplete supports direct price entry for LAGER/URPD articles
- **Enhanced Tablica Rabata**: Generate discount tables directly from search results
- **Color-coded UI**: Purple theme for enhanced features (#7c3aed)
- **Keyboard Shortcuts**: Comprehensive keyboard navigation support
- **Historical Pricing**: Import and compare last year's prices

## Enhanced Keyboard Shortcuts

### Search & Navigation
- `Ctrl+/` - Focus sticky search bar (always available)
- `Enter` in autocomplete - Add article with price
- `Tab` in autocomplete - Navigate between price/weight fields
- `Escape` - Clear search / close autocomplete
- `1-6` - Quick tab switching (1=Search, 2=Results, 3=Troškovnik, 4=Tablica Rabata, 5=Prošlogodišnje Cijene, 6=Save/Load)

### Data Management
- `Ctrl+S` - Quick save state
- `Ctrl+Shift+S` - Save as with timestamp
- `Ctrl+O` - Load state from file
- `Ctrl+R` - Refresh troškovnik colors
- `Ctrl+G` - Generate tablica rabata from results
- `Ctrl+E` - Export current tab

## Key Enhanced Functions

### Enhanced Article Management (`enhanced-functions.js`)
- `isTrulyOurArticle(source, code)` - Determines if article is truly "ours" (source contains LAGER or URPD, weight database NOT required)
- `shouldIncludeInTablicaRabata(source, code)` - Logic for tablica rabata inclusion (same as isTrulyOurArticle for now)
- `generateFromResults()` - **MAIN FUNCTION**: Generates tablica rabata from search results with user prices
- `addWithPriceFromAutocomplete()` - Handles direct price input workflow
- `addWithoutPriceFromAutocomplete()` - Adds articles without price (green checkmark)

### Historical Price Management (`proslogodisnje-cijene.js`)
- `processProslogodisnjeCijeneFile(file)` - Processes CSV/Excel/XML files with historical prices
- `getProslogodisnjaCijena(sifra)` - Retrieves historical price for article code
- `handleProslogodisnjeCijeneSearch()` - Filters historical data
- `parseXMLContent(xmlDoc)` - Supports multiple XML formats for price import

### Weight Management (`weight-manager.js`)
- `getArticleWeightAndPDV(code, name, jm, source)` - Get weight and PDV data for an article
- `updateWeightValue(code, newWeight)` - Update weight in database and sync to Google Sheets
- `importFromGoogleSheets()` - Load weight database from Google Sheets
- `exportWeightsToGoogleSheets()` - Export all weights to Google Sheets

### Utility Functions (`utils.js`)
- `parseWeightFromName(name)` - Extract weight from article name (e.g., "Ajvar 720g" → 0.72)
- `formatWeight(weight)` - Format weight for display
- `formatPrice(price)` - Format price with 2 decimals
- `showMessage(type, message, statusElementId)` - Display user messages (info/success/error)

### Enhanced Workflow
1. **Direct Price Input**: User enters price directly in autocomplete
2. **One-Step Tablica Rabata**: Generate discount table from results with `generateFromResults()`
3. **Historical Comparison**: Compare current prices with imported historical data
4. **Auto-sync**: Real-time sync with Google Sheets for weight updates

## Global Variables and State

All major data is stored in global window variables for easy access:

### Core Data Arrays
- `window.articles` - Array of all loaded articles (from CSV/Excel)
- `window.results` - Array of search results with user-entered prices
- `window.troskovnik` - Array of items in cost calculation table
- `window.tablicaRabata` - Array of items in discount table

### Database Maps
- `window.weightDatabase` - Map of article codes to weights (key: šifra, value: weight in kg)
- `window.pdvDatabase` - Map of article codes to PDV percentages
- `window.tarifniBrojDatabase` - Map of article codes to tarifni broj

### Utility Objects
- `window.Logger` - Logging utility with different levels (DEBUG, INFO, WARN, ERROR)
- `window.WeightManager` - Weight management instance for Google Sheets integration

### Debugging
The application includes comprehensive logging via the Logger module:
```javascript
// Enable debug logging in browser console
Logger.setLevel(Logger.LEVELS.DEBUG);

// Check current state
console.log('Articles:', window.articles.length);
console.log('Results:', window.results);
console.log('Weight DB:', window.weightDatabase.size);
```

## Common Development Patterns

### Adding a New Tab
1. Add tab button in `index.html` (in `.tabs` container)
2. Add tab content div (in `.container`)
3. Update `showTab()` function in `ui.js` to handle the new tab
4. Add keyboard shortcut number if desired

### Processing File Uploads
Files are handled using the SheetJS library for Excel and standard FileReader for CSV:
```javascript
function processFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        // Process workbook...
    };
    reader.readAsArrayBuffer(file);
}
```

### Updating Display Tables
All display update functions follow a pattern:
1. Clear existing table rows
2. Iterate through data array
3. Create table rows with event listeners
4. Update status messages

Example: `updateResultsDisplay()`, `updateTroskovnikDisplay()`, `updateTablicaRabataDisplay()`

### Article Classification Logic
Critical for understanding "our" vs "external" articles:
- **"Our articles"**: Source contains "LAGER" or "URPD" (case-insensitive)
- **Weight database is NOT required** for classification
- Use `isTrulyOurArticle(source, code)` from utils.js for consistency
- Green color scheme for "our", purple for "external"

### Google Sheets Synchronization
- Weight updates are bidirectional (app ↔ Google Sheets)
- Other fields (naziv, dobavljač, etc.) are read-only from Sheets
- Always use `updateWeightValue()` to update weights (handles sync automatically)
- Falls back to local storage if Google Sheets unavailable

## Browser Compatibility

- Modern browsers with ES6+ support required
- Uses Fetch API for Google Sheets integration
- File API for drag & drop functionality
- No build tools or transpilation used

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.