/**
 * FIXED ENHANCED SEARCH - DROPDOWN PERSISTS UNTIL ESCAPE
 * Problem riješen: dropdown se zatvara SAMO na Escape tipku
 */

// Autocomplete state
let autocompleteVisible = false;
let autocompleteResults = [];
let selectedAutocompleteIndex = -1;
let excludedArticles = new Set();

// NOTE: Article classification is centrally defined in utils.js
// Use window.isTrulyOurArticle(source, code) for all article type checks

/**
 * NEW: Check if weight is from Google Sheets database (for color coding)
 */
function isWeightFromDatabase(articleCode) {
    if (!articleCode || typeof window.weightDatabase === 'undefined') return false;
    return window.weightDatabase.has(articleCode);
}

/**
 * Enhanced weight extraction with database lookup - GOOGLE SHEETS PRIORITY
 */
function extractWeight(name, unit, articleCode, articleSource) {
    // Ako je NAŠ ARTIKL (LAGER/URPD i postoji u weightDatabase) koristi bazu
    if (articleCode && typeof window.weightDatabase !== 'undefined' && window.weightDatabase.has(articleCode) && window.isTrulyOurArticle(articleSource, articleCode)) {
        const dbWeight = window.weightDatabase.get(articleCode);
        // // console.log(`✅ Weight from Google Sheets database: ${dbWeight}kg for ${articleCode}`);
        return dbWeight;
    }

    // Parsiraj težinu iz naziva za "po cjeniku" artikle
    if (!name) return 0;
    let text = name.toLowerCase().replace(/,/g, '.');

    // NOVO: Normalizuj razmake između broja i oznake (npr. '1 kg' -> '1kg', '20 g' -> '20g')
    text = text.replace(/(\d+)\s*(kg|g|gr|ml|l|t)\b/g, '$1$2');

    let maxWeight = 0;

    // NETO/OCJEDENA format - koristi veći broj
    const netoPattern = /(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\s*(g|gr|ml)\b/g;
    let netoMatch;
    while ((netoMatch = netoPattern.exec(text)) !== null) {
        const firstNum = parseFloat(netoMatch[1]);
        const secondNum = parseFloat(netoMatch[2]);
        const netoMass = Math.max(firstNum, secondNum);
        let weightInKg = 0;
        if (netoMatch[3] === 'g' || netoMatch[3] === 'gr') weightInKg = netoMass / 1000;
        else if (netoMatch[3] === 'ml') weightInKg = netoMass / 1000; // za tekućine gustoće ≈1
        if (weightInKg > maxWeight) maxWeight = weightInKg;
    }

    // Standardni uzorci: prvo ml, pa l; prvo gr, pa g
    const weightPatterns = [
        { regex: /(\d+(?:\.\d+)?)\s*ml\b/, multiplier: 0.001 },
        { regex: /(\d+(?:\.\d+)?)\s*l(?![a-zA-Z])\b/, multiplier: 1 },
        { regex: /(\d+(?:\.\d+)?)\s*kg\b/, multiplier: 1 },
        { regex: /(\d+(?:\.\d+)?)\s*t\b/, multiplier: 1000 },
        { regex: /(\d+(?:\.\d+)?)\s*gr\b/, multiplier: 0.001 },
        { regex: /(\d+(?:\.\d+)?)\s*g\b/, multiplier: 0.001 }
    ];

    // Pronađi SVE količine i koristi najveću
    for (const pattern of weightPatterns) {
        let match;
        const globalRegex = new RegExp(pattern.regex.source, 'g');
        while ((match = globalRegex.exec(text)) !== null) {
            const value = parseFloat(match[1]);
            const weight = value * pattern.multiplier;
            if (weight > maxWeight) maxWeight = weight;
        }
    }

    // Ako nije pronađena težina, dodatna logika za PO CJENIKU s jedinicom 'kg'
    if (maxWeight === 0) {
        const supplier = (articleSource || '').toLowerCase();
        const unitNorm = (unit || '').toLowerCase();
        // Ako nije naš, tip je Po cjeniku i jedinica je kg
        if (unitNorm === 'kg' && (!window.isTrulyOurArticle(articleSource, articleCode))) {
            maxWeight = 1;
        }
    }

    // Ako nije pronađena težina, vrati 0 (za ručni unos)
    return maxWeight > 0 ? maxWeight : 0;
}

/**
 * Parse search query with range support
 */
function parseSearchQuery(query) {
    if (!query) return { segments: [] };

    const segments = query.split('*').map(seg => {
        const trimmed = seg.trim();
        
        let rb = null;
        let directCode = null; // NOVA FUNKCIONALNOST: direktna šifra iz zagrada
        let rbMatch = null;
        
        // PROVJERA 1: Format s RB i zagradama "33. (2245)" - traži u bazi težina
        const codeInBracketsMatch = trimmed.match(/^(\d+)\.\s*\((\w+)\)$/);
        if (codeInBracketsMatch) {
            rb = parseInt(codeInBracketsMatch[1]);
            directCode = codeInBracketsMatch[2]; // Šifra iz zagrada - traži SAMO u bazi težina
        }

        // NOVO: PROVJERA 2: Samo zagrade "(2245)" bez RB - koristi currentRB
        if (!codeInBracketsMatch) {
            const bracketsOnlyMatch = trimmed.match(/^\((\w+)\)$/);
            if (bracketsOnlyMatch) {
                directCode = bracketsOnlyMatch[1]; // Šifra iz zagrada
                rb = null; // Kasnije će se koristiti currentRB u performLiveSearch
            }
        }

        // PROVJERA 3: Standardni format "33. naziv proizvoda" ili "rb. tekst"
        if (!codeInBracketsMatch && !directCode) {
            rbMatch = trimmed.match(/^(\d+)\.\s*/);
            if (rbMatch) {
                rb = parseInt(rbMatch[1]);
            }
        }
        
        const mainQuery = (codeInBracketsMatch || directCode) ? '' : // Za format s zagradama nema text pretrage
                         rbMatch ? trimmed.substring(rbMatch[0].length).trim() : trimmed;
        
        // ENHANCED: Parse range query (e.g., "Ajvar 300-1000")
        let rangeMin = null;
        let rangeMax = null;
        let searchTokens = [];
        
        if (mainQuery) {
            const words = mainQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
            
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const rangeMatch = word.match(/^(\d+)-(\d+)$/);
                
                if (rangeMatch) {
                    // Found range pattern like "300-1000"
                    rangeMin = parseInt(rangeMatch[1]);
                    rangeMax = parseInt(rangeMatch[2]);
                    // // console.log(`🎯 Range detected: ${rangeMin}-${rangeMax}`);
                } else {
                    // Regular search token
                    searchTokens.push(word);
                }
            }
        }

        return { 
            rb, 
            tokens: searchTokens, 
            rangeMin, 
            rangeMax,
            directCode, // DODAJ directCode u segment
            originalSegment: trimmed 
        };
    });

    return { segments };
}

/**
 * Search articles with range support
 */
function searchArticles(articles, parsedQuery) {
    const searchResults = [];

    for (const segment of parsedQuery.segments) {
        for (const article of articles) {
            let allTokensFound = true;
            
            // Check text tokens
            if (segment.tokens.length > 0) {
                const searchableText = `${article.name} ${article.supplier} ${article.comment || ''} ${article.code || ''}`.toLowerCase();
                for (const token of segment.tokens) {
                    if (!searchableText.includes(token)) {
                        allTokensFound = false;
                        break;
                    }
                }
            }

            if (!allTokensFound) continue;

            // ENHANCED: Check range filter
            if (segment.rangeMin !== null && segment.rangeMax !== null) {
                const calculatedWeight = extractWeight(article.name, article.unit, article.code, article.source) || 0;
                const weightInGrams = calculatedWeight * 1000; // Convert kg to grams
                
                // Check if weight is within range
                if (weightInGrams < segment.rangeMin || weightInGrams > segment.rangeMax) {
                    // // console.log(`⚖️ Article ${article.name} (${weightInGrams}g) outside range ${segment.rangeMin}-${segment.rangeMax}g`);
                    continue;
                }
                
                // // console.log(`✅ Article ${article.name} (${weightInGrams}g) within range ${segment.rangeMin}-${segment.rangeMax}g`);
            }

            const resultRb = segment.rb || "PENDING";
            const calculatedWeight = extractWeight(article.name, article.unit, article.code, article.source) || 0;
            const calculatedPricePerKg = calculatedWeight > 0 ? article.price / calculatedWeight : 0;

            searchResults.push({
                ...article,
                rb: resultRb,
                calculatedWeight: calculatedWeight,
                pricePerKg: calculatedPricePerKg,
                segment: segment.originalSegment
            });
        }
    }

    const unique = searchResults.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id && t.rb === item.rb)
    );

    // NOVO: filter najnoviji po šifri
    let filtered = unique;
    if (window.latestPerCodeEnabled) {
        const byCode = {};
        filtered.forEach(item => {
            if (!item.code) return;
            const date = item.date ? new Date(item.date) : new Date(0);
            if (!byCode[item.code] || date > byCode[item.code].__date) {
                byCode[item.code] = { ...item, __date: date };
            }
        });
        filtered = Object.values(byCode).map(x => { delete x.__date; return x; });
    }
    // ISPRAVLJENO SORTIRANJE: "Sa težinom na vrh" = sortiranje po EUR/kg
    if (window.weightOnTopEnabled) {
        return filtered.sort((a, b) => {
            const aHasWeight = (a.calculatedWeight || a.weight || 0) > 0;
            const bHasWeight = (b.calculatedWeight || b.weight || 0) > 0;
            
            // // console.log(`🔍 Sorting: ${a.name} (weight: ${aHasWeight ? 'Yes' : 'No'}, €/kg: ${a.pricePerKg?.toFixed(2) || 'N/A'}) vs ${b.name} (weight: ${bHasWeight ? 'Yes' : 'No'}, €/kg: ${b.pricePerKg?.toFixed(2) || 'N/A'})`);
            
            // 1. PRIORITET: Artikli s težinom na vrh
            if (aHasWeight !== bHasWeight) {
                // // console.log(`  → Weight priority: ${aHasWeight ? a.name : b.name} goes first`);
                return aHasWeight ? -1 : 1;
            }
            
            // 2. PRIORITET: Sortiranje po EUR/kg (ISPRAVKA: EUR/kg prije RB!)
            const aPricePerKg = aHasWeight ? (a.pricePerKg || 0) : Number.POSITIVE_INFINITY;
            const bPricePerKg = bHasWeight ? (b.pricePerKg || 0) : Number.POSITIVE_INFINITY;
            
            if (aPricePerKg !== bPricePerKg) {
                // // console.log(`  → EUR/kg priority: ${aPricePerKg < bPricePerKg ? a.name : b.name} is cheaper (${Math.min(aPricePerKg, bPricePerKg).toFixed(2)} €/kg)`);
                return aPricePerKg - bPricePerKg;
            }
            
            // 3. PRIORITET: RB tek na kraju (za iste cijene/kg)
            if (a.rb !== b.rb) {
                // // console.log(`  → RB priority: ${a.rb < b.rb ? a.name : b.name} has lower RB`);
                return a.rb - b.rb;
            }
            
            // 4. PRIORITET: Alfabetski po nazivu
            // // console.log(`  → Alphabetical: ${a.name} vs ${b.name}`);
            return a.name.localeCompare(b.name, 'hr');
        });
    } else {
        // Kada "Sa težinom na vrh" nije označen, zadržaj postojeći RB prioritet
        return filtered.sort((a, b) => {
            if (a.rb !== b.rb) return a.rb - b.rb;
            return (a.pricePerKg || 0) - (b.pricePerKg || 0);
        });
    }
}

/**
 * Perform live search
 */
