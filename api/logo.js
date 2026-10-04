// ==============================
// GET /api/logo?symbol=RELIANCE
//
// Returns the company logo IMAGE directly, so it can be used as:
//   <img src="https://your-app.vercel.app/api/logo?symbol=RELIANCE">
//
// Optional:
//   &json=1   -> returns { symbol, source, logo } instead of the image
//
// Lookup order (same as the Stock Logo page):
//   1. AnyLogo   2. Indian logo database   3. DiceBear initials fallback
// ==============================

const INDIAN_LOGO_BASE =
  "https://dharunashokkumar.github.io/indian-listed-company-logos/";

const DICEBEAR_BASE =
  "https://api.dicebear.com/10.x/initials/svg?seed=";

// Cache the Indian logo database in memory between warm invocations
let logoDbCache = null;
let logoDbTime = 0;
const LOGO_DB_TTL = 6 * 60 * 60 * 1000; // 6 hours

async function getLogoDb() {
  if (logoDbCache && Date.now() - logoDbTime < LOGO_DB_TTL) {
    return logoDbCache;
  }
  const response = await fetch(`${INDIAN_LOGO_BASE}data/logos.json`);
  if (!response.ok) throw new Error("Indian logo database unavailable");
  const data = await response.json();
  logoDbCache = data;
  logoDbTime = Date.now();
  return data;
}

// Returns { source, url } for the best logo found
async function resolveLogo(symbol) {

  // 1. AnyLogo
  try {
    const check = await fetch(
      `https://api.anylogo.dev/ticker/${encodeURIComponent(symbol)}?json=1`
    );
    if (check.ok) {
      return {
        source: "anylogo",
        url: `https://img.anylogo.dev/ticker/${encodeURIComponent(symbol)}`
      };
    }
  } catch (error) {
    console.log("AnyLogo failed:", error.message);
  }

  // 2. Indian logo database
  try {
    const data = await getLogoDb();
    const company = (data.logos || []).find(
      item => item.ticker && item.ticker.toUpperCase() === symbol
    );
    if (company) {
      return {
        source: "indian-logo-db",
        url: new URL(company.file, INDIAN_LOGO_BASE).href
      };
    }
  } catch (error) {
    console.log("Indian logo search failed:", error.message);
  }

  // 3. DiceBear fallback
  return {
    source: "dicebear",
    url: DICEBEAR_BASE + encodeURIComponent(symbol)
  };
}

export default async function handler(req, res) {

  // ==============================
  // CORS
  // ==============================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ==============================
  // Get stock symbol
  // ==============================
  const symbol = String(req.query.symbol || "")
    .trim()
    .toUpperCase();

  if (!symbol) {
    return res.status(400).json({ error: "Stock symbol is required" });
  }

  try {

    let logo = await resolveLogo(symbol);

    // ==============================
    // JSON mode: return the URL only
    // ==============================
    if (String(req.query.json || "") === "1") {
      return res.status(200).json({
        symbol,
        source: logo.source,
        logo: logo.url
      });
    }

    // ==============================
    // Image mode: fetch and send bytes
    // ==============================
    let imageResponse = await fetch(logo.url);

    // If the chosen source's image fails, fall back to DiceBear
    if (!imageResponse.ok && logo.source !== "dicebear") {
      logo = {
        source: "dicebear",
        url: DICEBEAR_BASE + encodeURIComponent(symbol)
      };
      imageResponse = await fetch(logo.url);
    }

    if (!imageResponse.ok) {
      return res.status(502).json({ error: "Unable to fetch logo image" });
    }

    const contentType =
      imageResponse.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Logo-Source", logo.source);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800"
    );

    return res.status(200).send(buffer);

  } catch (error) {

    console.error("Logo API Error:", error);

    return res.status(500).json({ error: "Unable to fetch logo" });
  }
}
