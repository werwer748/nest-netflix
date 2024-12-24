import { Reflector } from '@nestjs/core';
//* prisma client에서 Role을 import
import { Role } from '@prisma/client';
// import { Role } from '../../user/entity/user.entity';

export const RBAC = Reflector.createDecorator<Role[]>();