function performLiveSearch(query) {
    if (!query || query.length < 2) return [];
    
    try {
        const parsedQuery = parseSearchQuery(query);
        let searchResults = [];
        
        // PROVJERA: Format s zagradama traži ISKLJUČIVO u bazi težina
        const hasDirectCodeFromBrackets = parsedQuery.segments.length > 0 && parsedQuery.segments[0].directCode;
        
        if (hasDirectCodeFromBrackets) {
            // SAMO pretraga baze težina za format s zagradama "22. (2232)"
            const directCode = parsedQuery.segments[0].directCode;
            // NOVO: Koristi currentRB ako nema RB u query-u
            const targetRB = parsedQuery.segments[0].rb || (typeof window.currentRB !== 'undefined' && window.currentRB > 0 ? window.currentRB : "PENDING");
            
            // console.log(`🔍 Direct code search (brackets only): ${directCode} for RB ${targetRB}`);
            
            const weightArticle = createArticleFromWeightDatabase(directCode, targetRB);
            if (weightArticle) {
                // console.log(`✅ Found article from weight database: ${weightArticle.name}`);
                searchResults = [weightArticle]; // Rezultat iz baze težina
            } else {
                // Ako šifra ne postoji u bazi, ne prikazuj ništa (prazni rezultati)
                // "Ručni unos" se odnosi SAMO na direktan unos u troškovnik, NE kroz tražilicu!
                searchResults = [];
            }
            // Nema standardne pretrage za format s zagradama
        } else {
            // Standardna pretraga za sve ostale formate
            searchResults = searchArticles(articles, parsedQuery);
            
            // NOVA FUNKCIONALNOST: Uvijek uključi prošlogodišnje cijene u autocomplete
            if (typeof proslogodisnjeCijene !== 'undefined' && proslogodisnjeCijene.length > 0) {
                // Pretraži prošlogodišnje cijene i stavi ih na vrh
                const historyResults = searchProslogodisnjeCijene(query, parsedQuery);
                if (historyResults.length > 0) {
                    // console.log(`📅 Found ${historyResults.length} historical results for "${query}"`);
                    searchResults = [...historyResults, ...searchResults];
                }
            }
        }

        // OUR ARTICLES filter - filter out LAGER/URPD if checkbox is unchecked
        if (!window.ourArticlesFilterEnabled) {
            searchResults = searchResults.filter(item => {
                const source = (item.source || '').toLowerCase();
                // Exclude if source contains 'lager' or 'urpd'
                return !(source.includes('lager') || source.includes('urpd'));
            });
        }

        // ROTO filter
        if (!window.rotoFilterEnabled) {
            searchResults = searchResults.filter(item => {
                const supplier = (item.supplier || '').toLowerCase();
                const source = (item.source || '').toLowerCase();
                // Sakrij samo ako je dobavljač ROTO i source NIJE URPD/LAGER (tj. Po cjeniku)
                if (supplier === 'roto' && !(source.includes('urpd') || source.includes('lager'))) {
                    return false;
                }
                return true;
            });
        }
        const filteredResults = searchResults.filter(item =>
            !excludedArticles.has(item.id)
        );

        return filteredResults.slice(0, 24);
    } catch (error) {
        console.error('Live search error:', error);
        return [];
    }
}

/**
 * FIXED: Show autocomplete - NO AUTO-CLOSE, only Escape closes it
 */
function showAutocomplete(results, inputElement) {
    // Remove any existing dropdown
    const existingDropdown = document.getElementById('autocomplete-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    if (results.length === 0) return;

    autocompleteResults = results;
    autocompleteVisible = true;
    selectedAutocompleteIndex = -1;

    const dropdown = document.createElement('div');
    dropdown.id = 'autocomplete-dropdown';
    dropdown.className = 'autocomplete-dropdown';
    
    // FIXED: Allow all interactions inside dropdown - NO stopPropagation
    dropdown.style.cssText = `
        position: fixed;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        max-height: 500px;
        overflow-y: auto;
        z-index: 1001;
    `;

    const currentQuery = inputElement.value.trim();
    const parsedQuery = parseSearchQuery(currentQuery);
    // NOVO: Koristi currentRB ako nema RB u query-u
    const targetRB = (parsedQuery.segments.length > 0 && parsedQuery.segments[0].rb) ?
                     parsedQuery.segments[0].rb :
                     (typeof window.currentRB !== 'undefined' && window.currentRB > 0 ? window.currentRB : "PENDING");

    // Check if range is active
    const hasRange = parsedQuery.segments.length > 0 && 
                     parsedQuery.segments[0].rangeMin !== null && 
                     parsedQuery.segments[0].rangeMax !== null;
    
    const rangeInfo = hasRange ? 
        ` • ⚖️ Range: ${parsedQuery.segments[0].rangeMin}-${parsedQuery.segments[0].rangeMax}g` : '';
    
    let html = `
        <div style="padding: 8px 16px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; display: flex; justify-content: space-between; align-items: center;">
            <span>🎯 ${results.length} rezultata za grupu ${targetRB}${rangeInfo} • Upisujte cijene • ESC za zatvaranje</span>
            <button onclick="forceCloseAutocomplete()" style="background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">✕ Zatvori</button>
        </div>
    `;
    

    results.forEach((item, index) => {
        const pricePerKg = item.pricePerKg ? '€' + formatDecimalHR(item.pricePerKg) + '/kg' : '';
        const weight = item.calculatedWeight ? formatDecimalHR(item.calculatedWeight) + 'kg' : '';
        const formattedDate = item.date ? new Date(item.date).toLocaleDateString('hr-HR') : 'N/A';

        // VIZUALNI PRIKAZ: Koristi isOurArticleVisual() za zeleno/ljubičasto
        const isOur = window.isOurArticleVisual(item.source);

        // ISPRAVKA: Zelena boja za težinu SAMO ako je NAŠ artikl I ima težinu u weightDatabase
        // Ovo je samo za COLOR CODING težine, ne utječe na badge
        const isWeightFromDB = isOur && isWeightFromDatabase(item.code);

        // ✅ Get last year's price ONLY for "NAŠ" articles (to prevent mixing with external articles)
        const lastYearPrice = (isOur && window.getProslogodisnjaCijena) ?
            window.getProslogodisnjaCijena(item.code) : null;
        
        // NOVA LOGIKA: Provjeri tip rezultat
        const isHistoricalResult = item.isHistorical === true;
        const isFromWeightDatabase = item.isFromWeightDatabase === true;
        const isManualEntry = item.isManualEntry === true;
        
        // ENHANCED: Check if historical article is in weight database
        const isHistoricalInWeightDb = isHistoricalResult && item.isInWeightDatabase;
        
        const sourceBadge = isHistoricalResult ?
            (isHistoricalInWeightDb ? 
                '<span style="background: #059669; color: white; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">📅 PROŠLA (BAZA)</span>' :
                '<span style="background: #64748b; color: white; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">📅 PROŠLA GODINA</span>') :
            isFromWeightDatabase ?
                '<span style="background: #dc2626; color: white; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">📦 IZ BAZE TEŽINA</span>' :
                isManualEntry ?
                    '<span style="background: #f59e0b; color: white; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">✏️ RUČNI UNOS</span>' :
                    isOur ? 
                        '<span style="background: #059669; color: white; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">🏠 NAŠ</span>' :
                        '<span style="background: #7c3aed; color: white; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">📋 PO CJENIKU</span>';

        // Last year's price badge
        const lastYearBadge = lastYearPrice ? 
            `<span style="background: #64748b; color: white; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">📅 Lani: €${formatDecimalHR(lastYearPrice)}</span>` : 
            '';

        // ENHANCED: Weight color coding including historical articles from weight database
        const weightColor = (isWeightFromDB || isHistoricalInWeightDb) ? 
            'background: #059669; color: white;' : 
            'background: #fbbf24; color: #92400e;';
        const weightIcon = (isWeightFromDB || isHistoricalInWeightDb) ? '⚖️' : '📝';

        html += `
            <div style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <div>
                            <strong>${item.name}</strong>
                            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                                <span style="font-weight: 600;">Izvor:</span> ${parseSourceName(item.source)}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span style="background: ${isOur ? '#059669' : '#fbbf24'}; color: white; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">${item.supplier}</span>
                            ${sourceBadge}
                            ${lastYearBadge}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12px;">
                        <span style="background: ${isHistoricalResult ? '#dc2626' : (isOur ? '#059669' : '#7c3aed')}; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${isHistoricalResult ? 'N/A' : '€' + formatDecimalHR(item.price)}</span>
                        <span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${item.unit}</span>
                        ${weight ? '<span style="' + weightColor + ' padding: 2px 6px; border-radius: 4px; font-weight: bold;">' + weightIcon + ' ' + weight + '</span>' : ''}
                        ${pricePerKg ? '<span style="background: #059669; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;">' + pricePerKg + '</span>' : ''}
                        <span style="background: #dbeafe; color: #1d4ed8; padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">${formattedDate}</span>
                    </div>
                </div>

                <div style="display: flex; gap: 8px; align-items: center; margin-left: 12px;">
                    <div style="text-align: center;">
                        <span style="background: #f3f4f6; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">${item.code || 'N/A'}</span>
                    </div>

                    <div style="display: flex; gap: 4px; align-items: center;">
                        ${isManualEntry ? `
                            <div style="text-align: center;">
                                <div style="font-size: 9px; color: #f59e0b; font-weight: bold; margin-bottom: 2px;">💰 Cijena</div>
                                <input type="number" step="0.01" placeholder="€" id="price-${item.id}-${targetRB}" style="width: 70px; padding: 4px 6px; border: 2px solid #f59e0b; border-radius: 6px; font-size: 11px; text-align: center; background: #fef3c7; color: #f59e0b; font-weight: bold;" onfocus="handlePriceFocus(this, 0)" onkeydown="handlePriceKeydown(event, '${item.id}', '${targetRB}', false)" title="Enter = Dodaj u troškovnik za ručni unos">
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 9px; color: #f59e0b; font-weight: bold; margin-bottom: 2px;">⚖️ Težina</div>
                                <input type="number" step="0.001" placeholder="kg" value="0.000" id="weight-${item.id}-${targetRB}" style="width: 70px; padding: 4px 6px; border: 2px solid #f59e0b; border-radius: 6px; font-size: 11px; text-align: center; background: #fef3c7; color: #f59e0b; font-weight: bold;" onfocus="this.select()" onkeydown="handleWeightKeydown(event, '${item.id}', '${targetRB}')" title="Unesite težinu">
                            </div>
                        ` : isHistoricalResult ? `
                            <div style="text-align: center;">
                                <div style="font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 2px;">💰 Cijena</div>
                                <input type="number" step="0.01" placeholder="€" value="${item.price ? item.price.toFixed(2) : ''}" id="price-${item.id}-${targetRB}" style="width: 70px; padding: 4px 6px; border: 2px solid #64748b; border-radius: 6px; font-size: 11px; text-align: center; background: #f8fafc; color: #64748b; font-weight: bold;" onfocus="handlePriceFocus(this, ${item.price || 0})" onkeydown="handlePriceKeydown(event, '${item.id}', '${targetRB}', false)" title="Prošlogodišnja cijena: €${item.price ? formatDecimalHR(item.price) : '0.00'} • Enter = Prvi izbor (troškovnik)">
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 9px; color: #dc2626; font-weight: bold; margin-bottom: 2px;">⚖️ Težina</div>
                                <input type="number" step="0.001" placeholder="kg" value="0.000" id="weight-${item.id}-${targetRB}" style="width: 70px; padding: 4px 6px; border: 2px solid #dc2626; border-radius: 6px; font-size: 11px; text-align: center; background: #fef2f2; color: #dc2626; font-weight: bold;" onfocus="this.select()" onkeydown="handleWeightKeydown(event, '${item.id}', '${targetRB}')" title="CRVENO: Unesi težinu jer prošlogodišnji artikli nemaju težinu u bazi">
                            </div>
                        ` : isOur ? `
                            <div style="text-align: center;">
                                <div style="font-size: 9px; color: #059669; font-weight: bold; margin-bottom: 2px;">💰 Cijena</div>
                                <input type="number" step="0.01" placeholder="${lastYearPrice ? 'Lani €' + formatDecimalHR(lastYearPrice) : '€'}" id="price-${item.id}-${targetRB}" style="width: 70px; padding: 4px 6px; border: 2px solid #059669; border-radius: 6px; font-size: 11px; text-align: center; background: #ecfdf5; color: #059669; font-weight: bold;" onfocus="handlePriceFocus(this, ${lastYearPrice || 0})" onkeydown="handlePriceKeydown(event, '${item.id}', '${targetRB}', ${isOur})" title="${lastYearPrice ? 'Lani: €' + formatDecimalHR(lastYearPrice) + ' • ' : ''}Enter = Prvi izbor (troškovnik), ✅ = Dodaj">
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 9px; color: ${isWeightFromDB ? '#059669' : '#dc2626'}; font-weight: bold; margin-bottom: 2px;">⚖️ Težina</div>
                                <div style="width: 70px; padding: 4px 6px; border: 2px solid ${isWeightFromDB ? '#059669' : '#dc2626'}; border-radius: 6px; font-size: 11px; text-align: center; background: ${isWeightFromDB ? '#ecfdf5' : '#fef2f2'}; color: ${isWeightFromDB ? '#059669' : '#dc2626'}; font-weight: bold;" title="${isWeightFromDB ? 'Težina iz Google Sheets baze' : 'CRVENO: NAŠ artikal nema prijavljenu težinu u bazi!'}">${weight || (isWeightFromDB ? 'Auto' : '⚠️ NEMA')}</div>
                            </div>
                        ` : `
                            <div style="text-align: center;">
                                <div style="font-size: 9px; color: #7c3aed; font-weight: bold; margin-bottom: 2px;">💰 Cijena</div>
                                <input type="number" step="0.01" placeholder="${lastYearPrice ? 'Lani €' + formatDecimalHR(lastYearPrice) : '€'}" id="price-${item.id}-${targetRB}" style="width: 70px; padding: 4px 6px; border: 2px solid #7c3aed; border-radius: 4px; font-size: 11px; text-align: center; background: #f3f4f6; color: #7c3aed; font-weight: bold;" onfocus="handlePriceFocus(this, ${lastYearPrice || 0})" onkeydown="handlePriceKeydown(event, '${item.id}', '${targetRB}', ${isOur})" title="${lastYearPrice ? 'Lani: €' + formatDecimalHR(lastYearPrice) + ' • ' : ''}Enter = Prvi izbor (troškovnik), ✅ = Dodaj">
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 9px; color: ${isWeightFromDB ? '#059669' : '#7c3aed'}; font-weight: bold; margin-bottom: 2px;">⚖️ Težina</div>
                                <input type="number" step="0.001" placeholder="kg" value="${(item.calculatedWeight || 0).toFixed(3)}" id="weight-${item.id}-${targetRB}" style="width: 70px; padding: 4px 6px; border: 2px solid ${isWeightFromDB ? '#059669' : '#7c3aed'}; border-radius: 4px; font-size: 11px; text-align: center; background: ${isWeightFromDB ? '#ecfdf5' : '#f3f4f6'}; color: ${isWeightFromDB ? '#059669' : '#7c3aed'}; font-weight: bold;" onfocus="this.select()" onkeydown="handleWeightKeydown(event, '${item.id}', '${targetRB}')" title="Enter = Prebaci na cijenu">
                            </div>
                        `}
                        
                        ${isManualEntry ? `
                            <button onclick="addWithoutPriceFromAutocomplete('${item.id}', '${targetRB}')" style="background: #f59e0b; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;" title="Dodaj u troškovnik za ručni unos">✅ Dodaj</button>
                        ` : isHistoricalResult ? `
                            <button onclick="addWithPriceFromAutocomplete('${item.id}', '${targetRB}', false)" style="background: #64748b; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;" title="Prvi izbor - dodaj s cijenom u troškovnik">✅ Prvi</button>
                            <button onclick="addWithoutPriceFromAutocomplete('${item.id}', '${targetRB}')" style="background: #d1fae5; color: #059669; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;" title="Drugi izbor - dodaj bez cijene">✅ Drugi</button>
                        ` : `
                            <button onclick="addWithPriceFromAutocomplete('${item.id}', '${targetRB}', ${isOur})" style="background: ${isOur ? '#059669' : '#7c3aed'}; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;" title="Prvi izbor - dodaj s cijenom">✅ Prvi</button>
                            <button onclick="addWithoutPriceFromAutocomplete('${item.id}', '${targetRB}')" style="background: #d1fae5; color: #059669; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;" title="Drugi izbor - dodaj bez cijene">✅ Drugi</button>
                        `}
                    </div>
                </div>
            </div>
        `;
    });

    dropdown.innerHTML = html;

    // Position dropdown
    const rect = inputElement.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 2) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = Math.max(rect.width, 700) + 'px';

    document.body.appendChild(dropdown);
    // // console.log('✅ FIXED: Autocomplete shown - only Escape will close it');
}

