import { getAllLocalScreenshotRows, insertLocalScreenshot } from '@/lib/local-db';
import { notifyPriceDrop } from '@/lib/notifications';
import { parsePriceAmount } from '@/lib/text-metadata';
import { recordSavingsUsd } from '@/lib/app-analytics';
import { scanAllForPriceDrops } from '@/lib/price-watch';

/** Foreground price-watch scan — compares shopping screenshots on-device. */
export async function runPriceWatchScan(): Promise<number> {
  const rows = await getAllLocalScreenshotRows();
  const { updated, alerts } = scanAllForPriceDrops(rows);

  for (const row of updated) {
    await insertLocalScreenshot(row);
  }

  for (const alert of alerts) {
    await notifyPriceDrop(alert);
    const oldAmt = parsePriceAmount(alert.oldPrice);
    const newAmt = parsePriceAmount(alert.newPrice);
    if (oldAmt != null && newAmt != null && oldAmt > newAmt) {
      await recordSavingsUsd(oldAmt - newAmt);
    }
  }

  return alerts.length;
}
