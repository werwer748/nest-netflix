import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Director } from './entity/director.entity';
import { Repository } from 'typeorm';
import { CreateDirectorDto } from './dto/create-director.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';

@Injectable()
export class DirectorService {
  constructor(
    @InjectRepository(Director)
    private directorRepository: Repository<Director>,
  ) {}

  create(createDirectorDto: CreateDirectorDto) {
    return this.directorRepository.save(createDirectorDto);
  }

  findAll() {
    return this.directorRepository.find();
  }

  findOne(id: number) {
    return this.directorRepository.findOne({
      where: { id },
    });
  }

  async update(id: number, updateDirectorDto: UpdateDirectorDto) {
    const director = await this.directorRepository.findOne({
      where: { id }
    });

    if (!director) {
      throw new NotFoundException('Director not found');
    }
    
    await this.directorRepository.update(
      { id },
      { ...updateDirectorDto }
    );

    return this.directorRepository.findOne({
      where: { id }
    })
  }

  async remove(id: number) {
    const director = await this.directorRepository.findOne({
      where: { id }
    });

    if (!director) {
      throw new NotFoundException('Director not found');
    }

    await this.directorRepository.delete(id);
    return id;
  }
}
