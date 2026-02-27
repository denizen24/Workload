import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { AuthService } from "../src/auth/auth.service";
import { RedisService } from "../src/common/redis/redis.service";

describe("AuthService", () => {
  const createSubject = () => {
    const model = {
      exists: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn()
    };

    const jwtService = {
      signAsync: jest.fn()
    } as unknown as JwtService;

    const configService = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const map: Record<string, unknown> = {
          JWT_ACCESS_SECRET: "access-secret",
          JWT_REFRESH_SECRET: "refresh-secret",
          JWT_ACCESS_EXPIRES_IN: "15m",
          JWT_REFRESH_EXPIRES_IN: "7d"
        };
        return map[key] ?? fallback;
      })
    } as unknown as ConfigService;

    const redisClient = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn()
    };

    const redisService = {
      getClient: () => redisClient
    } as unknown as RedisService;

    const service = new AuthService(
      model as never,
      jwtService,
      configService,
      redisService
    );

    return { service, model, jwtService, redisClient };
  };

  it("registers user and returns token pair", async () => {
    const { service, model, jwtService, redisClient } = createSubject();
    model.exists.mockResolvedValue(null);
    model.create.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User Name"
    });
    (jwtService.signAsync as jest.Mock)
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");

    const result = await service.register({
      email: "USER@EXAMPLE.COM",
      password: "password123",
      name: "User Name"
    });

    expect(model.exists).toHaveBeenCalledWith({ email: "user@example.com" });
    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
    expect(result.user).toEqual({
      id: "u1",
      email: "user@example.com",
      name: "User Name"
    });
    expect(redisClient.set).toHaveBeenCalledTimes(1);
  });

  it("throws conflict on duplicate email", async () => {
    const { service, model } = createSubject();
    model.exists.mockResolvedValue({ _id: "u1" });

    await expect(
      service.register({
        email: "user@example.com",
        password: "password123",
        name: "User Name"
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("refreshes tokens only for stored refresh token", async () => {
    const { service, model, jwtService, redisClient } = createSubject();
    redisClient.get.mockResolvedValue("refresh-token");
    model.findById.mockReturnValue({
      exec: () =>
        Promise.resolve({
          id: "u1",
          email: "user@example.com",
          name: "User Name"
        })
    });
    (jwtService.signAsync as jest.Mock)
      .mockResolvedValueOnce("new-access-token")
      .mockResolvedValueOnce("new-refresh-token");

    const result = await service.refreshTokens("u1", "refresh-token");
    expect(result).toEqual({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token"
    });
  });

  it("rejects refresh with mismatched token", async () => {
    const { service, redisClient } = createSubject();
    redisClient.get.mockResolvedValue("stored-token");

    await expect(service.refreshTokens("u1", "another-token")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });
});
