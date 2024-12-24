import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Genre } from './entity/genre.entity';
import { Repository } from 'typeorm';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class GenreService {
  constructor(
    // @InjectRepository(Genre)
    // private genreRepository: Repository<Genre>
    private readonly prisma: PrismaService,
  ) {}

  async create(createGenreDto: CreateGenreDto) {
    // const genre = await this.genreRepository.findOne({
    //   where: {
    //     name: createGenreDto.name
    //   }
    // });
    //
    // if (genre) {
    //   throw new NotFoundException('이미 존재하는 장르입니다!');
    // }

    // return this.genreRepository.save(createGenreDto);
    return this.prisma.genre.create({
      data: {
        ...createGenreDto,
      },
    });
  }

  findAll() {
    // return this.genreRepository.find();
    return this.prisma.genre.findMany();
  }

  async findOne(id: number) {
    // const genre = await this.genreRepository.findOne({
    //   where: { id }
    // });
    const genre = await this.prisma.genre.findUnique({
      where: { id },
    });

    if (!genre) {
      throw new NotFoundException('존재하지 않는 장르입니다!');
    }

    return genre;
  }

  async update(id: number, updateGenreDto: UpdateGenreDto) {
    const genre = await this.findOne(id);

    // await this.genreRepository.update({ id }, { ...updateGenreDto });
    await this.prisma.genre.update({
      where: { id },
      data: {
        ...updateGenreDto,
      },
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    const genre = await this.findOne(id);

    // await this.genreRepository.delete(id);
    await this.prisma.genre.delete({
      where: { id },
    });

    return id;
  }
}
