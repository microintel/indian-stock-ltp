import stockData from "./stock-data.json" with { type: "json" };

const GITHUB_LOGOS_BASE =
  "https://raw.githubusercontent.com/microintel/indian-stock-ltp/main/logos";

function findCompany(input) {
  const value = String(input || "").trim().toUpperCase();
  if (!value) return null;

  const tickerMatches = stockData.filter(item => String(item.ticker || "").toUpperCase() === value);
  if (tickerMatches.length) return tickerMatches.find(item => item.exchange === "NSE") || tickerMatches[0];

  const exactName = stockData.find(item => String(item.company_name || "").trim().toUpperCase() === value);
  if (exactName) return exactName;

  const nameMatches = stockData.filter(item => String(item.company_name || "").toUpperCase().includes(value));
  return nameMatches.find(item => item.exchange === "NSE") || nameMatches[0] || null;
}

function githubLogoUrl(company) {
  if (!company?.file) return null;
  return GITHUB_LOGOS_BASE.replace(/\/+$/, "") + "/" + company.file.replace(/^\/+/, "");
}

function initialsSvg(label) {
  const initials = String(label || "?")
    .trim()
    .split(/\\s+/)
    .slice(0, 2)
    .map(word => word[0] || "")
    .join("")
    .toUpperCase()
    .replace(/[<>&"']/g, "");
  const safe = initials || "?";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#e8eef7"/><text x="64" y="70" font-family="Arial,sans-serif" font-size="42" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#263b5a">${safe}</text></svg>`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const searchTerm = String(req.query.symbol || req.query.company || "").trim();
  if (!searchTerm) return res.status(400).json({ error: "Stock symbol or company name is required" });

  const company = findCompany(searchTerm);
  const symbol = company?.ticker || searchTerm.toUpperCase();
  const logo = githubLogoUrl(company);

  if (String(req.query.json || "") === "1") {
    return res.status(200).json({
      symbol,
      companyName: company?.company_name || symbol,
      exchange: company?.exchange || null,
      isin: company?.isin || null,
      source: logo ? "github" : "generated-fallback",
      logo: logo || null
    });
  }

  if (!logo || logo.includes("YOUR_GITHUB_USERNAME/YOUR_REPOSITORY")) {
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).send(initialsSvg(company?.company_name || symbol));
  }

  try {
    const imageResponse = await fetch(logo);
    if (!imageResponse.ok) {
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      return res.status(200).send(initialsSvg(company?.company_name || symbol));
    }
    const contentType = imageResponse.headers.get("content-type") || "image/svg+xml";
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Logo-Source", "github");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("GitHub logo fetch failed:", error);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    return res.status(200).send(initialsSvg(company?.company_name || symbol));
  }
}
