# Vercel Deployment Guide

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from project directory**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy "~/path/to/project"? **Y**
   - Which scope do you want to deploy to? **Select your account**
   - Link to existing project? **N** (for first deployment)
   - What's your project's name? **trazilica-proizvoda-troskovnik**
   - In which directory is your code located? **./**

5. **Production deployment**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub Integration

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect it as a static site

3. **Configure Project Settings**:
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - **Build Command**: `npm run build` (optional)
   - **Output Directory**: ./
   - **Install Command**: `npm install`

## Configuration Files

- **vercel.json**: Main configuration for routing and headers
- **.vercelignore**: Excludes test files and documentation from deployment
- **package.json**: Updated with build scripts for Vercel

## Environment Variables

If you need to set any environment variables (like Google Apps Script URLs), add them in the Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add variables as needed

## Post-Deployment

1. **Test the deployed application**
2. **Update any hardcoded URLs** in your Google Apps Script configuration
3. **Test Google Sheets integration** with the new domain
4. **Set up custom domain** (optional) in Vercel dashboard

## Notes

- The app is a static site, so it deploys quickly
- All JavaScript files are served directly
- Google Sheets integration will work with the new domain
- CORS settings may need adjustment in Google Apps Script

## Troubleshooting

- If deployment fails, check the build logs in Vercel dashboard
- Ensure all file paths are relative (not absolute)
- Check browser console for any CORS or loading errors