# Setup Instructions

## Before Using This Application

### 1. Google Apps Script Configuration

**IMPORTANT**: Before running this application, you need to set up your own Google Apps Script:

1. Open [Google Apps Script](https://script.google.com/)
2. Create a new project
3. Copy the contents of `GOOGLE_APPS_SCRIPT_FIXED.js` into the script editor
4. Update the `CONFIG.SPREADSHEET_ID` in the script with your Google Sheets ID
5. Deploy as Web App with permissions set to "Anyone"
6. Copy the deployment URL
7. Update `GOOGLE_SCRIPT_URL` in `weight-manager.js` (line 15) with your new URL

### 2. Current Configuration

The current Google Apps Script URL in `weight-manager.js` is configured for the original developer. You will need to replace it with your own deployment URL.

### 3. Google Sheets Format

Your Google Sheets should have these columns:
- Column A: Šifra (Article Code)  
- Column V: Težina (Weight)
- Column M: Tarifni broj (Tariff Number)

### 4. Running the Application

Since this is a client-side application, simply:
```bash
# Open directly in browser
open index.html

# Or serve locally  
python -m http.server 8000
```

### 5. Testing Connection

Use the "Test Google Sheets" button in the application to verify your Google Apps Script connection is working properly.

## Security Notes

- The Google Apps Script URL is publicly accessible but only performs read/write operations on your specific Google Sheet
- No sensitive data is stored in the application code
- All data processing happens client-side in your browser