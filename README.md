# SIWE Authentication System

A comprehensive Web3 authentication system using **Sign-In with Ethereum (SIWE)** protocol. This full-stack monorepo includes a NestJS backend with PostgreSQL and Redis, Solidity smart contracts for on-chain user profiles, and a React test frontend. The project implements secure Web3 authentication with JWT-based session management and blockchain integration.

## 🏗️ Architecture

This is a monorepo containing:

```text
├── packages/
│   ├── api/           # Main NestJS backend application
│   ├── contracts/     # Solidity smart contracts with Foundry
│   └── test-frontend/ # Optional React test frontend
```

### Tech Stack

#### Backend (API)

- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: SIWE (Sign-In with Ethereum) + JWT
- **Session Storage**: Redis (for token whitelisting)
- **Web3**: ethers.js v6
- **Testing**: Jest (unit & e2e tests)

#### Smart Contracts

- **Language**: Solidity ^0.8.13
- **Framework**: Foundry (Forge, Anvil, Cast)
- **Dependencies**: OpenZeppelin Contracts (AccessControl)
- **Testing**: Foundry Test (100% coverage)

## 📋 Prerequisites

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 15 (for local development or e2e tests)
- Redis >= 6 (for session storage)
- Foundry (for smart contract development and testing)
- Docker & Docker Compose (optional, for containerized deployment)

### Installing Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify installation:

```bash
forge --version
anvil --version
cast --version
```

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

   # Redis Configuration
   REDIS_HOST="localhost"
   REDIS_PORT="6379"
   REDIS_PASSWORD=""

   # Blockchain Configuration (optional, for smart contract integration)
   BLOCKCHAIN_RPC_URL="http://localhost:8545"  # Anvil local node or testnet RPC
   CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"  # Your deployed contract
   PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"  # For transactions
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

```text
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

## 📜 Smart Contracts

The `packages/contracts/` directory contains Solidity smart contracts that extend the authentication system with on-chain user profile management.

### AuthorizedUserProfile Contract

A Solidity smart contract that provides role-based access control for managing user JWT tokens and usernames on-chain.

**Key Features:**

- **Role-Based Access Control**: Uses OpenZeppelin's `AccessControl` for permission management
- **Backend Role**: Special `BACKEND_ROLE` for authorized backend services to set JWT tokens
- **JWT Storage**: Maps Ethereum addresses to JWT tokens on-chain
- **Username Updates**: Allows users to update their username using a valid JWT token
- **Event Emission**: Emits events for username updates for off-chain tracking

**Contract Functions:**

```solidity
// Admin functions (requires DEFAULT_ADMIN_ROLE)
function grantRole(bytes32 role, address account) external
function revokeRole(bytes32 role, address account) external

// Backend functions (requires BACKEND_ROLE)
function setJwt(address userAddress, string memory jwt) external

// Public functions (requires valid JWT)
function setUsername(address userAddress, string memory jwt, string memory newUsername) external

// View functions
function jwtTokens(address userAddress) external view returns (string memory)
function hasRole(bytes32 role, address account) external view returns (bool)
```

**Events:**

```solidity
event UsernameUpdated(address indexed user, string newUsername);
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
```

**Custom Errors:**

```solidity
error InvalidJwt(address userAddress);
```

### Contract Testing

The contracts package includes a comprehensive test suite with **100% code coverage**.

**Test Coverage:**

- ✅ Deployment and initialization
- ✅ Role management (grant, revoke, check)
- ✅ JWT token setting and validation
- ✅ Username updates with JWT authorization
- ✅ Access control enforcement
- ✅ Error handling and edge cases
- ✅ Fuzz testing for robustness
- ✅ Integration flows

**Running Contract Tests:**

```bash
cd packages/contracts

# Run all tests
forge test

# Run with verbosity (show logs)
forge test -vv

# Run with gas reporting
forge test --gas-report

# Run specific test
forge test --match-test test_SetJwt

# Run with coverage
forge coverage
```

**Test Output Example:**

```bash
Running 31 tests for test/AuthorizedUserProfile.t.sol:AuthorizedUserProfileTest
[PASS] test_BackendRoleConstant() (gas: 9891)
[PASS] test_Decimals() (gas: 7853)
[PASS] test_Deployment() (gas: 7755)
[PASS] test_DeploymentGrantsAdminRole() (gas: 11247)
[PASS] test_FullFlow_GrantRoleSetJwtUpdateUsername() (gas: 138924)
... (26 more tests)

Test result: ok. 31 passed; 0 failed; 0 skipped; finished in 8.12ms
```

### Contract Compilation

```bash
cd packages/contracts

# Compile contracts
forge build

# Clean and rebuild
forge clean && forge build
```

Compiled artifacts are available in `packages/contracts/out/`.

### Contract Deployment

The contracts use Foundry scripts for deployment:

```bash
cd packages/contracts

# Deploy to local Anvil node
anvil  # In separate terminal
forge script script/AuthorizedUserProfile.s.sol --rpc-url http://localhost:8545 --broadcast

# Deploy to testnet (e.g., Sepolia)
forge script script/AuthorizedUserProfile.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

