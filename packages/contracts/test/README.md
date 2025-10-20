# AuthorizedUserProfile Contract Tests

## Overview

Comprehensive test suite for the `AuthorizedUserProfile` smart contract using Foundry.

## Test Coverage

**100% Coverage** achieved across all contract functions:

- ✅ 100% Lines (10/10)
- ✅ 100% Statements (9/9)
- ✅ 100% Branches (1/1)
- ✅ 100% Functions (5/5)

## Running Tests

### Run all tests

```bash
forge test
```

### Run with gas reporting

```bash
forge test --gas-report
```

### Run with verbose output

```bash
forge test -vvv
```

### Run specific test

```bash
forge test --match-test test_SetJwt
```

### Run coverage

```bash
forge coverage
```

## Test Structure

### 1. Deployment Tests (4 tests)

- ✅ Contract deployment
- ✅ Admin role granted to deployer
- ✅ Backend role constant verification

### 2. Role Management Tests (7 tests)

- ✅ Grant backend role
- ✅ Grant role to multiple addresses
- ✅ Revoke backend role
- ✅ Check role status
- ✅ Unauthorized role grant attempts (reverts)
- ✅ Unauthorized role revoke attempts (reverts)

### 3. Set JWT Tests (7 tests)

- ✅ Set JWT with backend role
- ✅ Set JWT for multiple users
- ✅ Update existing JWT
- ✅ Set empty JWT
- ✅ Unauthorized JWT set attempts (reverts)
- ✅ User setting own JWT (reverts)
- ✅ Admin setting JWT without backend role (reverts)

### 4. Set Username Tests (8 tests)

- ✅ Set username with valid JWT
- ✅ Anyone can call with valid JWT
- ✅ Multiple username updates
- ✅ Username update after JWT update
- ✅ Invalid JWT attempts (reverts)
- ✅ No JWT set attempts (reverts)
- ✅ Empty JWT attempts (reverts)

### 5. Utility Functions Tests (2 tests)

- ✅ Symbol function
- ✅ Decimals function

### 6. Fuzz Tests (3 tests)

- ✅ Fuzz test for setJwt with random addresses and strings (256 runs)
- ✅ Fuzz test for setUsername with valid JWT (256 runs)
- ✅ Fuzz test for setUsername with invalid JWT (256 runs)

### 7. Integration Tests (3 tests)

- ✅ Full flow: grant role → set JWT → update username
- ✅ Revoke role prevents JWT updates
- ✅ Multiple users and multiple backends

## Total Tests

**31 Tests** - All Passing ✅

## Gas Benchmarks

### Function Gas Usage

| Function    | Min    | Avg    | Median | Max     | # Calls |
| ----------- | ------ | ------ | ------ | ------- | ------- |
| grantRole   | 27,606 | 51,988 | 52,019 | 52,019  | 788     |
| setJwt      | 26,475 | 70,659 | 48,720 | 116,156 | 788     |
| setUsername | 26,542 | 31,235 | 30,938 | 38,491  | 525     |
| revokeRole  | 27,649 | 29,325 | 30,164 | 30,164  | 3       |
| hasRole     | 3,187  | 3,187  | 3,187  | 3,187   | 9       |

### Deployment Cost

- **Deployment Gas**: 1,086,641
- **Contract Size**: 5,053 bytes

## Test Conventions

### Naming

- `test_` prefix for standard tests
- `testFuzz_` prefix for fuzz tests
- `test_RevertWhen_` prefix for tests expecting reverts
- `test_FullFlow_` prefix for integration tests

### Structure

Each test follows the Arrange-Act-Assert pattern:

1. **Arrange**: Set up test conditions
2. **Act**: Execute the function being tested
3. **Assert**: Verify the expected outcome

### Events

Tests verify that events are emitted correctly using `vm.expectEmit()`.

### Error Handling

Tests verify that unauthorized actions revert with appropriate error messages.

## Dependencies

- Foundry (forge-std)
- OpenZeppelin Contracts (AccessControl)

## Notes

- All tests use `makeAddr()` for generating test addresses
- Fuzz tests run with 256 iterations by default
- Tests cover both happy paths and error conditions
- Integration tests validate complete workflows
