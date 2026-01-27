# Trigger Vercel Redeploy

## If Changes Not Showing on Deployed Site

If your changes are on `main` branch but not showing on the deployed site:

### Option 1: Manual Redeploy in Vercel Dashboard

1. Go to https://vercel.com
2. Select your project
3. Go to **"Deployments"** tab
4. Find the latest deployment from `main` branch
5. Click the **"..."** menu (three dots)
6. Click **"Redeploy"**
7. Confirm the redeploy

### Option 2: Verify Production Branch Setting

1. Go to **Settings** → **Git**
2. Verify **"Production Branch"** is set to `main`
3. If it's set to `dev`, change it to `main` and save
4. Vercel will automatically redeploy

### Option 3: Push a New Commit

Any new commit to `main` branch will trigger an automatic deployment:

```bash
git checkout main
# Make a small change or add a comment
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

### Option 4: Clear Vercel Cache

1. Go to **Settings** → **General**
2. Scroll to **"Build & Development Settings"**
3. Click **"Clear Build Cache"**
4. Redeploy

## Verify Deployment

After redeploying:
1. Check **"Deployments"** tab - should show deployment from `main` branch
2. Check deployment logs - should show your latest commit
3. Visit your site - changes should be live

## Current Status

- ✅ Landing page removal commit (`c7e919f`) is on `main` branch
- ✅ Code is pushed to `origin/main`
- ⚠️ Vercel may need manual redeploy or branch setting update
