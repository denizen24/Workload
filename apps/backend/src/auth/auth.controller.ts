import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import { CurrentUser } from "../common/decorators/current-user.decorator";

import { AuthService } from "./auth.service";
import { AuthUser } from "./types/auth-user.type";

@ApiTags("Auth")
@ApiBearerAuth()
@SkipThrottle()
@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user);
  }
}
