import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { User } from '../user/entity/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { LocalStrategy } from './strategy/local.strategy';
import { JwtStrategy } from './strategy/jwt.strategy';
import { UserModule } from '../user/user.module';
import { CommonModule } from '../common/common.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/schema/user.schema';

@Module({
  imports: [
    // TypeOrmModule.forFeature([User]),
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    /**
     * JwtModule.register() 등록 시점에
     * 토큰값을 만드는 옵션을 사용할 수도 있다.
     * 하지만 여기서는 액세스,리프레시 두 토큰을 다르게 발급해서 사용할 예정이라
     * 일관된 설정을 사용하지않음
     */
    JwtModule.register({}),
    UserModule,
    CommonModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
