import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class MovieTitleValidationPipe implements PipeTransform<string | undefined, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    /**
     * metadata: ArgumentMetadata
     * - type: 'query' | 'param' | 'body' | 'custom'
     *    => 검증하는 값이 query, param, body 중 어디서 왔는지 확인 가능
     *
     * - metatype
     *   => 이 파이프를 제공한 변수의 타입이 무엇인지 확인 가능
     *
     * - data
     *   => @(Body | Query | Param)('title')에서 인자로 제공한 'title'을 확인 가능
     */
    if (value && value.length <= 2) {
      throw new BadRequestException('영화의 제목은 3자 이상 작성해주세요!');
    }

    return value;
  }

}