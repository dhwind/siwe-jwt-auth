# SIWE Authentication Backend

A robust authentication system using **Sign-In with Ethereum (SIWE)** protocol, built with NestJS, Prisma, and PostgreSQL. This project implements secure Web3 authentication with JWT-based session management.

## 🏗️ Architecture

This is a monorepo containing:

```
├── packages/
│   ├── api/           # Main NestJS backend application
│   └── test-frontend/ # Optional React test frontend
```

### Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: SIWE (Sign-In with Ethereum) + JWT
- **Web3**: ethers.js v6
- **Testing**: Jest (unit & e2e tests)

## 📋 Prerequisites

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 15 (for local development or e2e tests)
- Docker & Docker Compose (optional, for containerized deployment)

## 🚀 Getting Started

### Option 1: Local Development

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Set up environment variables**

   Create a `.env` file in `packages/api/`:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/siwe_auth?schema=public"

   # Server
   PORT=3000
   NODE_ENV=development

   # JWT Configuration
   JWT_ACCESS_SECRET="your-secret-key-change-in-production"
   JWT_ACCESS_EXPIRES_IN="1h"
   JWT_REFRESH_SECRET="your-refresh-secret-key"
   JWT_REFRESH_EXPIRES_IN="7d"
   ```

3. **Generate Prisma client and run migrations**

   ```bash
   cd packages/api
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

4. **Start development server**

   ```bash
   pnpm start:dev
   ```

   The API will be available at `http://localhost:3000`

### Option 2: Docker Compose

1. **Build and run with Docker Compose**

   ```bash
   cd packages/api
   docker-compose up --build
   ```

   The API will be available at `http://localhost:3000`

## 📚 API Documentation

### Base URL

```
http://localhost:3000
```

### Authentication Endpoints

#### `GET /auth/nonce`

Get a nonce for wallet address to sign.

**Query Parameters:**

- `address` (string, required) - Ethereum wallet address

**Response:**

```json
{
  "nonce": "AbCdEfGh12345678",
  "address": "0x..."
}
```

**Status Codes:**

- `200` - Success
- `400` - Invalid address format

---

#### `POST /auth/sign-in`

Sign in with a signed SIWE message.

**Request Body:**

```json
{
  "message": "localhost:3000 wants you to sign in...",
  "signature": "0x...",
  "nonce": "AbCdEfGh12345678"
}
```

**Response:**

```json
{
  "address": "0x...",
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Cookies Set:**

- `accessToken` - cookie with access token
- `refreshToken` - cookie with refresh token

**Status Codes:**

- `200` - Success
- `400` - Invalid SIWE message or address
- `401` - Invalid signature or nonce mismatch

---

#### `POST /auth/refresh`

Refresh the access token using the refresh token.

**Headers:**

- `Cookie: refreshToken=...` (automatically sent by browser)

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Cookies Set:**

- `accessToken` - Updated cookie

**Status Codes:**

- `201` - Success
- `400` - Missing refresh token
- `401` - Invalid or expired refresh token

---

#### `POST /auth/sign-out`

Sign out and clear authentication cookies.

**Response:**

- Status: `204 No Content`

**Cookies Cleared:**

- `accessToken`
- `refreshToken`

**Status Codes:**

- `204` - Success
- `500` - Server error during sign-out

---

### User Endpoints (Protected)

All user endpoints require authentication via JWT access token (sent as a cookie or Authorization header).

#### `GET /user/profile`

Get the current authenticated user's profile.

**Headers:**

- `Cookie: accessToken=...` (automatically sent by browser)
- OR `Authorization: Bearer <access_token>`

**Response:**

```json
{
  "id": "uuid",
  "publicAddress": "0x...",
  "username": "user-0x...",
  "nonce": "current-nonce",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**

- `200` - Success
- `401` - Unauthorized (missing or invalid token)

---

#### `PUT /user/profile`

Update the current user's profile.

**Headers:**

- `Cookie: accessToken=...` (automatically sent by browser)
- OR `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "username": "new-username"
}
```

**Response:**

```json
{
  "id": "uuid",
  "publicAddress": "0x...",
  "username": "new-username",
  "nonce": "current-nonce",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

**Status Codes:**

- `200` - Success
- `400` - Validation error (username too short)
- `401` - Unauthorized

---

## 🧪 Testing

### Unit Tests

Run all unit tests:

```bash
cd packages/api
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

Generate coverage report:

```bash
pnpm test:cov
```

Coverage reports will be available in `packages/api/coverage/`.

### E2E Tests

**Important:** E2E tests require a PostgreSQL database connection.

Run e2e tests:

```bash
cd packages/api
pnpm test:e2e
```

The e2e tests use NestJS's testing module with mocked `OrmService` to avoid requiring a real database connection. The database layer is mocked in-memory for faster test execution.

**E2E Test Coverage:**

- Authentication flow (nonce generation, sign-in, refresh, sign-out)
- User profile management
- Error handling and validation
- Cookie-based authentication

## 🛠️ Development Scripts

From `packages/api/`:

```bash
# Development
pnpm start:dev          # Start with hot-reload
pnpm start:debug        # Start in debug mode

# Building
pnpm build              # Build for production
pnpm start:prod         # Run production build

# Code Quality
pnpm lint               # Lint and fix
pnpm format:check       # Check formatting
pnpm format:fix         # Fix formatting

# Database
pnpm prisma:generate    # Generate Prisma client
pnpm prisma:migrate     # Run migrations

# Testing
pnpm test               # Run unit tests
pnpm test:watch         # Run tests in watch mode
pnpm test:cov           # Generate coverage
pnpm test:e2e           # Run e2e tests
```

## 🔐 Security Considerations

- **SIWE Protocol**: Follows the official Sign-In with Ethereum specification
- **JWT Secrets**: Always use strong, unique secrets in production
- **Nonce Rotation**: Nonce is regenerated after each successful sign-in to prevent replay attacks
- **Secure Cookies**: Cookies are set with `secure` flag in production (HTTPS only)

## 📦 Test Frontend (Optional)

An optional React test frontend is available in `packages/test-frontend/` for testing the SIWE authentication flow.

To run the test frontend:

```bash
cd packages/test-frontend
pnpm install
pnpm start
```

The frontend demonstrates:

- Wallet connection (MetaMask, WalletConnect, etc.)
- SIWE message signing
- Authentication flow
- Protected route access

## 📝 Environment Variables Reference

| Variable                 | Description                  | Default       | Required |
| ------------------------ | ---------------------------- | ------------- | -------- |
| `DATABASE_URL`           | PostgreSQL connection string | -             | Yes      |
| `PORT`                   | Server port                  | `3000`        | No       |
| `NODE_ENV`               | Environment mode             | `development` | No       |
| `JWT_ACCESS_SECRET`      | Secret for access tokens     | -             | Yes      |
| `JWT_ACCESS_EXPIRES_IN`  | Access token expiration      | `1h`          | No       |
| `JWT_REFRESH_SECRET`     | Secret for refresh tokens    | -             | Yes      |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration     | `7d`          | No       |

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
