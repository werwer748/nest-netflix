import { Request } from 'express';
import { User } from '../../user/entity/user.entity';


export interface IReqestUser extends Request {
  user: Pick<User, 'id' | 'role'>
}