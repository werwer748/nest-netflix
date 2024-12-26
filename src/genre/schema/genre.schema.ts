import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Movie } from '../../movie/schema/movie.schema';

@Schema({
  timestamps: true,
})
export class Genre extends Document {
  @Prop({
    required: true,
    unique: true,
  })
  name: string;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Movie' }],
  })
  movies: Movie[];
}

export const GenreSchema = SchemaFactory.createForClass(Genre);

//? ClassSerializerInterceptor와 충돌을 해결하기 위해 toObject를 사용해 plain object로 변환
// GenreSchema.set('toObject', {
//   transform: (model, ret) => {
//     ret._id = ret._id.toString();
//     return ret;
//   },
// });
