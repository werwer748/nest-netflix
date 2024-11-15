import { BadRequestException, Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { PagePaginationDto } from './dto/page-pagination.dto';
import { CursorPaginationDto } from './dto/cursor-pagination.dto';

@Injectable()
export class CommonService {
  constructor() {}

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
