import { IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateMovieDto {
  /**
   * validator를 두개 사용할 수도 있다.
   * 두개 validator의 조건을 만족하면 통과
   */
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsNotEmpty()
  @IsOptional()
  genre?: string;
}