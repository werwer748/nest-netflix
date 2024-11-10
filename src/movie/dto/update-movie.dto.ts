import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateMovieDto {
  /**
   * validator를 두개 사용할 수도 있다.
   * 두개 validator의 조건을 만족하면 통과
   */
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  title?: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  genre?: string;

  @IsNotEmpty()
  @IsOptional()
  detail?: string;

  @IsNumber()
  @IsOptional()
  directorId?: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @IsOptional()
  genreIds?: number[];
}