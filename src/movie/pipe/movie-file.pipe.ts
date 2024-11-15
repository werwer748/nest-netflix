import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { v4 } from 'uuid';
import { join } from 'path';
import { rename } from 'node:fs/promises';

interface IOptions {
  maxSize: number;
  mimeTypes: string;
}

@Injectable()
export class MovieFilePipe
  implements PipeTransform<Express.Multer.File,  Promise<Express.Multer.File>>
{
  constructor(private readonly options: IOptions) {}

  async transform(value: Express.Multer.File, metadata: ArgumentMetadata): Promise<Express.Multer.File> {
    if (!value) {
      throw new BadRequestException('movie 필드는 필수입니다!!');
    }

    const byteSize = this.options.maxSize * 1000000;

    if (value.size > byteSize) {
      throw new BadRequestException(`${this.options.maxSize}MB 이하의 파일만 업로드 가능합니다.`);
    }

    if (value.mimetype !== this.options.mimeTypes) {
      throw new BadRequestException(`${this.options.mimeTypes}만 업로드 가능합니다.`);
    }

    const split = value.originalname.split('.');

    let extension = 'mp4';

    if (split.length > 1) {
      extension = split.at(-1);
    }

    const filename = `${v4()}_${Date.now()}.${extension}`;
    const newPath = join(value.destination, filename);

    await rename(value.path, newPath);

    return {
      ...value,
      filename,
      path: newPath,
    }
  }
}