# Gold Rate APIs — India / Tamil Nadu

## Context

The shop's primary workflow is **manual rate entry**. The market rate and booked rate are entered by the owner or staff each day. API data is supplementary — it pre-fills the rate field as a suggestion that the user can override.

Gold rates in Tamil Nadu follow:
- **IBJA (India Bullion and Jewellers Association)** — The official reference for the trade
- **MCX (Multi Commodity Exchange)** — Futures market; spot price reference
- Local variation: Chennai gold rates may differ from national rates by ₹5–50/g

---

## Recommended Free APIs

### 1. GoldAPI.io (Best for INR)

**URL:** https://www.goldapi.io

**Free plan:** 100 requests/month (plenty for daily-fetch use)

**Endpoint:**
```
GET https://www.goldapi.io/api/XAU/INR
Headers:
  x-access-token: YOUR_API_KEY
  Content-Type: application/json
```

**Response:**
```json
{
  "price": 74245.50,        // XAU/INR spot price (per troy oz)
  "price_gram_24k": 2387.23, // ← use this — price per gram 24K
  "price_gram_22k": 2188.29,
  "price_gram_18k": 1790.42,
  "timestamp": 1717200000,
  "currency": "INR"
}
```

**Usage in app:**
```js
// server/src/services/goldRate.service.js
export async function fetchGoldRateINR() {
  const response = await fetch('https://www.goldapi.io/api/XAU/INR', {
    headers: {
      'x-access-token': process.env.GOLDAPI_KEY,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return {
    marketRate24K: data.price_gram_24k,
    marketRate22K: data.price_gram_22k,
    source: 'goldapi.io',
    fetchedAt: new Date(),
  };
}
```

**Sign up:** https://www.goldapi.io (email signup, instant key)

---

### 2. MetalPriceAPI.com (Good backup, 100 req/day free)

**URL:** https://metalpriceapi.com

**Free plan:** 100 req/day, INR supported

**Endpoint:**
```
GET https://api.metalpriceapi.com/v1/latest?api_key=YOUR_KEY&base=XAU&currencies=INR
```

**Response:**
```json
{
  "success": true,
  "base": "XAU",
  "rates": {
    "INR": 74200.00    // per troy oz (divide by 31.1035 for per gram)
  }
}
```

**Convert to per gram:**
```js
const pricePerGram = rates.INR / 31.1035;
```

---

### 3. Open Exchange Rates + XAU Conversion (USD base)

If you have USD/XAU rate + USD/INR rate:
```
Price (INR/g) = (USD per troy oz ÷ 31.1035) × USD→INR rate
```

Less elegant but works with free tiers that only do fiat currencies.

---

### 4. Metals.live (No key needed — limited)

```
GET https://api.metals.live/v1/spot/gold
```
Returns USD only. Combine with exchange rate for INR.

---

## Integration Pattern

Fetch once per day (morning, when staff sets rate). Cache in `rate_entries` table. Don't hammer the API.

```js
// server/src/routes/rates.routes.js
// GET /api/rates/fetch-live — STAFF/OWNER can call to pre-fill rate
router.get('/fetch-live',
  authenticate,
  requireRole(['OWNER', 'STAFF']),
  asyncHandler(async (req, res) => {
    const rate = await goldRateService.fetchGoldRateINR();
    if (!rate) {
      return res.json({
        success: false,
        error: { code: 'RATE_FETCH_FAILED', message: 'Could not fetch live rate. Enter manually.' }
      });
    }
    // Return the rate suggestion — do NOT auto-save it
    res.json({ success: true, data: { suggestedRate: rate.marketRate24K, source: rate.source } });
  })
);
```

**UI behavior:**
- When user opens Rate Entry panel, a small "[Fetch Live Rate]" link appears
- Click → shows spinner → fills rate field with API value + shows source + timestamp
- User can accept or change the pre-filled value before saving
- Saving always goes through the normal POST /api/rates endpoint

---

## Fallback Strategy

```
1. Try GoldAPI.io
2. If fails → try MetalPriceAPI.com
3. If both fail → return null, show: "Live rate unavailable. Enter manually."
```

Fallback is graceful — manual entry is always the primary path.

---

## IBJA Rate (Manual Reference)

IBJA publishes rates at https://ibja.co/IBJA_Rates.aspx daily (morning). No official public API.

For Tamil Nadu context, staff typically checks:
- IBJA website (morning rate)
- Local WhatsApp gold trader groups
- MCX app (live spot)

The app doesn't need to scrape these. Just let staff enter the agreed rate. The API fetch is a convenience, not a requirement.

---

## Rate Caching in App

```js
// Don't re-fetch if today's rate is already set
// GET /api/rates/today → if not null, use it to pre-fill form
// Only fetch live if today's rate is null
```

---

## API Keys Management

Store in Railway env vars (server only):
```
GOLDAPI_KEY=your_key_here
METAL_PRICE_API_KEY=your_key_here
```

Never expose in client environment variables. API calls happen server-side only via `/api/rates/fetch-live`.
