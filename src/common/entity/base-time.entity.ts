import { CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiHideProperty } from '@nestjs/swagger';

export class BaseTimeEntity {
  @CreateDateColumn() // 생성일 자동 등록
  @Exclude()
  @ApiHideProperty()
  createdAt: Date;

  @UpdateDateColumn() // 업데이트일 자동 등록
  @Exclude()
  @ApiHideProperty()
  updatedAt: Date;

  @VersionColumn() // 데이터에 변화가 생길때 마다 + 1
  @Exclude()
  @ApiHideProperty()
  version: number;
}