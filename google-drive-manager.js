/**
 * GOOGLE DRIVE MANAGER MODULE
 * Handles Google Drive integration for storing and loading application state files
 */

// Google Drive API configuration
const GOOGLE_DRIVE_CONFIG = {
    // Your actual Google Cloud Console OAuth client ID
    CLIENT_ID: '505926848303-62o2t8og7ct8pcoskq8gqtmpt8smu43p.apps.googleusercontent.com',
    API_KEY: 'AIzaSyBNFWtRCq2PrKDsk9O9DhKy0wcGFKmRAkI', // Create this in Google Cloud Console → Credentials → API Key
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    
    // Application folder settings
    APP_FOLDER_NAME: 'Tražilica Proizvoda - App Data',
    MIME_TYPE_JSON: 'application/json',
    MIME_TYPE_FOLDER: 'application/vnd.google-apps.folder'
};

// Global state variables
let gapi_initialized = false;
let gis_initialized = false;
let google_signed_in = false;
let app_folder_id = null;
let current_user_info = null;
let token_client = null;
let access_token = null;

/**
 * Initialize Google Drive API with Google Identity Services
 */
async function initializeGoogleDrive() {
    try {
        console.log('🔄 Initializing Google Drive API with GIS...');
        console.log('📋 Checking environment...');
        
        // Check if required elements exist
        const statusElement = document.getElementById('googleDriveStatus');
        console.log('📋 Status element available:', statusElement ? 'Yes' : 'No');
        
        // Wait for gapi and google (GIS) to be loaded
        console.log('⏳ Waiting for gapi and google (GIS) to load...');
        await Promise.all([
            waitForGapi(),
            waitForGIS()
        ]);
        
        console.log('🔄 Loading gapi client (Drive API only)...');
        
        // Initialize gapi client (no auth2)
        await new Promise((resolve, reject) => {
            gapi.load('client', {
                callback: () => {
                    console.log('✅ gapi.load (client) completed');
                    resolve(null);
                },
                onerror: (error) => {
                    console.error('❌ gapi.load failed:', error);
                    reject(new Error('Failed to load Google API client'));
                }
            });
        });
        
        // Initialize gapi client
        await initializeGapiClient();
        
        // Initialize GIS token client
        await initializeGISTokenClient();
        
        console.log('✅ Google Drive API with GIS initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to initialize Google Drive API:');
        console.error('📋 Full error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            error: error
        });
        
        showMessage('error', 
            `❌ Greška pri inicijalizaciji Google Drive API!\n\n` +
            `${error.message}\n\n` +
            `💡 Provjerite internet vezu i Google Drive konfiguraciju.\n\n` +
            `🔍 Više detalja u browser console (F12).`
        );
        return false;
    }
}

/**
 * Wait for gapi to load
 */
function waitForGapi() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds timeout
        
        if (typeof gapi !== 'undefined') {
            console.log('✅ gapi already loaded');
            resolve(null);
            return;
        }
        
        const checkGapi = setInterval(() => {
            attempts++;
            console.log(`🔍 Checking for gapi... (attempt ${attempts}/${maxAttempts})`);
            
            if (typeof gapi !== 'undefined') {
                console.log('✅ gapi loaded successfully');
                clearInterval(checkGapi);
                resolve(null);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkGapi);
                reject(new Error('gapi failed to load within timeout'));
            }
        }, 100);
    });
}

/**
 * Wait for Google Identity Services to load
 */
function waitForGIS() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds timeout
        
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            console.log('✅ Google Identity Services already loaded');
            resolve(null);
            return;
        }
        
        const checkGIS = setInterval(() => {
            attempts++;
            console.log(`🔍 Checking for GIS... (attempt ${attempts}/${maxAttempts})`);
            
            if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
                console.log('✅ Google Identity Services loaded successfully');
                clearInterval(checkGIS);
                resolve(null);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkGIS);
                reject(new Error('Google Identity Services failed to load within timeout'));
            }
        }, 100);
    });
}

/**
 * Initialize Google API client (Drive API only, no auth)
 */
