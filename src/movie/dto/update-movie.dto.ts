import { CreateMovieDto } from './create-movie.dto';
import { PartialType } from '@nestjs/mapped-types';

// PartialType을 사용하면 CreateMovieDto의 모든 필드는 optional로 변경된다.
export class UpdateMovieDto extends PartialType(CreateMovieDto) {}