import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authVariableKeys } from '../common/const/auth.const';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { UserService } from '../user/user.service';
import { PrismaService } from '../common/prisma.service';
import { Role } from '@prisma/client';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../user/schema/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    // @InjectRepository(User)
    // private readonly userRepository: Repository<User>,
    // private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async tokenBlock(token: string) {
    // 토큰 블록 처리용이라 검증할 필요는 없음
    const payload = this.jwtService.decode(token);

    const expiryDate = +new Date(payload.exp * 1000);
    const now = +Date.now();

    const differenceInSeconds = (expiryDate - now) / 1000;

    await this.cacheManager.set(
      `BLOCK_TOKEN_${token}`,
      payload,
      Math.max(differenceInSeconds * 1000, 1),
    );

    return true;
  }

  parseBasicToken(rawToken: string) {
    const basicSplit = rawToken.split(' ');

    if (basicSplit.length !== 2) {
      throw new BadRequestException('토큰 포맷이 잘못됐습니다!');
    }

    const [basic, token] = basicSplit;

    if (basic.toLowerCase() !== 'basic') {
      throw new BadRequestException('토큰 포맷이 잘못됐습니다!');
    }

    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const tokenSplit = decoded.split(':');

    if (tokenSplit.length !== 2) {
      throw new BadRequestException('토큰 포맷이 잘못됐습니다!');
    }

    const [email, password] = tokenSplit;

    return { email, password };
  }

  async parseBearerToken(rawToken: string, isRefreshToken: boolean) {
    const basicSplit = rawToken.split(' ');

    if (basicSplit.length !== 2) {
      throw new BadRequestException('토큰 포맷이 잘못됐습니다!');
    }

    const [bearer, token] = basicSplit;

    if (bearer.toLowerCase() !== 'bearer') {
      throw new BadRequestException('토큰 포맷이 잘못됐습니다!');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>(
          isRefreshToken
            ? authVariableKeys.refreshTokenSecret
            : authVariableKeys.accessTokenSecret,
        ),
      });

      if (isRefreshToken) {
        if (payload.type !== 'refresh') {
          throw new BadRequestException('Refresh 토큰을 입력해주세요!');
        }
      } else {
        if (payload.type !== 'access') {
          throw new BadRequestException('Access 토큰을 입력해주세요!');
        }
      }

      return payload;
    } catch (e) {
      throw new UnauthorizedException('토큰이 만료되었습니다.');
    }
  }

  async register(rawToken: string) {
    const { email, password } = this.parseBasicToken(rawToken);

    return await this.userService.create({
      email,
      password,
    });
  }

  async authenticate(email: string, password: string) {
    //* Mongoose
    const user = await this.userModel
      .findOne(
        { email },
        { password: 1, role: 1 }, // password, role 함께 가져나오기
      )
      .exec();

    //* Prisma
    // const user = await this.prisma.user.findUnique({
    //   where: {
    //     email,
    //   },
    //   omit: {
    //     password: false,
    //   },
    // });

    //* TypeORM
    // const user = await this.userRepository.findOne({
    //   where: {
    //     email,
    //   },
    // });

    if (!user) {
      throw new BadRequestException('잘못된 로그인 정보입니다.');
    }

    const checkPassword = await bcrypt.compare(password, user.password);

    if (!checkPassword) {
      throw new BadRequestException('잘못된 로그인 정보입니다.');
    }

    return user;
  }

  //* Role은 기존 TypeORM과 다르게 @prisma/client에서 가져와야함
  // async issueToken(user: { id: number; role: Role }, isRefreshToken: boolean) {
  //? MongoDB에서 id -> _id, ObjectId는 unknown이 계속 찍혀서 any로 처리
  async issueToken(user: { _id: any; role: Role }, isRefreshToken: boolean) {
    const refreshTokenSecret = this.configService.get<string>(
      authVariableKeys.refreshTokenSecret,
    );
    const accessTokenSecret = this.configService.get<string>(
      authVariableKeys.accessTokenSecret,
    );

    return this.jwtService.signAsync(
      {
        sub: user._id,
        role: user.role,
        type: isRefreshToken ? 'refresh' : 'access',
      },
      {
        secret: isRefreshToken ? refreshTokenSecret : accessTokenSecret,
        // 숫자로 넣으면 초단위
        // 문자의 경우 24h, 1d, 1h, 1m 등으로 표현 가능
        expiresIn: isRefreshToken ? '24h' : 300,
      },
    );
  }

  async login(rawToken: string) {
    const { email, password } = this.parseBasicToken(rawToken);

    const user = await this.authenticate(email, password);

    return {
      accessToken: await this.issueToken(user, false),
      refreshToken: await this.issueToken(user, true),
    };
  }
}
