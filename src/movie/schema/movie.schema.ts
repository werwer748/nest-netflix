import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../user/schema/user.schema';
import { MovieUserLike } from './movie-user-like.schema';
import { MovieDetail } from './movie-detail.schema';
import { Genre } from '../../genre/schema/genre.schema';
import { Director } from '../../director/schema/director.schema';

@Schema({
  timestamps: true,
})
export class Movie extends Document {
  @Prop({
    required: true,
    unique: true,
  })
  title: string;

  @Prop({
    default: 0,
  })
  likeCount: number;

  @Prop({
    default: 0,
  })
  disLikeCount: number;

  @Prop({
    required: true,
  })
  movieFilePath: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'MovieDetail',
    required: true,
  })
  detail: MovieDetail;
  //* 1:1이고 MongoDB 특성상 이렇게 쓰는게 맞지만 mongoose에서 제공하는 다양한 옵션을 써보기위해 주석처리
  // detail: {
  //   detail: string;
  // };

  @Prop({
    type: Types.ObjectId,
    ref: 'Director',
    required: true,
  })
  director: Director;

  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'Genre',
      },
    ],
  })
  genres: Genre[];

  @Prop({
    // 1:N 에서 N의 입장에서 1인 User와 연결
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  creator: User; // const로 만든 UserSchema가 아니라 class로 만든 User를 import해야 한다.

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'MovieUserLike' }],
  })
  likedUsers: MovieUserLike[];
}

export const MovieSchema = SchemaFactory.createForClass(Movie);
