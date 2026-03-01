import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from "passport-jwt";

import { AuthUser } from "../types/auth-user.type";

type JwtPayload = {
  sub: string;
  email: string;
};

type RequestWithAuthHeader = {
  headers: {
    authorization?: string;
  };
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(configService: ConfigService) {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
      passReqToCallback: true
    };
    super(options);
  }

  validate(req: RequestWithAuthHeader, payload: JwtPayload): AuthUser {
    const authHeader = req.headers.authorization ?? "";
    const [, refreshToken] = authHeader.split(" ");
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token is required");
    }
    return {
      userId: payload.sub,
      email: payload.email,
      refreshToken
    };
  }
}
