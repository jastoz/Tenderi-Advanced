# Tražilica Proizvoda & Troškovnik
**Product Search & Cost Calculator for Croatian Procurement**

## Opis / Description

**Hrvatski:** Aplikacija za pretraživanje artikala, upravljanje cijenama i kalkulaciju troškova s integracijom Google Sheets-a. Namijenjena je za olakšavanje rada s javnim nabavama i tender dokumentima u Hrvatskoj.

**English:** A Croatian procurement application for article search, price management, and cost calculation with Google Sheets integration. Designed to streamline work with public procurement and tender documents.

## Glavne Funkcionalnosti / Key Features

### 🔍 Napredna Pretraga / Enhanced Search
- Autocomplete pretraga s direktnim unosom cijena
- Pretraga po rasponu (npr. "Ajvar 300-1000" za proizvode 300-1000g)
- Podrška za "naše artikle" (LAGER/URPD) i "vanjske artikle"

### 📊 Google Sheets Integracija / Google Sheets Integration
- Sinkronizacija težina i PDV podataka u stvarnom vremenu
- Automatsko ažuriranje kroz Google Apps Script
- Podrška za bulk operacije

### 💰 Upravljanje Troškovima / Cost Management
- Automatska kalkulacija troškova po kilogramu
- Generiranje tablice rabata direktno iz rezultata pretrage
- Povijesni podaci o cijenama za bolje donošenje odluka

### 📁 Uvoz/Izvoz Datoteka / File Import/Export
- Podrška za CSV, Excel i XML formate
- Drag & drop funkcionalnost
- Višestruki formati izvoza

## Tehnička Arhitektura / Technical Architecture

### Modularni JavaScript / Modular JavaScript
- **Frontend-only** aplikacija - nema potrebe za build procesom
- ES6+ moduli za organizaciju koda
- Vanilla JavaScript bez vanjskih dependency-ja (osim SheetJS za Excel)

### Ključni Moduli / Key Modules
- `index.html` - Glavno sučelje aplikacije
- `app.js` - Inicijalizacija i koordinacija aplikacije
- `enhanced-search.js` - Napredna pretraga s autocomplete
- `enhanced-functions.js` - Direktna generacija tablice rabata
- `weight-manager.js` - Google Sheets integracija
- `proslogodisnje-cijene.js` - Upravljanje povijesnim cijenama

## Postavljanje / Setup

### 1. Lokalno Pokretanje / Local Running
```bash
# Jednostavno otvorite u pregledniku
open index.html

# Ili pokrenite lokalni server
python -m http.server 8000
# Zatim otvorite http://localhost:8000
```

### 2. Google Sheets Integracija / Google Sheets Integration
1. Postavite Google Apps Script koristeći `GOOGLE_APPS_SCRIPT_FIXED.js`
2. Ažurirajte `CONFIG.SPREADSHEET_ID` u skripti
3. Postavite dozvole na "Anyone"
4. Ažurirajte URL u `weight-manager.js`

## Tipkovi Prečaci / Keyboard Shortcuts

- `Ctrl+/` - Fokus na sticky search bar
- `Ctrl+S` - Brzo spremanje stanja
- `Ctrl+Shift+S` - Spremanje s vremenskom oznakom
- `Ctrl+G` - Generiraj tablicu rabata iz rezultata
- `Ctrl+E` - Izvoz trenutnog taba

## Kompatibilnost / Browser Compatibility

- Moderni preglednici s ES6+ podporom
- Koristi Fetch API za Google Sheets integraciju
- File API za drag & drop funkcionalnost

## Struktura Podataka / Data Structure

### Artikli / Articles
```javascript
{
    sifra: string,      // Šifra artikla
    naziv: string,      // Naziv artikla
    jm: string,         // Jedinica mjere
    source: string,     // Izvor podataka (LAGER, URPD, external)
    dobavljac: string   // Dobavljač
}
```

### PDV Mapiranje / VAT Mapping
- "1" → 25%
- "10", "2", "5", "7" → 5%
- Ostalo → 0%

## Doprinosi / Contributing

Aplikacija je dizajnirana za hrvatske javne nabave. Doprinosi su dobrodošli, posebno:
- Poboljšanja performansi
- Dodatni formati izvoza
- Poboljšanja korisničkog sučelja
- Bolja integracija s vanjskim sustavima

## Licenca / License

MIT License - pogledajte LICENSE datoteku za detalje.

---

**Razvijeno za potrebe hrvatskih javnih nabava / Developed for Croatian public procurement needs**