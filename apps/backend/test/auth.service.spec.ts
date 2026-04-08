import { AuthService } from "../src/auth/auth.service";

describe("AuthService", () => {
  const service = new AuthService();

  it("returns profile from AuthUser", () => {
    const result = service.getProfile({
      userId: "kc-uuid-123",
      email: "user@example.com",
      name: "User Name"
    });

    expect(result).toEqual({
      id: "kc-uuid-123",
      email: "user@example.com",
      name: "User Name"
    });
  });
});
