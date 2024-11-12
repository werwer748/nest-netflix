import { CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

export class BaseTimeEntity {
  @CreateDateColumn() // 생성일 자동 등록
  @Exclude()
  createdAt: Date;

  @UpdateDateColumn() // 업데이트일 자동 등록
  @Exclude()
  updatedAt: Date;

  @VersionColumn() // 데이터에 변화가 생길때 마다 + 1
  @Exclude()
  version: number;
}