import {
  BadRequestException,
  Controller,
  OnModuleInit,
  Post,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import * as fs from "fs";
import * as path from "path";

import { ParseService } from "../parse/parse.service";

@Controller("api")
export class FileController implements OnModuleInit {
  private readonly uploadsDir = path.join(process.cwd(), "files");

  constructor(private readonly parseService: ParseService) {}

  onModuleInit() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join(process.cwd(), "files");
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = path.extname(file.originalname);
          const name = path.basename(file.originalname, ext);
          cb(null, `${name}-${uniqueSuffix}${ext}`);
        }
      }),
      limits: {
        fileSize: 20 * 1024 * 1024
      }
    })
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    const filePath = path.join(this.uploadsDir, file.filename);
    const buffer = fs.readFileSync(filePath);
    return this.parseService.parseWorkbook(buffer);
  }

  @Post("workload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join(process.cwd(), "files");
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = path.extname(file.originalname);
          const name = path.basename(file.originalname, ext);
          cb(null, `${name}-${uniqueSuffix}${ext}`);
        }
      }),
      limits: {
        fileSize: 20 * 1024 * 1024
      }
    })
  )
  workload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    const filePath = path.join(this.uploadsDir, file.filename);
    const buffer = fs.readFileSync(filePath);
    return this.parseService.parseWorkbook(buffer);
  }
}
