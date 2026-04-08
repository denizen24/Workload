import { Injectable } from "@nestjs/common";

import { AuthUser } from "./types/auth-user.type";

@Injectable()
export class AuthService {
  getProfile(user: AuthUser) {
    return {
      id: user.userId,
      email: user.email,
      name: user.name
    };
  }
}
