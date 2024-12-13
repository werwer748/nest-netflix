import { Test, TestingModule } from '@nestjs/testing';
import { GenreService } from './genre.service';
import { Genre } from './entity/genre.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

const mockGenreRepository = {
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('GenreService', () => {
  let service: GenreService;
  let repository: Repository<Genre>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenreService,
        {
          provide: getRepositoryToken(Genre),
          useValue: mockGenreRepository,
        },
      ],
    }).compile();

    service = module.get<GenreService>(GenreService);
    repository = module.get<Repository<Genre>>(getRepositoryToken(Genre));
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a genre', async () => {
      const createGenreDto = { name: 'Fantasy' };
      const savedGenre = { id: 1, ...createGenreDto };

      jest.spyOn(repository, 'save').mockResolvedValue(savedGenre as Genre);

      const result = await service.create(createGenreDto);

      expect(repository.save).toHaveBeenCalledWith(createGenreDto);
      expect(result).toEqual(savedGenre);
    });
  });

  describe('findAll', () => {
    it('should return an array of genres', () => {
      const genres = [{ id: 1, name: 'Fantasy' }];

      jest.spyOn(repository, 'find').mockResolvedValue(genres as Genre[]);

      expect(service.findAll()).resolves.toEqual(genres);
      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a genre by id', async () => {
      const genre = { id: 1, name: '판타지' };

      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValue(genre);

      const result = await service.findOne(genre.id);

      expect(result).toEqual(genre);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: genre.id }
      })
    });

    it('should throw a NotFoundException if not found genre', async () => {
      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return a genre if exists', async () => {
      const updateGenreDto = {
        name: '액션'
      };
      const existingGenre = {
        id: 1,
        name: '드라마'
      };
      const updatedGenre = {
        id: 1,
        ...updateGenreDto
      };

      jest.spyOn(repository, 'update').mockResolvedValue(undefined);
      jest.spyOn(service, 'findOne')
        .mockResolvedValueOnce(existingGenre as Genre)
        .mockResolvedValueOnce(updatedGenre as Genre);

      const result = await service.update(1, updateGenreDto);

      expect(service.findOne).toHaveBeenNthCalledWith(1, 1);
      expect(repository.update).toHaveBeenCalledWith({ id: 1 }, updateGenreDto);
      expect(service.findOne).toHaveBeenNthCalledWith(2, 1);
      expect(result).toEqual(updatedGenre);
    });

    it('should throw a NotFoundException if not found genre', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, { name: '액션' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a genre by id', async () => {
      const genre = {
        id: 1,
        name: '드라마'
      }

      jest.spyOn(service, 'findOne').mockResolvedValue(genre as Genre);

      const result = await service.remove(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(repository.delete).toHaveBeenCalledWith(1);
      expect(result).toBe(1);
    });

    it('should throw a NotFoundException if genre to delete does not exists', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
