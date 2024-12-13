import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { PagePaginationDto } from './dto/page-pagination.dto';
import { CursorPaginationDto } from './dto/cursor-pagination.dto';
import * as AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { awsVariableKeys } from './const/aws.const';

@Injectable()
export class CommonService {
  private s3: AWS.S3;

  constructor(
    private readonly configService: ConfigService,
  ) {
    AWS.config.update({
      credentials: {
        accessKeyId: this.configService.get<string>(awsVariableKeys.awsAccessKeyId),
        secretAccessKey: this.configService.get<string>(awsVariableKeys.awsSecretAccessKey),
      },
      region: this.configService.get<string>(awsVariableKeys.awsRegion),
    });

    this.s3 = new AWS.S3();
  }

  async saveMovieToPermanentStorage(fileName: string) {
    try {
      const bucketName = this.configService.get<string>(awsVariableKeys.bucketName);

      // 파일 복사
      await this.s3.copyObject({
        Bucket: bucketName,
        CopySource: `${bucketName}/public/temp/${fileName}`,
        Key: `public/movie/${fileName}`,
        ACL: 'public-read',
      }).promise();

      // 복사한 원본(temp) 파일 삭제
      await this.s3.deleteObject({
        Bucket: bucketName,
        Key: `public/temp/${fileName}`,
      }).promise();
    } catch(e) {
      console.log(e);
      throw new InternalServerErrorException('S3 에러!');
    }
  }

  //? S3에 파일 업로드 시, presigned url을 생성해주는 메서드 - 5분간 유효
  async createPresignedUrl(expiresIn = 300) {
    const params = {
      //? 업로드할 파일의 버킷 이름
      Bucket: this.configService.get<string>(awsVariableKeys.bucketName),
      //? 버킷 내부를 키로 구분하여 저장할 수 있음 {버킷명}/{키} 형식 - 폴더처럼 보이는 헝태
      Key: `public/temp/${uuid()}.mp4`,
      //? url이 유효한 시간
      Expires: expiresIn,
      //? 아무나 볼수 있도록 설정
      ACL: 'public-read',
    };

    try {
      const url = await this.s3.getSignedUrlPromise('putObject', params);
      return url;
    } catch(e) {
      console.log(e);
      throw new InternalServerErrorException('S3 Presigned URL 생성 실패')
    }
  }

  applyPagePaginationParamsToQb<T>(
    qb: SelectQueryBuilder<T>,
    dto: PagePaginationDto
  ) {
    const { take, page } = dto;
    const skip = (page - 1) * take;

    qb.take(take);
    qb.skip(skip);
  }

  async applyCursorPaginationParamsToQb<T>(
    qb: SelectQueryBuilder<T>,
    dto: CursorPaginationDto,
  ) {
    let { cursor, take, order } = dto;

    if (cursor) {
      const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
      /**
       * {
       *   values: { id: 00 }
       * },
       * order: ['id_DESC']
       */
      const cursorObj = JSON.parse(decodedCursor);

      order = cursorObj.order;

      const { values } = cursorObj;

      // (column1, column2, column3) > (value1, value2, value3)

      const columns = Object.keys(values);
      const comparisonOperator = order.some((o) => o.endsWith('DESC')) ? '<' : '>';

      const whereConditions = columns.map((column) => `${qb.alias}.${column}`).join(',');
      const whereParams = columns.map((column) => `:${column}`).join(',');

      // (likeCount, id) > (:likeCount, :id), { likeCount: 20, id: 52 }
      qb.where(`(${whereConditions}) ${comparisonOperator} (${whereParams})`, values);
    }

    // [likeCount_DESC, id_DESC]
    for (let i = 0; i < order.length; i++) {
      const [column, direction] = order[i].split('_');

      if (direction !== 'ASC' && direction !== 'DESC') {
        throw new BadRequestException('Order는 ASC 또는 DESC만 가능합니다.');
      }

      if (i === 0) {
        qb.orderBy(`${qb.alias}.${column}`, direction);
      } else {
        qb.addOrderBy(`${qb.alias}.${column}`, direction);
      }
    }

    qb.take(take);

    const results = await qb.getMany();

    const nextCursor = this.generateNextCursor(results, order);

    return { qb, nextCursor, data: results };
  }

  generateNextCursor<T>(results: T[], order: string[]): string | null {
    if (results.length === 0) return null;

    /**
     * {
     *   values: { id: 00 }
     * },
     * order: ['id_DESC']
     */
    const lastItem = results.at(-1);

    const values = {};

    order.forEach((columnOrder) => {
      const [column] = columnOrder.split('_');
      values[column] = lastItem[column];
    });
    
    const cursorObj = { values, order };

    //* base64로 인코딩해서 보내주면 프론트에서 편하다.
    //* get요청이니까 body에 객체담아서 보내듯 할수가 없으니 이렇게 처리하는 듯
    return Buffer.from(JSON.stringify(cursorObj)).toString('base64');
  }
}
