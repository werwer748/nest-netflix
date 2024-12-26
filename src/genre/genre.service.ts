import {
  ClassSerializerInterceptor,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { InjectRepository } from '@nestjs/typeorm';
// import { Genre } from './entity/genre.entity';
import { Repository } from 'typeorm';
import { PrismaService } from '../common/prisma.service';
import { InjectModel } from '@nestjs/mongoose';
import { Genre } from './schema/genre.schema';
import { Model } from 'mongoose';

@Injectable()
export class GenreService {
  constructor(
    // @InjectRepository(Genre)
    // private genreRepository: Repository<Genre>
    // private readonly prisma: PrismaService,
    @InjectModel(Genre.name)
    private readonly genreModel: Model<Genre>,
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

    //* Mongoose
    return this.genreModel.create(createGenreDto);
    //* Mongoose - toObject 써보기
    // const result = await this.genreModel.create(createGenreDto);
    //* mongoose 경우 특별한 모델을 따르고있음 따라서 ClassSerializerInterceptor와 충돌이 생김
    //? .toObject를 통해 plain한 object로 변환해서 해결할 수 있다.
    // return {
    //   ...result.toObject(),
    //   //? _id는 그냥 string이 아니고 ObjectId로 되어있어서 변환해줘야함
    //   _id: result._id.toString(),
    // };
    //! 그러나 매번 저런식으로 변환하는 것은 비효율 적이다. 아래 방법을 통해 데이터를 변형해보자
    //? 해당 방법을 스키마단에서 해결하도록 할 수 있다.
    // return result.toObject({
    //   transform: (model, ret) => {
    //     ret._id = ret._id.toString();
    //     return ret;
    //   },
    // });
    // return result.toObject();

    //* Prisma
    // return this.prisma.genre.create({
    //   data: {
    //     ...createGenreDto,
    //   },
    // });

    //* TypeORM
    // return this.genreRepository.save(createGenreDto);
  }

  findAll() {
    //* Mongoose
    return this.genreModel.find().exec();

    //* Prisma
    // return this.prisma.genre.findMany();

    //* TypeORM
    // return this.genreRepository.find();
  }

  // async findOne(id: number) {
  //? mongoose _id -> string
  async findOne(id: string) {
    //* Mongoose
    const genre = await this.genreModel.findById(id).exec();

    //* Prisma
    // const genre = await this.prisma.genre.findUnique({
    //   where: { id },
    // });

    //* TypeORM
    // const genre = await this.genreRepository.findOne({
    //   where: { id }
    // });

    if (!genre) {
      throw new NotFoundException('존재하지 않는 장르입니다!');
    }

    return genre;
  }

  // async update(id: number, updateGenreDto: UpdateGenreDto) {
  //? mongoose _id -> string
  async update(id: string, updateGenreDto: UpdateGenreDto) {
    const genre = await this.findOne(id);

    //* Mongoose
    await this.genreModel.findByIdAndUpdate(id, updateGenreDto).exec();

    //* Prisma
    // await this.prisma.genre.update({
    //   where: { id },
    //   data: {
    //     ...updateGenreDto,
    //   },
    // });

    //* TypeORM
    // await this.genreRepository.update({ id }, { ...updateGenreDto });

    return this.findOne(id);
  }

  // async remove(id: number) {
  //? mongoose _id -> string
  async remove(id: string) {
    const genre = await this.findOne(id);

    //* Mongoose
    await this.genreModel.findByIdAndDelete(id).exec();

    //* Prisma
    // await this.prisma.genre.delete({
    //   where: { id },
    // });

    //* TypeORM
    // await this.genreRepository.delete(id);

    return id;
  }
}
