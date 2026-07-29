import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(@Inject(AppService) appService) {
    this.appService = appService;
  }

  @Get()
  getHello() {
    return this.appService.getHello();
  }
}
