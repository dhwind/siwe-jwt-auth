# SIWE Authentication Test Frontend

A React TypeScript application for testing Sign-In with Ethereum (SIWE) authentication.

## Features

- 🦊 MetaMask wallet connection
- ✍️ SIWE message generation and signing
- 🔐 JWT token management (access & refresh)
- 🔒 Protected route testing
- 📝 Real-time operation logs
- ⚙️ Configurable backend URL

## Installation

Already installed! The dependencies include:

- `ethers` (v6.15.0) - Ethereum wallet interaction
- `siwe` (v3.0.0) - SIWE message handling
- `react` & `react-dom` - UI framework

## Usage

### 1. Start the React app

```bash
cd test-frontend
npm start
```

The app will open at `http://localhost:3000`

### 2. Make sure your backend is running

Your NestJS backend should be running on `http://localhost:3000` (or update the Backend URL in the app)

### 3. Test the authentication flow

1. **Connect Wallet** - Click to connect MetaMask
2. **Sign In with Ethereum** - Generate and sign SIWE message
3. **Refresh Token** - Test token refresh using cookies
4. **Test Protected Route** - Call `/user/me` with JWT

## How It Works

### Authentication Flow

1. User connects MetaMask wallet
2. App generates SIWE message with:
   - Domain (from window.location)
   - User's Ethereum address
   - Random nonce
   - Chain ID
3. User signs the message in MetaMask
4. App sends message + signature to backend `/auth/sign-in`
5. Backend verifies signature and returns access token (in response) and refresh token (in cookie)
6. App can now call protected routes with the access token

### Token Management

- **Access Token**: Stored in state, sent in `Authorization` header
- **Refresh Token**: Stored in httpOnly cookie, automatically sent with requests
- **Refresh**: Call `/auth/refresh` to get a new access token

## API Endpoints Used

- `POST /auth/sign-in` - SIWE authentication
- `POST /auth/refresh` - Refresh access token
- `GET /user/me` - Protected route example

## Notes

- The app uses a **random nonce** for testing. In production, you should fetch the nonce from your backend first
- Make sure CORS is properly configured on your backend to allow requests from `http://localhost:3000`
- Cookies require `credentials: 'include'` in fetch requests

## Troubleshooting

### MetaMask not detected

- Make sure MetaMask extension is installed
- The app must be served via HTTP (not file://)
- Refresh the page after installing MetaMask

### CORS errors

Add CORS configuration to your NestJS backend:

\`\`\`typescript
app.enableCors({
origin: 'http://localhost:3000',
credentials: true,
});
\`\`\`

### Cookie not being sent

- Ensure `credentials: 'include'` is set in fetch requests
- Backend must respond with `Access-Control-Allow-Credentials: true`
- Domain must match (both on localhost)
