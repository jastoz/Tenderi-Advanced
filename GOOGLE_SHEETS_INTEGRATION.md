# Google Sheets Integracija - Ažurirana verzija

## Pregled
Aplikacija sada koristi **novi Weight Manager** s potpunom Google Sheets integracijom i CSV fallback sustavom.

## Konfiguracija

### 1. Google Apps Script
- **URL**: `https://script.google.com/macros/s/AKfycbwKoF0j4qR7J6ntXBpMc-qUgNUZcfyxd08L0l21Osf9i4Qqn7aKOMay_jjmXsaZ1cT-kg/exec`
- **Datoteka**: `GOOGLE_APPS_SCRIPT_FIXED.js`
- **Podržane akcije**: `test`, `getArticles`, `updateWeight`, `updateWeights`

### 2. Važne napomene
- **Spreadsheet ID**: Morate ažurirati `CONFIG.SPREADSHEET_ID` u Google Apps Script-u
- **Sheet Name**: Postavljen na `artiklitezine` (možete promijeniti)
- **Deployment**: Script mora biti deployan kao Web App s "Anyone" pristupom
- **CORS**: Headers su već postavljeni u script-u

## Kako funkcionira

### Učitavanje podataka
1. **Google Sheets** (prvi pokušaj) - koristi `getArticles` akciju
2. **CSV fallback** (ako Google Sheets ne radi)

### Sinkronizacija
- **Real-time**: Svaka promjena težine se odmah šalje u Google Sheets
- **Bulk update**: Export svih težina u Google Sheets odjednom
- **Fallback**: Ako Google Sheets ne radi, podaci se čuvaju lokalno

## Korak po korak setup

### 1. Kopirajte Google Apps Script
```javascript
// Kopirajte sadržaj iz GOOGLE_APPS_SCRIPT_FIXED.js
// u Google Apps Script editor
```

### 2. Ažurirajte Spreadsheet ID
```javascript
const CONFIG = {
  SPREADSHEET_ID: 'VAŠ_SPREADSHEET_ID', // Zamijenite s vašim ID-om
  SHEET_NAME: 'artiklitezine',
  // ...
};
```

### 3. Deploy kao Web App
- **Execute as**: Me
- **Who has access**: Anyone
- **Copy the Web App URL**

### 4. Testirajte URL
Otvorite URL u browseru s `?action=test` - trebao bi vratiti JSON s statusom.

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

## Format podataka

Google Sheets mora imati isti format kao CSV:

| Stupac | Oznaka | Opis | Obavezno | Sinkronizacija |
|--------|--------|------|----------|----------------|
| A | Šifra | Šifra artikla | ✅ | Read-only |
| E | Podgrupa | Podgrupa artikla | ❌ | Bidirekcionalna |
| F | Naziv | Naziv artikla | ❌ | Read-only |
| H | J.M. | Mjerna jedinica | ❌ | Read-only |
| M | Tarifni broj | Tarifni broj za PDV | ❌ | Bidirekcionalna |
| S | Dobavljač | Naziv dobavljača | ❌ | Read-only |
| V | Težina | Težina u kilogramima | ✅ | **BIDIREKCIONALNA** |

## Troubleshooting

### CORS greške
- Provjerite da je script deployan kao Web App
- Provjerite da je "Anyone" pristup omogućen
- Provjerite da koristite ispravan Web App URL

### 404 greške
- Provjerite da koristite Web App URL, ne Script Editor URL
- Provjerite da je deployment aktivan
- Testirajte URL s `?action=test`

### Spreadsheet ID greške
- Provjerite da je ID ispravan
- Provjerite da imate pristup spreadsheet-u
- Provjerite da sheet `artiklitezine` postoji

## Funkcionalnosti

### WeightManager klasa
- `importFromGoogleSheets()` - Učitava iz Google Sheets
- `processWeightFile()` - Učitava iz CSV-a
- `updateWeightValue()` - Ažurira težinu
- `exportWeightsToGoogleSheets()` - Sinkronizira s Google Sheets
- `exportWeightDatabase()` - Exportuje u CSV

### UI Status
- Prikazuje trenutni status (Google Sheets aktivno / CSV fallback aktivno)
- Automatski se ažurira ovisno o dostupnosti

## Primjena u aplikaciji
```javascript
// Dohvati težinu i PDV
const data = getArticleWeightAndPDV('SIFRA123', 'Naziv', 'KOM', 'source');

// Ažuriraj težinu
await updateWeightValue('SIFRA123', 15.5);

// Export u Google Sheets
await exportWeightsToGoogleSheets();
```

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