# Google Drive Integration Setup

## Pregled funkcionalnosti

Google Drive integracija omogućava:
- ☁️ **Spremanje stanja aplikacije** na Google Drive
- 📂 **Učitavanje stanja aplikacije** s Google Drive-a
- 🔒 **OAuth 2.0 autentifikacija** za sigurni pristup
- 📁 **Automatska mapa aplikacije** (`Tražilica Proizvoda - App Data`)
- 🔄 **Sinkronizacija između uređaja**

## ⚠️ VAŽNO: Novi Google Cloud projekt

Ova Google Drive integracija koristi **NOVI, ODVOJENI** Google Cloud projekt od postojeće Google Sheets integracije:

- **Google Sheets**: Koristi Google Apps Script (već postoji)
- **Google Drive**: Koristi novi Google Cloud projekt (ovaj setup)

**Razlog**: Čišća arhitektura, bolja sigurnost, nezavisan razvoj komponenti.

## Korak 1: Google Cloud Console setup

### 1.1 Stvori novi projekt (odvojen od Sheets)
1. Idite na [Google Cloud Console](https://console.cloud.google.com/)
2. Kliknite "Select a project" → "New Project"
3. Ime projekta: `Tražilica Drive Integration`
4. Kliknite "Create"

### 1.2 Omogući Google Drive API
1. U navigaciji idite na "APIs & Services" → "Library"
2. Potražite "Google Drive API"
3. Kliknite "Enable"

### 1.3 Stvori credentials

#### A) API Key
1. Idite na "APIs & Services" → "Credentials"
2. Kliknite "Create Credentials" → "API Key"
3. **Zapišite API Key** - trebat ćete ga kasnije
4. (Opcionalno) "Restrict Key" → "Google Drive API" za sigurnost

#### B) OAuth 2.0 Client ID
1. Kliknite "Create Credentials" → "OAuth 2.0 Client IDs"
2. Ako trebate, konfigurirajte OAuth consent screen:
   - Application type: "External"
   - Application name: "Tražilica Proizvoda Drive"
   - User support email: vaš email
   - Developer contact: vaš email
3. Za OAuth Client ID:
   - Application type: "Web application" 
   - Name: "Tražilica Drive Client"
   - **Authorized JavaScript origins** (KRITIČNO):
     ```
     http://127.0.0.1:56326
     http://localhost:56326
     http://localhost:8000
     http://localhost:8001
     ```
   - **NE dodavajte** "Authorized redirect URIs" (ne treba za web apps)

**Vaš Client ID**: `505926848303-62o2t8og7ct8pcoskq8gqtmpt8smu43p.apps.googleusercontent.com` ✅

## Korak 2: Konfiguracija u aplikaciji

Otvorite datoteku `google-drive-manager.js` i ažurirajte sljedeće vrijednosti:

```javascript
const GOOGLE_DRIVE_CONFIG = {
    CLIENT_ID: '505926848303-62o2t8og7ct8pcoskq8gqtmpt8smu43p.apps.googleusercontent.com', // ✅ Postavljeno
    API_KEY: 'AIzaSyBNFWtRCq2PrKDsk9O9DhKy0wcGFKmRAkI', // ✅ Postavljeno
    // ... ostalo ostaje isto
};
```

### Konfiguracija:
- **CLIENT_ID**: ✅ **Postavljeno** u kodu
- **API_KEY**: ✅ **Postavljeno** u kodu

### 🎯 KONFIGURACIJA GOTOVA!
Sve potrebne credentials su postavljene. Možete odmah testirati Google Drive funkcionalnost.

## Korak 3: Testiranje

1. **Otvorite aplikaciju** u browseru na jednom od authorized origins
2. **Promatrajte console** za poruke Google Drive inicijalizacije:
   - "✅ Google Drive API initialized successfully" - sve radi
   - "⚠️ Google Drive API initialization failed" - provjerite API Key
3. **Kliknite "🔑 Prijavite se"** u Google Drive sekciji (header aplikacije)
4. **Odobrite dozvole** za pristup Google Drive-u
5. **Status trebao bi se promijeniti** na "✅ Povezano s Google Drive"
6. **Testirajte spremanje**: 
   - Kliknite "💾 Spremi stanje aplikacije"
   - Odaberite "☁️ Spremi na Google Drive"
7. **Testirajte učitavanje**:
   - Kliknite "📂 Učitaj stanje aplikacije" 
   - Odaberite "☁️ Učitaj s Google Drive"

## Sigurnosne napomene

### Dozvole
- Aplikacija traži samo `https://www.googleapis.com/auth/drive.file`
- Ova dozvola omogućava pristup **samo datotekama koje je aplikacija stvorila**
- **NE** može pristupiti drugim datotekama na vašem Google Drive-u

### Podaci
- Sve datoteke se spremaju u mapu `Tražilica Proizvoda - App Data`
- Datoteke su u JSON formatu (čitljive)
- Sadrže samo podatke aplikacije (artikli, troškovnik, kalkulacije)
- **NEMA osobnih podataka** poput lozinki ili privatnih informacija

### OAuth 2.0
- Siguran industrijski standard za autentifikaciju
- Tokeni se pohranjuju lokalno u browseru
- Automatsko obnavljanje tokena
- Možete se odjaviti bilo kada

## Troubleshooting

### Problem: "Google Drive API nije inicijalizirani"
**Uzrok**: Niste kreirali ili postavili API Key  
**Rješenje**: 
1. Google Cloud Console → Credentials → Create API Key
2. Kopirajte API Key u `google-drive-manager.js`
3. Osvježite aplikaciju

### Problem: "Origin not allowed"
**Uzrok**: Vaš localhost nije u authorized origins  
**Rješenje**: Dodajte u Google Cloud Console → Credentials → OAuth Client:
- `http://127.0.0.1:56326`
- `http://localhost:8000` (i ostali portovi koje koristite)

### Problem: "Access blocked"
**Uzrok**: OAuth consent screen nije konfiguriran  
**Rješenje**: Konfigurirajte OAuth consent screen u Google Cloud Console

### Problem: "API key not valid"
**Uzrok**: Google Drive API nije omogućen ili API Key je pogrešan  
**Rješenje**: 
1. Provjerite da je Google Drive API "Enabled" za vaš projekt
2. Provjerite da API Key nije ograničen na druge API-jeve

## Korisni linkovi

- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

## Napomene za produkciju

Za produkcijsku upotrebu:
1. **Ograniči API Key** na specifične domene
2. **Postavi quota limits** za API pozive
3. **Monitoriraj usage** u Google Cloud Console
4. **Backup API keys** na sigurnom mjestu

---

## 📋 Status implementacije

### ✅ GOTOVO
- Google Drive manager modul stvoren
- Client ID konfiguriran: `505926848303-62o2t8og7ct8pcoskq8gqtmpt8smu43p.apps.googleusercontent.com`
- API Key konfiguriran: `AIzaSyBNFWtRCq2PrKDsk9O9DhKy0wcGFKmRAkI`
- UI integracija implementirana
- Authorized JavaScript origins dokumentirani
- Troubleshooting guide stvoren

### 🎯 SPREMNO ZA TESTIRANJE
1. **Otvorite aplikaciju** u browseru
2. **Provjerite console** za Google Drive inicijalizaciju
3. **Testirajte Google Drive funkcionalnost**

### 🚀 SLJEDEĆI KORAK
**Google Drive integracija je 100% konfigurirana - testirajte funkcionalnost!**

---

**Status implementacije**: ✅ 100% GOTOVO - spremno za testiranje