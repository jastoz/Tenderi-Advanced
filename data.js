/**
 * DATA MANAGEMENT MODULE - ENHANCED WITH PDV FUNCTIONALITY
 * Upravlja svim podacima aplikacije s PDV stopama
 */

// Global data stores - ENHANCED WITH PDV FUNCTIONALITY
let articles = []; // Demo podaci uklonjeni - upload-ajte svoje podatke

let results = [];
let troskovnik = [];
let selectedResults = new Set();
let preracunResults = [];

/**
 * Updates article statistics counters - ENHANCED WITH PDV STATS
 */
function updateArticleStats() {
    // Basic counts
    document.getElementById('articlesCount').textContent = articles.length;
    document.getElementById('lagerCount').textContent = articles.filter(a => 
        a.source && a.source.toLowerCase().includes('lager')).length;
    document.getElementById('urpdCount').textContent = articles.filter(a => 
        a.source && a.source.toLowerCase().includes('urpd')).length;
    document.getElementById('cjeniciCount').textContent = articles.filter(a => 
        a.source && !a.source.toLowerCase().includes('lager') && 
        !a.source.toLowerCase().includes('urpd')).length;
    
    // TAB COUNTS - Critical for drag & drop functionality
    updateElementIfExists('resultsCount', (typeof results !== 'undefined') ? results.length : 0);
    updateElementIfExists('resultsCountText', (typeof results !== 'undefined') ? results.length : 0);
    
    updateElementIfExists('troskovnikCount', (typeof troskovnik !== 'undefined') ? troskovnik.length : 0);
    updateElementIfExists('troskovnikCountText', (typeof troskovnik !== 'undefined') ? troskovnik.length : 0);
    
    updateElementIfExists('tablicaRabataCount', (typeof tablicaRabata !== 'undefined') ? tablicaRabata.length : 0);
    
    // Prošlogodišnje cijene count
    updateElementIfExists('proslogodisnjeCijeneCount', (typeof proslogodisnjeCijene !== 'undefined') ? proslogodisnjeCijene.length : 0);
    
    // Weight database counts
    const weightDbSize = (typeof weightDatabase !== 'undefined') ? weightDatabase.size : 0;
    updateElementIfExists('weightsCount', weightDbSize);
    updateElementIfExists('weightsDbCount', weightDbSize);
    
    // Enhanced: PDV statistics
    const pdv5Count = articles.filter(a => a.pdvStopa === 5).length;
    const pdv25Count = articles.filter(a => a.pdvStopa === 25).length;
    const pdvTotalCount = articles.filter(a => a.pdvStopa > 0).length;
    
    if (articles.length > 0) {
        // // console.log(`📊 PDV statistike: ${pdv5Count} x 5%, ${pdv25Count} x 25%, ukupno ${pdvTotalCount} s PDV`);
    } else {
        // // console.log('📊 Nema artikala za statistike');
    }
}

/**
 * Helper function to safely update DOM elements
 */
