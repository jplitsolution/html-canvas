import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import configuration from './config/configuration';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { UploadModule } from './modules/upload/upload.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { FlowModule } from './modules/flow/flow.module';
import { OtpModule } from './modules/otp/otp.module';
import { PartnersModule } from './modules/partners/partners.module';
import { SearchModule } from './modules/search/search.module';
import { LogsModule } from './modules/logs/logs.module';
import { RedisModule } from './common/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: (configService.get<string>('database.type') || 'mysql') as any,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: false,
        migrations: [join(__dirname, 'database/migrations/*{.ts,.js}')],
        migrationsRun: true,
      }),
    }),

    UsersModule,
    AuthModule,
    UploadModule,
    TemplatesModule,
    DatabaseModule,
    AnalyticsModule,
    CampaignsModule,
    FlowModule,
    OtpModule,
    PartnersModule,
    SearchModule,
    LogsModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
