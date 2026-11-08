import { IsIn, IsOptional } from 'class-validator';
import { CATALOG_FILTERS, type CatalogFilter } from '../../../rewards/domain/catalog.js';

// GET /customers/me/recompensas (§3.5.1). Mensajes por defecto de class-validator, como el resto de
// los query params (el contrato no los cita).
export class CatalogQueryDto {
  @IsOptional()
  @IsIn(CATALOG_FILTERS)
  filter: CatalogFilter = 'ALL';
}
