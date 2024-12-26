import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { authVariableKeys } from '../common/const/auth.const';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class UserService {
  constructor(
    // @InjectRepository(User)
    // private readonly userRepository: Repository<User>,

    private readonly configService: ConfigService,
    // private readonly prisma: PrismaService,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}
  async create(createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;

    //* Mongoose
    //? .exec()를 붙여주어야 실제로 쿼리가 실행된다.
    const user = await this.userModel.findOne({ email }).exec();

    //* Prisma
    // const user = await this.prisma.user.findUnique({
    //   where: {
    //     email,
    //   },
    // });

    //* TypeORM
    // const checkEmail = await this.userRepository.exists({
    //   where: {
    //     email,
    //   },
    // });

    if (user) {
      throw new BadRequestException('이미 존재하는 이메일입니다!');
    }

    const hash = await bcrypt.hash(
      password,
      this.configService.get<number>(authVariableKeys.hashRounds),
    );

    //? mongoose로 데이터를 생성하는 2가지 방법
    /*
      const newUser = new this.userModel({
        email,
        password: hash,
      });
      await newUser.save();
      await this.userModel.create(newUser);
    */
    await this.userModel.create({
      email,
      password: hash,
    });

    //* Prisma
    // await this.prisma.user.create({
    //   data: {
    //     email,
    //     password: hash,
    //   },
    // });

    //* TypeORM
    // await this.userRepository.save({
    //   email,
    //   password: hash,
    // });

    return await this.userModel
      .findOne(
        { email },
        {
          createdMovies: 0,
          likedMovies: 0,
          chats: 0,
          chatRooms: 0,
        },
      )
      .exec();
    // return this.prisma.user.findUnique({
    //   where: {
    //     email,
    //   },
    // });
    // return this.userRepository.findOne({
    //   where: {
    //     email,
    //   },
    // });
  }

  findAll() {
    //* Mongoose
    return this.userModel.find().exec();

    //* Prisma
    // return this.prisma.user.findMany({
    //   // 정석적인 필드 제외하는 방법
    //   omit: {
    //     password: true,
    //   },
    // });

    //* TypeORM
    // return this.userRepository.find();
  }

  async findOne(id: number) {
    //* Mongoose
    const user = await this.userModel.findById(id);

    //* Prisma
    // const user = await this.prisma.user.findUnique({
    //   where: {
    //     id,
    //   },
    // });

    //* TypeORM
    // const user = await this.userRepository.findOne({
    //   where: {
    //     id,
    //   },
    // });

    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자 입니다.');
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const { password } = updateUserDto;

    //* Mongoose
    const user = await this.userModel.findById(id);

    //* Prisma
    // const user = await this.prisma.user.findUnique({
    //   where: {
    //     id,
    //   },
    // });

    //* TypeORM
    // const user = await this.userRepository.findOne({
    //   where: {
    //     id,
    //   },
    // });

    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자 입니다.');
    }

    const updateValues = {
      ...updateUserDto,
    };

    if (password) {
      updateValues.password = await bcrypt.hash(
        password,
        this.configService.get<number>(authVariableKeys.hashRounds),
      );
    }

    //* Mongoose
    // await this.userModel.findOneAndUpdate // 이렇게 사용하는 방법도 있음
    await this.userModel.findByIdAndUpdate(id, updateValues).exec();

    //* Prisma
    // await this.prisma.user.update({
    //   where: {
    //     id,
    //   },
    //   data: updateValues,
    // });

    //* TypeORM
    // await this.userRepository.update(
    //   { id },
    //   {
    //     ...updateUserDto,
    //     password: hashedPassword,
    //   },
    // );

    return this.userModel.findById(id);
    // return this.prisma.user.findUnique({
    //   where: {
    //     id,
    //   },
    // });
    // return this.userRepository.findOne({
    //   where: {
    //     id,
    //   },
    // });
  }

  async remove(id: number) {
    const user = await this.userModel.findById(id);
    // const user = await this.prisma.user.findUnique({
    //   where: {
    //     id,
    //   },
    // });
    // const user = await this.userRepository.findOne({
    //   where: {
    //     id,
    //   },
    // });

    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자 입니다.');
    }

    //* Mongoose
    await this.userModel.findByIdAndDelete(id);

    //* Prisma
    // await this.prisma.user.delete({
    //   where: {
    //     id,
    //   },
    // });

    //* TypeORM
    // await this.userRepository.delete(id);

    return id;
  }
}
