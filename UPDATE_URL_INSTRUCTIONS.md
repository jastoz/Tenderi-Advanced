# Instrukcije za ažuriranje Google Script URL-a

## Trenutni URL
```
https://script.google.com/macros/s/AKfycbwsubMtx7wWir2f2062UBA7W-_fzSOAOWOFRmLVDFBrTVJVsq8csL_LXEiCQWLWYkRf-w/exec
```

## 🚨 VAŽNO: Google Apps Script treba biti ponovno deployan!

**Problem**: Google Apps Script ima grešku s CORS headers jer Google Apps Script ne podržava custom headers na standardni način.

**Rješenje**: 
1. Kopirajte **NOVI** kod iz `GOOGLE_APPS_SCRIPT_FIXED.js` (pojednostavljena verzija)
2. **Ponovno deployajte** kao Web App
3. Kopirajte **NOVI** Web App URL

## 🔧 Problem s ažuriranjem težina

**Problem**: Kada promijenite težinu u aplikaciji, ne prenosi se u Google Sheets stupac V.

**Uzrok**: Google Apps Script još uvijek koristi stari kod s `setHeaders` greškom.

**Rješenje**: 
1. **OBVEZNO** kopirajte NOVI kod iz `GOOGLE_APPS_SCRIPT_FIXED.js`
2. **OBVEZNO** ponovno deployajte kao "New deployment"
3. Testirajte ažuriranje težina

## CORS Problem i Rješenje

**Problem**: Google Apps Script ne podržava `setHeader` ili `setHeaders` metode.

**Rješenje**: 
- Uklonjeni su custom CORS headers
- Google Apps Script automatski postavlja osnovne CORS headers
- Frontend će raditi s osnovnim CORS postavkama

## Kako ažurirati URL

### 1. U weight-manager.js
URL je već ažuriran:
```javascript
const WEIGHT_CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwsubMtx7wWir2f2062UBA7W-_fzSOAOWOFRmLVDFBrTVJVsq8csL_LXEiCQWLWYkRf-w/exec',
    // ...
};
```

### 2. U Google Apps Script-u
Ažurirajte `CONFIG.SPREADSHEET_ID` u vašem Google Apps Script-u:
```javascript
const CONFIG = {
  SPREADSHEET_ID: 'VAŠ_SPREADSHEET_ID',
  SHEET_NAME: 'artiklitezine',
  // ...
};
```

## Koraci za deployment

### 1. Kopirajte kod
- Kopirajte sadržaj iz `GOOGLE_APPS_SCRIPT_FIXED.js`
- Zalijepite u Google Apps Script editor
- **Zamijenite sve postojeće kodove!**

### 2. Ažurirajte Spreadsheet ID
- Pronađite liniju s `CONFIG.SPREADSHEET_ID`
- Zamijenite s ID-om vašeg Google Sheet-a

### 3. Deploy kao Web App
- Kliknite "Deploy" > "New deployment"
- Odaberite "Web app"
- Postavite:
  - **Execute as**: Me
  - **Who has access**: Anyone
- Kliknite "Deploy"

### 4. Kopirajte URL
- Kopirajte **NOVI** Web App URL
- Ažurirajte u `weight-manager.js` ako je drugačiji

## Testiranje

### 1. Testirajte URL direktno
```
VAŠ_NOVI_URL?action=test
```
Trebali biste dobiti JSON s statusom, ne HTML grešku.

### 2. Testirajte ažuriranje težina
```
VAŠ_NOVI_URL?action=updateWeight&sheet=artiklitezine&sifra=TEST123&tezina=15.5
```
Trebali biste dobiti JSON s `success: true`.

### 3. Testirajte u aplikaciji
- Učitajte aplikaciju
- Kliknite "📊 Google Sheets" botun
- Promijenite težinu u tablici
- Provjerite Google Sheets stupac V

## Troubleshooting

### CORS greške
- **Normalno**: Google Apps Script ima ograničenu CORS podršku
- **Rješenje**: Koristite CSV fallback ako Google Sheets ne radi
- **Alternative**: Testirajte u incognito prozoru ili različitom browseru

### 404 greške
- Provjerite da koristite Web App URL, ne Script Editor URL
- Provjerite da je deployment aktivan
- Testirajte URL s `?action=test`

### Spreadsheet ID greške
- Provjerite da je ID ispravan
- Provjerite da imate pristup spreadsheet-u
- Provjerite da sheet `artiklitezine` postoji

### "setHeader is not a function" greška
- **Ovo znači da koristite stari kod!**
- Kopirajte **NOVI** kod iz `GOOGLE_APPS_SCRIPT_FIXED.js`
- **Ponovno deployajte** kao Web App

### Težine se ne ažuriraju u Google Sheets
- **Uzrok**: Google Apps Script koristi stari kod
- **Rješenje**: Kopirajte NOVI kod i ponovno deployajte
- **Test**: Provjerite da POST zahtjevi rade s `?action=updateWeight`

## Napomene

- **Pojednostavljeni kod**: Uklonjeni su problematični CORS headers
- **CSV fallback**: Ako Google Sheets ne radi, koristi se CSV
- **Real-time sync**: Promjene se odmah šalju u Google Sheets
- **Automatski fallback**: Ako Google Sheets ne radi, prelazi na CSV
- **Browser razlike**: Neki browseri mogu imati različite CORS postavke
- **Obavezno redeployment**: Nakon promjene koda morate ponovno deployati 