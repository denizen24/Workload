import { Module } from "@nestjs/common";

import { FileModule } from "./file/file.module";
import { HealthController } from "./health/health.controller";
import { ParseModule } from "./parse/parse.module";

@Module({
  imports: [FileModule, ParseModule],
  controllers: [HealthController]
})
export class AppModule {}
