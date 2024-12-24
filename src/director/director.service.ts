import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Director } from './entity/director.entity';
import { Repository } from 'typeorm';
import { CreateDirectorDto } from './dto/create-director.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DirectorService {
  constructor(
    // @InjectRepository(Director)
    // private directorRepository: Repository<Director>,
    private readonly prisma: PrismaService,
  ) {}

  create(createDirectorDto: CreateDirectorDto) {
    // return this.directorRepository.save(createDirectorDto);
    return this.prisma.director.create({
      data: createDirectorDto,
    });
  }

  findAll() {
    // return this.directorRepository.find();
    return this.prisma.director.findMany();
  }

  findOne(id: number) {
    // return this.directorRepository.findOne({
    //   where: { id },
    // });
    return this.prisma.director.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateDirectorDto: UpdateDirectorDto) {
    // const director = await this.directorRepository.findOne({
    //   where: { id },
    // });
    const director = this.prisma.director.findUnique({
      where: { id },
    });

    if (!director) {
      throw new NotFoundException('Director not found');
    }

    // await this.directorRepository.update({ id }, { ...updateDirectorDto });
    await this.prisma.director.update({
      where: { id },
      data: updateDirectorDto,
    });

    // return this.directorRepository.findOne({
    //   where: { id },
    // });
    return this.prisma.director.findUnique({
      where: { id },
    });
  }

  async remove(id: number) {
    // const director = await this.directorRepository.findOne({
    //   where: { id },
    // });
    const director = this.prisma.director.findUnique({
      where: { id },
    });

    if (!director) {
      throw new NotFoundException('Director not found');
    }

    // await this.directorRepository.delete(id);
    await this.prisma.director.delete({ where: { id } });
    return id;
  }
}