/**
 * FIXED: Force close - only when explicitly called
 */
function forceCloseAutocomplete() {
    // // console.log('🔴 Force closing autocomplete...');
    
    const dropdown = document.getElementById('autocomplete-dropdown');
    if (dropdown) {
        dropdown.remove();
    }
    
    autocompleteVisible = false;
    autocompleteResults = [];
    selectedAutocompleteIndex = -1;
    
    // // console.log('✅ Autocomplete closed');
}

/**
 * ENHANCED: Handle price keydown - Enter for first choice (troškovnik)
 */
/**
 * Handle price input focus - auto-suggest last year's price
 */
function handlePriceFocus(inputElement, lastYearPrice) {
    if (lastYearPrice && lastYearPrice > 0 && !inputElement.value) {
        // Pre-populate with last year's price as suggestion
        // FIX: Use dot format for input value to avoid parsing errors
        inputElement.value = lastYearPrice.toFixed(2); // Use dot format for input
        inputElement.style.background = '#fef3c7'; // Light yellow background to indicate suggestion
        inputElement.style.color = '#92400e'; // Dark yellow text
        inputElement.select(); // Select all text for easy editing
        
        // Show tooltip with comparison info (display can still use Croatian format)
        inputElement.title = `Prošla godina: €${formatDecimalHR(lastYearPrice)} • Kliknite za prihvaćanje ili unesite novu cijenu`;
        
        // Add event listener for when user starts typing (clears suggestion styling)
        inputElement.addEventListener('input', function clearSuggestionStyling() {
            inputElement.style.background = '';
            inputElement.style.color = '';
            inputElement.removeEventListener('input', clearSuggestionStyling);
        }, { once: true });
    } else {
        inputElement.select();
    }
    
    // Convert comma to dot on input for HTML5 number input compatibility  
    inputElement.addEventListener('input', function convertCommasToDots() {
        if (inputElement.value.includes(',')) {
            const cursorPos = inputElement.selectionStart;
            inputElement.value = inputElement.value.replace(',', '.');
            inputElement.setSelectionRange(cursorPos, cursorPos);
        }
    });
}

async function handlePriceKeydown(event, articleId, targetRB, isOurArticle) {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation(); // FIXED: Prevent event bubbling to main search handler

        const priceInput = event.target;
        const hasPrice = priceInput.value && priceInput.value.trim() !== '';

        // Visual feedback - briefly highlight the input
        priceInput.style.boxShadow = '0 0 10px #10b981';
        setTimeout(() => {
            priceInput.style.boxShadow = '';
        }, 300);

        if (hasPrice) {
            // Show price comparison before adding
            showPriceComparison(articleId, priceInput.value);

            // Price + Enter = First choice (goes to troškovnik)
            await addAsFirstChoice(articleId, targetRB, isOurArticle);

            // OPCIJA A: NE zatvaraj autocomplete - korisnik može nastaviti dodavati
            // Autocomplete će ostati otvoren i automatski se refreshati s Arrow Up/Down ili Option+W/E
            console.log('✅ Autocomplete remains open for fast workflow');
        } else {
            // Empty + Enter = Additional choice (nabavna opcija)
            addAsAdditionalChoice(articleId, targetRB, isOurArticle);

            // Close autocomplete after successful addition
            setTimeout(() => {
                forceCloseAutocomplete();
            }, 100);
        }
    }
}

/**
 * Show price comparison with last year
 */
function showPriceComparison(articleId, currentPrice) {
    const article = articles.find(a => a.id === parseInt(articleId));
    if (!article) return;

    // ✅ Check if article is "NAŠ" before showing last year's price
    const isOurArticle = window.isOurArticleVisual ? window.isOurArticleVisual(article.source) : false;
    if (!isOurArticle) return; // Only show comparison for "NAŠ" articles

    const lastYearPrice = window.getProslogodisnjaCijena ? window.getProslogodisnjaCijena(article.code) : null;
    if (!lastYearPrice) return;
    
    const current = parseFloat(currentPrice.replace(',', '.'));
    const last = parseFloat(lastYearPrice);
    
    if (isNaN(current) || isNaN(last)) return;
    
    const difference = current - last;
    const percentChange = ((difference / last) * 100).toFixed(1);
    
    let comparisonHtml = '';
    if (Math.abs(difference) > 0.01) { // Only show if difference is significant
        const isIncrease = difference > 0;
        const color = isIncrease ? '#dc2626' : '#059669'; // Red for increase, green for decrease
        const arrow = isIncrease ? '↗️' : '↘️';
        const sign = isIncrease ? '+' : '';
        
        comparisonHtml = `
            <div style="position: absolute; top: -25px; left: 0; background: white; border: 1px solid ${color}; border-radius: 4px; padding: 4px 8px; font-size: 10px; color: ${color}; font-weight: bold; z-index: 1000; white-space: nowrap;">
                ${arrow} vs lani €${formatDecimalHR(last)} (${sign}€${formatDecimalHR(Math.abs(difference))}, ${sign}${percentChange}%)
            </div>
        `;
        
        // Find the price input container and add comparison
        const priceInputContainer = document.getElementById(`price-${articleId}-${targetRB}`)?.parentElement;
        if (priceInputContainer) {
            priceInputContainer.style.position = 'relative';
            priceInputContainer.innerHTML += comparisonHtml;
            
            // Remove after 3 seconds
            setTimeout(() => {
                const comparison = priceInputContainer.querySelector('div[style*="position: absolute"]');
                if (comparison) comparison.remove();
            }, 3000);
        }
    }
}

/**
 * Handle weight keydown - Enter moves to price input
 */
function handleWeightKeydown(event, articleId, targetRB) {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation(); // FIXED: Prevent event bubbling to main search handler

        const priceInput = document.getElementById(`price-${articleId}-${targetRB}`);
        if (priceInput) {
            priceInput.focus();
            priceInput.select();
        }
    }
}

/**
 * NEW: Add as first choice - goes to troškovnik (Izlazna + Nabavna 1 + Dobavljač 1)
 * ENHANCED: PDV selection dialog for non-"NAŠ" articles
 */