async function initializeGapiClient() {
    try {
        console.log('🔄 Starting Google API client initialization (Drive only)...');
        console.log('📋 Config check:', {
            apiKey: GOOGLE_DRIVE_CONFIG.API_KEY ? 'Present' : 'Missing',
            discoveryDoc: GOOGLE_DRIVE_CONFIG.DISCOVERY_DOC
        });
        
        await gapi.client.init({
            apiKey: GOOGLE_DRIVE_CONFIG.API_KEY,
            discoveryDocs: [GOOGLE_DRIVE_CONFIG.DISCOVERY_DOC]
        });
        
        console.log('✅ gapi.client.init completed (Drive API)');
        gapi_initialized = true;
        
        console.log('✅ Google API client initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing Google API client:');
        console.error('📋 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            error: error
        });
        
        if (error.details) {
            console.error('🔍 Google API error details:', error.details);
        }
        
        if (error.result) {
            console.error('🔍 Google API error result:', error.result);
        }
        
        throw error;
    }
}

/**
 * Initialize Google Identity Services token client
 */
async function initializeGISTokenClient() {
    try {
        console.log('🔄 Initializing GIS token client...');
        console.log('📋 GIS Config check:', {
            clientId: GOOGLE_DRIVE_CONFIG.CLIENT_ID ? 'Present' : 'Missing',
            scopes: GOOGLE_DRIVE_CONFIG.SCOPES
        });
        
        token_client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
            scope: GOOGLE_DRIVE_CONFIG.SCOPES,
            callback: handleTokenResponse
        });
        
        console.log('✅ GIS token client initialized');
        gis_initialized = true;
        
        // Check if we have a stored token
        const storedToken = getStoredToken();
        if (storedToken && isTokenValid(storedToken)) {
            access_token = storedToken.access_token;
            gapi.client.setToken({ access_token: access_token });
            google_signed_in = true;
            
            // Get user info
            await getCurrentUserInfo();
            console.log('✅ Restored session from stored token');
        }
        
        updateGoogleDriveUI();
        
    } catch (error) {
        console.error('❌ Error initializing GIS token client:', error);
        throw error;
    }
}

/**
 * Handle token response from GIS
 */
async function handleTokenResponse(tokenResponse) {
    try {
        console.log('✅ Token received from GIS');
        
        if (tokenResponse.error) {
            console.error('❌ Token error:', tokenResponse.error);
            showMessage('error', `❌ Greška pri prijavi: ${tokenResponse.error}`);
            return;
        }
        
        access_token = tokenResponse.access_token;
        
        // Set token for gapi client
        gapi.client.setToken({ access_token: access_token });
        
        // Store token with expiry
        storeToken({
            access_token: access_token,
            expires_at: Date.now() + (tokenResponse.expires_in * 1000)
        });
        
        google_signed_in = true;
        
        // Get current user info
        await getCurrentUserInfo();
        
        // Find or create app folder
        await findOrCreateAppFolder();
        
        updateGoogleDriveUI();
        
        showMessage('success', 
            `✅ Uspješno prijavljeni na Google Drive!\n\n` +
            `👤 Korisnik: ${current_user_info?.name || 'N/A'}\n` +
            `📧 Email: ${current_user_info?.email || 'N/A'}`
        );
        
    } catch (error) {
        console.error('❌ Error handling token response:', error);
        showMessage('error', `❌ Greška pri obradi tokena: ${error.message}`);
    }
}

/**
 * Get current user information using direct API call with access token
 */
async function getCurrentUserInfo() {
    try {
        console.log('🔄 Getting current user info...');
        
        if (!access_token) {
            console.log('❌ No access token available');
            setFallbackUserInfo();
            return;
        }
        
        // Direct fetch to userinfo API with access token
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const userInfo = await response.json();
        
        current_user_info = {
            id: userInfo.id,
            name: userInfo.name,
            email: userInfo.email,
            picture: userInfo.picture
        };
        
        console.log('✅ User info retrieved:', current_user_info.name, current_user_info.email);
        
    } catch (error) {
        console.error('❌ Error getting user info:', error);
        setFallbackUserInfo();
    }
}

/**
 * Set fallback user info when real info is not available
 */
