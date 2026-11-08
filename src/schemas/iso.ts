/**
 * Shared ISO helpers for Zod 4. Wire timestamps stay UTC with trailing Z
 * (same rule as v0.2.0+). z.iso.datetime() accepts offsets; we still reject them.
 */

import { z } from 'zod';

export const utcDateTimeSchema = z.iso.datetime().refine((value) => value.endsWith('Z'), {
  error: 'timestamp must be UTC with trailing Z',
});
