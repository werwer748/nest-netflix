import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMovieDto {
  /**
   * validator를 두개 사용할 수도 있다.
   * 두개 validator의 조건을 만족하면 통과
   */
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  detail: string;

  @IsNumber()
  directorId: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  // FormData로 넘어오는 경우 string, number 구분을 못함
  // => class-transformer의 @Type()을 사용해서 number로 변환해야 한다.
  @Type(() => Number)
  genreIds: number[];
}