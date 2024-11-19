import { Reflector } from '@nestjs/core';
import { IThrottleDecorator } from '../interfaces/throttleDecorator.interface';

export const ThrottleDecorator = Reflector.createDecorator<IThrottleDecorator>();