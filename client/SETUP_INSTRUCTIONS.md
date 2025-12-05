# Quick Setup Instructions

## Prerequisites

1. Backend (AI_agent) running on `http://localhost:8000`
2. Node.js and npm installed

## Setup Steps

### 1. Create Environment File

Create a `.env` file in the frontend root (`/home/bs01083/_work/shadcn-admin/.env`):

```env
VITE_API_BASE_URL=http://localhost:8000
```

### 2. Install Dependencies (if not already done)

```bash
cd /home/bs01083/_work/shadcn-admin
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

### 4. Test the Integration

1. Navigate to `http://localhost:5173/sign-up` (or your dev server URL)
2. Register a new account
3. Login with your credentials
4. Check that your profile displays in the top-right corner

## Verify Backend is Running

Before testing, ensure the backend is running:

```bash
cd /home/bs01083/_work/AI_agent
# Follow backend setup instructions
# The API should be accessible at http://localhost:8000
# You can verify by visiting http://localhost:8000/docs
```

## Troubleshooting

### Issue: Can't connect to API

**Solution:**
1. Verify backend is running: `http://localhost:8000/health`
2. Check the `.env` file exists and has correct URL
3. Check browser console for CORS errors
4. Verify backend CORS settings include your frontend URL

### Issue: Token not persisting after refresh

**Solution:**
1. Check browser cookies (DevTools → Application → Cookies)
2. Should see: `access_token`, `refresh_token`, `user_data`
3. If missing, check browser console for errors

### Issue: 401 Unauthorized errors

**Solution:**
1. Token might be expired - try logging out and back in
2. Check Authorization header in Network tab
3. Verify token format: `Bearer <token>`

## What's Integrated

✅ User Registration
✅ User Login  
✅ User Logout
✅ Token Management (Access + Refresh)
✅ Automatic Token Refresh
✅ Profile Display
✅ React Query Caching
✅ Error Handling
✅ TypeScript Type Safety

## Next Steps

- Read `API_INTEGRATION_GUIDE.md` for detailed documentation
- Add more API endpoints as needed
- Implement role-based access control
- Add more features using the same patterns

## Support

For more detailed information, see:
- `API_INTEGRATION_GUIDE.md` - Complete API integration documentation
- Backend API docs: `http://localhost:8000/docs`


