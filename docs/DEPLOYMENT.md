# Deployment Guide

## Overview

The frontend is deployed on Vercel with native Next.js support.

## Production URLs

- **Frontend:** `https://employees.anchorselectric.com`
- **Backend:** `https://anchors-electric-backend-production.up.railway.app`

## Vercel Deployment

### Prerequisites

1. Vercel account (https://vercel.com)
2. GitHub repository connected
3. Backend deployed and accessible

### Step 1: Import Project

1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js

### Step 2: Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

**Name:** `NEXT_PUBLIC_API_URL`  
**Value:** `https://anchors-electric-backend-production.up.railway.app`

⚠️ **Important:** The `NEXT_PUBLIC_` prefix makes it available in the browser.

### Step 3: Deploy

1. Click "Deploy"
2. Vercel will build and deploy automatically
3. App will be live at: `https://your-project.vercel.app`

### Step 4: Custom Domain

1. Go to Settings → Domains
2. Add your custom domain: `employees.anchorselectric.com`
3. Follow DNS configuration instructions
4. SSL is automatic

## Automatic Deployments

- **Production:** Pushes to `main` branch
- **Preview:** Pull requests and other branches

## Environment Variables

### Required

- `NEXT_PUBLIC_API_URL` - Backend API URL
  - Production: `https://anchors-electric-backend-production.up.railway.app`
  - Local: `http://localhost:3001`

### Setting Variables

**Via Dashboard:**
1. Settings → Environment Variables
2. Add variable
3. Select environments (Production, Preview, Development)
4. Redeploy

**Via CLI:**
```bash
vercel env add NEXT_PUBLIC_API_URL
```

## Post-Deployment Checklist

- [ ] Verify environment variables are set
- [ ] Test login functionality
- [ ] Test API connections
- [ ] Check browser console for errors
- [ ] Verify CORS settings on backend
- [ ] Test on mobile devices
- [ ] Set up custom domain

## Troubleshooting

### Build Fails

1. Check build logs in Vercel dashboard
2. Verify Node.js version (Vercel uses Node 20)
3. Check for TypeScript errors:
   ```bash
   npm run build
   ```

### API Connection Issues

1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Check backend CORS settings
3. Check backend logs for connection attempts

### Environment Variables Not Working

1. Redeploy after adding variables
2. Check variable name starts with `NEXT_PUBLIC_`
3. Clear browser cache

### CORS Errors

Update backend `CORS_ORIGIN` to include your Vercel domain:
```
CORS_ORIGIN=https://employees.anchorselectric.com
```

## Performance

Vercel automatically provides:
- ✅ Global CDN
- ✅ Edge caching
- ✅ Automatic HTTPS
- ✅ Image optimization
- ✅ Serverless functions

## Monitoring

- **Analytics:** Vercel Analytics
- **Logs:** View in Vercel dashboard
- **Performance:** Built-in monitoring