### Backend Integration

The NestJS backend integrates with the deployed contract through the `AuthorizedUserProfileService`:

**Configuration** (`packages/api/src/config/configuration.ts`):

```typescript
contracts: {
  authorizedUserProfile: {
    address: process.env.CONTRACT_ADDRESS || '0x...',
    abi: [...] // Contract ABI
  }
}
```

**Service Usage:**

```typescript
// Set JWT on-chain after successful sign-in
await this.authorizedUserProfileService.addJwtToContract(address, accessToken);

// Update username on-chain
await this.authorizedUserProfileService.updateUsername(
  address,
  accessToken,
  username
);
```

### Local Blockchain Development

For local development, use Anvil (Foundry's local Ethereum node):

```bash
# Start local node
anvil

# Deploy contract to local node
cd packages/contracts
forge script script/AuthorizedUserProfile.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

The contract address will be displayed in the terminal output. Update your `.env` file accordingly.

---

## 🧪 Testing

### Backend Unit Tests

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

### Backend E2E Tests

**Important:** E2E tests require a PostgreSQL database connection.

Run e2e tests:

```bash
cd packages/api
pnpm test:e2e
```

The e2e tests use NestJS's testing module with mocked services to avoid requiring external dependencies. The database layer and smart contract service are mocked in-memory for faster test execution.

**E2E Test Coverage:**

- Authentication flow (nonce generation, sign-in, refresh, sign-out)
- User profile management
- Error handling and validation
- Cookie-based authentication
- Redis session management

### Smart Contract Tests

Run Solidity tests with Foundry:

```bash
cd packages/contracts

# Run all tests
forge test

# Run with gas reporting
forge test --gas-report

# Generate coverage
forge coverage
```

**Smart Contract Test Coverage:**

- 31 test cases covering all contract functionality
- 100% code coverage
- Fuzz testing for edge cases
- Role-based access control tests
- JWT validation and username updates
- Event emission verification
- Integration flow tests

## 🛠️ Development Scripts

### Backend API Scripts

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

### Smart Contract Scripts

From `packages/contracts/`:

```bash
# Building
forge build             # Compile contracts
forge clean             # Clean build artifacts

# Testing
forge test              # Run all tests
forge test -vv          # Run with verbose output
forge test -vvv         # Run with extra verbose (including traces)
forge test --gas-report # Run with gas usage report
forge coverage          # Generate coverage report
forge test --match-test <pattern>  # Run specific test

# Deployment
anvil                   # Start local Ethereum node
forge script script/AuthorizedUserProfile.s.sol --broadcast  # Deploy

# Utilities
forge fmt               # Format Solidity code
forge snapshot          # Create gas snapshot
cast <command>          # Ethereum RPC interactions
```

## 🔐 Security Considerations

### Backend Security

- **SIWE Protocol**: Follows the official Sign-In with Ethereum specification
- **JWT Secrets**: Always use strong, unique secrets in production
- **Nonce Rotation**: Nonce is regenerated after each successful sign-in to prevent replay attacks
- **Secure Cookies**: Cookies are set with `secure` flag in production (HTTPS only)
- **Redis Token Whitelist**: All access and refresh tokens are validated against Redis storage
- **Token Expiration**: Tokens are automatically removed from Redis after expiration

### Smart Contract Security

- **Role-Based Access Control**: Uses OpenZeppelin's battle-tested `AccessControl` implementation
- **JWT Validation**: Username updates require valid JWT token matching on-chain storage
- **Admin Separation**: Backend role is separate from admin role for better security
- **Custom Errors**: Gas-efficient error handling with descriptive error messages
- **Event Logging**: All username updates emit events for transparency and off-chain tracking
- **Immutable Logic**: Deployed contracts cannot be modified, ensuring predictable behavior

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

| Variable                 | Description                            | Default       | Required |
| ------------------------ | -------------------------------------- | ------------- | -------- |
| `DATABASE_URL`           | PostgreSQL connection string           | -             | Yes      |
| `PORT`                   | Server port                            | `3000`        | No       |
| `NODE_ENV`               | Environment mode                       | `development` | No       |
| `JWT_ACCESS_SECRET`      | Secret for access tokens               | -             | Yes      |
| `JWT_ACCESS_EXPIRES_IN`  | Access token expiration                | `1h`          | No       |
| `JWT_REFRESH_SECRET`     | Secret for refresh tokens              | -             | Yes      |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration               | `7d`          | No       |
| `REDIS_HOST`             | Redis server host                      | `localhost`   | No       |
| `REDIS_PORT`             | Redis server port                      | `6379`        | No       |
| `REDIS_PASSWORD`         | Redis password (if required)           | -             | No       |
| `BLOCKCHAIN_RPC_URL`     | Ethereum RPC endpoint URL              | -             | Yes\*    |
| `CONTRACT_ADDRESS`       | AuthorizedUserProfile contract address | -             | Yes\*    |
| `PRIVATE_KEY`            | Private key for contract transactions  | -             | Yes\*    |

**Note:** Variables marked with \* are required only if you're using the smart contract integration features.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
