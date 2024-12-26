import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class MovieDetail extends Document {
  @Prop({
    required: true,
  })
  detail: string;

  //* 서로 참조되어서 데이터 생성이 안됨
  // @Prop({
  //   type: Types.ObjectId,
  //   ref: 'Movie',
  //   required: true,
  //   unique: true,
  // })
  // movie: Movie;
}

export const MovieDetailSchema = SchemaFactory.createForClass(MovieDetail);
