import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseTimeEntity } from '../../common/entity/base-time.entity';
import { Exclude } from 'class-transformer';

export enum Role {
  admin = 'admin',
  paidUser = 'paidUser',
  user = 'user'
}

@Entity()
export class User extends BaseTimeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  email: string;

  @Exclude({
    // 응답시
    toPlainOnly: true,
  })
  @Column()
  password: string;

  @Column({
    enum: Role,
    default: Role.user,
  })
  role: Role;
}