async function addAsFirstChoice(articleId, targetRB, isOurArticle) {
    // IMPORTANT: Don't allow adding to troškovnik if RB is PENDING
    if (targetRB === "PENDING") {
        alert('Ne možete dodati u troškovnik bez rednog broja!\n\nRezultat će biti dodan u neklasificirane rezultate.\nNakon toga možete ga premjestiti u odgovarajući RB.');

        // Instead, add as additional choice (goes to results only)
        addAsAdditionalChoice(articleId, targetRB, isOurArticle);
        return;
    }

    // ⚠️ PROVJERA: Postoji li već prvi izbor u ovoj RB grupi?
    const existingFirstChoice = results.find(r => r.rb == targetRB && r.isFirstChoice === true);
    if (existingFirstChoice) {
        const message =
            `⚠️ UPOZORENJE: Već postoji prvi izbor za RB ${targetRB}!\n\n` +
            `Trenutni prvi izbor:\n` +
            `📦 ${existingFirstChoice.code} - ${existingFirstChoice.name}\n` +
            `💰 Cijena: €${(existingFirstChoice.pricePerPiece || 0).toFixed(2)}\n\n` +
            `Što želite učiniti?\n\n` +
            `[OK] = Zamijeni (ukloni stari, dodaj novi kao PRVI izbor)\n` +
            `[Odustani] = Ne dodaj ništa (korisnik može ručno dodati kao drugi izbor)`;

        const shouldReplace = confirm(message);

        if (shouldReplace) {
            // Korisnik želi zamijeniti - ukloni stari prvi izbor
            console.log(`🔄 Replacing first choice in RB ${targetRB}: ${existingFirstChoice.code} → articleId ${articleId}`);

            // Makni stari prvi izbor
            const indexToRemove = results.findIndex(r => r.id === existingFirstChoice.id && r.rb === existingFirstChoice.rb);
            if (indexToRemove !== -1) {
                results.splice(indexToRemove, 1);
                selectedResults.delete(`${existingFirstChoice.id}-${existingFirstChoice.rb}`);
                console.log(`✅ Old first choice removed: ${existingFirstChoice.code}`);
            }

            // Nastavi s dodavanjem novog kao prvi izbor (nastavlja se normalno)
        } else {
            // Korisnik je odustao - ne dodaj ništa
            console.log(`❌ User cancelled adding first choice for RB ${targetRB}`);
            return;
        }
    }

    const priceInput = document.getElementById(`price-${articleId}-${targetRB}`);
    const weightInput = document.getElementById(`weight-${articleId}-${targetRB}`);

    if (!priceInput || !priceInput.value || priceInput.value.trim() === '') {
        alert('Molimo unesite cijenu za prvi izbor!');
        if (priceInput) priceInput.focus();
        return;
    }

    // Fix: Handle Croatian decimal format (comma) and convert to dot format
    let priceValue = priceInput.value.trim().replace(',', '.');
    const inputPrice = parseFloat(priceValue);
    if (isNaN(inputPrice) || inputPrice <= 0) {
        alert('Neispravna cijena!');
        priceInput.focus();
        return;
    }
    
    // Update input value to use dot format to prevent HTML5 validation errors
    priceInput.value = inputPrice.toFixed(2);

    let inputWeight = 0;
    
    // Always try to get weight from input field first (for both our and external articles)
    if (weightInput && weightInput.value && weightInput.value.trim() !== '') {
        inputWeight = parseFloat(weightInput.value.trim().replace(',', '.'));
        if (isNaN(inputWeight) || inputWeight <= 0) {
            alert('Neispravna težina!');
            weightInput.focus();
            return;
        }
    }
    
    // For external articles, weight input is mandatory if no weight from input
    if (!isOurArticle && inputWeight === 0) {
        alert('Molimo unesite težinu za vanjski artikl!');
        if (weightInput) weightInput.focus();
        return;
    }

    // Try to find the article in main articles array first, then in autocomplete results
    let article = null;

    // ✅ SPECIAL HANDLING: Weight Database articles with ID format "weight_CODE_RB"
    if (String(articleId).startsWith('weight_')) {
        const parts = String(articleId).split('_'); // ["weight", "CODE", "RB"]
        if (parts.length >= 3) {
            const code = parts[1]; // Extract CODE
            console.log(`🔍 Weight Database article detected (first choice): ID="${articleId}", CODE="${code}"`);

            // Use existing function to recreate full article from weight database
            if (typeof createArticleFromWeightDatabase === 'function') {
                article = createArticleFromWeightDatabase(code, targetRB);
                console.log(`✅ Weight Database article recreated (first choice):`, article);
            }
        }
    }

    // Standard lookup for non-weight-database articles
    if (!article) {
        // ENHANCED SEARCH LOGIC: Try multiple sources
        // Fix: Convert articleId to number for comparison since article.id is numeric
        const articleIdNum = parseInt(articleId);
        const articleIdStr = String(articleId);

        if (typeof articles !== 'undefined' && articles.length > 0) {
            // Try both numeric and string comparison
            article = articles.find(a => a.id === articleIdNum || a.id === articleIdStr || String(a.id) === articleIdStr);
        }

        if (!article && autocompleteResults.length > 0) {
            // Try multiple comparison strategies
            let found1 = autocompleteResults.find(a => a.id === articleIdNum);
            let found2 = autocompleteResults.find(a => a.id === articleIdStr);
            let found3 = autocompleteResults.find(a => String(a.id) === articleIdStr);
            let found4 = autocompleteResults.find(a => a.code === articleIdStr || a.code === articleIdNum);

            // Use the first successful strategy
            article = found1 || found2 || found3 || found4;
        }

        // FALLBACK: Try to reconstruct article from weight database if available
        if (!article && typeof window.weightDatabase !== 'undefined') {
            // Extract code from articleId (assuming format like "code-timestamp" or just "code")
            const possibleCodes = [
                articleId,
                articleId.split('-')[0], // If format is "code-timestamp"
                articleId.replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
            ];

            for (const code of possibleCodes) {
                if (window.weightDatabase.has(code)) {
                    // Create a minimal article object from weight database
                    article = {
                        id: articleId,
                        code: code,
                        name: `Artikl ${code}`, // Basic name
                        unit: 'kom', // Default unit
                        source: 'LAGER', // Assume LAGER since it's in weight DB
                        price: 0 // Will be filled from input
                    };
                    break;
                }
            }
        }
    }
    
    if (!article) {
        console.error(`❌ Article "${articleId}" not found in any source!`);
        console.error(`Available sources checked:`, {
            mainArticles: typeof articles !== 'undefined' ? articles.length : 'undefined',
            autocompleteResults: autocompleteResults.length,
            weightDatabase: typeof window.weightDatabase !== 'undefined' ? window.weightDatabase.size : 'undefined'
        });
        alert(`Artikl "${articleId}" nije pronađen! Molimo pokušajte ponovo ili osvježite stranicu.`);
        return;
    }

    // PENDING CHECK: Skip troškovnik operations for PENDING RB
    let troskovnikItem = null;
    if (targetRB === "PENDING") {
        console.log(`⚠️ PENDING article (first choice): Adding to results only, skipping troškovnik`);
        // Continue with adding to results only, skip troškovnik operations
    } else {
        troskovnikItem = getTroskovnikItemForRB(targetRB);
        if (!troskovnikItem) {
            alert(`Stavka RB ${targetRB} ne postoji u troškovniku!`);
            return;
        }
    }

    // ENHANCED: Determine final weight with special handling for historical articles
    let finalWeight;
    let isHistoricalWithWeight = false;
    
    // Check if this is a historical article that exists in weight database
    if (article.isHistorical && article.code && typeof window.weightDatabase !== 'undefined' && window.weightDatabase.has(article.code)) {
        // Historical article exists in weight database - treat as "our" article
        finalWeight = window.weightDatabase.get(article.code);
        isHistoricalWithWeight = true;
        isOurArticle = true; // Override for calculation purposes
    } else if (isOurArticle) {
        // For truly our articles, prioritize input weight if modified, otherwise use database/extraction
        if (inputWeight > 0) {
            finalWeight = inputWeight;
        } else {
            finalWeight = extractWeight(article.name, article.unit, article.code, article.source) ||
                         article.calculatedWeight || article.weight || 1;
        }
    } else {
        // For external articles (including historical without weight database match)
        if (article.isHistorical) {
            // Historical article not in weight database - check if user entered weight
            if (inputWeight > 0) {
                finalWeight = inputWeight;
            } else {
                alert('Molimo unesite težinu za prošlogodišnji artikl koji nije u bazi težina!');
                if (weightInput) weightInput.focus();
                return;
            }
        } else {
            // Priority: Use weight from input field if provided, otherwise fallback to calculated/stored weight
            if (inputWeight > 0) {
                finalWeight = inputWeight;
            } else {
                finalWeight = article.calculatedWeight || article.weight || 0;
            }
        }
    }

    // Calculate prices (needed for both troškovnik and results)
    const pricePerKg = inputPrice / finalWeight;
    
    // UPDATE TROŠKOVNIK - Only if not PENDING
    if (troskovnikItem) {
        const troskovnikWeight = troskovnikItem.tezina || 1;
        const troskovnikPrice = pricePerKg * troskovnikWeight;
        
        // Calculate nabavna price (original VPC converted to troškovnik weight)
        const originalPricePerKg = article.price / finalWeight;
        const nabavnaPrice = originalPricePerKg * troskovnikWeight;

        // UPDATE TROŠKOVNIK - FIRST CHOICE gets priority positions
        // NOVA LOGIKA: Ako je težina troškovnik stavke = 0, ne preračunavaj cijenu
        if (troskovnikItem.tezina === 0 || troskovnikItem.tezina <= 0) {
            // Koristi originalnu cijenu iz tražilice bez preračunavanja
            // Korisno za proizvode s kompleksnim pakiranjem (npr. "Čaj filter vrećice 40g")
            troskovnikItem.izlazna_cijena = Math.round(inputPrice * 100) / 100;
            troskovnikItem.nabavna_cijena_1 = Math.round(article.price * 100) / 100; // Originalna nabavna cijena
        } else {
            // Postojeća logika preračunavanja na osnovu težine
            troskovnikItem.izlazna_cijena = Math.round(troskovnikPrice * 100) / 100;
            troskovnikItem.nabavna_cijena_1 = Math.round(nabavnaPrice * 100) / 100;
        }
        troskovnikItem.dobavljac_1 = `${article.supplier} (${article.source})`;
        
        // Update najniza_cijena and marza
        const prices = [troskovnikItem.nabavna_cijena_1, troskovnikItem.nabavna_cijena_2].filter(p => p > 0);
        if (prices.length > 0) {
            troskovnikItem.najniza_cijena = Math.min(...prices);
            troskovnikItem.najniza_cijena = Math.round(troskovnikItem.najniza_cijena * 100) / 100;
            
            if (troskovnikItem.najniza_cijena > 0 && troskovnikItem.izlazna_cijena > 0) {
                troskovnikItem.marza = ((troskovnikItem.izlazna_cijena - troskovnikItem.najniza_cijena) / troskovnikItem.najniza_cijena * 100);
                troskovnikItem.marza = Math.round(troskovnikItem.marza * 10) / 10;
            }
        }

        // MISSING RUC/KG CALCULATION FIX: Calculate RUC per kilogram 
        // Formula: ruc_per_kg = (izlazna_cijena - nabavna_cijena_1) / tezina
        const ruc = troskovnikItem.izlazna_cijena - troskovnikItem.nabavna_cijena_1;
        const weight = parseFloat(troskovnikItem.tezina) || 0;
        if (weight > 0) {
            troskovnikItem.ruc_per_kg = Math.round((ruc / weight) * 100) / 100; // Round to 2 decimal places
        } else {
            troskovnikItem.ruc_per_kg = 0;
        }
    }

    // Remove any existing result for this article+RB combo
    const existingIndex = results.findIndex(r => r.id === parseInt(articleId) && r.rb === targetRB);
    if (existingIndex !== -1) {
        results.splice(existingIndex, 1);
    }

    // CRITICAL PDV FIX: Get correct PDV stopa for "our articles"
    let finalPdvStopa = article.pdvStopa || 0;

    if (isOurArticle && article.code && finalPdvStopa === 0) {
        // Try to get PDV from weight/PDV database for our articles
        if (typeof window.getArticleWeightAndPDV === 'function') {
            const pdvData = window.getArticleWeightAndPDV(article.code, article.name, article.unit, article.source);
            if (pdvData.pdvStopa > 0) {
                finalPdvStopa = pdvData.pdvStopa;
            }
        }

        // Alternative: Direct check in PDV database
        if (finalPdvStopa === 0 && typeof window.pdvDatabase !== 'undefined' && window.pdvDatabase.has(article.code)) {
            finalPdvStopa = window.pdvDatabase.get(article.code);
        }
    }

    // ENHANCED: PDV selection for non-"NAŠ" articles
    if (!isOurArticle && finalPdvStopa === 0) {
        try {
            finalPdvStopa = await window.selectPDVRate(article.name);
        } catch (error) {
            console.error('Error in PDV selection dialog:', error);
            finalPdvStopa = 25; // Default fallback
        }
    }

    // Add to results as "first choice"
    const resultItem = {
        ...article,
        rb: targetRB,
        calculatedWeight: finalWeight,
        pricePerKg: Math.round(pricePerKg * 100) / 100,
        hasUserPrice: true,
        userPriceType: 'pricePerPiece',
        pricePerPiece: Math.round(inputPrice * 100) / 100,
        isFirstChoice: true, // Mark as first choice
        troskovnikPosition: 'Izlazna + Nabavna 1',
        // ENHANCED: Mark historical articles that were found in weight database
        isHistoricalWithWeight: isHistoricalWithWeight,
        // Override source for historical articles found in weight database
        source: isHistoricalWithWeight ? 'HISTORICAL_LAGER' : article.source,
        // CRITICAL FIX: Use correct PDV stopa (either from database or default)
        pdvStopa: finalPdvStopa > 0 ? finalPdvStopa : (!isOurArticle ? 25 : 0),
        tarifniBroj: article.tarifniBroj || '',
        // CRITICAL FIX: Set customPdvStopa for external articles
        customPdvStopa: !isOurArticle ? (finalPdvStopa > 0 ? finalPdvStopa : 25) : undefined,
        // JEBENI FIX: FORCE preserve isFromWeightDatabase flag
        isFromWeightDatabase: article.isFromWeightDatabase === true ? true : undefined,
        // NEW: Mark that user has manually entered/modified weight to prevent auto-overwrite
        hasUserWeight: inputWeight > 0
    };

    results.push(resultItem);
    
    const resultKey = `${articleId}-${targetRB}`;
    selectedResults.add(resultKey);

    // Sort results
    if (window.weightOnTopEnabled) {
        results.sort((a, b) => {
            const aHasWeight = (a.calculatedWeight || a.weight || 0) > 0;
            const bHasWeight = (b.calculatedWeight || b.weight || 0) > 0;
            if (aHasWeight !== bHasWeight) return aHasWeight ? -1 : 1;
            if (a.rb !== b.rb) return a.rb - b.rb;
            const aPricePerKg = aHasWeight ? (a.pricePerKg || 0) : Number.POSITIVE_INFINITY;
            const bPricePerKg = bHasWeight ? (b.pricePerKg || 0) : Number.POSITIVE_INFINITY;
            return aPricePerKg - bPricePerKg;
        });
    } else {
        results.sort((a, b) => {
            if (a.rb !== b.rb) return a.rb - b.rb;
            return (a.pricePerKg || 0) - (b.pricePerKg || 0);
        });
    }

    // Update all other results in this RB to be additional choices
    updateAdditionalChoicesForRB(targetRB);

    // Update displays
    if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
    if (typeof updateTroskovnikDisplay === 'function') updateTroskovnikDisplay();

    const successMessage = troskovnikItem ? 
        `🥇 PRVI IZBOR: "${article.name}" postavljen u troškovnik RB ${targetRB}!\n\n` +
        `💰 IZLAZNA CIJENA: €${troskovnikItem.izlazna_cijena.toFixed(2)} (${(troskovnikItem.tezina || 1).toFixed(3)}kg)\n` +
        `📦 NABAVNA 1: €${troskovnikItem.nabavna_cijena_1.toFixed(2)}\n` +
        `🏭 DOBAVLJAČ 1: ${troskovnikItem.dobavljac_1}\n` +
        `⚖️ TEŽINA: ${finalWeight.toFixed(3)}kg\n\n` +
        `✅ Zapisano u troškovnik kao glavni izbor!` :
        `📋 PENDING: "${article.name}" dodan u neklasificirane rezultate!\n\n` +
        `💰 CIJENA: €${inputPrice.toFixed(2)}\n` +
        `⚖️ TEŽINA: ${finalWeight.toFixed(3)}kg\n\n` +
        `⚠️ Premjestite u odgovarajući RB iz sekcije Rezultati!`;

    if (typeof showMessage === 'function') {
        showMessage('success', successMessage);
    } else {
        alert(successMessage);
    }

    // Clear inputs
    priceInput.value = '';
    if (weightInput) weightInput.value = '';

    // Blur (unfocus) price input da se ne ostaje u njemu
    priceInput.blur();
    if (weightInput) weightInput.blur();

    // Fokusiraj glavnu tražilicu za nastavak rada
    const globalSearchInput = document.getElementById('globalSearchInput');
    if (globalSearchInput) {
        setTimeout(() => {
            globalSearchInput.focus({preventScroll: true});
            console.log('✅ Focus returned to search input after adding article');
        }, 100);
    }

    // // console.log(`🥇 FIRST CHOICE added: ${article.name} → Troškovnik RB ${targetRB}`);
}

