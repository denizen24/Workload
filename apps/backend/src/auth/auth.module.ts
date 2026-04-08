import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { PassportModule } from "@nestjs/passport";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { KeycloakAuthGuard } from "./guards/keycloak-auth.guard";
import { KeycloakStrategy } from "./strategies/keycloak.strategy";

@Module({
  imports: [ConfigModule, PassportModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    KeycloakStrategy,
    {
      provide: APP_GUARD,
      useClass: KeycloakAuthGuard
    }
  ],
  exports: [AuthService]
})
export class AuthModule {}
