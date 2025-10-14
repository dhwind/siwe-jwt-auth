import { Test, TestingModule } from '@nestjs/testing';
import { OrmService } from './orm.service';

describe('OrmService', () => {
  let service: OrmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrmService],
    }).compile();

    service = module.get<OrmService>(OrmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should connect to the database', async () => {
      const mockConnect = jest
        .spyOn(service, '$connect')
        .mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockConnect).toHaveBeenCalledWith();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from the database', async () => {
      const mockDisconnect = jest
        .spyOn(service, '$disconnect')
        .mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      expect(mockDisconnect).toHaveBeenCalledWith();
    });
  });
});
