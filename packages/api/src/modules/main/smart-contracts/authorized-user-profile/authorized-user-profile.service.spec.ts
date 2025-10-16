import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { User } from 'generated/prisma';

// Create mocks that will be used by the ethers module
const mockProvider = {
  destroy: jest.fn(),
  getNetwork: jest.fn().mockResolvedValue({ chainId: 31337n }),
};

const mockWallet = {
  address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
};

const mockContract = {
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
  setJwt: jest
    .fn()
    .mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
  setUsername: jest
    .fn()
    .mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
};

// Mock ethers module with a factory function
jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual, // Spread all actual exports for SIWE compatibility
    ethers: {
      ...actual, // Include all ethers exports
      JsonRpcProvider: jest.fn(() => mockProvider),
      Wallet: jest.fn(() => mockWallet),
      Contract: jest.fn(() => mockContract),
    },
    JsonRpcProvider: jest.fn(() => mockProvider),
    Wallet: jest.fn(() => mockWallet),
    Contract: jest.fn(() => mockContract),
  };
});

// Import the service AFTER mocking
import { AuthorizedUserProfileService } from './authorized-user-profile.service';
import { UserService } from '@/modules/main/user/user.service';

describe('AuthorizedUserProfileService', () => {
  let service: AuthorizedUserProfileService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockUserService: jest.Mocked<UserService>;

  const mockUser: User = {
    id: 'test-user-id',
    publicAddress: '0x1234567890abcdef',
    nonce: 'test-nonce',
    username: 'test-user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const minimalABI = [
    {
      type: 'event',
      name: 'UsernameUpdated',
      inputs: [
        { name: 'user', type: 'address', indexed: true },
        { name: 'newUsername', type: 'string', indexed: false },
      ],
      anonymous: false,
    },
    {
      type: 'function',
      name: 'setJwt',
      inputs: [
        { name: 'user', type: 'address' },
        { name: 'jwt', type: 'string' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'setUsername',
      inputs: [
        { name: 'user', type: 'address' },
        { name: 'jwt', type: 'string' },
        { name: 'newUsername', type: 'string' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ];

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    mockConfigService = {
      getOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    mockUserService = {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    // Setup config mock responses for service initialization
    mockConfigService.getOrThrow
      .mockReturnValueOnce('http://localhost:8545') // rpcUrl
      .mockReturnValueOnce(
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
      ) // rpcPrivateKey
      .mockReturnValueOnce('0x5FbDB2315678afecb367f032d93F642f64180aa3') // address
      .mockReturnValueOnce(minimalABI); // abi

    // Mock Logger static methods to suppress logs during tests
    jest.spyOn(Logger, 'log').mockImplementation();
    jest.spyOn(Logger, 'error').mockImplementation();
    jest.spyOn(Logger, 'warn').mockImplementation();
    jest.spyOn(Logger, 'debug').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizedUserProfileService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<AuthorizedUserProfileService>(
      AuthorizedUserProfileService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should create JsonRpcProvider with correct URL', () => {
      const { ethers } = require('ethers');
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(
        'http://localhost:8545'
      );
    });

    it('should create Wallet with private key and provider', () => {
      const { ethers } = require('ethers');
      expect(ethers.Wallet).toHaveBeenCalledWith(
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        mockProvider
      );
    });

    it('should create Contract with address, abi, and wallet', () => {
      const { ethers } = require('ethers');
      expect(ethers.Contract).toHaveBeenCalledWith(
        '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        minimalABI,
        mockWallet
      );
    });

    it('should subscribe to UsernameUpdated events', () => {
      expect(mockContract.on).toHaveBeenCalledWith(
        'UsernameUpdated',
        expect.any(Function)
      );
    });
  });

  describe('addJwtToContract', () => {
    it('should call contract.setJwt with correct parameters', async () => {
      const address = '0xUserAddress';
      const jwt = 'test-jwt-token';

      await service.addJwtToContract(address, jwt);

      expect(mockContract.setJwt).toHaveBeenCalledTimes(1);
      expect(mockContract.setJwt).toHaveBeenCalledWith(address, jwt);
    });

    it('should return the transaction from setJwt', async () => {
      const address = '0xUserAddress';
      const jwt = 'test-jwt-token';
      const mockTx = { wait: jest.fn() };
      mockContract.setJwt.mockResolvedValue(mockTx);

      const result = await service.addJwtToContract(address, jwt);

      expect(result).toBe(mockTx);
    });
  });

  describe('updateUsername', () => {
    it('should call contract.setUsername with correct parameters', async () => {
      const address = '0xUserAddress';
      const jwt = 'test-jwt-token';
      const username = 'newusername';

      await service.updateUsername(address, jwt, username);

      expect(mockContract.setUsername).toHaveBeenCalledTimes(1);
      expect(mockContract.setUsername).toHaveBeenCalledWith(
        address,
        jwt,
        username
      );
    });

    it('should return the transaction from setUsername', async () => {
      const address = '0xUserAddress';
      const jwt = 'test-jwt-token';
      const username = 'newusername';
      const mockTx = { wait: jest.fn() };
      mockContract.setUsername.mockResolvedValue(mockTx);

      const result = await service.updateUsername(address, jwt, username);

      expect(result).toBe(mockTx);
    });
  });

  describe('UsernameUpdated event handling', () => {
    let eventListener: any;

    const mockEventLog = {
      transactionHash: '0xtxhash',
      blockNumber: 123,
    };

    beforeEach(() => {
      // Extract the event listener that was registered
      const onCalls = mockContract.on.mock.calls;
      const usernameUpdatedCall = onCalls.find(
        (call: any) => call[0] === 'UsernameUpdated'
      );
      eventListener = usernameUpdatedCall ? usernameUpdatedCall[1] : null;
    });

    it('should update username in database when event is received', async () => {
      const userAddress = '0x1234567890abcdef';
      const newUsername = 'updated-username';
      const mockEvent = { log: mockEventLog };

      mockUserService.findUnique
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(mockUser); // user lookup
      mockUserService.update.mockResolvedValue({
        ...mockUser,
        username: newUsername,
      });

      await eventListener(userAddress, newUsername, mockEvent);

      expect(mockUserService.findUnique).toHaveBeenCalledTimes(2);
      expect(mockUserService.findUnique).toHaveBeenNthCalledWith(1, {
        username: newUsername,
      });
      expect(mockUserService.findUnique).toHaveBeenNthCalledWith(2, {
        publicAddress: userAddress,
      });

      expect(mockUserService.update).toHaveBeenCalledTimes(1);
      expect(mockUserService.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { username: newUsername },
      });

      expect(Logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Username updated for user')
      );
    });

    it('should log error when username is already taken', async () => {
      const userAddress = '0x1234567890abcdef';
      const newUsername = 'taken-username';
      const mockEvent = { log: mockEventLog };

      const existingUser = { ...mockUser, username: newUsername };
      mockUserService.findUnique.mockResolvedValue(existingUser);

      await eventListener(userAddress, newUsername, mockEvent);

      expect(mockUserService.findUnique).toHaveBeenCalledWith({
        username: newUsername,
      });
      expect(mockUserService.update).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Username "taken-username" is already taken')
      );
    });

    it('should log error when user is not found', async () => {
      const userAddress = '0xnonexistent';
      const newUsername = 'new-username';
      const mockEvent = { log: mockEventLog };

      mockUserService.findUnique
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(null); // user not found

      await eventListener(userAddress, newUsername, mockEvent);

      expect(mockUserService.findUnique).toHaveBeenCalledTimes(2);
      expect(mockUserService.update).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('User not found: 0xnonexistent')
      );
    });

    it('should handle errors during database update', async () => {
      const userAddress = '0x1234567890abcdef';
      const newUsername = 'updated-username';
      const mockEvent = { log: mockEventLog };
      const mockError = new Error('Database error');

      mockUserService.findUnique
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(mockUser); // user lookup
      mockUserService.update.mockRejectedValue(mockError);

      await eventListener(userAddress, newUsername, mockEvent);

      expect(mockUserService.update).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing UsernameUpdated event')
      );
    });
  });
});
