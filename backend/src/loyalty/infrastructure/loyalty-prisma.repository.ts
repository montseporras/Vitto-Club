import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type LoyaltyProgramConfiguration as PrismaConfig,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PointsEquivalence } from '../domain/points-equivalence.js';
import { PointsValidity } from '../domain/points-validity.js';
import { DEFAULT_POINTS_EXPIRATION_MONTHS } from '../domain/points-validity.js';
import { LoyaltyConfigurationRepository } from '../domain/port/loyalty-configuration.repository.js';
import {
  FirstPurchaseBonus,
  FirstPurchaseBonusType,
} from '../domain/first-purchase-bonus.js';
import {
  LoyaltyProgramConfiguration,
  LoyaltyProgramConfigurationData,
  LoyaltyProgramConfigurationInput,
} from '../domain/loyalty-program-configuration.js';

function toBonusType(value: string): FirstPurchaseBonusType {
  if (value === 'PERCENTAGE' || value === 'FIXED_AMOUNT') {
    return value;
  }
  throw new Error(
    `Unsupported first purchase bonus type returned by Prisma: ${value}`,
  );
}

function toDomain(record: PrismaConfig): LoyaltyProgramConfiguration {
  return LoyaltyProgramConfiguration.define({
    version: record.version,
    baseAmount: record.baseAmount?.toNumber() ?? null,
    pointsAwarded: record.pointsAwarded,
    pointsExpirationMonths: record.pointsExpirationMonths,
    bonusType: record.bonusType ? toBonusType(record.bonusType) : null,
    bonusValue: record.bonusValue?.toNumber() ?? null,
    isActive: record.isActive,
    validFrom: record.validFrom,
    validTo: record.validTo,
    createdAt: record.createdAt,
  });
}

