# Sažetak implementacije - Google Sheets integracija (Ažurirano)

## Pregled promjena

### 1. Weight Manager klasa (NOVA VERZIJA)
- **Datoteka**: `weight-manager.js`
- **Pristup**: Potpuna Google Sheets integracija s akcijama
- **Fallback**: CSV sustav ako Google Sheets ne radi
- **PDV podrška**: Automatsko mapiranje tarifnih brojeva na PDV stope

### 2. Google Apps Script (AŽURIRANO)
- **Datoteka**: `GOOGLE_APPS_SCRIPT_FIXED.js`
- **URL**: `https://script.google.com/macros/s/AKfycbwKoF0j4qR7J6ntXBpMc-qUgNUZcfyxd08L0l21Osf9i4Qqn7aKOMay_jjmXsaZ1cT-kg/exec`
- **Funkcionalnost**: Podržava akcije `test`, `getArticles`, `updateWeight`, `updateWeights`

### 3. Dokumentacija
- **GOOGLE_SHEETS_INTEGRATION.md**: Opis funkcionalnosti (ažurirano)
- **UPDATE_URL_INSTRUCTIONS.md**: Instrukcije za ažuriranje URL-a
- **IMPLEMENTATION_SUMMARY.md**: Ovaj dokument

## Ključne funkcionalnosti

### WeightManager klasa
```javascript
// Dohvati težinu i PDV
function getArticleWeightAndPDV(code, name, unit, source) {
    // Vraća { weight, tarifniBroj, pdvStopa }
}

// Import iz Google Sheets
async function importFromGoogleSheets() {
    // Koristi getArticles akciju
}

// Ažuriraj težinu
async function updateWeightValue(sifra, newValue) {
    // Real-time sync s Google Sheets
}
```

### Učitavanje podataka
1. **Google Sheets** (prvi pokušaj) - koristi `getArticles` akciju
2. **CSV fallback** (ako Google Sheets ne radi)

### Sinkronizacija
- **Real-time**: Svaka promjena se odmah šalje u Google Sheets
- **Bulk update**: Export svih težina u Google Sheets odjednom
- **Automatski fallback**: Ako Google Sheets ne radi, podaci se čuvaju lokalno

## Koraci za deployment

### 1. Google Apps Script
- Kopirajte kod iz `GOOGLE_APPS_SCRIPT_FIXED.js`
- Ažurirajte `CONFIG.SPREADSHEET_ID` s vašim ID-om
- Deploy kao Web App s "Anyone" pristupom

### 2. Frontend
- URL je već postavljen u `weight-manager.js`
- Aplikacija automatski pokušava Google Sheets
- Ako ne radi, prelazi na CSV

## Podržane akcije

### GET zahtjevi:
- `?action=test` - Test veze i konfiguracije
- `?action=getArticles&sheet=artiklitezine` - Dohvat artikala

### POST zahtjevi:
- `action=updateWeight` - Ažuriranje pojedinačne težine
- `action=updateWeights` - Bulk ažuriranje težina
- `action=updatePodgrupa` - Ažuriranje podgrupe
- `action=updateTarifniBroj` - Ažuriranje tarifnog broja
- `action=updateGrupa` - Ažuriranje grupe

## Troubleshooting

### CORS greške
- Provjerite da je script deployan kao Web App
- Provjerite da je "Anyone" pristup omogućen
- Provjerite da koristite ispravan Web App URL

### 404 greške
- Provjerite da koristite Web App URL
- Provjerite da je deployment aktivan
- Testirajte URL s `?action=test`

### Spreadsheet ID greške
- Provjerite da je ID ispravan
- Provjerite da imate pristup spreadsheet-u
- Provjerite da sheet `artiklitezine` postoji

## Prednosti nove verzije

1. **Potpuna integracija**: Podržava sve akcije za Google Sheets
2. **PDV podrška**: Automatsko mapiranje tarifnih brojeva
3. **Real-time sync**: Promjene se odmah šalju u Google Sheets
4. **Bulk operations**: Export svih težina odjednom
5. **Robusnost**: CSV fallback ako Google Sheets ne radi
6. **Lako održavanje**: Jasna struktura i dokumentacija

## Testiranje

### 1. Test URL-a
```
https://script.google.com/macros/s/AKfycbwKoF0j4qR7J6ntXBpMc-qUgNUZcfyxd08L0l21Osf9i4Qqn7aKOMay_jjmXsaZ1cT-kg/exec?action=test
```

### 2. Test u aplikaciji
- Učitajte aplikaciju
- Kliknite "📊 Google Sheets" botun
- Provjerite konzolu za poruke

### 3. Test sinkronizacije
- Uredite težinu u tablici
- Provjerite Google Sheets - stupac V treba biti ažuriran

## Napomene

- **Internet veza**: Potrebna je stabilna internet veza za Google Sheets
- **Permissions**: Google Script mora imati dozvole za čitanje/pisanje
- **Format**: Podaci moraju biti u istom formatu kao CSV
- **Fallback**: CSV sustav osigurava da aplikacija radi i bez interneta
- **PDV**: Automatsko mapiranje iz tarifnih brojeva (1→25%, 10,2,5,7→5%, ostali→0%) 