/**
 * NEW: Add as additional choice - nabavna opcija (Nabavna 2 + Dobavljač 2)
 */
function addAsAdditionalChoice(articleId, targetRB, isOurArticle) {
    // Try to find the article in main articles array first, then in autocomplete results
    let article = null;

    // ENHANCED SEARCH LOGIC: Try multiple sources
    // Fix: Convert articleId to number for comparison since article.id is numeric

    // ✅ SPECIAL HANDLING: Weight Database articles with ID format "weight_CODE_RB"
    if (String(articleId).startsWith('weight_')) {
        const parts = String(articleId).split('_'); // ["weight", "CODE", "RB"]
        if (parts.length >= 3) {
            const code = parts[1]; // Extract CODE
            console.log(`🔍 Weight Database article detected: ID="${articleId}", CODE="${code}"`);

            // Use existing function to recreate full article from weight database
            if (typeof createArticleFromWeightDatabase === 'function') {
                article = createArticleFromWeightDatabase(code, targetRB);
                console.log(`✅ Weight Database article recreated:`, article);
            }
        }
    }

    // ✅ SPECIAL HANDLING: Historical articles with ID format "history_INDEX"
    if (!article && String(articleId).startsWith('history_')) {
        const parts = String(articleId).split('_'); // ["history", "INDEX"]
        if (parts.length === 2) {
            const index = parseInt(parts[1]); // Extract INDEX
            console.log(`🔍 Historical article detected: ID="${articleId}", INDEX="${index}"`);

            // Try to find in proslogodisnjeCijene array
            if (typeof window.proslogodisnjeCijene !== 'undefined' && Array.isArray(window.proslogodisnjeCijene)) {
                const historicalItem = window.proslogodisnjeCijene[index];

                if (historicalItem) {
                    console.log(`✅ Historical article found:`, historicalItem);

                    // Check if article exists in weight database
                    const existsInWeightDb = historicalItem.sifra &&
                                            typeof window.weightDatabase !== 'undefined' &&
                                            window.weightDatabase.has(historicalItem.sifra);

                    let pdvStopa = 0;
                    if (existsInWeightDb && historicalItem.sifra) {
                        if (typeof window.getArticleWeightAndPDV === 'function') {
                            const pdvData = window.getArticleWeightAndPDV(historicalItem.sifra, historicalItem.naziv, historicalItem.jm, 'HISTORICAL');
                            if (pdvData.pdvStopa > 0) {
                                pdvStopa = pdvData.pdvStopa;
                            }
                        }
                        if (pdvStopa === 0 && typeof window.pdvDatabase !== 'undefined' && window.pdvDatabase.has(historicalItem.sifra)) {
                            pdvStopa = window.pdvDatabase.get(historicalItem.sifra);
                        }
                    }

                    // Recreate article object from historical data
                    article = {
                        id: articleId,
                        name: historicalItem.naziv || 'Nepoznat naziv',
                        code: historicalItem.sifra || '',
                        unit: historicalItem.jm || 'kom',
                        price: parseFloat(historicalItem.cijena) || 0,
                        supplier: existsInWeightDb ? 'Prošlogodišnje (iz baze)' : 'Prošlogodišnje cijene',
                        source: 'HISTORICAL',
                        calculatedWeight: existsInWeightDb ? window.weightDatabase.get(historicalItem.sifra) : 0,
                        weight: existsInWeightDb ? window.weightDatabase.get(historicalItem.sifra) : 0,
                        isHistorical: true,
                        isInWeightDatabase: existsInWeightDb,
                        pdvStopa: pdvStopa > 0 ? pdvStopa : 0,
                        customPdvStopa: !existsInWeightDb ? 25 : (pdvStopa > 0 ? pdvStopa : undefined)
                    };
                    console.log(`✅ Historical article recreated for additional choice:`, article);
                } else {
                    console.error(`❌ Historical article not found at index ${index}`);
                }
            }
        }
    }

    // Standard lookup for non-weight-database articles
    if (!article) {
        const articleIdNum = parseInt(articleId);

        if (typeof articles !== 'undefined' && articles.length > 0) {
            article = articles.find(a => a.id === articleIdNum);
        }

        if (!article && autocompleteResults.length > 0) {
            article = autocompleteResults.find(a => a.id === articleIdNum);
        }

        // FALLBACK: Try to reconstruct article from weight database if available
        if (!article && typeof window.weightDatabase !== 'undefined') {
            // Extract code from articleId (assuming format like "code-timestamp" or just "code")
            const possibleCodes = [
                articleId,
                articleId.split('-')[0], // If format is "code-timestamp"
                articleId.replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
            ];

            for (const code of possibleCodes) {
                if (window.weightDatabase.has(code)) {
                    // Create a minimal article object from weight database
                    article = {
                        id: articleId,
                        code: code,
                        name: `Artikl ${code}`, // Basic name
                        unit: 'kom', // Default unit
                        source: 'LAGER', // Assume LAGER since it's in weight DB
                        price: 0 // Will be filled from input
                    };
                    break;
                }
            }
        }
    }
    
    if (!article) {
        console.error(`❌ Article "${articleId}" not found in any source!`);
        console.error(`Available sources checked:`, {
            mainArticles: typeof articles !== 'undefined' ? articles.length : 'undefined',
            autocompleteResults: autocompleteResults.length,
            weightDatabase: typeof window.weightDatabase !== 'undefined' ? window.weightDatabase.size : 'undefined'
        });
        alert(`Artikl "${articleId}" nije pronađen! Molimo pokušajte ponovo ili osvježite stranicu.`);
        return;
    }

    // PENDING CHECK: Skip troškovnik operations for PENDING RB
    let troskovnikItem = null;
    if (targetRB === "PENDING") {
        console.log(`⚠️ PENDING article (additional choice): Adding to results only, skipping troškovnik`);
        // Continue with adding to results only, skip troškovnik operations
    } else {
        troskovnikItem = getTroskovnikItemForRB(targetRB);
        if (!troskovnikItem) {
            alert(`Stavka RB ${targetRB} ne postoji u troškovniku!`);
            return;
        }
    }

    // ENHANCED: Get weight with special handling for historical articles
    let finalWeight;
    let isHistoricalWithWeight = false;
    
    // Check if this is a historical article that exists in weight database
    if (article.isHistorical && article.code && typeof window.weightDatabase !== 'undefined' && window.weightDatabase.has(article.code)) {
        // Historical article exists in weight database - treat as "our" article
        finalWeight = window.weightDatabase.get(article.code);
        isHistoricalWithWeight = true;
        isOurArticle = true; // Override for calculation purposes
    } else if (isOurArticle) {
        finalWeight = extractWeight(article.name, article.unit, article.code, article.source) ||
                     article.calculatedWeight || article.weight || 1;
    } else {
        finalWeight = article.calculatedWeight || article.weight || 0;
    }

    // UPDATE TROŠKOVNIK - Only if not PENDING
    let canUpdateTroskovnik = false;
    if (troskovnikItem) {
        // Calculate nabavna price for troškovnik weight
        const troskovnikWeight = troskovnikItem.tezina || 1;
        const originalPricePerKg = article.price / finalWeight;
        const nabavnaPrice = originalPricePerKg * troskovnikWeight;

        // Check if Nabavna 2 is free, otherwise just add to results
        canUpdateTroskovnik = !troskovnikItem.nabavna_cijena_2 || troskovnikItem.nabavna_cijena_2 === 0;
        
        if (canUpdateTroskovnik) {
            // UPDATE TROŠKOVNIK - Second choice
            // NOVA LOGIKA: Ako je težina troškovnik stavke = 0, ne preračunavaj cijenu
            if (troskovnikItem.tezina === 0 || troskovnikItem.tezina <= 0) {
                // Koristi originalnu cijenu iz tražilice bez preračunavanja
                troskovnikItem.nabavna_cijena_2 = Math.round(article.price * 100) / 100;
            } else {
                // Postojeća logika preračunavanja na osnovu težine
                troskovnikItem.nabavna_cijena_2 = Math.round(nabavnaPrice * 100) / 100;
            }
            troskovnikItem.dobavljac_2 = `${article.supplier} (${article.source})`;
            
            // Update najniza_cijena and marza
            const prices = [troskovnikItem.nabavna_cijena_1, troskovnikItem.nabavna_cijena_2].filter(p => p > 0);
            if (prices.length > 0) {
                troskovnikItem.najniza_cijena = Math.min(...prices);
                troskovnikItem.najniza_cijena = Math.round(troskovnikItem.najniza_cijena * 100) / 100;
                
                if (troskovnikItem.najniza_cijena > 0 && troskovnikItem.izlazna_cijena > 0) {
                    troskovnikItem.marza = ((troskovnikItem.izlazna_cijena - troskovnikItem.najniza_cijena) / troskovnikItem.najniza_cijena * 100);
                    troskovnikItem.marza = Math.round(troskovnikItem.marza * 10) / 10;
                }
            }

            // MISSING RUC/KG CALCULATION FIX: Calculate RUC per kilogram for additional choice
            // Formula: ruc_per_kg = (izlazna_cijena - nabavna_cijena_1) / tezina
            const ruc = troskovnikItem.izlazna_cijena - troskovnikItem.nabavna_cijena_1;
            const weight = parseFloat(troskovnikItem.tezina) || 0;
            if (weight > 0) {
                troskovnikItem.ruc_per_kg = Math.round((ruc / weight) * 100) / 100; // Round to 2 decimal places
            } else {
                troskovnikItem.ruc_per_kg = 0;
            }
        }
    }

    // Remove any existing result for this article+RB combo
    const existingIndex = results.findIndex(r => r.id === parseInt(articleId) && r.rb === targetRB);
    if (existingIndex !== -1) {
        results.splice(existingIndex, 1);
    }

    // ENHANCED: Detect Weight database articles and set appropriate flags
    const isWeightDatabaseArticle = article.isFromWeightDatabase === true ||
                                   article.source === 'WEIGHT_DATABASE' ||
                                   (article.id && String(article.id).startsWith('weight_'));

    // FIXED: Drugi izbor UVIJEK ima cijenu = 0 (samo nabavna opcija, ne utječe na izlaznu cijenu)
    // Tablica rabata će koristiti preračunatu cijenu iz prvog izbora iz troškovnika
    const finalUserPrice = 0;
    const hasValidUserPrice = false;

    // CRITICAL PDV FIX: Get correct PDV stopa for "our articles" (same as in addAsFirstChoice)
    let finalPdvStopa = article.pdvStopa || 0;
    
    if (isOurArticle && article.code && finalPdvStopa === 0) {
        // Try to get PDV from weight/PDV database for our articles
        if (typeof window.getArticleWeightAndPDV === 'function') {
            const pdvData = window.getArticleWeightAndPDV(article.code, article.name, article.unit, article.source);
            if (pdvData.pdvStopa > 0) {
                finalPdvStopa = pdvData.pdvStopa;
                console.log(`🎯 FIXED (addAdditional): Got PDV ${finalPdvStopa}% for our article ${article.code} from database`);
            }
        }
        
        // Alternative: Direct check in PDV database
        if (finalPdvStopa === 0 && typeof window.pdvDatabase !== 'undefined' && window.pdvDatabase.has(article.code)) {
            finalPdvStopa = window.pdvDatabase.get(article.code);
            console.log(`🎯 FIXED (addAdditional): Got PDV ${finalPdvStopa}% for our article ${article.code} from PDV database`);
        }
    }

    // Add to results
    const resultItem = {
        ...article,
        rb: targetRB,
        calculatedWeight: finalWeight,
        pricePerKg: 0, // FIXED: Drugi izbor nema cijenu (koristi se iz prvog izbora)
        hasUserPrice: hasValidUserPrice, // false - nema user cijenu
        userPriceType: null, // null - bez cijene
        pricePerPiece: finalUserPrice, // 0 - drugi izbor nema cijenu
        isFirstChoice: false,
        troskovnikPosition: canUpdateTroskovnik ? 'Nabavna 2' : 'Samo u rezultatima',
        // Keep original VPC data separate for troškovnik calculations
        originalVPC: article.price,
        originalVPCPerKg: finalWeight > 0 ? Math.round((article.price / finalWeight) * 100) / 100 : 0,
        // ENHANCED: Mark historical articles that were found in weight database
        isHistoricalWithWeight: isHistoricalWithWeight,
        // Override source for historical articles found in weight database
        source: isHistoricalWithWeight ? 'HISTORICAL_LAGER' : article.source,
        // ENHANCED: Preserve Weight database flag
        isFromWeightDatabase: isWeightDatabaseArticle,
        // CRITICAL FIX: Use correct PDV stopa (either from database or default)
        pdvStopa: finalPdvStopa > 0 ? finalPdvStopa : (!isOurArticle ? 25 : 0),
        tarifniBroj: article.tarifniBroj || '',
        // CRITICAL FIX: Set customPdvStopa for external articles
        customPdvStopa: !isOurArticle ? (finalPdvStopa > 0 ? finalPdvStopa : 25) : undefined
    };

    results.push(resultItem);
    const resultKey = `${articleId}-${targetRB}`;
    selectedResults.add(resultKey);

    // Sort results
    if (window.weightOnTopEnabled) {
        results.sort((a, b) => {
            const aHasWeight = (a.calculatedWeight || a.weight || 0) > 0;
            const bHasWeight = (b.calculatedWeight || b.weight || 0) > 0;
            if (aHasWeight !== bHasWeight) return aHasWeight ? -1 : 1;
            if (a.rb !== b.rb) return a.rb - b.rb;
            const aPricePerKg = aHasWeight ? (a.pricePerKg || 0) : Number.POSITIVE_INFINITY;
            const bPricePerKg = bHasWeight ? (b.pricePerKg || 0) : Number.POSITIVE_INFINITY;
            return aPricePerKg - bPricePerKg;
        });
    } else {
        results.sort((a, b) => {
            if (a.rb !== b.rb) return a.rb - b.rb;
            return (a.pricePerKg || 0) - (b.pricePerKg || 0);
        });
    }

    // Update displays
    if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
    if (typeof updateTroskovnikDisplay === 'function') updateTroskovnikDisplay();

    const position = troskovnikItem ? (canUpdateTroskovnik ? 'NABAVNA 2' : 'REZULTATIMA') : 'PENDING';
    const successMessage = troskovnikItem ?
        `🥈 DODATNI IZBOR: "${article.name}" dodan u ${position} RB ${targetRB}!\n\n` +
        (canUpdateTroskovnik ? 
            `📦 NABAVNA 2: €${troskovnikItem.nabavna_cijena_2.toFixed(2)}\n` +
            `🏭 DOBAVLJAČ 2: ${troskovnikItem.dobavljac_2}\n` :
            `📊 DODANO U REZULTATE: Nabavna 2 već zauzeta\n`) +
        `⚖️ TEŽINA: ${finalWeight.toFixed(3)}kg\n\n` +
        `✅ Dodan kao nabavna opcija!` :
        `📋 PENDING: "${article.name}" dodan u neklasificirane rezultate!\n\n` +
        `💰 CIJENA: €${article.price.toFixed(2)}\n` +
        `⚖️ TEŽINA: ${finalWeight.toFixed(3)}kg\n\n` +
        `⚠️ Premjestite u odgovarajući RB iz sekcije Rezultati!`;

    if (typeof showMessage === 'function') {
        showMessage('success', successMessage);
    } else {
        alert(successMessage);
    }

    // Fokusiraj glavnu tražilicu nakon dodavanja
    const globalSearchInput = document.getElementById('globalSearchInput');
    if (globalSearchInput) {
        setTimeout(() => {
            globalSearchInput.focus({preventScroll: true});
            console.log('✅ Focus returned to search input after adding additional choice');
        }, 100);
    }

    // // console.log(`🥈 ADDITIONAL CHOICE added: ${article.name} → ${position} RB ${targetRB}`);
}

