import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Movie } from './movie.schema';
import { User } from '../../user/schema/user.schema';

@Schema({
  timestamps: true,
})
export class MovieUserLike extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Movie',
    required: true,
  })
  movie: Movie;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: User;

  @Prop({
    required: true,
  })
  isLike: boolean;
}

export const MovieUserLikeSchema = SchemaFactory.createForClass(MovieUserLike);

//* composite primary key 설정
MovieUserLikeSchema.index({ movie: 1, user: 1 }, { unique: true }); //? 두개의 컬럼을 합쳐서 유니크한 인덱스를 생성한다.
