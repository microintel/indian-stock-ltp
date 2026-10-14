import stockData from "./stock-data.json" with { type: "json" };

const GITHUB_LOGOS_BASE =
  "https://raw.githubusercontent.com/microintel/indian-stock-ltp/main/logos";

function findCompany(input) {
  const value = String(input || "").trim().toUpperCase();
  if (!value) return null;

  // Exact ticker match first; prefer NSE because LTP is fetched from Yahoo's .NS ticker.
  const tickerMatches = stockData.filter(item => String(item.ticker || "").toUpperCase() === value);
  if (tickerMatches.length) {
    return tickerMatches.find(item => item.exchange === "NSE") || tickerMatches[0];
  }

  // Exact company name, then partial name match for natural company-name searches.
  const exactName = stockData.find(item =>
    String(item.company_name || "").trim().toUpperCase() === value
  );
  if (exactName) return exactName;

  const nameMatches = stockData.filter(item =>
    String(item.company_name || "").toUpperCase().includes(value)
  );
  return nameMatches.find(item => item.exchange === "NSE") || nameMatches[0] || null;
}

function githubLogoUrl(company) {
  if (!company || !company.file) return null;
  return GITHUB_LOGOS_BASE.replace(/\/+$/, "") + "/" + company.file.replace(/^\/+/, "");
}

export default async function handler(req, res) {

  // ==============================
  // CORS
  // ==============================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  // Browser CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only GET allowed
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  // ==============================
  // Get stock symbol
  // ==============================
  const searchTerm = String(req.query.symbol || req.query.company || "")
    .trim();

  if (!searchTerm) {
    return res.status(400).json({
      error: "Stock symbol is required"
    });
  }

  // Resolve either a ticker or company name through the bundled metadata.
  const company = findCompany(searchTerm);
  const symbol = company?.ticker || searchTerm.toUpperCase();

  // ==============================
  // Yahoo Finance symbol
  // ==============================
  const yahooSymbol = `${symbol}.NS`;

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/` +
    `${encodeURIComponent(yahooSymbol)}?range=1d&interval=1m`;

  try {

    // ==============================
    // Fetch Yahoo Finance
    // ==============================
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({
        error: "Yahoo Finance request failed",
        status: response.status
      });
    }

    const data = await response.json();

    // ==============================
    // Get chart result
    // ==============================
    const result = data?.chart?.result?.[0];

    if (!result) {
      return res.status(404).json({
        error: `Stock not found: ${symbol}`
      });
    }

    // ==============================
    // Get LTP
    // ==============================
    const ltp = result.meta?.regularMarketPrice;

    if (typeof ltp !== "number") {
      return res.status(404).json({
        error: "LTP unavailable"
      });
    }

    // ==============================
    // Return response
    // ==============================
    const body = {
      symbol,
      yahooSymbol,
      ltp
    };

    // Preserve the original response for ordinary ticker-only requests.
    // Company-name searches return company metadata; details=1 or logo=true
    // opts ticker searches into the same expanded response.
    const logoFlag = String(req.query.logo || "").toLowerCase();
    const wantsDetails =
      Boolean(company && searchTerm.toUpperCase() !== symbol.toUpperCase()) ||
      String(req.query.details || "") === "1" ||
      logoFlag === "true" ||
      logoFlag === "1";

    if (wantsDetails) {
      const proto = req.headers["x-forwarded-proto"] || "https";
      body.companyName = company?.company_name || symbol;
      body.exchange = company?.exchange || "NSE";
      body.isin = company?.isin || null;
      body.logo = company
        ? githubLogoUrl(company)
        : `${proto}://${req.headers.host}/api/logo?symbol=${encodeURIComponent(symbol)}`;
    }

    return res.status(200).json(body);

  } catch (error) {

    console.error("LTP API Error:", error);

    return res.status(500).json({
      error: "Unable to fetch Yahoo Finance data"
    });
  }
}
