import {
  ChildEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn, TableInheritance,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';


export class BaseEntity {
  @CreateDateColumn() // 생성일 자동 등록
  createdAt: Date;

  @UpdateDateColumn() // 업데이트일 자동 등록
  updatedAt: Date;

  @VersionColumn() // 데이터에 변화가 생길때 마다 + 1
  version: number;
}

@Entity()
export class Movie extends BaseEntity{
  // pk 등록
  @PrimaryGeneratedColumn()
  id: number;

  @Column() // 테이블의 컬럼
  title: string;

  @Column()
  genre: string

}
