import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommonService } from './common.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Controller('common')
@ApiBearerAuth()
@ApiTags('common')
export class CommonController {
  constructor(
    private readonly commonService: CommonService,
    @InjectQueue('thumbnail-generation') //register queue에 등록한 이름과 같아야 한다.
    private readonly thumbnailQueue: Queue,
  ) {}

  @Post('video')
  @UseInterceptors(
    FileInterceptor('video', {
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
          );
        }

        return callback(null, true);
      },
    }),
  )
  async createVideo(@UploadedFile() video: Express.Multer.File) {
    /**
     * 큐에 작업 추가
     * 이 함수를 실행하는 서버가 Producer 역할을 하게 된다.
     * 컨슈머가 작업을 할 수 있는 정도의 정보를 전달해주는게 중요
     */
    await this.thumbnailQueue.add(
      'thumbnail',
      {
        // 전달해줄 데이터
        videoId: video.filename,
        videoPath: video.path,
      },
      {
        //* BullMq에서 제공하는 옵션
        //? priority: 숫자가 낮을 수록 우선순위가 높다. 우선순위가 높은 작업이 먼저 처리된다.
        priority: 1,
        //? delay: 작업을 몇 ms 후에 실행할지 설정
        delay: 100,
        //? attempts: 작업이 실패했을 때 재시도 횟수
        attempts: 3,
        //? lifo: true로 설정하면 큐가아닌 스택구조로 작업을 처리한다.
        lifo: true,
        //? removeOnComplete: true로 설정하면 작업이 완료되면 레디스에서 작업을 삭제한다.
        removeOnComplete: true,
        //? removeOnFail: true로 설정하면 작업이 실패하면 레디스에서 작업을 삭제한다.
        removeOnFail: true,
      },
    );

    return {
      fileName: video.filename,
    };
  }

  @Post('presigned-url')
  async createPresignedUrl() {
    return {
      url: await this.commonService.createPresignedUrl(),
    };
  }
}