/**
 * Update all other results in RB to be marked as additional choices
 */
function updateAdditionalChoicesForRB(targetRB) {
    results.forEach(result => {
        if (result.rb === targetRB && !result.isFirstChoice) {
            result.isFirstChoice = false;
            result.troskovnikPosition = result.troskovnikPosition || 'Dodatni izbor';
        }
    });
}
/**
 * UPDATED: Add with price function - now calls first choice logic
 */
async function addWithPriceFromAutocomplete(articleId, targetRB, isOurArticle) {
    // ✅ Button click = First choice (same as Enter with price)
    await addAsFirstChoice(articleId, targetRB, isOurArticle);
}

/**
 * UPDATED: Add without price - now calls additional choice logic
 */
function addWithoutPriceFromAutocomplete(articleId, targetRB) {
    // ✅ Right checkmark = Additional choice (same as Enter on empty field)
    // ENHANCED: Look for article in both main articles and autocomplete results (for historical items)
    let article = null;
    
    // Try main articles first
    if (typeof articles !== 'undefined' && articles.length > 0) {
        article = articles.find(a => a.id === parseInt(articleId) || String(a.id) === String(articleId));
    }
    
    // If not found in main articles, try autocomplete results (for historical items)
    if (!article && autocompleteResults.length > 0) {
        article = autocompleteResults.find(a => a.id === articleId || String(a.id) === String(articleId));
    }
    
    const isOurArticle = article ? window.isTrulyOurArticle(article.source, article.code) : false;
    addAsAdditionalChoice(articleId, targetRB, isOurArticle);
}

/**
 * Handle search input with debounce
 */
function handleSearchInput(event) {
    const query = event.target.value.trim();
    
    if (query.length < 2) {
        forceCloseAutocomplete();
        return;
    }
    
    // Clear previous timeout
    clearTimeout(event.target.searchTimeout);
    
    // Set new timeout
    event.target.searchTimeout = setTimeout(() => {
        const results = performLiveSearch(query);
        if (results && results.length > 0) {
            showAutocomplete(results, event.target);
        } else {
            forceCloseAutocomplete();
        }
    }, 300); // Slightly longer delay for stability
}

/**
 * Handle global search keypress
 */
function handleGlobalSearchKeypress(event) {
    if (event.key === 'Escape') {
        forceCloseAutocomplete();
        return;
    }
    
    if (event.key === 'Enter') {
        event.preventDefault();
        
        if (autocompleteVisible && autocompleteResults.length > 0) {
            // Add all our articles
            const currentQuery = event.target.value.trim();
            const parsedQuery = parseSearchQuery(currentQuery);
            // NOVO: Koristi currentRB ako nema RB u query-u
            const targetRB = (parsedQuery.segments.length > 0 && parsedQuery.segments[0].rb) ?
                             parsedQuery.segments[0].rb :
                             (typeof window.currentRB !== 'undefined' && window.currentRB > 0 ? window.currentRB : "PENDING");
            
            const ourArticles = autocompleteResults.filter(item => window.isTrulyOurArticle(item.source, item.code));
            if (ourArticles.length > 0) {
                addAllOurArticles(ourArticles, targetRB);
            }
        } else {
            performGlobalSearch();
        }
    }
}

/**
 * Add all our articles at once
 */
function addAllOurArticles(ourArticles, targetRB) {
    let addedCount = 0;
    
    ourArticles.forEach(item => {
        // Remove existing if present
        const existingIndex = results.findIndex(r => r.id === item.id && r.rb === targetRB);
        if (existingIndex !== -1) {
            results.splice(existingIndex, 1);
        }
        
        // Use enhanced weight logic for our articles
        const calculatedWeight = extractWeight(item.name, item.unit, item.code, item.source) || 
                               item.calculatedWeight || item.weight || 0;
        // // console.log(`✅ Our article weight (bulk add): ${calculatedWeight}kg for ${item.code}`);
        
        const resultItem = {
            ...item,
            rb: targetRB,
            calculatedWeight: calculatedWeight,
            pricePerKg: calculatedWeight > 0 ? item.price / calculatedWeight : 0,
            hasUserPrice: false,
            userPriceType: null,
            pricePerPiece: 0
        };
        
        results.push(resultItem);
        const resultKey = `${item.id}-${targetRB}`;
        selectedResults.add(resultKey);
        addedCount++;
    });
    
    // Sort results
    if (window.weightOnTopEnabled) {
        results.sort((a, b) => {
            const aHasWeight = (a.calculatedWeight || a.weight || 0) > 0;
            const bHasWeight = (b.calculatedWeight || b.weight || 0) > 0;
            if (aHasWeight !== bHasWeight) return aHasWeight ? -1 : 1;
            if (a.rb !== b.rb) return a.rb - b.rb;
            const aPricePerKg = aHasWeight ? (a.pricePerKg || 0) : Number.POSITIVE_INFINITY;
            const bPricePerKg = bHasWeight ? (b.pricePerKg || 0) : Number.POSITIVE_INFINITY;
            return aPricePerKg - bPricePerKg;
        });
    } else {
        results.sort((a, b) => {
            if (a.rb !== b.rb) return a.rb - b.rb;
            return (a.pricePerKg || 0) - (b.pricePerKg || 0);
        });
    }
    
    // Update displays
    if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
    if (typeof showTab === 'function') showTab('results');
    
    const message = `✅ Dodano ${addedCount} NAŠIH artikala u grupu ${targetRB}`;
    if (typeof showMessage === 'function') {
        showMessage('success', message);
    } else {
        alert(message);
    }
}

/**
 * Get troškovnik item for RB
 */
function getTroskovnikItemForRB(rb) {
    if (!window.troskovnik || window.troskovnik.length === 0) return null;
    return window.troskovnik.find(item => item.redni_broj == rb) || null;
}

/**
 * Perform global search
 */
