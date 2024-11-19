import { CreateMovieDto } from './create-movie.dto';
// swagger에서 MappedType을 쓴 Dto의 정보를 표시하려면 @nestjs/swagger에서 PartialType을 import해야 한다.
import { PartialType } from '@nestjs/swagger';

// PartialType을 사용하면 CreateMovieDto의 모든 필드는 optional로 변경된다.
export class UpdateMovieDto extends PartialType(CreateMovieDto) {}