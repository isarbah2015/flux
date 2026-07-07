/**
 * Seeds the `screenshots` table with rich demo data for local development.
 *
 * Usage:
 *   USER_ID=local-dev pnpm --filter @workspace/api-server run seed
 *   USER_ID=<firebase-uid> pnpm --filter @workspace/api-server run seed
 *
 * Idempotent: skips if the user already has screenshots.
 */
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const USER_ID = process.env.USER_ID ?? "local-dev";

if (!DATABASE_URL) {
  console.error("DATABASE_URL must be set");
  process.exit(1);
}

const day = 86400000;
const ago = (days, hours = 12) =>
  new Date(Date.now() - days * day - hours * 3600000).toISOString();

const DEMO = [
  {
    category: "shopping",
    colorHex: "#FF9F0A",
    summary: "Nike Air Max 90 — price dropped $30",
    extractedText:
      "Nike Air Max 90\nMen's Shoes\nWas $129.99  Now $99.99\nFree shipping over $50\nnike.com",
    tags: ["nike", "shoes", "sale"],
    metadata: {
      priceTracking: {
        productName: "Nike Air Max 90",
        detectedPrice: "$129.99",
        currentPrice: "$99.99",
        retailer: "Nike",
        priceDropped: true,
      },
    },
    capturedAt: ago(1, 3),
  },
  {
    category: "travel",
    colorHex: "#00D4FF",
    summary: "Flight AA 1842 — SFO → JFK, Mar 15",
    extractedText:
      "American Airlines\nFlight AA 1842\nSan Francisco (SFO) → New York (JFK)\nMarch 15, 2026 · 8:45 AM\nConfirmation: ABC123",
    tags: ["flight", "american", "sfo", "jfk"],
    metadata: {
      calendarEvent: {
        title: "Flight AA 1842 to NYC",
        date: "2026-03-15",
        time: "8:45 AM",
        location: "SFO Terminal 2",
      },
    },
    capturedAt: ago(2, 5),
  },
  {
    category: "conversation",
    colorHex: "#FF375F",
    summary: "Alex promised to send the contract by Friday",
    extractedText:
      "Alex Chen\nHey! I'll get the signed contract over to you by Friday EOD. Sorry for the delay!\n10:42 AM",
    tags: ["contract", "alex", "follow-up"],
    metadata: {
      promise: {
        from: "Alex Chen",
        content: "Send signed contract",
        deadline: "Friday EOD",
        followUpDate: new Date(Date.now() + 2 * day).toISOString().slice(0, 10),
      },
    },
    capturedAt: ago(0, 8),
  },
  {
    category: "receipt",
    colorHex: "#30D158",
    summary: "Whole Foods — $47.82 groceries",
    extractedText:
      "Whole Foods Market\n123 Market St\nSubtotal: $44.50\nTax: $3.32\nTotal: $47.82\nVisa •••• 4242",
    tags: ["groceries", "whole-foods", "receipt"],
    metadata: {},
    capturedAt: ago(3, 1),
  },
  {
    category: "work",
    colorHex: "#7C72FF",
    summary: "Q1 roadmap review — Tuesday 2pm",
    extractedText:
      "Google Calendar\nQ1 Roadmap Review\nTuesday, Mar 11 · 2:00 – 3:00 PM\nZoom link: zoom.us/j/123456789",
    tags: ["meeting", "roadmap", "q1"],
    metadata: {
      calendarEvent: {
        title: "Q1 Roadmap Review",
        date: "2026-03-11",
        time: "2:00 PM",
        location: "Zoom",
      },
    },
    capturedAt: ago(4, 6),
  },
  {
    category: "shopping",
    colorHex: "#FF9F0A",
    summary: "Sony WH-1000XM5 — watching price",
    extractedText:
      "Sony WH-1000XM5\nWireless Noise Canceling Headphones\n$348.00\nBest Buy\n4.8 stars (2,341 reviews)",
    tags: ["sony", "headphones", "best-buy"],
    metadata: {
      priceTracking: {
        productName: "Sony WH-1000XM5",
        detectedPrice: "$348.00",
        currentPrice: "$348.00",
        retailer: "Best Buy",
        priceDropped: false,
      },
    },
    capturedAt: ago(5, 2),
  },
  {
    category: "travel",
    colorHex: "#00D4FF",
    summary: "Airbnb in Lisbon — Apr 2–9",
    extractedText:
      "Airbnb\nCharming apartment in Alfama\nLisbon, Portugal\nApr 2 – Apr 9, 2026\n$89/night · $623 total\nConfirmation: HM8K2X9P",
    tags: ["airbnb", "lisbon", "portugal"],
    metadata: {
      calendarEvent: {
        title: "Lisbon trip — Alfama apartment",
        date: "2026-04-02",
        location: "Alfama, Lisbon",
      },
    },
    capturedAt: ago(6, 4),
  },
  {
    category: "conversation",
    colorHex: "#FF375F",
    summary: "Mom: dinner Sunday at 6?",
    extractedText:
      "Mom\nHi sweetie! Can you come for dinner this Sunday? Dad is making his famous lasagna 🍝\n6 PM?\nYesterday",
    tags: ["family", "dinner", "sunday"],
    metadata: {
      calendarEvent: {
        title: "Dinner at Mom's",
        date: new Date(Date.now() + 3 * day).toISOString().slice(0, 10),
        time: "6:00 PM",
      },
    },
    capturedAt: ago(1, 10),
  },
  {
    category: "receipt",
    colorHex: "#30D158",
    summary: "Uber ride — $24.50 to airport",
    extractedText:
      "Uber\nTrip to SFO International Airport\nMar 1, 2026 · 5:12 AM\n$24.50\nThank you for riding!",
    tags: ["uber", "airport", "transport"],
    metadata: {},
    capturedAt: ago(7, 8),
  },
  {
    category: "work",
    colorHex: "#7C72FF",
    summary: "Slack: design review feedback from Sarah",
    extractedText:
      "#design-reviews\nSarah Kim\nThe new onboarding flow looks great! Two small notes:\n1. Increase contrast on the CTA\n2. Add loading state to import\nCan we sync tomorrow?",
    tags: ["slack", "design", "feedback"],
    metadata: {
      promise: {
        from: "Sarah Kim",
        content: "Sync on design feedback",
        deadline: "Tomorrow",
        followUpDate: new Date(Date.now() + 1 * day).toISOString().slice(0, 10),
      },
    },
    capturedAt: ago(0, 2),
  },
] ;

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  try {
    const existing = await pool.query(
      "SELECT count(*)::int AS n FROM screenshots WHERE user_id = $1",
      [USER_ID],
    );
    const count = existing.rows[0]?.n ?? 0;
    if (count > 0) {
      console.log(`User "${USER_ID}" already has ${count} screenshot(s) — skipping seed.`);
      return;
    }

    for (const row of DEMO) {
      await pool.query(
        `INSERT INTO screenshots
          (user_id, image_uri, category, extracted_text, summary, tags, color_hex, metadata, captured_at)
         VALUES ($1, NULL, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8::timestamptz)`,
        [
          USER_ID,
          row.category,
          row.extractedText,
          row.summary,
          JSON.stringify(row.tags),
          row.colorHex,
          JSON.stringify(row.metadata),
          row.capturedAt,
        ],
      );
    }

    console.log(`Seeded ${DEMO.length} demo screenshots for user "${USER_ID}".`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