function performGlobalSearch() {
    const query = document.getElementById('globalSearchInput')?.value;
    if (!query?.trim()) {
        alert('Unesite pojam za pretragu!');
        return;
    }

    try {
        const parsedQuery = parseSearchQuery(query);
        let targetRB = "PENDING";

        // ENHANCED: Provjeri postoji li RB u query-u (backwards compatible)
        if (parsedQuery.segments.length > 0 && parsedQuery.segments[0].rb) {
            targetRB = parsedQuery.segments[0].rb;
            // Update currentRB display ako korisnik upiše "5. krastavac"
            if (typeof window.currentRB !== 'undefined') {
                window.currentRB = targetRB;
                const rbInput = document.getElementById('currentRB');
                if (rbInput) rbInput.value = targetRB;
            }
        } else if (typeof window.currentRB !== 'undefined' && window.currentRB > 0) {
            // NOVO: Koristi trenutni RB iz selectora ako nema RB-a u query-u
            targetRB = window.currentRB;
        }
        
        // Clear existing results for this RB
        const existingResultsForRB = results.filter(r => r.rb == targetRB);
        if (existingResultsForRB.length > 0) {
            results = results.filter(r => r.rb != targetRB);
            existingResultsForRB.forEach(item => {
                selectedResults.delete(`${item.id}-${item.rb}`);
            });
        }
        
        let searchResults = searchArticles(window.articles, parsedQuery);

        // OUR ARTICLES filter - filter out LAGER/URPD if checkbox is unchecked
        if (!window.ourArticlesFilterEnabled) {
            searchResults = searchResults.filter(item => {
                const source = (item.source || '').toLowerCase();
                // Exclude if source contains 'lager' or 'urpd'
                return !(source.includes('lager') || source.includes('urpd'));
            });
        }

        // ROTO filter
        if (!window.rotoFilterEnabled) {
            searchResults = searchResults.filter(item => {
                const supplier = (item.supplier || '').toLowerCase();
                const source = (item.source || '').toLowerCase();
                return supplier !== 'roto' && source !== 'roto';
            });
        }

        if (searchResults.length === 0) {
            if (typeof showMessage === 'function') {
                showMessage('error', `Nema rezultata za "${query}"`);
            } else {
                alert(`Nema rezultata za "${query}"`);
            }
            if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
            return;
        }

        let addedCount = 0;
        searchResults.forEach(newItem => {
            newItem.rb = targetRB;
            newItem.hasUserPrice = false;
            newItem.userPriceType = null;
            newItem.pricePerPiece = 0;
            
            // CRITICAL FIX: Assign PDV data for global search results
            let finalPdvStopa = 0;
            const isOurArticle = window.isTrulyOurArticle(newItem.source, newItem.code);
            
            if (isOurArticle && newItem.code) {
                // Try to get PDV data using weight database function
                if (typeof window.getArticleWeightAndPDV === 'function') {
                    const pdvData = window.getArticleWeightAndPDV(newItem.code, newItem.name, newItem.unit, newItem.source);
                    if (pdvData.pdvStopa > 0) {
                        finalPdvStopa = pdvData.pdvStopa;
                    }
                }
                
                // Fallback: Try PDV database directly
                if (finalPdvStopa === 0 && typeof window.pdvDatabase !== 'undefined' && window.pdvDatabase.has(newItem.code)) {
                    finalPdvStopa = window.pdvDatabase.get(newItem.code);
                }
            }
            
            // Assign PDV data to result object
            if (finalPdvStopa > 0) {
                newItem.pdvStopa = finalPdvStopa;
                if (!isOurArticle) {
                    newItem.customPdvStopa = finalPdvStopa;
                }
            } else if (!isOurArticle) {
                // Default 25% PDV for external articles
                newItem.customPdvStopa = 25;
            }
            
            results.push(newItem);
            addedCount++;
            const resultKey = `${newItem.id}-${newItem.rb}`;
            selectedResults.add(resultKey);
        });

        // Sort results
        if (window.weightOnTopEnabled) {
            results.sort((a, b) => {
                const aHasWeight = (a.calculatedWeight || a.weight || 0) > 0;
                const bHasWeight = (b.calculatedWeight || b.weight || 0) > 0;
                if (aHasWeight !== bHasWeight) return aHasWeight ? -1 : 1;
                if (a.rb !== b.rb) return a.rb - b.rb;
                const aPricePerKg = aHasWeight ? (a.pricePerKg || 0) : Number.POSITIVE_INFINITY;
                const bPricePerKg = bHasWeight ? (b.pricePerKg || 0) : Number.POSITIVE_INFINITY;
                return aPricePerKg - bPricePerKg;
            });
        } else {
            results.sort((a, b) => {
                if (a.rb !== b.rb) return a.rb - b.rb;
                return (a.pricePerKg || 0) - (b.pricePerKg || 0);
            });
        }

        // Update displays
        if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
        if (typeof showTab === 'function') showTab('results');
        
        const message = `✅ Dodano ${addedCount} rezultata za "${query}" u grupu ${targetRB}`;
        if (typeof showMessage === 'function') {
            showMessage('success', message);
        } else {
            alert(message);
        }
        
        // Clear search input
        document.getElementById('globalSearchInput').value = '';
        
    } catch (error) {
        console.error('Search error:', error);
        if (typeof showMessage === 'function') {
            showMessage('error', `Greška pri pretrazi: ${error.message}`);
        } else {
            alert(`Greška pri pretrazi: ${error.message}`);
        }
    }
}

/**
 * FIXED: Initialize search with ONLY Escape closing
 */
function initializeStickySearchAutocomplete() {
    const globalSearchInput = document.getElementById('globalSearchInput');
    if (globalSearchInput) {
        // Add input handler for autocomplete
        globalSearchInput.addEventListener('input', handleSearchInput);
        
        // Add keydown handler
        globalSearchInput.addEventListener('keydown', handleGlobalSearchKeypress);
        
        // // console.log('✅ FIXED: Sticky search initialized - dropdown persists until Escape');
    } else {
        console.error('❌ globalSearchInput not found!');
    }
}

/**
 * FIXED: Global Escape handler - ONLY way to close dropdown
 */
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        if (autocompleteVisible) {
            event.preventDefault();
            event.stopPropagation();
            forceCloseAutocomplete();
            // // console.log('🔴 Global Escape pressed - autocomplete closed');
            return true;
        }
    }
}, true);

/**
 * FIXED: Override any legacy hideAutocomplete calls
 */
window.hideAutocomplete = function() {
    // Intentionally do nothing - only Escape should close
    // // console.log('🚫 hideAutocomplete called but ignored - use Escape to close');
};

/**
 * NOVA FUNKCIJA: Pretraži prošlogodišnje cijene za autocomplete
 * @param {string} query - Search query
 * @param {Object} parsedQuery - Parsed query object  
 * @returns {Array} Array of formatted results for autocomplete
 */
function searchProslogodisnjeCijene(query, parsedQuery) {
    if (!proslogodisnjeCijene || proslogodisnjeCijene.length === 0) return [];
    
    // ISPRAVKA: Koristi parsirane tokene umjesto cijelog query stringa
    // Za upit "22. Cikla" koristiti samo tokene ["cikla"], ne "22. cikla"
    const searchTokens = parsedQuery.segments.length > 0 ? 
        parsedQuery.segments[0].tokens : 
        query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
    
    const results = [];
    
    // Filter prošlogodišnje cijene based on parsed tokens
    proslogodisnjeCijene.forEach((item, index) => {
        const name = (item.naziv || '').toLowerCase();
        const code = (item.sifra || '').toLowerCase();
        
        // NOVA LOGIKA: Provjeri da svi tokeni postoje u nazivu ili šifri
        const matchesTokens = searchTokens.length === 0 || searchTokens.every(token => 
            name.includes(token) || code.includes(token)
        );
        
        if (matchesTokens) {
            // ISPRAVKA: Dodaj RB iz parsiranog query-ja
            // NOVO: Koristi currentRB ako nema RB u query-u
            const targetRB = parsedQuery.segments.length > 0 && parsedQuery.segments[0].rb ?
                parsedQuery.segments[0].rb :
                (typeof window.currentRB !== 'undefined' && window.currentRB > 0 ? window.currentRB : 1);
            
            // ENHANCED: Check if this historical article exists in weight database
            const existsInWeightDb = typeof window.weightDatabase !== 'undefined' && 
                                   window.weightDatabase.has(item.sifra || '');
            
            // CRITICAL FIX: Get PDV data for historical articles
            let pdvStopa = 0;
            if (existsInWeightDb && item.sifra) {
                // Try to get PDV data from weight database
                if (typeof window.getArticleWeightAndPDV === 'function') {
                    const pdvData = window.getArticleWeightAndPDV(item.sifra, item.naziv, item.jm, 'HISTORICAL');
                    if (pdvData.pdvStopa > 0) {
                        pdvStopa = pdvData.pdvStopa;
                    }
                }
                
                // Fallback: Try PDV database directly
                if (pdvStopa === 0 && typeof window.pdvDatabase !== 'undefined' && window.pdvDatabase.has(item.sifra)) {
                    pdvStopa = window.pdvDatabase.get(item.sifra);
                }
            }
            
            // Format as autocomplete result (compatible with existing structure)
            const formattedResult = {
                id: `history_${index}`, // Unique ID with prefix
                name: item.naziv || 'Nepoznat naziv',
                code: item.sifra || '',
                unit: item.jm || 'kom',
                price: parseFloat(item.cijena) || 0,
                supplier: existsInWeightDb ? 'Prošlogodišnje (iz baze)' : 'Prošlogodišnje cijene',
                source: 'HISTORICAL',
                calculatedWeight: existsInWeightDb ? window.weightDatabase.get(item.sifra || '') : 0,
                weight: existsInWeightDb ? window.weightDatabase.get(item.sifra || '') : 0,
                pricePerKg: 0, // Will be calculated later
                isHistorical: true, // Special flag for styling
                isInWeightDatabase: existsInWeightDb, // NEW: Flag to indicate if in weight database
                historicalYear: 'Prošla godina',
                rb: targetRB, // DODAJ RB za ispravno dodavanje u rezultate
                // CRITICAL FIX: Include PDV data
                pdvStopa: pdvStopa > 0 ? pdvStopa : 0,
                customPdvStopa: !existsInWeightDb ? 25 : (pdvStopa > 0 ? pdvStopa : undefined)
            };
            
            results.push(formattedResult);
        }
    });
    
    // Limit results to prevent overwhelming autocomplete
    return results.slice(0, 5);
}

/**
 * Create article from weight database for direct code search
 * RESTORED: Original logic from working version - reads ONLY from HTML table
 * @param {string} code - šifra artikla
 * @param {number} targetRB - RB za koji se dodaje
 * @returns {Object|null} Formatiran artikl ili null ako ne postoji
 */
function createArticleFromWeightDatabase(code, targetRB) {
    console.log(`🔍 DEBUG: Searching for code "${code}" (type: ${typeof code}) in HTML table`);

    let weightData = null;
    let dataSource = null;

    // PRIORITY 1: Read from HTML table in "Težine" tab (as in working version)
    const weightsTableBody = document.getElementById('weightsTableBody');
    if (weightsTableBody) {
        const tableRows = weightsTableBody.querySelectorAll('tr');
        console.log(`📊 Searching in HTML table: ${tableRows.length} rows`);

        // Search for the code in column 0 (šifra)
        for (const row of tableRows) {
            const cells = row.cells;
            if (cells && cells.length > 0) {
                const cellCode = cells[0].textContent.trim();

                // Try different matching approaches
                if (cellCode === code ||
                    cellCode === String(code) ||
                    String(cellCode) === String(code) ||
                    parseInt(cellCode) === parseInt(code)) {

                    console.log(`✅ MATCH FOUND in HTML table for "${code}"`);

                    // Extract weight from input element first, then fallback to textContent
                    const weightInput = cells[7] ? cells[7].querySelector('input[type="number"]') : null;
                    const weightFromInput = weightInput ? parseFloat(weightInput.value) : null;
                    const weightFromText = cells[7] ? parseFloat(cells[7].textContent.trim()) : null;
                    const finalWeight = weightFromInput || weightFromText || 0;

                    // Extract data according to column structure:
                    // 0=šifra, 1=podgrupa, 2=naziv, 3=JM, 4=TB, 5=PDV%, 6=dobavljač, 7=težina
                    weightData = {
                        sifra: cells[0] ? cells[0].textContent.trim() : '',
                        podgrupa: cells[1] ? cells[1].textContent.trim() : '',
                        naziv: cells[2] ? cells[2].textContent.trim() : '',
                        jedinica: cells[3] ? cells[3].textContent.trim() : 'kom',
                        tarifniBroj: cells[4] ? cells[4].textContent.trim() : '',
                        pdvStopa: parseFloat(cells[5] ? cells[5].textContent.trim() : '0') || 0,
                        dobavljac: cells[6] ? cells[6].textContent.trim() : '',
                        tezinaKg: finalWeight
                    };
                    dataSource = 'HTML_TABLE';
                    break;
                }
            }
        }
    }

    // PRIORITY 2: Fallback to weightDatabase Map (minimal data - only weight, no name)
    if (!weightData && window.weightDatabase && window.weightDatabase.has(code)) {
        console.log(`📊 FALLBACK: Found in weightDatabase Map (no name available)`);
        const dbWeight = window.weightDatabase.get(code);
        weightData = {
            sifra: code,
            podgrupa: '',
            naziv: '', // No name in Map - user needs to load Google Sheets
            jedinica: 'kom',
            tarifniBroj: '',
            pdvStopa: 0,
            dobavljac: '',
            tezinaKg: dbWeight
        };
        dataSource = 'WEIGHT_DATABASE_MAP';
    }

    if (!weightData) {
        console.log(`❌ Code ${code} NOT FOUND in any source`);
        // Show available codes from HTML table
        if (weightsTableBody) {
            const tableRows = weightsTableBody.querySelectorAll('tr');
            const availableCodes = [];
            for (let i = 0; i < Math.min(10, tableRows.length); i++) {
                const cells = tableRows[i].cells;
                if (cells && cells[0]) {
                    availableCodes.push(`"${cells[0].textContent.trim()}"`);
                }
            }
            console.log(`Available codes in HTML table:`, availableCodes.join(', '));
        }
        return null;
    }

    console.log(`✅ Found code ${code} from ${dataSource}:`, weightData);

    // Use data from found source
    const articleName = weightData.naziv || `Nepoznat naziv ${code}`;
    const tarifniBroj = weightData.tarifniBroj || '';
    let pdvStopa = weightData.pdvStopa || 0;

    console.log(`📝 Article name: "${articleName}"`);
    console.log(`📊 Tarifni broj: "${tarifniBroj}"`);
    console.log(`💰 PDV stopa: ${pdvStopa}%`);

    // FALLBACK: If PDV stopa is 0, try calculating from tarifni broj
    if (pdvStopa === 0 && tarifniBroj && window.mapTarifniBrojToPDV) {
        const calculatedPdv = window.mapTarifniBrojToPDV(tarifniBroj);
        if (calculatedPdv > 0) {
            pdvStopa = calculatedPdv;
            console.log(`🔄 Fallback PDV calculation from tarifni broj: ${pdvStopa}%`);
        }
    }

    // Format as standard article object (compatible with existing system)
    const article = {
        id: `weight_${code}_${targetRB}`,
        name: `${articleName} (${code})`,
        code: code,
        unit: weightData.jedinica || 'kom',
        price: 0,
        pricePerPiece: 0,
        hasUserPrice: true,
        supplier: weightData.dobavljac || 'Iz baze težina',
        source: 'WEIGHT_DATABASE',
        calculatedWeight: weightData.tezinaKg || 0,
        weight: weightData.tezinaKg || 0,
        pricePerKg: 0,
        rb: targetRB,
        isFromWeightDatabase: true,
        tarifniBroj: tarifniBroj,
        pdvStopa: pdvStopa
    };

    return article;
}

