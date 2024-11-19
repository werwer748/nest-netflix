import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMovieDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: '영화 제목',
    example: '겨울왕국',
    required: true,
  })
  title: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: '영화 설명',
    example: 'Do wanna build a snowman?',
    required: true,
  })
  detail: string;

  @IsNumber()
  @ApiProperty({
    description: '감독 pk',
    example: 1,
    required: true,
  })
  directorId: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  // FormData로 넘어오는 경우 string, number 구분을 못함
  // => class-transformer의 @Type()을 사용해서 number로 변환해야 한다.
  @Type(() => Number)
  @ApiProperty({
    description: '장르 pk 배열',
    example: [1, 2, 3],
    required: true,
  })
  genreIds: number[];

  @IsString()
  @ApiProperty({
    description: '영화 파일 이름',
    example: 'aaa-bbb-ccc-ddd_0123456.jpg',
    required: true,
  })
  movieFileName: string;
}