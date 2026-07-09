import type { PriceTracking } from '@/lib/on-device-classifier';
import type { LocalScreenshotRow } from '@/lib/local-db';
import { normalizeProductKey, parsePriceAmount } from '@/lib/text-metadata';

export interface PriceDropAlert {
  screenshotId: string;
  productName: string;
  oldPrice: string;
  newPrice: string;
  retailer: string;
}

function similarity(a: string, b: string): number {
  const wa = new Set(a.split(' ').filter((w) => w.length > 2));
  const wb = new Set(b.split(' ').filter((w) => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return a === b ? 1 : 0;
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  return overlap / Math.max(wa.size, wb.size);
}

/** Compare a new shopping item against prior watches — detect price drops on-device. */
export function reconcilePriceTracking(
  row: LocalScreenshotRow,
  allRows: LocalScreenshotRow[],
): { metadata: LocalScreenshotRow['metadata']; alerts: PriceDropAlert[] } {
  const pt = row.metadata.priceTracking;
  if (!pt) return { metadata: row.metadata, alerts: [] };

  const key = normalizeProductKey(pt.productName);
  const newAmount = parsePriceAmount(pt.currentPrice);
  const alerts: PriceDropAlert[] = [];
  let best: PriceTracking = { ...pt };

  for (const other of allRows) {
    if (other.id === row.id) continue;
    const otherPt = other.metadata.priceTracking;
    if (!otherPt) continue;

    const otherKey = normalizeProductKey(otherPt.productName);
    if (similarity(key, otherKey) < 0.45) continue;

    const otherAmount = parsePriceAmount(otherPt.detectedPrice);
    const rowAmount = parsePriceAmount(pt.currentPrice);
    if (otherAmount == null || rowAmount == null) continue;

    if (rowAmount < otherAmount) {
      best = {
        productName: pt.productName || otherPt.productName,
        detectedPrice: otherPt.detectedPrice,
        currentPrice: pt.currentPrice,
        retailer: pt.retailer !== 'Unknown' ? pt.retailer : otherPt.retailer,
        priceDropped: true,
      };
      alerts.push({
        screenshotId: row.id,
        productName: best.productName,
        oldPrice: otherPt.detectedPrice,
        newPrice: pt.currentPrice,
        retailer: best.retailer,
      });
    } else if (otherAmount < rowAmount) {
      best = {
        ...pt,
        detectedPrice: pt.detectedPrice,
        currentPrice: pt.currentPrice,
        priceDropped: false,
      };
    }
  }

  if (newAmount != null && !best.priceDropped) {
    const baseline = parsePriceAmount(best.detectedPrice);
    if (baseline != null && newAmount < baseline * 0.98) {
      best = { ...best, priceDropped: true };
      alerts.push({
        screenshotId: row.id,
        productName: best.productName,
        oldPrice: best.detectedPrice,
        newPrice: best.currentPrice,
        retailer: best.retailer,
      });
    }
  }

  return {
    metadata: { ...row.metadata, priceTracking: best },
    alerts,
  };
}

/** Re-scan all local rows and refresh price-drop flags (background task). */
export function scanAllForPriceDrops(rows: LocalScreenshotRow[]): {
  updated: LocalScreenshotRow[];
  alerts: PriceDropAlert[];
} {
  const shopping = rows.filter((r) => r.metadata.priceTracking);
  const alerts: PriceDropAlert[] = [];
  const updated: LocalScreenshotRow[] = [];

  for (const row of shopping) {
    const { metadata, alerts: rowAlerts } = reconcilePriceTracking(row, shopping);
    if (JSON.stringify(metadata) !== JSON.stringify(row.metadata)) {
      updated.push({ ...row, metadata });
    }
    alerts.push(...rowAlerts);
  }

  return { updated, alerts };
}
