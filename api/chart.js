export default async function handler(req, res) {

  // ==============================
  // CORS - restrict to allowed domains only
  // Add every domain that should be allowed to call this API here.
  // ==============================
  const allowedOrigins = [
    "https://microintel.github.io",
    "http://192.0.0.4:8080"
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  // If origin isn't in the list, no ACAO header is set,
  // so the browser blocks the response client-side.

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  // Browser CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Extra server-side guard: block disallowed origins outright
  // (belt-and-suspenders — protects non-browser requests too,
  // e.g. curl/Postman/server-to-server, which ignore CORS headers)
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      error: "Origin not allowed"
    });
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
  // Optional query params
  // range: 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max (default 1y)
  // interval: 1m,2m,5m,15m,30m,60m,1d,1wk,1mo (default 1d)
  // Yahoo restricts intraday intervals (1m-30m) to short ranges only,
  // so for a full year, daily interval is what actually works.
  // ==============================
  const range = String(req.query.range || "1y").trim();
  const interval = String(req.query.interval || "1d").trim();

  // ==============================
  // Yahoo Finance symbol
  // ==============================
  const yahooSymbol = `${symbol}.NS`;

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/` +
    `${encodeURIComponent(yahooSymbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;

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

    const meta = result.meta || {};
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    if (timestamps.length === 0) {
      return res.status(404).json({
        error: "No historical data available"
      });
    }

    // ==============================
    // Build a clean array: one entry per data point
    // Skip entries where close is null (non-trading gaps)
    // ==============================
    const history = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        close: quote.close?.[i] ?? null
      }))
      .filter(point => point.close !== null);

    // ==============================
    // Beginning -> current summary
    // ==============================
    const first = history[0];
    const last = history[history.length - 1];

    const change =
      first && last ? Number((last.close - first.close).toFixed(2)) : null;
    const changePercent =
      first && last && first.close !== 0
        ? Number((((last.close - first.close) / first.close) * 100).toFixed(2))
        : null;

    // ==============================
    // Return response
    // ==============================
    return res.status(200).json({
      symbol,
      yahooSymbol,
      range,
      interval,
      currency: meta.currency ?? null,
      ltp: meta.regularMarketPrice ?? null,
      points: history.length,
      startDate: first?.date ?? null,
      endDate: last?.date ?? null,
      startPrice: first?.close ?? null,
      currentPrice: last?.close ?? null,
      change,
      changePercent,
      history
    });

  } catch (error) {

    console.error("Chart API Error:", error);

    return res.status(500).json({
      error: "Unable to fetch Yahoo Finance data"
    });
  }
}

