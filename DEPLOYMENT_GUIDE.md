# MERN LMS - Vercel Deployment Guide

Complete guide for deploying your MERN Learning Management System to Vercel.

## 📋 Prerequisites

- GitHub account with two repositories:
  - **Backend**: `saumya185/MERN_LMS_STARTER1`
  - **Frontend**: `saumya185/MERN_LMS_STARTER2`
- Vercel account (free tier works fine)
- MongoDB Atlas database
- Cloudinary account (for media uploads)
- Stripe account (for payments)
- Google OAuth credentials (optional, for OAuth login)

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend to Vercel

1. **Login to Vercel Dashboard**
   - Go to https://vercel.com
   - Click "Add New Project"

2. **Import Backend Repository**
   - Click "Import Git Repository"
   - Select `saumya185/MERN_LMS_STARTER1`
   - Click "Import"

3. **Configure Project**
   - **Project Name**: `lms-backend` (or your choice)
   - **Framework Preset**: Other
   - **Root Directory**: `backend` (IMPORTANT: Set this to `backend` folder)
   - **Build Command**: Leave empty or use `npm install`
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

4. **Add Environment Variables**
   
   Click "Environment Variables" and add the following:

   ```env
   # MongoDB Configuration
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/lms_production?retryWrites=true&w=majority

   # JWT Secret (generate a random 64-character string)
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

   # Cloudinary Configuration
   CLOUDINARY_NAME=your-cloudinary-cloud-name
   CLOUDINARY_KEY=your-cloudinary-api-key
   CLOUDINARY_SECRET=your-cloudinary-api-secret
   CLOUDINARY_URL=cloudinary://key:secret@cloud-name

   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
   STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key

   # Google OAuth (Optional)
   GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

   # Frontend URL (update after deploying frontend)
   CLIENT_URL=https://your-frontend-app.vercel.app

   # Node Environment
   NODE_ENV=production

   # Server Port (Vercel handles this automatically)
   PORT=3000
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Copy your backend URL (e.g., `https://lms-backend.vercel.app`)

---

### Step 2: Deploy Frontend to Vercel

1. **Add New Project**
   - In Vercel dashboard, click "Add New Project"

2. **Import Frontend Repository**
   - Select `saumya185/MERN_LMS_STARTER2`
   - Click "Import"

3. **Configure Project**
   - **Project Name**: `lms-frontend` (or your choice)
   - **Framework Preset**: Vite
   - **Root Directory**: Leave as root (/)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Add Environment Variables**

   ```env
   # Backend API URL (use the backend URL from Step 1)
   VITE_API_URL=https://lms-backend.vercel.app

   # Optional: Google OAuth Client ID (if using OAuth)
   VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Copy your frontend URL (e.g., `https://lms-frontend.vercel.app`)

---

### Step 3: Update Backend CLIENT_URL

1. Go to your backend project in Vercel
2. Settings → Environment Variables
3. Update `CLIENT_URL` with your frontend URL
4. Redeploy the backend (Deployments → Latest → Redeploy)

---

### Step 4: Update Frontend API Configuration

1. **Edit `frontend/src/services/api.js`**
   
   Update the base URL to use environment variable:

   ```javascript
   import axios from 'axios';

   const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

   export const api = axios.create({
     baseURL: API_BASE_URL,
     headers: {
       'Content-Type': 'application/json',
     },
   });
   ```

2. **Commit and push changes**
   ```bash
   cd frontend
   git add .
   git commit -m "Update API base URL for production"
   git push
   ```

3. Vercel will auto-deploy the updated frontend

---

## 🔧 Configuration Files Overview

### Backend Files

**`backend/vercel.json`**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/index.js"
    }
  ]
}
```

**`backend/api/index.js`**
- Serverless wrapper for Express app
- Handles all API routes as serverless functions
- Manages MongoDB connection pooling

**`backend/.vercelignore`**
- Excludes unnecessary files from deployment
- Reduces deployment size and time

### Frontend Files

**`frontend/vercel.json`**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "handle": "filesystem" },
    { "src": "/.*", "dest": "/index.html" }
  ]
}
```

---

## ⚠️ Important Notes

### Socket.io Limitation

Vercel serverless functions **do not support WebSocket/socket.io** for real-time features. 

**Solutions:**
1. Deploy a separate socket server on Render, Railway, or Fly.io
2. Use managed services like Pusher, Supabase Realtime, or Ably
3. Implement polling as a fallback (not recommended for production)

### MongoDB Connection

- Use MongoDB Atlas (cloud database)
- Whitelist Vercel IPs or use `0.0.0.0/0` (allow all)
- Use connection string format: `mongodb+srv://...`

### CORS Configuration

Ensure your backend allows frontend origin:

```javascript
// In backend/src/index.js or api/index.js
const cors = require('cors');

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
```

### Google OAuth Callback URL

Update Google Cloud Console with your deployed URLs:
- **Authorized JavaScript origins**: 
  - `https://your-frontend.vercel.app`
- **Authorized redirect URIs**:
  - `https://your-frontend.vercel.app/auth/google/callback`
  - `https://your-backend.vercel.app/api/auth/google/callback`

---

## 🧪 Testing Deployment

### Backend Health Check
```bash
curl https://your-backend.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "LMS Backend (serverless) is running"
}
```

### Frontend
1. Open `https://your-frontend.vercel.app`
2. Check browser console for errors
3. Test navigation and API calls

---

## 🐛 Troubleshooting

### Build Failures

1. **Check Build Logs** in Vercel dashboard
2. Common issues:
   - Missing dependencies in `package.json`
   - Wrong Node version (add `.nvmrc` with `18` or `20`)
   - Environment variables not set

### API Connection Errors

1. Verify `VITE_API_URL` in frontend env vars
2. Check CORS configuration in backend
3. Verify backend is deployed and healthy (`/api/health`)

### Database Connection Issues

1. Check MongoDB Atlas network access
2. Verify `MONGO_URI` is correct
3. Check Vercel function logs for connection errors

### MIME Type Errors (JavaScript modules)

If you see: `"Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of 'text/html'"`

**Solution**: Ensure `frontend/vercel.json` has:
```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/.*", "dest": "/index.html" }
  ]
}
```

---

## 📦 Deployment Checklist

- [ ] Backend deployed with correct Root Directory (`backend`)
- [ ] All environment variables added to backend
- [ ] Frontend deployed with Vite framework preset
- [ ] Frontend environment variables added (`VITE_API_URL`)
- [ ] Backend `CLIENT_URL` updated with frontend URL
- [ ] CORS configured properly
- [ ] MongoDB Atlas network access configured
- [ ] Google OAuth redirect URIs updated (if using OAuth)
- [ ] Cloudinary credentials verified
- [ ] Stripe keys added and tested
- [ ] Health check endpoint responding
- [ ] Frontend successfully calling backend APIs

---

## 🔄 Continuous Deployment

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Your commit message"
git push

# Vercel will auto-deploy
```

---

## 📞 Support

If you encounter issues:
1. Check Vercel function logs (Runtime Logs)
2. Review build logs for errors
3. Verify all environment variables are set correctly
4. Test locally with production environment variables

---

## 🎉 Success!

Once deployed, your MERN LMS will be accessible at:
- **Frontend**: `https://your-frontend.vercel.app`
- **Backend API**: `https://your-backend.vercel.app/api`

Enjoy your deployed Learning Management System! 🚀
