import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UpdateUserDTO } from './dto/update-user.dto';
import { Request } from 'express';
import { User } from 'generated/prisma';

describe('UserController', () => {
  let controller: UserController;
  let mockUserService: jest.Mocked<UserService>;
  let mockRequest: Partial<Request>;

  const mockUser: User = {
    id: 'test-user-id',
    publicAddress: '0x1234567890abcdef',
    nonce: 'test-nonce',
    username: 'test-user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockUserService = {
      update: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);

    // Setup mock request with user
    mockRequest = {
      user: mockUser,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('me', () => {
    it('should return the authenticated user from request', async () => {
      const result = await controller.me(mockRequest as Request);

      expect(result).toEqual(mockUser);
    });

    it('should return user when user exists in request', async () => {
      const customUser: User = {
        id: 'custom-user-id',
        publicAddress: '0xabcdef1234567890',
        nonce: 'custom-nonce',
        username: 'custom-user',
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      };
      mockRequest.user = customUser;

      const result = await controller.me(mockRequest as Request);

      expect(result).toEqual(customUser);
    });
  });

  describe('update', () => {
    it('should update user profile successfully', async () => {
      const inputDto: UpdateUserDTO = {
        username: 'updated-username',
      };
      const expectedUpdatedUser: User = {
        ...mockUser,
        username: inputDto.username,
        updatedAt: new Date('2024-01-02'),
      };

      mockUserService.update.mockResolvedValue(expectedUpdatedUser);

      const result = await controller.update(mockRequest as Request, inputDto);

      expect(mockUserService.update).toHaveBeenCalledTimes(1);
      expect(mockUserService.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: inputDto,
      });
      expect(result).toEqual(expectedUpdatedUser);
    });

    it('should throw UnauthorizedException when user is not in request', async () => {
      const inputDto: UpdateUserDTO = {
        username: 'updated-username',
      };
      mockRequest.user = undefined;

      await expect(
        controller.update(mockRequest as Request, inputDto)
      ).rejects.toThrow(new UnauthorizedException('User not found'));

      expect(mockUserService.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is null', async () => {
      const inputDto: UpdateUserDTO = {
        username: 'updated-username',
      };
      mockRequest.user = null as any;

      await expect(
        controller.update(mockRequest as Request, inputDto)
      ).rejects.toThrow(new UnauthorizedException('User not found'));

      expect(mockUserService.update).not.toHaveBeenCalled();
    });

    it('should update with different username', async () => {
      const inputDto: UpdateUserDTO = {
        username: 'new-username-123',
      };
      const expectedUpdatedUser: User = {
        ...mockUser,
        username: inputDto.username,
      };

      mockUserService.update.mockResolvedValue(expectedUpdatedUser);

      const result = await controller.update(mockRequest as Request, inputDto);

      expect(mockUserService.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: inputDto,
      });
      expect(result.username).toBe(inputDto.username);
    });

    it('should throw error when UserService throws error', async () => {
      const inputDto: UpdateUserDTO = {
        username: 'updated-username',
      };
      const expectedError = new Error('Database error');

      mockUserService.update.mockRejectedValue(expectedError);

      await expect(
        controller.update(mockRequest as Request, inputDto)
      ).rejects.toThrow(expectedError);

      expect(mockUserService.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: inputDto,
      });
    });
  });
});
