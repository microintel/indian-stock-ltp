export default async function handler(req, res) {

if (req.method !== "GET") {
return res.status(405).json({
error: "Method not allowed"
});
}

const symbol = String(req.query.symbol || "")
.trim()
.toUpperCase();

if (!symbol) {
return res.status(400).json({
error: "Stock symbol is required"
});
}

// Allow normal NSE equity symbols only.
// Example: RELIANCE, TCS, INFY
if (!/^[A-Z0-9&.-]+$/.test(symbol)) {
return res.status(400).json({
error: "Invalid stock symbol"
});
}

const nseUrl =
"https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}";

try {

const response = await fetch(nseUrl, {
  method: "GET",

  headers: {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36"
  }
});

const text = await response.text();

if (!response.ok) {

  return res.status(502).json({
    error: "NSE request failed",
    status: response.status
  });

}

let data;

try {
  data = JSON.parse(text);
} catch {

  return res.status(502).json({
    error: "NSE returned non-JSON data"
  });

}

const ltp = data?.priceInfo?.lastPrice;

if (
  typeof ltp !== "number" &&
  typeof ltp !== "string"
) {

  return res.status(404).json({
    error: `LTP not found for ${symbol}`
  });

}

return res.status(200).json({
  symbol: symbol,
  ltp: Number(ltp)
});

} catch (error) {

console.error("NSE ERROR:", error);

return res.status(500).json({
  error: "Unable to fetch stock price"
});

}
}