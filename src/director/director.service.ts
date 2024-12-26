import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// import { Director } from './entity/director.entity';
import { Repository } from 'typeorm';
import { CreateDirectorDto } from './dto/create-director.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';
import { PrismaService } from '../common/prisma.service';
import { InjectModel } from '@nestjs/mongoose';
import { Director } from './schema/director.schema';
import { Model } from 'mongoose';

@Injectable()
export class DirectorService {
  constructor(
    // @InjectRepository(Director)
    // private directorRepository: Repository<Director>,
    // private readonly prisma: PrismaService,
    @InjectModel(Director.name)
    private readonly directorModel: Model<Director>,
  ) {}

  create(createDirectorDto: CreateDirectorDto) {
    //* Mongoose
    return this.directorModel.create(createDirectorDto);

    //* Prisma
    // return this.prisma.director.create({
    //   data: createDirectorDto,
    // });

    //* TypeORM
    // return this.directorRepository.save(createDirectorDto);
  }

  findAll() {
    //* Mongoose
    return this.directorModel.find().exec();

    //* Prisma
    // return this.prisma.director.findMany();

    //* TypeORM
    // return this.directorRepository.find();
  }

  // findOne(id: number) {
  //? mongoose _id -> string
  findOne(id: string) {
    //* Mongoose
    return this.directorModel.findById(id).exec();

    //* Prisma
    // return this.prisma.director.findUnique({
    //   where: { id },
    // });

    //* TypeORM
    // return this.directorRepository.findOne({
    //   where: { id },
    // });
  }

  // async update(id: number, updateDirectorDto: UpdateDirectorDto) {
  //? mongoose _id -> string
  async update(id: string, updateDirectorDto: UpdateDirectorDto) {
    //* Mongoose
    const director = await this.directorModel.findById(id).exec();

    //* Prisma
    // const director = this.prisma.director.findUnique({
    //   where: { id },
    // });

    //* TypeORM
    // const director = await this.directorRepository.findOne({
    //   where: { id },
    // });

    if (!director) {
      throw new NotFoundException('Director not found');
    }

    //* Mongoose
    await this.directorModel.findByIdAndUpdate(id, updateDirectorDto).exec();
    //* Mongoose - upsert
    // await this.directorModel
    //   .findByIdAndUpdate(id, updateDirectorDto, { new: true })
    //   .exec();

    //* Prisma
    // await this.prisma.director.update({
    //   where: { id },
    //   data: updateDirectorDto,
    // });

    //* TypeORM
    // await this.directorRepository.update({ id }, { ...updateDirectorDto });

    return this.directorModel.findById(id);
    // return this.prisma.director.findUnique({
    //   where: { id },
    // });
    // return this.directorRepository.findOne({
    //   where: { id },
    // });
  }

  // async remove(id: number) {
  //? mongoose _id -> string
  async remove(id: string) {
    //* Mongoose
    const director = await this.directorModel.findById(id).exec();

    //* Prisma
    // const director = this.prisma.director.findUnique({
    //   where: { id },
    // });

    //* TypeORM
    // const director = await this.directorRepository.findOne({
    //   where: { id },
    // });

    if (!director) {
      throw new NotFoundException('Director not found');
    }

    //* Mongoose
    await this.directorModel.findByIdAndDelete(id).exec();

    //* Prisma
    // await this.prisma.director.delete({ where: { id } });

    //* TypeORM
    // await this.directorRepository.delete(id);

    return id;
  }
}
