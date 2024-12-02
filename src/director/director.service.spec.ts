import { Test, TestingModule } from '@nestjs/testing';
import { DirectorService } from './director.service';
import { Director } from './entity/director.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateDirectorDto } from './dto/create-director.dto';
import { NotFoundException } from '@nestjs/common';

const mockDirectorRepository = {
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('DirectorService', () => {
  let directorService: DirectorService;
  let directorRepository: Repository<Director>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectorService,
        {
          provide: getRepositoryToken(Director),
          useValue: mockDirectorRepository,
        },
      ],
    }).compile();

    directorService = module.get<DirectorService>(DirectorService);
    directorRepository = module.get<Repository<Director>>(
      getRepositoryToken(Director),
    );
  });

  it('should be defined', () => {
    expect(directorService).toBeDefined();
  });

  beforeAll(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a director', async () => {
      const createDirectorDto = {
        name: 'Christopher Nolan',
      };

      jest
        .spyOn(mockDirectorRepository, 'save')
        .mockResolvedValue(createDirectorDto);

      const result = await directorService.create(createDirectorDto as CreateDirectorDto);
      expect(directorRepository.save).toHaveBeenCalledWith(createDirectorDto);
      expect(result).toEqual(createDirectorDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of directors', async () => {
      const directors = [
        {
          id: 1,
          name: 'code factory'
        }
      ];

      jest.spyOn(mockDirectorRepository, 'find').mockResolvedValue(directors);

      const result = await directorService.findAll();

      expect(directorRepository.find).toHaveBeenCalled();
      expect(result).toEqual(directors);
    });
  });

  describe('findOne', () => {
    it('should return a director by id', async () => {
      const director = {
        id: 1,
        name: 'code factory'
      };

      jest.spyOn(mockDirectorRepository, 'findOne').mockResolvedValue(director);

      const result = await directorService.findOne(1);

      expect(directorRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(director);
    });
  });

  describe('update', () => {
    it('should update a director', async () => {
      const updateDirectorDto = {
        name: 'code factory2',
      }
      const existingDirector = {
        id: 1,
        name: 'code factory'
      }
      const updatedDirector = {
        id: 1,
        name: 'code factory2'
      };

      jest.spyOn(mockDirectorRepository, 'findOne').mockResolvedValueOnce(existingDirector);
      jest.spyOn(mockDirectorRepository, 'findOne').mockResolvedValueOnce(updatedDirector);
      jest.spyOn(mockDirectorRepository, 'update').mockResolvedValue(updatedDirector);

      const result = await directorService.update(1, updateDirectorDto);

      expect(result).toEqual(updatedDirector);
      expect(directorRepository.findOne).toHaveBeenNthCalledWith(1, { where: { id: 1 } });
      expect(directorRepository.update).toHaveBeenCalledWith({ id: 1 }, updateDirectorDto);
      expect(directorRepository.findOne).toHaveBeenNthCalledWith(2, { where: { id: 1 } });
    });

    it('should throw NotFoundException if director not found', async () => {
      
      jest.spyOn(mockDirectorRepository, 'findOne').mockResolvedValue(null);

      await expect(directorService.update(1, { name: 'code factory' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a director by id', async () => {
      const director = {
        id: 1,
        name: 'code factory'
      };

      jest.spyOn(mockDirectorRepository, 'findOne').mockResolvedValue(director);

      const result = await directorService.remove(director.id);

      expect(directorRepository.findOne).toHaveBeenCalledWith({ where: { id: director.id } });
      expect(directorRepository.delete).toHaveBeenCalledWith(director.id);
      expect(result).toEqual(director.id);
    });

    it('should throw NotFoundException if director not found', async () => {
      jest.spyOn(mockDirectorRepository, 'findOne').mockResolvedValue(null);

      await expect(directorService.remove(1)).rejects.toThrow(
        NotFoundException,
      );
    });
  })
});
