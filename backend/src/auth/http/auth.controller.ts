import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '../../shared/security/public.decorator.js';
import { AuthService } from '../application/auth.service.js';
import type { AuthResult } from '../application/auth.service.js';
import { AuthConfig } from '../infrastructure/auth.config.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthExceptionFilter } from './filters/auth-exception.filter.js';
import {
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  readCookie,
} from './refresh-cookie.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { AuditCategory } from '../../audit/domain/audit.repository.js';

// Los tres endpoints son públicos: al login se llega sin sesión, y la renovación y el
// cierre se identifican por la cookie, no por el access token (que puede estar vencido).
@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AuthConfig,
    private readonly auditService: AuditService,
  ) {}

  // POST /api/auth/login -> SCRUM-158 y SCRUM-159. Un solo endpoint para todos los roles.
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.auditService.capture(
      () => this.authService.login(dto.email, dto.password),
      ({ user }) => {
        const roleLabel = {
          ADMIN: 'Administrador',
          CASHIER: 'Cajero',
          CUSTOMER: 'Cliente',
        }[user.role];
        return {
          actorAccountId: user.accountId,
          category: AuditCategory.SESSION,
          action: `Inicio de sesión (${roleLabel})`,
          details: { role: user.role },
        };
      },
    );
    this.setRefreshCookie(res, result);
    return AuthResponseDto.fromResult(result);
  }

  // POST /api/auth/refresh -> access token nuevo. Responde lo mismo que el login.
  // Si falla NO se borra la cookie: con dos pestañas, la otra pudo haber dejado una nueva.
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.refresh(
      readCookie(req.headers.cookie, REFRESH_COOKIE),
    );
    this.setRefreshCookie(res, result);
    return AuthResponseDto.fromResult(result);
  }

  // POST /api/auth/logout -> SCRUM-36. Siempre responde 204, haya o no sesión.
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auditService.capture(
      () =>
        this.authService.logout(readCookie(req.headers.cookie, REFRESH_COOKIE)),
      (accountId) =>
        accountId === undefined
          ? null
          : {
              actorAccountId: accountId,
              category: AuditCategory.SESSION,
              action: 'Cierre de sesión',
            },
    );
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  // httpOnly: el JavaScript del front no puede leerla.
  // sameSite lax: no viaja en pedidos POST hechos desde otro sitio.
  // path: solo viaja a las rutas de auth.
  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
    };
  }

  private setRefreshCookie(res: Response, result: AuthResult): void {
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...this.cookieOptions(),
      expires: result.refreshTokenExpiresAt,
    });
  }
}