/**
 * Handle history priority checkbox change
 */
function handleHistoryPriorityChange() {
    // Refresh autocomplete if search is active
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput && searchInput.value.trim().length >= 2) {
        const results = performLiveSearch(searchInput.value.trim());
        if (results && results.length > 0) {
            showAutocomplete(results, searchInput);
        }
    }
}

// Helper za prikaz broja s dvije decimale i zarezom
function formatDecimalHR(value) {
    if (typeof value !== 'number' || isNaN(value)) return value;
    return value.toFixed(2).replace('.', ',');
}

// Helper za parsiranje hrvatskog formata natrag u broj (za input polja)
function parseDecimalHR(value) {
    if (typeof value !== 'string') return value;
    return value.replace(',', '.');
}

// Export all necessary functions globally
window.performGlobalSearch = performGlobalSearch;
window.handleGlobalSearchKeypress = handleGlobalSearchKeypress;
window.handleSearchInput = handleSearchInput;
window.forceCloseAutocomplete = forceCloseAutocomplete;
window.showAutocomplete = showAutocomplete;
window.initializeStickySearchAutocomplete = initializeStickySearchAutocomplete;
window.addWithPriceFromAutocomplete = addWithPriceFromAutocomplete;
window.addWithoutPriceFromAutocomplete = addWithoutPriceFromAutocomplete;
window.isOurArticle = isOurArticle;
window.isWeightFromDatabase = isWeightFromDatabase;
window.extractWeight = extractWeight;
window.performLiveSearch = performLiveSearch;
window.searchProslogodisnjeCijene = searchProslogodisnjeCijene;
window.handleHistoryPriorityChange = handleHistoryPriorityChange;
window.createArticleFromWeightDatabase = createArticleFromWeightDatabase;

// Globalna varijabla za filter "Prikaži NAŠE artikle (LAGER/URPD)"
window.ourArticlesFilterEnabled = true;
window.setOurArticlesFilterEnabled = function(enabled) {
    window.ourArticlesFilterEnabled = enabled;
    // Trigger refresh of autocomplete if active
    const globalSearchInput = document.getElementById('globalSearchInput');
    if (globalSearchInput && globalSearchInput.value.trim().length >= 2) {
        const results = performLiveSearch(globalSearchInput.value.trim());
        if (results && results.length > 0) {
            showAutocomplete(results, globalSearchInput);
        } else {
            forceCloseAutocomplete();
        }
    }
    if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
};

window.rotoFilterEnabled = true;
window.setRotoFilterEnabled = function(enabled) {
    window.rotoFilterEnabled = enabled;
    // Trigger refresh of autocomplete/results if needed
    if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
};

// Globalna varijabla za "Sa težinom na vrh"
window.weightOnTopEnabled = true;
window.setWeightOnTopEnabled = function(enabled) {
    window.weightOnTopEnabled = enabled;
    if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
};

// Globalna varijabla za filter 'ista šifra - najnoviji datum'
window.latestPerCodeEnabled = false;
window.setLatestPerCodeEnabled = function(enabled) {
    window.latestPerCodeEnabled = enabled;
    if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStickySearchAutocomplete);
} else {
    initializeStickySearchAutocomplete();
}

/**
 * Show dialog for creating custom "po cjeniku" article
 */
function showCustomArticleDialog(naziv, targetRB) {
    const dialog = document.createElement('div');
    dialog.id = 'custom-article-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const dialogContent = document.createElement('div');
    dialogContent.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        max-width: 500px;
        width: 90%;
    `;
    
    dialogContent.innerHTML = `
        <h3 style="margin: 0 0 16px 0; color: #7c3aed; font-size: 20px;">
            ➕ Dodaj novi po cjeniku artikal
        </h3>
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: bold; color: #374151;">Naziv artikla:</label>
            <input type="text" id="customArticleName" value="${naziv}" style="width: 100%; padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 6px; font-size: 14px;" />
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: bold; color: #374151;">Težina (kg):</label>
            <input type="number" id="customArticleWeight" step="0.001" min="0" placeholder="npr. 0.5" style="width: 100%; padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 6px; font-size: 14px;" />
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: bold; color: #374151;">Cijena (€):</label>
            <input type="number" id="customArticlePrice" step="0.01" min="0" placeholder="npr. 2.50" style="width: 100%; padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 6px; font-size: 14px;" />
        </div>
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 4px; font-weight: bold; color: #374151;">Stopa PDV (%):</label>
            <select id="customArticlePDV" style="width: 100%; padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 6px; font-size: 14px;">
                <option value="25">25% (standardna stopa)</option>
                <option value="5">5% (snižena stopa)</option>
                <option value="0">0% (oslobođeno)</option>
            </select>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button onclick="closeCustomArticleDialog()" style="padding: 8px 16px; border: 2px solid #e5e7eb; background: white; border-radius: 6px; cursor: pointer; font-size: 14px;">
                Otkaži
            </button>
            <button onclick="createCustomArticle('${targetRB}')" style="padding: 8px 16px; border: none; background: #7c3aed; color: white; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold;">
                Dodaj artikal
            </button>
        </div>
    `;
    
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('customArticleName').focus();
    }, 100);
    
    // Close on ESC
    document.addEventListener('keydown', function closeOnEsc(e) {
        if (e.key === 'Escape') {
            closeCustomArticleDialog();
            document.removeEventListener('keydown', closeOnEsc);
        }
    });
    
    // Close on outside click
    dialog.addEventListener('click', function(e) {
        if (e.target === dialog) {
            closeCustomArticleDialog();
        }
    });
}

/**
 * Close custom article dialog
 */
function closeCustomArticleDialog() {
    const dialog = document.getElementById('custom-article-dialog');
    if (dialog) {
        dialog.remove();
    }
}

/**
 * Create custom article and add to results
 */
function createCustomArticle(targetRB) {
    const name = document.getElementById('customArticleName').value.trim();
    const weight = parseFloat(document.getElementById('customArticleWeight').value) || 0;
    const price = parseFloat(document.getElementById('customArticlePrice').value) || 0;
    const pdvStopa = parseInt(document.getElementById('customArticlePDV').value) || 25;
    
    if (!name) {
        alert('Molimo unesite naziv artikla!');
        return;
    }
    
    if (weight <= 0) {
        alert('Molimo unesite valju težinu!');
        return;
    }
    
    if (price <= 0) {
        alert('Molimo unesite valju cijenu!');
        return;
    }
    
    // Generate unique ID for custom article
    const customId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create custom article object
    const customArticle = {
        id: customId,
        name: name,
        unit: 'kom',
        price: price,
        supplier: 'Po cjeniku',
        source: 'Po cjeniku',
        code: customId,
        date: new Date().toISOString(),
        comment: 'Ručno dodano',
        rb: targetRB,
        calculatedWeight: weight,
        pricePerKg: price / weight,
        pricePerPiece: price,
        hasUserPrice: true,
        userPriceType: 'pricePerPiece',
        isCustomArticle: true,
        customPdvStopa: pdvStopa
    };
    
    // Add to results
    if (typeof window.results === 'undefined') {
        window.results = [];
    }
    results.push(customArticle);
    
    // Update troškovnik - only if not PENDING
    if (targetRB !== "PENDING") {
        const troskovnikItem = getTroskovnikItemForRB(targetRB);
        if (troskovnikItem) {
        const troskovnikWeight = troskovnikItem.tezina || 1;
        const troskovnikPrice = (price / weight) * troskovnikWeight;
        
        // NOVA LOGIKA: Ako je težina troškovnik stavke = 0, ne preračunavaj cijenu
        if (troskovnikItem.tezina === 0 || troskovnikItem.tezina <= 0) {
            // Koristi originalnu cijenu bez preračunavanja
            troskovnikItem.izlazna_cijena = Math.round(price * 100) / 100;
            troskovnikItem.nabavna_cijena_1 = Math.round(price * 100) / 100;
        } else {
            // Postojeća logika preračunavanja na osnovu težine
            troskovnikItem.izlazna_cijena = Math.round(troskovnikPrice * 100) / 100;
            troskovnikItem.nabavna_cijena_1 = Math.round(troskovnikPrice * 100) / 100;
        }
        troskovnikItem.dobavljac_1 = `Po cjeniku (Custom)`;
        troskovnikItem.found_results = (troskovnikItem.found_results || 0) + 1;
        
        // Update najniza_cijena
        const prices = [troskovnikItem.nabavna_cijena_1, troskovnikItem.nabavna_cijena_2].filter(p => p > 0);
        if (prices.length > 0) {
            troskovnikItem.najniza_cijena = Math.min(...prices);
        }
        }
    }
    
    // Update displays
    if (typeof updateResultsDisplay === 'function') {
        updateResultsDisplay();
    }
    if (typeof TroskovnikUI !== 'undefined' && TroskovnikUI.render) {
        TroskovnikUI.render();
    }
    
    // Close dialog and autocomplete
    closeCustomArticleDialog();
    forceCloseAutocomplete();
    
    // Clear search input
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Show success message
    if (typeof showMessage === 'function') {
        showMessage('success', 
            `✅ Dodan po cjeniku artikal: ${name}\n` +
            `📊 Težina: ${weight}kg\n` +
            `💰 Cijena: €${price.toFixed(2)}\n` +
            `📋 PDV: ${pdvStopa}%\n` +
            `🎯 Grupa: ${targetRB}`, 
            'resultsStatus'
        );
    }
}

// Export functions
window.showCustomArticleDialog = showCustomArticleDialog;
window.closeCustomArticleDialog = closeCustomArticleDialog;
window.createCustomArticle = createCustomArticle;

// // console.log('✅ FIXED Enhanced Search loaded - dropdown PERSISTS until Escape!');
// // console.log('🎯 ONLY Escape key or ✕ button will close the dropdown');
// // console.log('💡 You can freely click in price/weight inputs without dropdown closing');
// // console.log('⚡ Google Sheets prioritet za težine - weightDatabase prvi!');
// // console.log('🟢 Zelene težine = iz baze, 🟡 Žute težine = parsirane');
// // console.log('➕ NEW: Custom po cjeniku articles with PDV support');