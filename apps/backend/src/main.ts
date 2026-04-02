import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  app.getHttpAdapter().getInstance().set("trust proxy", true);

  const corsOrigin = configService.get<string>("CORS_ORIGIN") || false;
  const port = configService.get<number>("PORT", 3000);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );

  app.enableCors({
    origin: corsOrigin,
    credentials: true
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Workload API")
    .setDescription("API для планирования нагрузки команды")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(port);
  logger.log(`Application started on port ${port}`);
}

bootstrap();
