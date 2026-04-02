import * as crypto from "crypto";

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import * as bcrypt from "bcrypt";
import { SignOptions } from "jsonwebtoken";
import { Model } from "mongoose";

import { RedisService } from "../common/redis/redis.service";

import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { User, UserDocument } from "./schemas/user.schema";

type PublicUser = {
  id: string;
  email: string;
  name: string;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTtlSeconds: number;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService
  ) {
    this.refreshTtlSeconds = this.parseDurationToSeconds(
      this.configService.get<string>("JWT_REFRESH_EXPIRES_IN", "7d")
    );
  }

  async register(dto: RegisterDto) {
    const requiredSecret = this.configService.get<string>("REGISTRATION_SECRET", "");
    if (requiredSecret && dto.registrationSecret !== requiredSecret) {
      throw new ForbiddenException("Invalid registration secret");
    }

    const email = dto.email.toLowerCase().trim();
    const exists = await this.userModel.exists({ email });
    if (exists) {
      throw new ConflictException("User with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const fallbackName = email.split("@")[0] || "user";
    const user = await this.userModel.create({
      email,
      name: fallbackName,
      passwordHash
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    this.logger.log(`User registered: ${email}`);

    return {
      user: this.toPublicUser(user),
      ...tokens
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email }).select("+passwordHash").exec();
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValidPassword) {
      this.logger.warn(`Failed login attempt for: ${email}`);
      throw new UnauthorizedException("Invalid email or password");
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    this.logger.log(`User logged in: ${email}`);

    return {
      user: this.toPublicUser(user),
      ...tokens
    };
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokenPair> {
    const redis = this.redisService.getClient();
    const key = this.getRefreshKey(userId);
    const storedToken = await redis.get(key);

    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException("Refresh token is invalid");
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    const redis = this.redisService.getClient();
    await redis.del(this.getRefreshKey(userId));
    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return this.toPublicUser(user);
  }

  async generateTokens(userId: string, email: string): Promise<TokenPair> {
    const accessSecret = this.configService.get<string>("JWT_ACCESS_SECRET", "");
    const refreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET", "");
    const accessExpiresIn = this.configService.get<string>("JWT_ACCESS_EXPIRES_IN", "15m");
    const refreshExpiresIn = this.configService.get<string>("JWT_REFRESH_EXPIRES_IN", "7d");

    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn as SignOptions["expiresIn"]
      }),
      this.jwtService.signAsync(
        { ...payload, jti: crypto.randomUUID() },
        {
          secret: refreshSecret,
          expiresIn: refreshExpiresIn as SignOptions["expiresIn"]
        }
      )
    ]);

    return { accessToken, refreshToken };
  }

  async saveRefreshToken(userId: string, token: string) {
    const redis = this.redisService.getClient();
    await redis.set(this.getRefreshKey(userId), token, "EX", this.refreshTtlSeconds);
  }

  private toPublicUser(user: UserDocument): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name
    };
  }

  private getRefreshKey(userId: string) {
    return `refreshToken:${userId}`;
  }

  private parseDurationToSeconds(value: string): number {
    const normalized = value.trim().toLowerCase();
    const match = normalized.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60;
    }

    const amount = Number(match[1]);
    const unit = match[2];

    if (unit === "s") return amount;
    if (unit === "m") return amount * 60;
    if (unit === "h") return amount * 60 * 60;
    return amount * 24 * 60 * 60;
  }
}