function updateElementIfExists(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Adds new articles to the main articles array - ENHANCED WITH PDV VALIDATION
 * @param {Array} newArticles - Array of new articles to add
 */
function addArticles(newArticles) {
    const startId = articles.length > 0 ? Math.max(...articles.map(a => a.id)) + 1 : 1;
    newArticles.forEach((article, index) => {
        article.id = startId + index;
        
        // FORCE 2 DECIMALS for all price fields
        if (article.price) {
            article.price = Math.round(article.price * 100) / 100;
        }
        if (article.pricePerKg) {
            article.pricePerKg = Math.round(article.pricePerKg * 100) / 100;
        }
        
        // ENHANCED: Ensure PDV data is present
        if (!article.tarifniBroj) {
            article.tarifniBroj = '';
        }
        if (!article.pdvStopa) {
            article.pdvStopa = 0;
        }
        
        articles.push(article);
    });
    updateArticleStats();
    
    if (articles.length === newArticles.length) {
        // // console.log(`✅ Added ${newArticles.length} articles with PDV data (first upload)`);
    } else {
        // // console.log(`✅ Added ${newArticles.length} articles with PDV data (total: ${articles.length})`);
    }
}

/**
 * Gets demo troškovnik data with comments - ENHANCED S 2 DECIMALE + TEŽINA
 * @returns {Array} Demo troškovnik data
 */
function getDemoTroskovnik() {
    return [
        {
            id: 1,
            redni_broj: 1,
            custom_search: '',
            naziv_artikla: 'Kompot jagoda 3/1',
            mjerna_jedinica: 'kom',
            tezina: 3.0,                   // NOVA KOLONA - Težina u kg
            trazena_kolicina: 10,
            izlazna_cijena: 3.50,          // Exactly 2 decimals
            marza: 0,
            nabavna_cijena_1: 0.00,        // Exactly 2 decimals
            nabavna_cijena_2: 0.00,        // Exactly 2 decimals
            najniza_cijena: 0.00,          // Exactly 2 decimals
            dobavljac_1: '',
            dobavljac_2: '',
            found_results: 0,
            komentar: 'Premium kvaliteta kompota jagoda. Provjeriti dostupnost u sezoni.'
        },
        {
            id: 2,
            redni_broj: 2,
            custom_search: '',
            naziv_artikla: 'Kompot kruška 4/1',
            mjerna_jedinica: 'kom',
            tezina: 4.0,                   // NOVA KOLONA - Težina u kg
            trazena_kolicina: 5,
            izlazna_cijena: 6.00,          // Exactly 2 decimals
            marza: 0,
            nabavna_cijena_1: 0.00,        // Exactly 2 decimals
            nabavna_cijena_2: 0.00,        // Exactly 2 decimals
            najniza_cijena: 0.00,          // Exactly 2 decimals
            dobavljac_1: '',
            dobavljac_2: '',
            found_results: 0,
            komentar: '' // Nema komentar
        },
        {
            id: 3,
            redni_broj: 3,
            custom_search: '',
            naziv_artikla: 'Ulje suncokret 5L',
            mjerna_jedinica: 'kom',
            tezina: 5.0,                   // NOVA KOLONA - Težina u kg
            trazena_kolicina: 2,
            izlazna_cijena: 12.00,         // Exactly 2 decimals
            marza: 0,
            nabavna_cijena_1: 0.00,        // Exactly 2 decimals
            nabavna_cijena_2: 0.00,        // Exactly 2 decimals
            najniza_cijena: 0.00,          // Exactly 2 decimals
            dobavljac_1: '',
            dobavljac_2: '',
            found_results: 0,
            komentar: 'Važno: Provjeriti datum proizvodnje. Ulje mora biti svježe, max 3 mjeseca staro.'
        }
    ];
}

/**
 * Gets demo preračun data with šifra information - ENHANCED S 2 DECIMALE
 * @returns {Array} Demo preračun data
 */
function getDemoPreracunData() {
    return [
        {
            id: 'demo-1',
            rb: 1,
            result_id: 1,
            selected: true,
            
            // Troškovnik data
            troskovnik_naziv: 'Kompot jagoda 3/1',
            troskovnik_jm: 'kom',
            troskovnik_weight: 3.0,
            troskovnik_quantity: 10,
            troskovnik_izlazna_cijena: 3.50,    // Exactly 2 decimals
            
            // Result data
            result_naziv: 'Kompot 3/1 jagoda 2550/1000g Giana',
            result_jm: 'KOM',
            result_price: 3.15,                 // Exactly 2 decimals
            result_supplier: 'GIANA D.O.O.',
            result_source: 'Lager lista',
            result_weight: 2.55,
            result_code: '3594',
            result_has_sifra: true, // Lager lista contains šifra
            
            // Calculated values - ENHANCED S 2 DECIMALE
            adjusted_price: 3.70,               // Exactly 2 decimals
            price_per_kg: 1.24,                 // Rounded to 2 decimals
            total_cost: 37.00,                  // Exactly 2 decimals
            calculation_formula: '3.15€ ÷ 2.550kg × 3.000kg = 3.70€'
        },
        {
            id: 'demo-2',
            rb: 1,
            result_id: 2,
            selected: true,
            
            // Troškovnik data
            troskovnik_naziv: 'Kompot jagoda 3/1',
            troskovnik_jm: 'kom',
            troskovnik_weight: 3.0,
            troskovnik_quantity: 10,
            troskovnik_izlazna_cijena: 3.50,    // Exactly 2 decimals
            
            // Result data
            result_naziv: 'KOMPOT KRUŠKE,KOCKE 4250ml',
            result_jm: 'kom',
            result_price: 6.15,                 // Exactly 2 decimals
            result_supplier: 'Mikado',
            result_source: 'Mikado 2 cjenika',
            result_weight: 4.25,
            result_code: '5',
            result_has_sifra: false, // Mikado cjenik doesn't contain šifra
            
            // Calculated values - ENHANCED S 2 DECIMALE
            adjusted_price: 4.34,               // Exactly 2 decimals
            price_per_kg: 1.45,                 // Rounded to 2 decimals
            total_cost: 43.40,                  // Exactly 2 decimals
            calculation_formula: '6.15€ ÷ 4.250kg × 3.000kg = 4.34€'
        },
        {
            id: 'demo-3',
            rb: 2,
            result_id: 3,
            selected: true,
            
            // Troškovnik data
            troskovnik_naziv: 'Kompot kruška 4/1',
            troskovnik_jm: 'kom',
            troskovnik_weight: 4.0,
            troskovnik_quantity: 5,
            troskovnik_izlazna_cijena: 6.00,    // Exactly 2 decimals
            
            // Result data
            result_naziv: 'Ulje suncokret 5/1',
            result_jm: 'KOM',
            result_price: 12.50,                // Exactly 2 decimals
            result_supplier: 'METRO',
            result_source: 'Metro BMPL',
            result_weight: 5.0,
            result_code: '734',
            result_has_sifra: false, // Metro BMPL doesn't contain šifra
            
            // Calculated values - ENHANCED S 2 DECIMALE
            adjusted_price: 10.00,              // Exactly 2 decimals
            price_per_kg: 2.50,                 // Exactly 2 decimals
            total_cost: 50.00,                  // Exactly 2 decimals
            calculation_formula: '12.50€ ÷ 5.000kg × 4.000kg = 10.00€'
        }
    ];
}

// Expose all functions and data globally
window.articles = articles;
window.results = results;
window.troskovnik = troskovnik;
window.selectedResults = selectedResults;
window.preracunResults = preracunResults;
window.updateArticleStats = updateArticleStats;
window.addArticles = addArticles;
window.getDemoTroskovnik = getDemoTroskovnik;
window.getDemoPreracunData = getDemoPreracunData;

// // console.log('✅ Enhanced Data module loaded with PDV functionality:');
// // console.log('📊', articles.length, 'demo articles with tarifni broj and PDV stopa');
// // console.log('💰 PDV mapping: TB 1→25%, TB 10,2,5,7→5%');
// // console.log('🎯 All prices formatted to 2 decimals + PDV data included');