import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor {
  intercept(context, next) {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode: response.statusCode,
        data: data === undefined ? null : data,
      })),
    );
  }
}
