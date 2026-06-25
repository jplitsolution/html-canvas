import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import configuration from './config/configuration';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { UploadModule } from './modules/upload/upload.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// New Features Modules
import { PagesModule } from './modules/pages/pages.module';
import { BlocklistModule } from './modules/blocklist/blocklist.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ApiConfigModule } from './modules/api-config/api-config.module';
import { RoutingModule } from './modules/routing/routing.module';
import { PublishModule } from './modules/publish/publish.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Database Integration (TypeORM dynamic dialect support)
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
        synchronize: false, // synchronize disabled for production readiness / migrations
        migrations: [join(__dirname, 'database/migrations/*{.ts,.js}')],
        migrationsRun: true, // auto-run migrations on application start
      }),
    }),

    // Features Modules
    UsersModule,
    AuthModule,
    UploadModule,
    ProjectsModule,
    TemplatesModule,
    DatabaseModule,
    
    // New Feature Modules Registered
    PagesModule,
    BlocklistModule,
    SubscriptionsModule,
    ApiConfigModule,
    RoutingModule,
    PublishModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
