import {MEXICO_REGION_CONFIG, type RegionConfig} from '#/lib/constants/mexico'

/**
 * Returns the geographic region configuration for the current deployment.
 * For now PARA is Mexico-only; future iterations can switch on locale or
 * server config.
 */
export function useRegionConfig(): RegionConfig {
  return MEXICO_REGION_CONFIG
}
