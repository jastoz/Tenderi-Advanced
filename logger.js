/**
 * Enhanced Logging System
 * Uvjetno logiranje za poboljšanje performansi
 */

// Konfiguracija logiranja
const LOG_CONFIG = {
    // ONEMOGUĆENO - aplikacija je prespora s logovima
    DEVELOPMENT_MODE: false,
    
    // Log nivoi
    LEVELS: {
        ERROR: 'error',
        WARN: 'warn', 
        INFO: 'info',
        DEBUG: 'debug'
    },
    
    // SVA PODRUČJA ONEMOGUĆENA - samo greške
    AREAS: {
        APP_STARTUP: false,
        SEARCH: false,          
        WEIGHT_EXTRACTION: false,  
        TROSKOVNIK: false,      
        FILE_PROCESSING: false,
        ERROR_HANDLING: true,   // Samo greške
        UI_EVENTS: false
    }
};

/**
 * Glavni logger objekt
 */
const Logger = {
    
    // Expose LEVELS for external access (e.g., Logger.LEVELS.INFO)
    LEVELS: LOG_CONFIG.LEVELS,
    
    /**
     * Error logovi - uvijek aktivni
     */
    error: function(message, ...args) {
        console.error('❌ ERROR:', message, ...args);
    },
    
    /**
     * Warning logovi - uvijek aktivni za važne upozorenja
     */
    warn: function(message, ...args) {
        console.warn('⚠️ WARN:', message, ...args);
    },
    
    /**
     * Info logovi - samo u development modu
     */
    info: function(message, ...args) {
        if (LOG_CONFIG.DEVELOPMENT_MODE) {
            console.log('ℹ️ INFO:', message, ...args);
        }
    },
    
    /**
     * Debug logovi - samo u development modu
     */
    debug: function(message, ...args) {
        if (LOG_CONFIG.DEVELOPMENT_MODE) {
            console.log('🐛 DEBUG:', message, ...args);
        }
    },
    
    /**
     * Područno logiranje - omogućuje granularnu kontrolu
     */
    area: function(areaName, level, message, ...args) {
        if (!LOG_CONFIG.DEVELOPMENT_MODE) return;
        if (!LOG_CONFIG.AREAS[areaName]) return;
        
        const prefix = this.getAreaPrefix(areaName);
        
        switch(level) {
            case LOG_CONFIG.LEVELS.ERROR:
                console.error(prefix, message, ...args);
                break;
            case LOG_CONFIG.LEVELS.WARN:
                console.warn(prefix, message, ...args);
                break;
            case LOG_CONFIG.LEVELS.INFO:
                console.log(prefix, message, ...args);
                break;
            case LOG_CONFIG.LEVELS.DEBUG:
                console.log(prefix, message, ...args);
                break;
        }
    },
    
    /**
     * Prefiksi za različita područja
     */
    getAreaPrefix: function(areaName) {
        const prefixes = {
            APP_STARTUP: '🚀 STARTUP:',
            SEARCH: '🔍 SEARCH:',
            WEIGHT_EXTRACTION: '⚖️ WEIGHT:',
            TROSKOVNIK: '📊 TROSKOVNIK:',
            FILE_PROCESSING: '📁 FILE:',
            ERROR_HANDLING: '💥 ERROR:',
            UI_EVENTS: '🖱️ UI:'
        };
        return prefixes[areaName] || '📝 LOG:';
    },
    
    /**
     * Performance logging - samo u development modu
     */
    perf: function(label, fn) {
        if (!LOG_CONFIG.DEVELOPMENT_MODE) {
            return fn();
        }
        
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`⏱️ PERF: ${label} took ${(end - start).toFixed(2)}ms`);
        return result;
    },
    
    /**
     * Batch logging za smanjenje console poziva
     */
    batch: function(messages) {
        if (!LOG_CONFIG.DEVELOPMENT_MODE) return;
        if (!Array.isArray(messages) || messages.length === 0) return;
        
        console.group('📦 BATCH LOG');
        messages.forEach(msg => {
            if (typeof msg === 'string') {
                console.log(msg);
            } else if (msg.level && msg.message) {
                this[msg.level](msg.message, ...(msg.args || []));
            }
        });
        console.groupEnd();
    },
    
    /**
     * Konfiguracijske funkcije
     */
    setDevelopmentMode: function(enabled) {
        LOG_CONFIG.DEVELOPMENT_MODE = enabled;
        console.log(`🔧 Development mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
    },
    
    setAreaEnabled: function(areaName, enabled) {
        if (LOG_CONFIG.AREAS.hasOwnProperty(areaName)) {
            LOG_CONFIG.AREAS[areaName] = enabled;
            console.log(`🔧 Area ${areaName} ${enabled ? 'ENABLED' : 'DISABLED'}`);
        }
    },
    
    /**
     * Status provjera
     */
    getConfig: function() {
        return {
            developmentMode: LOG_CONFIG.DEVELOPMENT_MODE,
            areas: {...LOG_CONFIG.AREAS}
        };
    }
};

/**
 * Backward compatibility - omogućava postupnu migraciju
 * Ove funkcije mogu zamijeniti postojeće console.log pozive
 */
window.log = Logger.debug;
window.logError = Logger.error;
window.logWarn = Logger.warn;
window.logInfo = Logger.info;

/**
 * Dodaj u window objekt za globalnu dostupnost
 */
window.Logger = Logger;

/**
 * Automatska konfiguracija za produkciju
 * Prepoznaje produkcijski environment i onemogućuje logove
 */
if (typeof window !== 'undefined') {
    // Provjeri je li produkcija (može se proširiti s dodatnim provjeram)
    const isProduction = (
        window.location.protocol === 'https:' || 
        window.location.hostname !== 'localhost' ||
        window.location.hostname !== '127.0.0.1'
    );
    
    if (isProduction) {
        Logger.setDevelopmentMode(false);
        console.log('🏭 Production mode detected - logging disabled for performance');
    }
}

console.log('✅ Enhanced Logger initialized');
console.log('🔧 Use Logger.setDevelopmentMode(false) to disable logging');
console.log('🎯 Current config:', Logger.getConfig());
console.log('📋 Logger.LEVELS:', Logger.LEVELS);
console.log('🌍 window.Logger:', typeof window.Logger);