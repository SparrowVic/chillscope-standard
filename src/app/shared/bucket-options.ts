import { BUCKET_IDS, type BucketId } from '../core/data/series.catalog';
import type { SelectOption } from './controls/select-option';

export const BUCKET_OPTIONS: readonly SelectOption<BucketId>[] = BUCKET_IDS.map((id) => ({
  value: id,
  label: `bucket.${id}`,
}));
