import {
  Body,
  Controller,
  Get,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { LoyaltyService } from '../application/loyalty.service.js';
import { PointsEquivalenceResponseDto } from './dto/points-equivalence-response.dto.js';
import { SetPointsEquivalenceDto } from './dto/set-points-equivalence.dto.js';
import { AdminRoleGuard } from './guards/admin-role.guard.js';
import { LoyaltyExceptionFilter } from './filters/loyalty-exception.filter.js';

@Controller('loyalty/configuration/points-equivalence')
@UseGuards(AdminRoleGuard)
@UseFilters(LoyaltyExceptionFilter)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get()
  async getCurrent(): Promise<PointsEquivalenceResponseDto> {
    const configuration =
      await this.loyaltyService.getCurrentPointsEquivalence();
    return PointsEquivalenceResponseDto.fromDomain(configuration);
  }

  @Put()
  async set(
    @Body() dto: SetPointsEquivalenceDto,
  ): Promise<PointsEquivalenceResponseDto> {
    const configuration = await this.loyaltyService.setPointsEquivalence({
      baseAmount: dto.baseAmount,
      pointsAwarded: dto.pointsAwarded,
    });
    return PointsEquivalenceResponseDto.fromDomain(configuration);
  }
}
