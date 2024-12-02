import { Test, TestingModule } from '@nestjs/testing';
import { DirectorController } from './director.controller';
import { DirectorService } from './director.service';
import { CreateDirectorDto } from './dto/create-director.dto';

const mockDirectorService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('DirectorController', () => {
  let directorController: DirectorController;
  let directorService: DirectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DirectorController],
      providers: [
        {
          provide: DirectorService,
          useValue: mockDirectorService,
        }
      ],
    }).compile();

    directorController = module.get<DirectorController>(DirectorController);
    directorService = module.get<DirectorService>(DirectorService);
  });

  beforeAll(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(directorController).toBeDefined();
  });

  describe('findAll', () => {
    it('should call findAll method from DirectorService', async () => {
      const result = [{ id: 1, name: 'Christopher Nolan' }];

      jest.spyOn(mockDirectorService, 'findAll').mockResolvedValue(result);

      await expect(directorController.findAll()).resolves.toEqual(result);
      expect(directorService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should call findOne method from DirectorService with id', () => {
      const result = { id: 1, name: 'Christopher Nolan' };

      jest.spyOn(mockDirectorService, 'findOne').mockResolvedValue(result);

      expect(directorController.findOne(1)).resolves.toEqual(result);
      expect(directorService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should call create method from DirectorService with createDirectorDto', () => {
      const createDirectorDto = { name: 'Christopher Nolan' };
      const result = { id: 1, name: 'Christopher Nolan' };

      jest.spyOn(mockDirectorService, 'create').mockResolvedValue(result);

      expect(directorController
        .create(createDirectorDto as CreateDirectorDto))
        .resolves.toEqual(result);
      expect(directorService.create).toHaveBeenCalledWith(createDirectorDto);
    });
  });

  describe('update', () => {
    it('should call update method from DirectorService with id and updateDirectorDto', () => {
      const updateRequest = { id: 1, updateDirectorDto: { name: 'Christopher Nolan' } };

      const result = { id: 1, name: 'Christopher Nolan' };

      jest.spyOn(mockDirectorService, 'update').mockResolvedValue(result);

      expect(directorController.update(updateRequest.id, updateRequest.updateDirectorDto))
        .resolves
        .toEqual(result);
      expect(directorService.update).toHaveBeenCalledWith(updateRequest.id, updateRequest.updateDirectorDto);
    });
  });

  describe('delete', () => {
    it('should call delete method from DirectorService with id', () => {
      const removeId = 1;

      jest.spyOn(mockDirectorService, 'remove').mockResolvedValue(removeId);

      expect(directorController.remove(removeId))
        .resolves
        .toEqual(removeId);
      expect(directorService.remove).toHaveBeenCalledWith(1);
    });
  });
});
