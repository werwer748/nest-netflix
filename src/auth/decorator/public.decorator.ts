// 전역 설정된 AuthGuard 우회용
import { Reflector } from '@nestjs/core';

// Reflector.createDecorator<데코레이터에 파라미터로 받을 수 있는 타입> => 이렇게도 사용 가능
export const Public = Reflector.createDecorator();