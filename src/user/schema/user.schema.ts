import { Types, Document } from 'mongoose';
// import { Role } from '../entity/user.entity';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Movie } from '../../movie/schema/movie.schema';
import { MovieUserLike } from '../../movie/schema/movie-user-like.schema';
import { Chat } from '../../chat/schema/chat.schema';
import { ChatRoom } from '../../chat/schema/chat-room.schema';
import { Role } from '@prisma/client';

//? nestjs에서 제공하는 기능을 사용하지 않는 기본적인 스키마 정의 방법
//? 여기서 Schema는 mongoose에서 제공하는 Schema를 사용한다. import { Schema, Types } from 'mongoose';
// export const userSchema = new Schema({
//   id: Number, //* id는 자동으로 생성되기 때문에 필요없다.
//   email: String,
//   password: String,
//   role: Role,
//   //* 리스트기 때문에 []를 사용 - 리스트가 아닌 경우에는 지금 형태에서 []를 제거하면 된다.
//   createdMovies: [{
//     type: Types.ObjectId,
//     ref: 'Movie'
//   }],
//   likedMovies: [{
//     type: Types.ObjectId,
//     ref: 'MovieUserLike'
//   }],
//   chats: [{
//     type: Types.ObjectId,
//     ref: 'Chat'
//   }],
//   chatRooms: [{
//     type: Types.ObjectId,
//     ref: 'ChatRoom'
//   }]
// })

//? nestjs에서 제공하는 기능을 통해 클래스로 스키마 정의하는 방법
//? 여기서 Schema는 @nestjs/mongoose에서 제공하는 Schema를 사용한다.
@Schema({
  timestamps: true, //* timestamps를 사용하면 생성일자와 수정일자를 자동으로 관리한다.
  //? version의 경우 __v로 _id와 함께 자동으로 생성된다.
})
export class User extends Document {
  //* id는 자동으로 생성되기 때문에 필요없다. - _id
  //* @Prop()을 사용하여 필드를 정의한다.
  @Prop({
    unique: true,
    required: true,
  })
  email: string;

  @Prop({
    required: true,
    select: false, //* select를 false로 설정하면 해당 필드를 조회할 때 제외된다.
  })
  password: string;

  @Prop({
    enum: Role,
    default: Role.user,
  })
  role: Role;

  //* 관계 설정
  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'Movie',
      },
    ],
  })
  createdMovies: Movie[];

  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'MovieUserLike',
      },
    ],
  })
  likedMovies: MovieUserLike[];

  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'Chat',
      },
    ],
  })
  chats: Chat[];

  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'ChatRoom',
      },
    ],
  })
  chatRooms: ChatRoom[];
}

//? SchemaFactory.createForClass()를 사용하여 User 클래스를 UserSchema로 변환한다.
export const UserSchema = SchemaFactory.createForClass(User);
