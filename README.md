# Indian Stock LTP API

A lightweight API for looking up Indian stock last-traded prices (LTP), company details, and company logos. Logo assets are hosted in this repository on GitHub, and the API can be deployed with Vercel.

- **GitHub repository:** https://github.com/microintel/indian-stock-ltp
- **Live API:** https://indian-stock-ltp.vercel.app/

## Features

- Retrieve stock LTP using a supported ticker symbol.
- Request additional company details, including the company name and logo URL (where metadata is available).
- Resolve a logo through the API or use its direct GitHub raw URL.
- Keep logo hosting in your own GitHub repository without requiring an environment variable for the logo base URL.
- Deploy the API using Vercel.

> **Note:** Quote availability and symbol formats depend on the existing price-data provider and the API implementation. A logo being available for a BSE-listed company does not by itself guarantee that the LTP provider supports its quote symbol.

## Quick start: use the live API

Replace `RELIANCE` in the examples with a supported ticker symbol.

### 1. Get LTP

```http
GET https://indian-stock-ltp.vercel.app/api/ltp?symbol=RELIANCE
```

Open in a browser:

https://indian-stock-ltp.vercel.app/api/ltp?symbol=RELIANCE

This returns the existing LTP response format. The exact fields depend on the deployed API version.

### 2. Get LTP plus company details

```http
GET https://indian-stock-ltp.vercel.app/api/ltp?symbol=RELIANCE&details=1
```

This requests the extended response, including company details and a logo URL when matching metadata is available.

### 3. Get logo information

```http
GET https://indian-stock-ltp.vercel.app/api/logo?symbol=RELIANCE&json=1
```

This returns logo metadata as JSON when a matching logo is found.

### 4. Get the logo through the API

```http
GET https://indian-stock-ltp.vercel.app/api/logo?symbol=RELIANCE
```

This endpoint serves or redirects to the matching logo, depending on the deployed implementation.

## Use the API in JavaScript

```js
async function getStock(symbol) {
  const url = new URL(
    "https://indian-stock-ltp.vercel.app/api/ltp"
  );
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("details", "1");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Stock API request failed: ${response.status}`);
  }

  return response.json();
}

getStock("RELIANCE")
  .then((stock) => console.log(stock))
  .catch(console.error);
```

Use the returned field names from the actual API response in your application. A typical UI can display the company name, LTP, and logo URL if those fields are present.

## Logo hosting on GitHub

The logo base URL for this repository is:

```text
https://raw.githubusercontent.com/microintel/indian-stock-ltp/main/logos
```

For example, if a file exists at `logos/nse/NSE_RELIANCE.svg`, its direct URL is:

```text
https://raw.githubusercontent.com/microintel/indian-stock-ltp/main/logos/nse/NSE_RELIANCE.svg
```

The example path is illustrative: use the exact filename and capitalization in the repository. GitHub raw URLs are case-sensitive.

### Logo folder and metadata

Keep the existing folder structure and metadata file intact. Do not rename directories or logo files unless you also update the metadata or lookup code that refers to them.

To add or update logos:

1. Open the repository's `logos/` folder.
2. Upload the image into the correct existing exchange/company subfolder.
3. Update the metadata file if the API uses it to map symbols or company names to image paths.
4. Commit the changes to the `main` branch.
5. Check the raw GitHub URL in a browser and then test the Vercel API.

Make sure every metadata path matches the actual file path exactly. Prefer stable, descriptive filenames and avoid duplicate mappings for the same symbol.

## Deploy or update with Vercel

1. Sign in to Vercel and open the project connected to `microintel/indian-stock-ltp`.
2. Ensure the project is linked to the correct GitHub repository and the `main` branch.
3. Push your code changes to `main`; Vercel should deploy automatically if Git integration is enabled.
4. Wait for the deployment to finish successfully.
5. Test the endpoints listed above.

The logo base URL is configured directly in code for this repository, so **no environment variable is required** for that URL.

If you fork the repository or rename it, update the hard-coded raw GitHub base URL in the API code to match your new owner, repository, and branch.

## Troubleshooting

- **Logo is missing:** Confirm the file exists under `logos/`, check capitalization, and open its raw GitHub URL directly.
- **Wrong logo appears:** Check the symbol/company mapping in the metadata file and remove conflicting mappings.
- **LTP is missing:** Confirm the symbol is supported by the existing quote provider and inspect the API response for an error.
- **Vercel returns 404:** Confirm the endpoint file exists under `api/` and that the latest deployment succeeded.
- **Changes are not visible:** Confirm the commit reached the deployed branch and wait for Vercel to finish building.
- **BSE symbol does not return a price:** Logo metadata and price-provider symbol support are separate. Check the provider's expected symbol format before changing the existing LTP logic.

## API reference

| Endpoint | Purpose |
|---|---|
| `/api/ltp?symbol=RELIANCE` | Existing LTP response |
| `/api/ltp?symbol=RELIANCE&details=1` | LTP with extended company details, when available |
| `/api/logo?symbol=RELIANCE&json=1` | Logo metadata as JSON |
| `/api/logo?symbol=RELIANCE` | Logo via API endpoint |

## Important notes

- This project is provided as-is; response fields and provider behavior are determined by the code deployed in the repository.
- Do not treat an LTP quote as guaranteed real-time market data without checking the underlying provider's update frequency and terms.
- Do not commit API secrets or credentials to a public repository.
