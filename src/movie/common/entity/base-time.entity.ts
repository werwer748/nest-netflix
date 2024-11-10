import { CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

export class BaseTimeEntity {
  @CreateDateColumn() // 생성일 자동 등록
  createdAt: Date;

  @UpdateDateColumn() // 업데이트일 자동 등록
  updatedAt: Date;

  @VersionColumn() // 데이터에 변화가 생길때 마다 + 1
  version: number;
}