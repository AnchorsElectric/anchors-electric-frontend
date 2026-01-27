# Fix Vercel Deployment Branch

## Problem
Vercel is deploying from `dev` branch instead of `main` branch.

## Solution: Change Production Branch in Vercel Dashboard

### Step 1: Go to Vercel Dashboard
1. Go to https://vercel.com
2. Sign in to your account
3. Select your project (`anchors-electric-frontend`)

### Step 2: Go to Project Settings
1. Click on **"Settings"** tab (top navigation)
2. Scroll down to **"Git"** section

### Step 3: Change Production Branch
1. Find **"Production Branch"** setting
2. Click the dropdown/input field
3. Change it from `dev` to `main`
4. Click **"Save"** or the checkmark

### Step 4: Redeploy
After changing the branch:
1. Go to **"Deployments"** tab
2. Click **"Redeploy"** on the latest deployment (or it will auto-redeploy)
3. Make sure it's deploying from `main` branch

## Alternative: Using Vercel CLI

If you have Vercel CLI installed:

```bash
# Link to your project (if not already linked)
vercel link

# Update production branch
vercel --prod --force
```

## Verify

After changing:
1. Check **"Deployments"** tab
2. New deployments should show `main` branch
3. Production URL should reflect changes from `main` branch

## Note

- **Production Branch:** Deploys automatically on push to this branch
- **Preview Deployments:** All other branches create preview deployments
- **Custom Domain:** Points to production branch deployments
