import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { join } from 'path';
import * as ffmpegFluent from 'fluent-ffmpeg';

@Processor('thumbnail-generation')
export class ThumbnailGenerationProcess extends WorkerHost {
  //* thumbnail-generation 큐에 작업이 추가되면 실행되는 함수
  async process(job: Job, token: string | undefined): Promise<any> {
    // 작업이 어떻게 되는지 확인해보기
    const { videoPath, videoId } = job.data;

    console.log(`영상 트랜스코딩중... ID: ${videoId}`);

    const outputDirectory = join(process.cwd(), 'public', 'thumbnail');

    ffmpegFluent(videoPath)
      .screenshots({
        count: 1,
        filename: `${videoId}.png`,
        folder: outputDirectory,
        size: '320x240',
      })
      // 작업이 끝났을 때 실행되는 함수
      .on('end', () => {
        console.log(`썸네일 생성 완료! ID: ${videoId}`);
      })
      // 에러발생 시 실행되는 함수
      .on('error', (error) => {
        console.log(error);
        console.log(`썸네일 생성 실패!`);
      });
    return 1;
  }
}
