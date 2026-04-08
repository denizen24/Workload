import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { passportJwtSecret } from "jwks-rsa";
import { ExtractJwt, Strategy } from "passport-jwt";

import { AuthUser } from "../types/auth-user.type";

type KeycloakJwtPayload = {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  email_verified?: boolean;
};

@Injectable()
export class KeycloakStrategy extends PassportStrategy(Strategy, "keycloak") {
  constructor(configService: ConfigService) {
    const issuer = configService.getOrThrow<string>("KEYCLOAK_ISSUER");

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer,
      algorithms: ["RS256"],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/protocol/openid-connect/certs`
      })
    });
  }

  validate(payload: KeycloakJwtPayload): AuthUser {
    return {
      userId: payload.sub,
      email: payload.email ?? payload.preferred_username ?? "",
      name: payload.name ?? payload.preferred_username ?? ""
    };
  }
}
