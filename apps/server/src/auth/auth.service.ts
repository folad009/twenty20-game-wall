import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { parseBody } from "../common/zod.util";
import { PrismaService } from "../prisma/prisma.service";
import { loginSchema } from "./auth.schemas";
import { JwtPayload } from "./jwt.strategy";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(raw: unknown) {
    const dto = parseBody(loginSchema, raw);
    const adminPhone = this.config
      .get<string>("ADMIN_PHONE", "+15550000001")
      .trim();
    const normalizedPhone = dto.phone.replace(/\s/g, "");
    const role = normalizedPhone === adminPhone ? "admin" : "user";

    const user = await this.prisma.user.upsert({
      where: { phone: normalizedPhone },
      create: {
        name: dto.name,
        phone: normalizedPhone,
        role,
      },
      update: {
        name: dto.name,
        ...(role === "admin" ? { role: "admin" } : {}),
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
    };

    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }
}
