import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Response } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T | null;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        statusCode: response.statusCode,
        data: data === undefined ? null : data,
      })),
    );
  }
}