function setFallbackUserInfo() {
    current_user_info = {
        id: 'unknown',
        name: 'Google korisnik',
        email: 'nepoznato',
        picture: null
    };
    console.log('⚠️ Using fallback user info');
}

/**
 * Sign in to Google Drive using GIS
 */
async function signInToGoogleDrive() {
    try {
        if (!gis_initialized || !token_client) {
            showMessage('error', '❌ Google Identity Services nije inicijalizirani!');
            return false;
        }
        
        showMessage('info', '🔄 Prijavljivanje na Google Drive...');
        
        // Request access token with consent to get updated scopes
        token_client.requestAccessToken({
            prompt: 'consent' // Force consent to ensure we get fresh token with all scopes
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ Sign in error:', error);
        showMessage('error', `❌ Greška pri prijavi: ${error.message}`);
        return false;
    }
}

/**
 * Sign out from Google Drive using GIS
 */
async function signOutFromGoogleDrive() {
    try {
        if (!gis_initialized) return;
        
        // Revoke the token
        if (access_token) {
            google.accounts.oauth2.revoke(access_token);
        }
        
        // Clear stored data
        access_token = null;
        google_signed_in = false;
        current_user_info = null;
        app_folder_id = null;
        
        // Clear gapi token
        gapi.client.setToken(null);
        
        // Clear stored token
        removeStoredToken();
        
        updateGoogleDriveUI();
        
        showMessage('success', '✅ Uspješno odjavljeni s Google Drive!');
        
    } catch (error) {
        console.error('❌ Sign out error:', error);
        showMessage('error', `❌ Greška pri odjavi: ${error.message}`);
    }
}

/**
 * Find or create application folder in Google Drive
 */
async function findOrCreateAppFolder() {
    try {
        if (!google_signed_in) return;
        
        // Refresh token if needed
        await refreshTokenIfNeeded();
        
        console.log('🔍 Searching for app folder...');
        
        // Search for existing folder
        const searchResponse = await gapi.client.drive.files.list({
            q: `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='${GOOGLE_DRIVE_CONFIG.MIME_TYPE_FOLDER}' and trashed=false`,
            fields: 'files(id, name)'
        });
        
        const folders = searchResponse.result.files;
        
        if (folders && folders.length > 0) {
            app_folder_id = folders[0].id;
            console.log(`✅ Found existing app folder: ${app_folder_id}`);
        } else {
            // Create new folder
            console.log('📁 Creating new app folder...');
            
            const folderResponse = await gapi.client.drive.files.create({
                resource: {
                    name: GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME,
                    mimeType: GOOGLE_DRIVE_CONFIG.MIME_TYPE_FOLDER
                },
                fields: 'id, name'
            });
            
            app_folder_id = folderResponse.result.id;
            console.log(`✅ Created new app folder: ${app_folder_id}`);
        }
        
        return app_folder_id;
        
    } catch (error) {
        console.error('❌ Error managing app folder:', error);
        showMessage('error', `❌ Greška s Google Drive mapom: ${error.message}`);
        return null;
    }
}

/**
 * Upload file to Google Drive
 */
async function uploadFileToGoogleDrive(fileName, jsonContent, description = '') {
    try {
        if (!google_signed_in || !app_folder_id) {
            throw new Error('Niste prijavljeni na Google Drive ili nema app folder!');
        }
        
        // Refresh token if needed
        await refreshTokenIfNeeded();
        
        console.log(`🔄 Uploading file to Google Drive: ${fileName}`);
        showMessage('info', `🔄 Spremanje datoteke na Google Drive: ${fileName}...`);
        
        // Prepare file metadata
        const fileMetadata = {
            name: fileName,
            parents: [app_folder_id]
        };
        
        if (description) {
            fileMetadata.description = description;
        }
        
        // Create form data for multipart upload
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        
        let body = delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(fileMetadata) + delimiter +
            'Content-Type: ' + GOOGLE_DRIVE_CONFIG.MIME_TYPE_JSON + '\r\n\r\n' +
            JSON.stringify(jsonContent, null, 2) +
            close_delim;
        
        // Upload the file
        const request = gapi.client.request({
            'path': 'https://www.googleapis.com/upload/drive/v3/files',
            'method': 'POST',
            'params': {'uploadType': 'multipart'},
            'headers': {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            'body': body
        });
        
        const response = await request;
        
        const fileSizeKB = Math.round(JSON.stringify(jsonContent).length / 1024);
        
        showMessage('success', 
            `✅ Datoteka uspješno spremljena na Google Drive!\n\n` +
            `📁 Ime datoteke: ${fileName}\n` +
            `📊 Veličina: ${fileSizeKB} KB\n` +
            `🆔 Drive ID: ${response.result.id}\n` +
            `☁️ Lokacija: ${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}`
        );
        
        console.log(`✅ File uploaded successfully: ${response.result.id}`);
        
        return {
            success: true,
            fileId: response.result.id,
            fileName: fileName,
            size: fileSizeKB
        };
        
    } catch (error) {
        console.error('❌ Upload error:', error);
        showMessage('error', 
            `❌ Greška pri spremanju na Google Drive!\n\n` +
            `${error.message}\n\n` +
            `💡 Provjerite internet vezu i Google Drive dozvole.`
        );
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * List files from Google Drive app folder
 */
async function listFilesFromGoogleDrive() {
    try {
        if (!google_signed_in || !app_folder_id) {
            throw new Error('Niste prijavljeni na Google Drive ili nema app folder!');
        }
        
        // Refresh token if needed
        await refreshTokenIfNeeded();
        
        console.log('📋 Listing files from Google Drive...');
        
        const response = await gapi.client.drive.files.list({
            q: `'${app_folder_id}' in parents and mimeType='${GOOGLE_DRIVE_CONFIG.MIME_TYPE_JSON}' and trashed=false`,
            fields: 'files(id, name, description, createdTime, modifiedTime, size)',
            orderBy: 'modifiedTime desc'
        });
        
        const files = response.result.files || [];
        
        console.log(`✅ Found ${files.length} files in Google Drive`);
        
        return files.map(file => ({
            id: file.id,
            name: file.name,
            description: file.description || '',
            createdTime: new Date(file.createdTime),
            modifiedTime: new Date(file.modifiedTime),
            sizeKB: file.size ? Math.round(file.size / 1024) : 0
        }));
        
    } catch (error) {
        console.error('❌ List files error:', error);
        showMessage('error', `❌ Greška pri dohvaćanju datoteka: ${error.message}`);
        return [];
    }
}

/**
 * Download file from Google Drive
 */
async function downloadFileFromGoogleDrive(fileId, fileName) {
    try {
        if (!google_signed_in) {
            throw new Error('Niste prijavljeni na Google Drive!');
        }
        
        // Refresh token if needed
        await refreshTokenIfNeeded();
        
        console.log(`🔄 Downloading file from Google Drive: ${fileName} (${fileId})`);
        showMessage('info', `🔄 Učitavanje datoteke s Google Drive: ${fileName}...`);
        
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        const content = JSON.parse(response.body);
        
        console.log(`✅ File downloaded successfully: ${fileName}`);
        
        showMessage('success', 
            `✅ Datoteka uspješno učitana s Google Drive!\n\n` +
            `📁 Ime datoteke: ${fileName}\n` +
            `🆔 Drive ID: ${fileId}`
        );
        
        return {
            success: true,
            content: content,
            fileName: fileName
        };
        
    } catch (error) {
        console.error('❌ Download error:', error);
        showMessage('error', 
            `❌ Greška pri učitavanju s Google Drive!\n\n` +
            `Datoteka: ${fileName}\n` +
            `Greška: ${error.message}`
        );
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Delete file from Google Drive
 */
async function deleteFileFromGoogleDrive(fileId, fileName) {
    try {
        if (!google_signed_in) {
            throw new Error('Niste prijavljeni na Google Drive!');
        }
        
        // Refresh token if needed
        await refreshTokenIfNeeded();
        
        if (!confirm(`Sigurni ste da želite obrisati datoteku "${fileName}" s Google Drive?`)) {
            return { success: false, cancelled: true };
        }
        
        console.log(`🗑️ Deleting file from Google Drive: ${fileName} (${fileId})`);
        showMessage('info', `🗑️ Brisanje datoteke s Google Drive: ${fileName}...`);
        
        await gapi.client.drive.files.delete({
            fileId: fileId
        });
        
        console.log(`✅ File deleted successfully: ${fileName}`);
        
        showMessage('success', 
            `✅ Datoteka uspješno obrisana s Google Drive!\n\n` +
            `📁 Ime datoteke: ${fileName}`
        );
        
        return {
            success: true,
            fileName: fileName
        };
        
    } catch (error) {
        console.error('❌ Delete error:', error);
        showMessage('error', 
            `❌ Greška pri brisanju s Google Drive!\n\n` +
            `Datoteka: ${fileName}\n` +
            `Greška: ${error.message}`
        );
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Save current application state to Google Drive
 */
async function saveStateToGoogleDrive(saveType = 'full') {
    try {
        if (!google_signed_in || !app_folder_id) {
            const signInSuccess = await signInToGoogleDrive();
            if (!signInSuccess) return;
        }
        
        // Generate filename with timestamp
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const fileName = saveType === 'minimal' ? 
            `Trazilica-Complete-Data-${timestamp}.json` :
            `Trazilica-Stanje-${timestamp}.json`;
        
        // Serialize state based on type
        let state;
        let description;
        
        if (saveType === 'minimal' && typeof serializeMinimalState === 'function') {
            state = serializeMinimalState();
            description = `Kompletni podaci aplikacije (${state.summary?.totalResultsItems || 0} rezultata, ${state.summary?.totalTroskovnikItems || 0} troškovnik stavki)`;
        } else if (typeof serializeAppState === 'function') {
            state = serializeAppState();
            description = `Kompletno stanje aplikacije (${state.stats?.articlesCount || 0} artikala, ${state.stats?.resultsCount || 0} rezultata)`;
        } else {
            throw new Error('State serialization functions not available!');
        }
        
        // Upload to Google Drive
        const result = await uploadFileToGoogleDrive(fileName, state, description);
        
        if (result.success) {
            // Mark as saved if function exists
            if (typeof AppState !== 'undefined' && AppState.markAsSaved) {
                AppState.markAsSaved();
            }
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Save to Google Drive error:', error);
        showMessage('error', `❌ Greška pri spremanju na Google Drive: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Load application state from Google Drive (show file picker)
 */
async function loadStateFromGoogleDrive() {
    try {
        if (!google_signed_in || !app_folder_id) {
            const signInSuccess = await signInToGoogleDrive();
            if (!signInSuccess) return;
        }
        
        // Get list of files
        const files = await listFilesFromGoogleDrive();
        
        if (files.length === 0) {
            showMessage('info', 
                `ℹ️ Nema spremljenih datoteka na Google Drive!\n\n` +
                `📁 Lokacija: ${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}\n\n` +
                `💡 Prvo spremite stanje aplikacije na Google Drive.`
            );
            return;
        }
        
        // Show file picker (simple version - in production you might want a better UI)
        let fileList = 'Odaberite datoteku za učitavanje:\n\n';
        files.forEach((file, index) => {
            fileList += `${index + 1}. ${file.name}\n`;
            fileList += `   📅 Modificirano: ${file.modifiedTime.toLocaleString('hr-HR')}\n`;
            fileList += `   📊 Veličina: ${file.sizeKB} KB\n\n`;
        });
        
        const selection = prompt(fileList + 'Unesite broj datoteke (1-' + files.length + '):');
        const fileIndex = parseInt(selection) - 1;
        
        if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= files.length) {
            showMessage('info', 'Učitavanje otkazano.');
            return;
        }
        
        const selectedFile = files[fileIndex];
        
        // Download and load the file
        const result = await downloadFileFromGoogleDrive(selectedFile.id, selectedFile.name);
        
        if (result.success && typeof deserializeAppState === 'function') {
            const success = deserializeAppState(result.content);
            if (!success) {
                showMessage('error', 'Greška pri učitavanju stanja aplikacije!');
            }
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Load from Google Drive error:', error);
        showMessage('error', `❌ Greška pri učitavanju s Google Drive: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Update Google Drive UI elements
 */
function updateGoogleDriveUI() {
    // Update sign-in button
    const signInBtn = document.getElementById('googleDriveSignInBtn');
    const signOutBtn = document.getElementById('googleDriveSignOutBtn');
    const statusElement = document.getElementById('googleDriveStatus');
    const userInfo = document.getElementById('googleDriveUserInfo');
    
    if (google_signed_in && current_user_info) {
        // Signed in state
        if (signInBtn) signInBtn.style.display = 'none';
        if (signOutBtn) signOutBtn.style.display = 'inline-block';
        
        if (statusElement) {
            statusElement.textContent = '✅ Povezano s Google Drive';
            statusElement.style.color = '#059669';
        }
        
        if (userInfo) {
            userInfo.innerHTML = `
                <div style="font-size: 12px; color: #6b7280;">
                    👤 ${current_user_info.name}<br>
                    📧 ${current_user_info.email}
                </div>
            `;
            userInfo.style.display = 'block';
        }
        
        // Google Drive integration is now built into save/load dialogs
        // No separate buttons needed
        
    } else {
        // Signed out state
        if (signInBtn) signInBtn.style.display = 'inline-block';
        if (signOutBtn) signOutBtn.style.display = 'none';
        
        if (statusElement) {
            statusElement.textContent = '❌ Nije povezano';
            statusElement.style.color = '#dc2626';
        }
        
        if (userInfo) {
            userInfo.style.display = 'none';
        }
        
        // Google Drive integration is built into save/load dialogs
        // Status is communicated via the status indicator
    }
}

// Expose functions globally
window.initializeGoogleDrive = initializeGoogleDrive;
window.signInToGoogleDrive = signInToGoogleDrive;
window.signOutFromGoogleDrive = signOutFromGoogleDrive;
window.saveStateToGoogleDrive = saveStateToGoogleDrive;
window.loadStateFromGoogleDrive = loadStateFromGoogleDrive;
window.uploadFileToGoogleDrive = uploadFileToGoogleDrive;
window.downloadFileFromGoogleDrive = downloadFileFromGoogleDrive;
window.listFilesFromGoogleDrive = listFilesFromGoogleDrive;
window.deleteFileFromGoogleDrive = deleteFileFromGoogleDrive;
window.updateGoogleDriveUI = updateGoogleDriveUI;

/**
 * Token management functions
 */

// Token storage key
const TOKEN_STORAGE_KEY = 'google_drive_token';

/**
 * Store token in localStorage with expiry
 */
function storeToken(tokenData) {
    try {
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
        console.log('🔐 Token stored successfully');
    } catch (error) {
        console.error('❌ Error storing token:', error);
    }
}

/**
 * Get stored token from localStorage
 */
function getStoredToken() {
    try {
        const tokenStr = localStorage.getItem(TOKEN_STORAGE_KEY);
        return tokenStr ? JSON.parse(tokenStr) : null;
    } catch (error) {
        console.error('❌ Error retrieving stored token:', error);
        return null;
    }
}

/**
 * Remove stored token from localStorage
 */
function removeStoredToken() {
    try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        console.log('🗑️ Token removed from storage');
    } catch (error) {
        console.error('❌ Error removing token:', error);
    }
}

/**
 * Check if token is still valid
 */
function isTokenValid(tokenData) {
    if (!tokenData || !tokenData.access_token || !tokenData.expires_at) {
        return false;
    }
    
    // Check if token expires within next 5 minutes
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    return tokenData.expires_at > fiveMinutesFromNow;
}

/**
 * Refresh token if needed
 */
async function refreshTokenIfNeeded() {
    const storedToken = getStoredToken();
    if (!storedToken || isTokenValid(storedToken)) {
        return; // Token is valid or doesn't exist
    }
    
    console.log('🔄 Token expired, requesting new one...');
    
    // Request new token
    if (token_client) {
        token_client.requestAccessToken({
            prompt: '' // No prompt for refresh
        });
    }
}

console.log('✅ Google Drive Manager loaded with GIS - configure CLIENT_ID and API_KEY for full functionality!');