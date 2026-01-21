# Vercel Deployment Guide

## Overview

This guide covers deploying the Anchors Electric frontend to Vercel. Vercel has native Next.js support, which is the recommended deployment method.

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com (free tier available)
2. **GitHub Repository**: Your frontend code should be in a GitHub repository
3. **Backend URL**: Your backend should be deployed (Railway: `https://anchors-electric-backend-production.up.railway.app`)

## Option 1: Native Vercel Deployment (Recommended)

Vercel's native Next.js deployment is optimized and doesn't require Docker.

### Step 1: Sign Up / Login to Vercel

1. Go to https://vercel.com
2. Sign up with GitHub (recommended for easy integration)
3. Complete the setup

### Step 2: Import Your Project

1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository (`anchors-electric-frontend`)
3. Vercel will auto-detect it's a Next.js project

### Step 3: Configure Project Settings

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `./` (or leave default)

**Build Command:** `npm run build` (default)

**Output Directory:** `.next` (default)

**Install Command:** `npm install` (default)

### Step 4: Configure Environment Variables

In the project settings, add:

**Name:** `NEXT_PUBLIC_API_URL`  
**Value:** `https://anchors-electric-backend-production.up.railway.app`

**Important:** 
- The `NEXT_PUBLIC_` prefix makes it available in the browser
- This is already set in `vercel.json`, but you can override it here

### Step 5: Deploy

1. Click **"Deploy"**
2. Vercel will:
   - Install dependencies
   - Build your Next.js app
   - Deploy to a global CDN
3. Your app will be live at: `https://your-project-name.vercel.app`

### Step 6: Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Option 2: Docker Deployment on Vercel

Vercel also supports Docker deployments, but native Next.js is recommended.

### Using Vercel CLI with Docker

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

Vercel will use the Dockerfile if configured, but native Next.js is still preferred.

## Environment Variables

### Required Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL
  - Production: `https://anchors-electric-backend-production.up.railway.app`
  - Local Dev: `http://localhost:3001` (for local testing)

### Setting Environment Variables

**Via Vercel Dashboard:**
1. Go to **Settings** → **Environment Variables**
2. Add each variable
3. Select environments (Production, Preview, Development)
4. Redeploy

**Via Vercel CLI:**
```bash
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://anchors-electric-backend-production.up.railway.app
```

## Configuration Files

### `vercel.json`
- Framework detection
- Build settings
- Default environment variables

### `.vercelignore`
- Files to exclude from deployment
- Similar to `.gitignore`

## Deployment Workflow

### Automatic Deployments

Vercel automatically deploys:
- **Production:** Pushes to `main` or `prod` branch
- **Preview:** Pull requests and other branches

### Manual Deployment

```bash
vercel --prod
```

## Post-Deployment Checklist

- [ ] Verify environment variables are set
- [ ] Test login functionality
- [ ] Test API connections
- [ ] Check console for errors
- [ ] Verify CORS settings on backend
- [ ] Test on mobile devices
- [ ] Set up custom domain (if needed)

## Troubleshooting

### Build Fails

1. **Check build logs** in Vercel dashboard
2. **Verify Node.js version** (Vercel uses Node 20 by default)
3. **Check for TypeScript errors:**
   ```bash
   npm run build
   ```

### API Connection Issues

1. **Verify `NEXT_PUBLIC_API_URL`** is set correctly
2. **Check backend CORS settings** - ensure Vercel domain is allowed
3. **Check backend logs** for connection attempts

### Environment Variables Not Working

1. **Redeploy** after adding environment variables
2. **Check variable name** - must start with `NEXT_PUBLIC_` for client-side
3. **Clear browser cache** - old values might be cached

### CORS Errors

Update backend CORS settings to include your Vercel domain:
```typescript
// In backend src/app.ts
cors({
  origin: [
    'https://your-app.vercel.app',
    'https://your-custom-domain.com',
    process.env.CORS_ORIGIN || '*'
  ],
  credentials: true,
})
```

## Performance Optimization

Vercel automatically provides:
- ✅ Global CDN
- ✅ Edge caching
- ✅ Automatic HTTPS
- ✅ Image optimization
- ✅ Serverless functions

## Monitoring

- **Analytics:** Vercel Analytics (add to project)
- **Logs:** View in Vercel dashboard
- **Performance:** Built-in performance monitoring

## Cost

- **Free Tier:** 
  - 100GB bandwidth/month
  - Unlimited deployments
  - Perfect for most projects

- **Pro Tier:** $20/month
  - More bandwidth
  - Team features
  - Advanced analytics

## Next Steps After Deployment

1. **Update Backend CORS:**
   - Add Vercel domain to allowed origins
   - Update `CORS_ORIGIN` environment variable

2. **Test Everything:**
   - Login/logout
   - All user flows
   - Admin functions
   - Employee functions

3. **Set Up Custom Domain:**
   - Add domain in Vercel
   - Configure DNS
   - Enable SSL (automatic)

4. **Monitor:**
   - Check Vercel analytics
   - Monitor error logs
   - Set up alerts

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Support:** Available in dashboard
