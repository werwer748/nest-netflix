import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('common')
@ApiBearerAuth()
@ApiTags('common')
export class CommonController {
  @Post('video')
  @UseInterceptors(
    FileInterceptor('video',
      {
        limits: {
          fileSize: 20000000, // 20MB
        },
        fileFilter(
          req: any,
          file: {
            fieldname: string;
            originalname: string;
            encoding: string;
            mimetype: string;
            size: number;
            destination: string;
            filename: string;
            path: string;
            buffer: Buffer;
          },
          // acceptFile: boolean => true: 파일 저장, false: 파일 저장 안함
          callback: (error: Error | null, acceptFile: boolean) => void,
        ) {
          if (file.mimetype !== 'video/mp4') {
            return callback(
              new BadRequestException('mp4 파일만 업로드 가능합니다.'),
              false,
            )
          }

          return callback(null, true);
        },
      },
    ),
  )
  createVideo(
    @UploadedFile() video: Express.Multer.File,
  ) {
    return {
      fileName: video.filename,
    }
  }
}
