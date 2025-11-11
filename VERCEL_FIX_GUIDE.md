# 🔧 Vercel Deployment Fix Guide

## ✅ Changes Made to Fix the Crash

I've updated `api/index.js` with:
1. ✅ Better error handling
2. ✅ Improved CORS configuration
3. ✅ Mongoose connection retry logic
4. ✅ Health check endpoint that works without DB
5. ✅ Try-catch blocks for route loading
6. ✅ Global error handler
7. ✅ 404 handler for unknown routes

---

## 🚀 Redeploy Steps

### Option 1: Automatic Redeploy (Recommended)
Vercel will automatically redeploy when it detects the GitHub push. Wait 2-3 minutes.

### Option 2: Manual Redeploy
1. Go to your backend project in Vercel dashboard
2. Click **Deployments** tab
3. Click on latest deployment
4. Click **Redeploy** button

---

## ⚠️ Critical Checks Before Deploying

### 1. Root Directory Setting
**MUST be set to `backend`** (not `.` or empty)

In Vercel dashboard:
- Settings → General → Root Directory
- Set to: `backend`
- Save

### 2. Required Environment Variables

These MUST be set in Vercel (Settings → Environment Variables):

```env
# Critical - Must have these
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/lms_production
JWT_SECRET=your-super-secret-random-string-64-chars-minimum
NODE_ENV=production

# For file uploads
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
# OR individually:
CLOUDINARY_NAME=your-cloud-name
CLOUDINARY_KEY=your-api-key
CLOUDINARY_SECRET=your-api-secret

# For CORS (update after frontend deploy)
CLIENT_URL=https://your-frontend.vercel.app

# Optional (if using these features)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
STRIPE_SECRET_KEY=your-stripe-secret-key
```

### 3. MongoDB Atlas Configuration

Your MongoDB must:
- ✅ Be a MongoDB Atlas cloud database (not localhost)
- ✅ Have Network Access set to `0.0.0.0/0` (allow all) or Vercel IPs whitelisted
- ✅ Use connection string format: `mongodb+srv://...`

Example:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lms_production?retryWrites=true&w=majority
```

---

## 🧪 Testing After Deploy

### 1. Test Health Endpoint
```bash
curl https://your-backend.vercel.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "LMS Backend (serverless) is running",
  "timestamp": "2025-11-11T...",
  "env": "production"
}
```

### 2. Check Vercel Function Logs

If still getting errors:
1. Go to Vercel Dashboard
2. Your backend project → **Logs** or **Runtime Logs**
3. Look for error messages
4. Common errors and fixes below ⬇️

---

## 🐛 Common Errors and Solutions

### Error: "FUNCTION_INVOCATION_FAILED"

**Causes:**
1. ❌ Missing environment variables
2. ❌ Wrong Root Directory (not set to `backend`)
3. ❌ MongoDB connection string is localhost (must be Atlas)
4. ❌ Missing dependencies in package.json

**Fix:**
- Set Root Directory to `backend`
- Add all required environment variables
- Use MongoDB Atlas connection string
- Redeploy

### Error: "Cannot find module '../src/routes/auth'"

**Cause:** Root Directory not set correctly

**Fix:**
1. Vercel Settings → General → Root Directory
2. Change to: `backend`
3. Save and redeploy

### Error: "MongooseServerSelectionError"

**Causes:**
1. ❌ Wrong MongoDB connection string
2. ❌ Network access not configured in MongoDB Atlas
3. ❌ MONGO_URI environment variable not set

**Fix:**
1. Go to MongoDB Atlas
2. Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)
3. Database → Connect → Get connection string
4. Add to Vercel environment variables
5. Redeploy

### Error: "CORS policy blocked"

**Cause:** CLIENT_URL not set or wrong

**Fix:**
1. Add environment variable in Vercel:
   ```
   CLIENT_URL=https://your-frontend.vercel.app
   ```
2. Make sure no trailing slash
3. Redeploy

---

## 📋 Deployment Checklist

Before declaring success, verify:

- [ ] Health endpoint returns 200 OK: `curl https://your-backend.vercel.app/api/health`
- [ ] Root Directory is set to `backend` in Vercel settings
- [ ] All environment variables are set (especially MONGO_URI, JWT_SECRET)
- [ ] MongoDB Atlas has network access configured
- [ ] No errors in Vercel Runtime Logs
- [ ] Function doesn't crash (no 500 errors)
- [ ] CORS is working (CLIENT_URL is set)

---

## 🔍 How to Debug

### Check Vercel Logs:
1. Vercel Dashboard → Your Project
2. Click **Logs** or **Runtime Logs** tab
3. Look for red error messages
4. Common patterns:
   - "Cannot find module" → Root Directory wrong
   - "MongooseError" → Database connection issue
   - "TypeError" → Missing environment variable

### Test Locally First:
```bash
cd backend
npm install

# Set environment variables (create .env file)
# Then test:
node api/index.js
```

---

## ✅ Success Indicators

You know it's working when:

1. ✅ Health endpoint responds: `https://your-backend.vercel.app/api/health`
2. ✅ No 500 errors in browser/curl
3. ✅ Vercel Runtime Logs show: "MongoDB connected (serverless)"
4. ✅ Function cold start takes 3-5 seconds, then responds quickly

---

## 🆘 Still Not Working?

If after all fixes it still crashes, check:

1. **View Build Logs** in Vercel (during deployment)
   - Look for npm install errors
   - Check for missing dependencies

2. **View Runtime Logs** (after deployment)
   - Look for JavaScript errors
   - Check for environment variable issues

3. **Test MongoDB Connection String** locally:
   ```bash
   node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_MONGO_URI').then(() => console.log('Connected!')).catch(err => console.error(err));"
   ```

4. **Verify serverless-http version:**
   ```bash
   cd backend
   npm ls serverless-http
   # Should show version ^3.2.0 or higher
   ```

---

## 📞 Quick Support Commands

```bash
# Check if health endpoint works
curl https://your-backend.vercel.app/api/health

# Check if root endpoint works
curl https://your-backend.vercel.app/

# Test with verbose output
curl -v https://your-backend.vercel.app/api/health

# Check response headers
curl -I https://your-backend.vercel.app/api/health
```

---

## 🎯 Next Steps After Backend Works

1. Deploy frontend to Vercel
2. Get frontend URL (e.g., `https://lms-frontend.vercel.app`)
3. Update backend `CLIENT_URL` environment variable
4. Redeploy backend
5. Test full app flow

Good luck! 🚀
