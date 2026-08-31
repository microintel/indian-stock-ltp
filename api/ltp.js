export default async function handler(req, res) {
  const symbol = String(req.query.symbol || "")
    .trim()
    .toUpperCase();

  if (!symbol) {
    return res.status(400).json({
      error: "Stock symbol is required"
    });
  }

  const yahooSymbol = `${symbol}.NS`;

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1m`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({
        error: "Yahoo Finance request failed",
        status: response.status
      });
    }

    const data = await response.json();

    const result = data?.chart?.result?.[0];

    if (!result) {
      return res.status(404).json({
        error: `Stock not found: ${symbol}`
      });
    }

    const ltp = result.meta?.regularMarketPrice;

    if (typeof ltp !== "number") {
      return res.status(404).json({
        error: "LTP unavailable"
      });
    }

    return res.status(200).json({
      symbol,
      yahooSymbol,
      ltp
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Unable to fetch Yahoo Finance data"
    });
  }
}