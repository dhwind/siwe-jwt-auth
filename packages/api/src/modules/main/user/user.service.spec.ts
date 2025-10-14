import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { OrmService } from '@/modules/common/orm/orm.service';
import { User, Prisma } from 'generated/prisma';

describe('UserService', () => {
  let service: UserService;
  let mockOrmService: {
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockUser: User = {
    id: 'test-user-id',
    publicAddress: '0x1234567890abcdef',
    nonce: 'test-nonce',
    username: 'test-user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockOrmService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: OrmService,
          useValue: mockOrmService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findUnique', () => {
    it('should return a user when found', async () => {
      const inputWhere: Prisma.UserWhereUniqueInput = {
        publicAddress: mockUser.publicAddress,
      };
      const expectedUser = mockUser;
      mockOrmService.user.findUnique.mockResolvedValue(expectedUser);

      const actualUser = await service.findUnique(inputWhere);

      expect(actualUser).toBe(expectedUser);
      expect(mockOrmService.user.findUnique).toHaveBeenCalledTimes(1);
      expect(mockOrmService.user.findUnique).toHaveBeenCalledWith({
        where: inputWhere,
      });
    });

    it('should return null when user not found', async () => {
      const inputWhere: Prisma.UserWhereUniqueInput = {
        publicAddress: 'non-existent',
      };
      mockOrmService.user.findUnique.mockResolvedValue(null);

      const actualUser = await service.findUnique(inputWhere);

      expect(actualUser).toBeNull();
      expect(mockOrmService.user.findUnique).toHaveBeenCalledTimes(1);
      expect(mockOrmService.user.findUnique).toHaveBeenCalledWith({
        where: inputWhere,
      });
    });
  });

  describe('findMany', () => {
    it('should return array of users with all parameters', async () => {
      const inputParams = {
        skip: 0,
        take: 10,
        cursor: { id: 'cursor-id' },
        where: { username: 'test' },
        orderBy: { createdAt: Prisma.SortOrder.desc },
      };
      const expectedUsers = [mockUser];
      mockOrmService.user.findMany.mockResolvedValue(expectedUsers);

      const actualUsers = await service.findMany(inputParams);

      expect(actualUsers).toBe(expectedUsers);
      expect(mockOrmService.user.findMany).toHaveBeenCalledTimes(1);
      expect(mockOrmService.user.findMany).toHaveBeenCalledWith({
        skip: inputParams.skip,
        take: inputParams.take,
        cursor: inputParams.cursor,
        where: inputParams.where,
        orderBy: inputParams.orderBy,
      });
    });

    it('should return array of users with minimal parameters', async () => {
      const inputParams = {};
      const expectedUsers = [mockUser];
      mockOrmService.user.findMany.mockResolvedValue(expectedUsers);

      const actualUsers = await service.findMany(inputParams);

      expect(actualUsers).toBe(expectedUsers);
      expect(mockOrmService.user.findMany).toHaveBeenCalledTimes(1);
      expect(mockOrmService.user.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        cursor: undefined,
        where: undefined,
        orderBy: undefined,
      });
    });

    it('should return empty array when no users found', async () => {
      const inputParams = {};
      const expectedUsers: User[] = [];
      mockOrmService.user.findMany.mockResolvedValue(expectedUsers);

      const actualUsers = await service.findMany(inputParams);

      expect(actualUsers).toEqual([]);
      expect(mockOrmService.user.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      const inputData: Prisma.UserCreateInput = {
        publicAddress: mockUser.publicAddress,
        nonce: mockUser.nonce,
        username: mockUser.username,
      };
      const expectedUser = mockUser;
      mockOrmService.user.create.mockResolvedValue(expectedUser);

      const actualUser = await service.create(inputData);

      expect(actualUser).toBe(expectedUser);
      expect(mockOrmService.user.create).toHaveBeenCalledTimes(1);
      expect(mockOrmService.user.create).toHaveBeenCalledWith({
        data: inputData,
      });
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const inputParams = {
        where: { publicAddress: mockUser.publicAddress },
        data: { nonce: 'new-nonce' },
      };
      const expectedUser = { ...mockUser, nonce: 'new-nonce' };
      mockOrmService.user.update.mockResolvedValue(expectedUser);

      const actualUser = await service.update(inputParams);

      expect(actualUser).toBe(expectedUser);
      expect(mockOrmService.user.update).toHaveBeenCalledTimes(1);
      expect(mockOrmService.user.update).toHaveBeenCalledWith({
        data: inputParams.data,
        where: inputParams.where,
      });
    });
  });

  describe('delete', () => {
    it('should delete and return the user', async () => {
      const inputWhere: Prisma.UserWhereUniqueInput = {
        publicAddress: mockUser.publicAddress,
      };
      const expectedUser = mockUser;
      mockOrmService.user.delete.mockResolvedValue(expectedUser);

      const actualUser = await service.delete(inputWhere);

      expect(actualUser).toBe(expectedUser);
      expect(mockOrmService.user.delete).toHaveBeenCalledTimes(1);
      expect(mockOrmService.user.delete).toHaveBeenCalledWith({
        where: inputWhere,
      });
    });
  });
});