@Injectable()
export class LoyaltyPrismaRepository implements LoyaltyConfigurationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async savePointsEquivalence(
    configuration: PointsEquivalence,
  ): Promise<PointsEquivalence> {
    const saved = await this.updatePartialConfig({
      baseAmount: configuration.getBaseAmount(),
      pointsAwarded: configuration.getPointsAwarded(),
    });
    return PointsEquivalence.reconstruct({
      baseAmount: saved.getBaseAmount()!,
      pointsAwarded: saved.getPointsAwarded()!,
      updatedAt: saved.getCreatedAt(),
    });
  }

  async findCurrentPointsEquivalence(): Promise<PointsEquivalence | null> {
    const active = await this.findActiveConfig();
    if (!active) {
      return null;
    }
    const baseAmount = active.getBaseAmount();
    const pointsAwarded = active.getPointsAwarded();
    if (baseAmount === null || pointsAwarded === null) {
      return null;
    }
    return PointsEquivalence.reconstruct({
      baseAmount,
      pointsAwarded,
      updatedAt: active.getCreatedAt(),
    });
  }

  async savePointsValidity(validity: PointsValidity): Promise<PointsValidity> {
    const saved = await this.updatePartialConfig({
      pointsExpirationMonths: validity.getPointsExpirationMonths(),
    });
    return PointsValidity.reconstruct({
      pointsExpirationMonths: saved.getPointsExpirationMonths(),
      updatedAt: saved.getCreatedAt(),
    });
  }

  async findCurrentPointsValidity(): Promise<PointsValidity> {
    const active = await this.findActiveConfig();
    return PointsValidity.reconstruct({
      pointsExpirationMonths:
        active?.getPointsExpirationMonths() ?? DEFAULT_POINTS_EXPIRATION_MONTHS,
      updatedAt: active?.getCreatedAt() ?? null,
    });
  }

  async saveFirstPurchaseBonus(
    bonus: FirstPurchaseBonus,
  ): Promise<FirstPurchaseBonus> {
    const saved = await this.updatePartialConfig({
      bonusType: bonus.getBonusType(),
      bonusValue: bonus.getBonusValue(),
    });
    return FirstPurchaseBonus.reconstruct({
      bonusType: saved.getBonusType()!,
      bonusValue: saved.getBonusValue()!,
      updatedAt: saved.getCreatedAt(),
    });
  }

  async findCurrentFirstPurchaseBonus(): Promise<FirstPurchaseBonus | null> {
    const active = await this.findActiveConfig();
    if (!active) {
      return null;
    }
    const bonusType = active.getBonusType();
    const bonusValue = active.getBonusValue();
    return bonusType !== null && bonusValue !== null
      ? FirstPurchaseBonus.reconstruct({
          bonusType,
          bonusValue,
          updatedAt: active.getCreatedAt(),
        })
      : null;
  }

  async getActiveConfig(): Promise<LoyaltyProgramConfiguration> {
    const configuration = await this.findActiveConfig();
    if (!configuration) {
      throw new Error('No active loyalty program configuration exists');
    }
    return configuration;
  }

  private async findActiveConfig(): Promise<LoyaltyProgramConfiguration | null> {
    const record = await this.prisma.loyaltyProgramConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });
    return record ? toDomain(record) : null;
  }

  async saveNewConfigVersion(
    configuration: LoyaltyProgramConfigurationData,
  ): Promise<LoyaltyProgramConfiguration> {
    return await this.prisma.$transaction(async (transaction) => {
      const current = await this.lockAndGetActiveConfig(transaction);
      return await this.persistNewVersion(transaction, current, configuration);
    });
  }

  async updateFullConfig(
    configuration: LoyaltyProgramConfigurationInput,
  ): Promise<LoyaltyProgramConfiguration> {
    return await this.prisma.$transaction(async (transaction) => {
      const current = await this.lockAndGetActiveConfig(transaction);
      const next = LoyaltyProgramConfiguration.createNextVersion(
        current,
        configuration,
      );
      next.baseAmount = configuration.baseAmount;
      next.pointsAwarded = configuration.pointsAwarded;
      next.pointsExpirationMonths = configuration.pointsExpirationMonths;
      next.bonusType = configuration.bonusType;
      next.bonusValue = configuration.bonusValue;
      return await this.persistNewVersion(transaction, current, next);
    });
  }

  private async updatePartialConfig(
    patch: Partial<LoyaltyProgramConfigurationInput>,
  ): Promise<LoyaltyProgramConfiguration> {
    return await this.prisma.$transaction(async (transaction) => {
      const current = await this.lockAndGetActiveConfig(transaction);
      const next = LoyaltyProgramConfiguration.createNextVersion(
        current,
        patch,
      );
      return await this.persistNewVersion(transaction, current, next);
    });
  }

  private async lockAndGetActiveConfig(
    transaction: Prisma.TransactionClient,
  ): Promise<LoyaltyProgramConfiguration | null> {
    await transaction.$queryRaw`
      SELECT pg_advisory_xact_lock(761204, 1)::text AS lock_acquired
    `;
    const record = await transaction.loyaltyProgramConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });
    return record ? toDomain(record) : null;
  }

  private async persistNewVersion(
    transaction: Prisma.TransactionClient,
    current: LoyaltyProgramConfiguration | null,
    data: LoyaltyProgramConfigurationData,
  ): Promise<LoyaltyProgramConfiguration> {
    const version = (current?.getVersion() ?? 0) + 1;
    const now = new Date();

    if (current) {
      await transaction.loyaltyProgramConfiguration.update({
        where: { version: current.getVersion() },
        data: { isActive: false, validTo: now },
      });
    }

    const record = await transaction.loyaltyProgramConfiguration.create({
      data: {
        version,
        baseAmount: data.baseAmount,
        pointsAwarded: data.pointsAwarded,
        pointsExpirationMonths: data.pointsExpirationMonths,
        bonusType: data.bonusType,
        bonusValue: data.bonusValue,
        isActive: true,
        validFrom: now,
        validTo: null,
      },
    });
    return toDomain(record);
  }
}
