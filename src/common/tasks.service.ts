import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { readdir, unlink } from 'node:fs/promises';
import { join, parse } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Movie } from '../movie/entity/movie.entity';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { DefaultLogger } from './logger/default.logger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class TasksService {
  // Logger(클래스명)을 사용해 클래스를 지정해서 로깅을 할 수 있다.
  // private readonly logger = new Logger(TasksService.name);

  //* 다른 서비스 클래스처럼 사용하면 된다.
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    // 다이나믹 스케줄링을 사용하려면 SchedulerRegistry를 주입받아야 한다.
    private readonly schedulerRegistry: SchedulerRegistry,
    // private readonly logger: DefaultLogger,
    //* winston을 사용한 로깅을 위해 주입받아야 한다.
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  //* 매초마다 실행되는거 확인하기
  // @Cron('*/5 * * * * *')
  logEverySecond() {
    /**
     * 기본 Nest Logger 사용
     * 콘솔창에 로그 확인
     * [Nest] '프로세스아이디' - '로깅 시간' '로깅레벨' ['컨텍스트(new Logger(TasksService.name))'] 1초마다 실행!!
     * logger.[로그레벨] => 로깅할 레벨을 지정할 수 있다.
     * fatal > error > warn > log(정보성 info와 같음) > debug > verbose
     */

    /**
     * winston 사용
     * logger.[로그레벨](로그내용, 컨텍스트) => 올바른 컨텍스트정보를 포함한 로그를 볼 수 있다.
     * error와 fatal 은 logger.[로그레벨](로그내용, 에러의 실제 스택트레이스나 메시지, 컨텍스트)
     */
    this.logger.fatal('FATAL 레벨 로그', null, TasksService.name);
    this.logger.error('ERROR 레벨 로그', null, TasksService.name);
    this.logger.warn('WARN 레벨 로그', TasksService.name);
    this.logger.log('LOG 레벨 로그', TasksService.name);
    this.logger.debug('DEBUG 레벨 로그', TasksService.name);
    this.logger.verbose('VERBOSE 레벨 로그', TasksService.name);
  }

  // @Cron('* * * * * *')
  async eraseOrphanFiles() {
    // readdir: 디렉토리 내 파일 목록을 가져온다.
    const files = await readdir(join(process.cwd(), 'public', 'temp'));

    const deleteFilesTargets = files.filter((file) => {
      // parse?: 인자인 데이터를 분석하여 이 데이터의 root, dir, base, ext, name을 확인할 수 있다.
      const filename = parse(file).name;

      const split = filename.split('_');

      if (split.length !== 2) {
        return true;
      }

      try {
        const date = +new Date(parseInt(split.at(-1)));
        const aDayInMilSec = 1000 * 60 * 60 * 24;

        const now = +new Date();

        // 파일이 생성된지 하루가 지났다면 삭제할 파일로 간주
        return (now - date) > aDayInMilSec;
      } catch(e) {
        //파일 처리 도중 에러발생시에도 삭제할 파일로 간주한다.
        return true;
      }
    });

    // 삭제할 파일 이름 확인! => 의도대로 작동함
    // console.log(deleteFilesTargets)

    // unlink를 사용해 단일 파일 삭제시
    // unlink(join(process.cwd(), 'public', 'temp', deleteFilesTargets[0]));

    // Promise.all을 사용해 여러 파일 삭제시
    await Promise.all(
      deleteFilesTargets.map((x) => unlink(join(process.cwd(), 'public', 'temp', x)))
    )
  }


  // @Cron('0 * * * * *') // X시 X분 0초마다 실행
  async calculateMovieLikeCounts() {
    console.log('영화 좋아요, 싫어요 개수 계산');
    await this.movieRepository.query(`
      UPDATE movie m
      SET "likeCount" = (
              SELECT count(*) FROM movie_user_like mul
              WHERE m.id = mul."movieId" AND mul."isLike" = $1
          );
    `, [true]);
    await this.movieRepository.query(`
      UPDATE movie m
      SET "disLikeCount" = (
              SELECT count(*) FROM movie_user_like mul
              WHERE m.id = mul."movieId" AND mul."isLike" = $1
          );
    `, [false]);
  }

  // @Cron('* * * * * *', {
  //   name: 'printer',
  // })
  printer() {
    console.log('print every second');
  }

  // @Cron('*/5 * * * * *') // 분, 초에 상관없이 5초 간격으로 실행
  stopper() {
    console.log('==== stopper run ====');

    // @Cron() 선언시 이름을 지정한 크론작업을 이런식으로 가져올 수 있다.
    const job = this.schedulerRegistry.getCronJob('printer');

    // 마지막 실행시점 가져오기
    // console.log('# Last Date');
    // console.log(job.lastDate());

    // 다음 실행시점 가져오기
    // console.log('# Next Date');
    // console.log(job.nextDate());

    // 다음 5회 실행시점 가져오기 -> 배열로 반환 [실행시점 1, 실행시점 2, ...]
    console.log('# Next Dates');
    console.log(job.nextDates(5));

    // job.running: 현재 작업이 실행중인지 여부 - boolean
    if (job.running) {
      job.stop();
    } else {
      job.start();
    }
  }
}