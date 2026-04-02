import * as path from "path";

import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { SkipThrottle } from "@nestjs/throttler";

import { ApiConsumes, ApiTags } from "@nestjs/swagger";

import { Public } from "../common/decorators/public.decorator";
import { ParseService } from "../parse/parse.service";

const multerConfig = {
  storage: memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void
  ) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".xlsx" || ext === ".xls") {
      cb(null, true);
    } else {
      cb(new BadRequestException("Only .xlsx/.xls files are allowed"), false);
    }
  }
};

@ApiTags("File")
@SkipThrottle()
@Controller("api")
export class FileController {
  constructor(private readonly parseService: ParseService) {}

  @Public()
  @Post("upload")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", multerConfig))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    return this.parseService.parseWorkbook(file.buffer);
  }

}
