import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AuthModule } from "./auth/auth.module";
import { validateEnv } from "./config/env.validation";
import { FileModule } from "./file/file.module";
import { HealthController } from "./health/health.controller";
import { ParseModule } from "./parse/parse.module";
import { SnapshotsModule } from "./snapshots/snapshots.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.example"],
      validate: validateEnv
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>("MONGO_URI")
      })
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    FileModule,
    ParseModule,
    AuthModule,
    SnapshotsModule
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
