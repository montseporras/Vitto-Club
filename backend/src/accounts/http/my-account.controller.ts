import { Body, Controller, HttpCode, HttpStatus, Patch, Req, UseFilters } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { REFRESH_COOKIE, readCookie } from '../../shared/security/refresh-cookie.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { PasswordChangeService } from '../application/password-change.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { AccountsExceptionFilter } from './filters/accounts-exception.filter.js';

// Ruta en español, como /usuarios. Es del usuario autenticado, de cualquier rol (contrato §3.11.1):
// la pantalla existe solo para el Cliente, pero el endpoint no distingue. No se audita en una cuenta
// de cliente; para un empleado el contrato pide USER_ACCOUNT_UPDATED "cuando exista la pantalla".
@Controller('mi-cuenta')
@Roles('ADMIN', 'CASHIER', 'CUSTOMER')
@UseFilters(AccountsExceptionFilter)
export class MyAccountController {
  constructor(private readonly passwordChangeService: PasswordChangeService) {}

  // PATCH /api/mi-cuenta/password -> 204. La cuenta sale del token, nunca del body.
  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
  ): Promise<void> {
    await this.passwordChangeService.changeOwnPassword({
      accountId: user.accountId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
      // La cookie identifica la sesión actual, que es la que no se cierra
      currentRefreshToken: readCookie(req.headers.cookie, REFRESH_COOKIE),
    });
  }
}
