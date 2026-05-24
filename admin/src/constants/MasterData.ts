import type { MasterDataManifest } from '@/types/MasterDataManifest';

export const DEFAULT_MASTER_DATA_MANIFEST: MasterDataManifest = {
  localization: {
    lastUpdated: new Date().toISOString(),
    version: 0,
  },
};
