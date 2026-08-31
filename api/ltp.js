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
  const symbol = String(req.query.symbol || "")
    .trim()
    .toUpperCase();

  if (!symbol) {
    return res.status(400).json({
      error: "Stock symbol is required"
    });
  }

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
    return res.status(200).json({
      symbol,
      yahooSymbol,
      ltp
    });

  } catch (error) {

    console.error("LTP API Error:", error);

    return res.status(500).json({
      error: "Unable to fetch Yahoo Finance data"
    });
  }
}
