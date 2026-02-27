import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "./auth/auth.module";
import { RedisModule } from "./common/redis/redis.module";
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
    RedisModule,
    FileModule,
    ParseModule,
    AuthModule,
    SnapshotsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
