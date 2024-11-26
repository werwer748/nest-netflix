import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { Role } from '../../user/entity/user.entity';
import { RBAC } from '../decorator/rbac.decorator';

@Injectable()
export class RBACGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const userRole = context.switchToHttp().getRequest().user?.role;
    const passRoles = this.reflector.get<Role[]>(RBAC, context.getHandler());

    if (!passRoles) {
      return true;
    }


    return passRoles.includes(userRole);
  }
}