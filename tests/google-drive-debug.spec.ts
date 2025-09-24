import { test, expect } from '@playwright/test';

test.describe('Google Drive Integration Debugging', () => {
  
  test('Debug Google Drive API initialization', async ({ page }) => {
    // Collect console messages for detailed debugging
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(text);
      
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
      
      console.log(`BROWSER ${msg.type().toUpperCase()}: ${msg.text()}`);
    });

    // Capture network failures
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`NETWORK ERROR: ${response.status()} ${response.statusText()} - ${response.url()}`);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      console.log(`PAGE ERROR: ${error.message}`);
      consoleErrors.push(`PAGE ERROR: ${error.message}`);
    });

    // Navigate to application
    await page.goto('http://localhost:8001');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'tests/debug-screenshots/initial-load.png' });
    
    // Wait for Google Drive manager to load
    await page.waitForTimeout(3000);
    
    // Check if Google APIs are loaded
    const gapiLoaded = await page.evaluate(() => {
      return typeof window.gapi !== 'undefined';
    });
    
    console.log(`GAPI Loaded: ${gapiLoaded}`);
    
    // Check Google Drive config
    const driveConfig = await page.evaluate(() => {
      return window.GOOGLE_DRIVE_CONFIG || 'Not available';
    });
    
    console.log('Drive Config:', driveConfig);
    
    // Check initialization function availability
    const initFunctionAvailable = await page.evaluate(() => {
      return typeof window.initializeGoogleDrive === 'function';
    });
    
    console.log(`Init Function Available: ${initFunctionAvailable}`);
    
    // Try to get more detailed error info
    const detailedError = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (typeof window.initializeGoogleDrive === 'function') {
          window.initializeGoogleDrive().then(success => {
            resolve({ success, error: null });
          }).catch(error => {
            resolve({ 
              success: false, 
              error: {
                message: error.message,
                stack: error.stack,
                name: error.name,
                toString: error.toString()
              }
            });
          });
        } else {
          resolve({ success: false, error: 'initializeGoogleDrive not available' });
        }
      });
    });
    
    console.log('Detailed Error Result:', detailedError);
    
    // Check Google Drive UI elements
    const signInButton = await page.locator('#googleDriveSignInBtn');
    const statusElement = await page.locator('#googleDriveStatus');
    
    const signInVisible = await signInButton.isVisible();
    const statusText = await statusElement.textContent();
    
    console.log(`Sign In Button Visible: ${signInVisible}`);
    console.log(`Status Text: ${statusText}`);
    
    // Take final screenshot
    await page.screenshot({ path: 'tests/debug-screenshots/after-analysis.png' });
    
    // Print summary
    console.log('\n=== DEBUGGING SUMMARY ===');
    console.log(`Console Messages: ${consoleMessages.length}`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`GAPI Loaded: ${gapiLoaded}`);
    console.log(`Init Function Available: ${initFunctionAvailable}`);
    console.log(`Google Drive Status: ${statusText}`);
    console.log('\n=== CONSOLE ERRORS ===');
    consoleErrors.forEach(error => console.log(error));
    
    // Basic assertions
    expect(initFunctionAvailable).toBe(true);
    
    // If there are errors, fail the test with detailed info
    if (consoleErrors.length > 0) {
      console.log('\n❌ Errors detected during Google Drive initialization');
      // Don't fail immediately - let's analyze first
    }
  });

  test('Check Google APIs loading sequence', async ({ page }) => {
    const networkRequests: string[] = [];
    
    page.on('request', request => {
      if (request.url().includes('googleapis.com') || request.url().includes('google.com')) {
        networkRequests.push(`REQUEST: ${request.method()} ${request.url()}`);
        console.log(`GOOGLE REQUEST: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('googleapis.com') || response.url().includes('google.com')) {
        console.log(`GOOGLE RESPONSE: ${response.status()} ${response.url()}`);
        
        if (!response.ok()) {
          console.log(`❌ GOOGLE API ERROR: ${response.status()} ${response.statusText()}`);
        }
      }
    });
    
    await page.goto('http://localhost:8001');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    console.log('\n=== GOOGLE API REQUESTS ===');
    networkRequests.forEach(req => console.log(req));
    
    // Check if specific Google scripts loaded
    const scriptsLoaded = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
      return {
        gapiScript: scripts.some(src => src.includes('apis.google.com/js/api.js')),
        gsiScript: scripts.some(src => src.includes('accounts.google.com/gsi/client')),
        allScripts: scripts.filter(src => src.includes('google'))
      };
    });
    
    console.log('Scripts Loaded:', scriptsLoaded);
  });

  test('Test Google Drive authentication flow', async ({ page }) => {
    await page.goto('http://localhost:8001');
    await page.waitForLoadState('networkidle');
    
    // Wait for Google Drive to initialize
    await page.waitForTimeout(3000);
    
    // Look for sign-in button
    const signInButton = page.locator('#googleDriveSignInBtn');
    
    // Check if button becomes visible
    try {
      await signInButton.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Google Drive sign-in button is visible');
      
      // Click sign-in button (this might open popup)
      await signInButton.click();
      
      // Wait a bit to see what happens
      await page.waitForTimeout(2000);
      
      // Take screenshot of any popups or changes
      await page.screenshot({ path: 'tests/debug-screenshots/after-signin-click.png' });
      
    } catch (error) {
      console.log('❌ Sign-in button not visible or clickable:', error.message);
      
      // Check current status
      const status = await page.locator('#googleDriveStatus').textContent();
      console.log(`Current status: ${status}`);
    }
  });

});