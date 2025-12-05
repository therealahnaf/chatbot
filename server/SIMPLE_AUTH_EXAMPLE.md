# Simple Authentication - Like Express.js

## The Auth Function

```python
# app/api/middleware/auth.py

def authenticate_token(credentials) -> dict:
    """
    Validates JWT token and returns decoded user info.
    
    - Extracts token from "Bearer <token>"
    - Returns 401 if token missing
    - Returns 403 if token invalid/expired
    - Returns decoded user dict on success
    """
```

## Usage in Routes

### Protected Route
```python
from fastapi import APIRouter, Depends
from app.api.middleware import authenticate_token

router = APIRouter()

@router.get("/documents")
async def list_documents(
    user: dict = Depends(authenticate_token)  # ← Simple auth
):
    user_id = user["sub"]  # Get user ID from token
    return {"user_id": user_id, "documents": [...]}
```

### Open Route (No Auth)
```python
@router.post("/auth/login")
async def login(credentials: LoginRequest):
    # No Depends(authenticate_token) = open to everyone
    return {"token": "..."}
```

## What You Get

The `user` dict contains the decoded JWT payload:
```python
{
    "sub": "user-id-here",      # User ID
    "exp": 1234567890,          # Expiration timestamp
    "type": "access"            # Token type
}
```

## Example: Knowledge Base Route

**Before (complex):**
```python
async def upload_document(
    file: UploadFile,
    current_user: User = Depends(get_current_user),  # Fetches from DB
    db: Session = Depends(get_db),
):
    user_id = current_user.id
```

**After (simple):**
```python
async def upload_document(
    file: UploadFile,
    user: dict = Depends(authenticate_token),  # Just validates token
):
    user_id = user["sub"]  # Get ID from token
```

## Benefits

✅ **Super Simple** - Just like Express.js middleware  
✅ **No Database Queries** - Only validates token  
✅ **Fast** - No extra overhead  
✅ **Clear** - You see exactly what's happening  
✅ **Flexible** - Fetch user from DB only if you need it  

## Making Requests

```bash
# Protected endpoint
curl -H "Authorization: Bearer <your-jwt-token>" \
     http://localhost:8000/api/v1/documents

# Returns 401 without token
curl http://localhost:8000/api/v1/documents
```

## That's It!

No complex middleware, no global auth, no hidden magic. Just a simple dependency that validates tokens. 🎯
