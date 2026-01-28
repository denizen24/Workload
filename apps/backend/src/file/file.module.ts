import { Module } from "@nestjs/common";

import { ParseModule } from "../parse/parse.module";

import { FileController } from "./file.controller";

@Module({
  imports: [ParseModule],
  controllers: [FileController]
})
export class FileModule {}
