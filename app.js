const symbolInput = document.getElementById("symbolInput");
const getPriceBtn = document.getElementById("getPriceBtn");

const symbolElement = document.getElementById("symbol");
const priceElement = document.getElementById("price");
const statusElement = document.getElementById("status");

async function getLTP() {

const symbol = symbolInput.value.trim().toUpperCase();

if (!symbol) {
statusElement.textContent = "Enter a stock symbol";
return;
}

symbolElement.textContent = symbol;
priceElement.textContent = "₹--";
statusElement.textContent = "Loading...";
getPriceBtn.disabled = true;

try {

const response = await fetch(
  `/api/ltp?symbol=${encodeURIComponent(symbol)}`
);

const data = await response.json();

if (!response.ok) {
  throw new Error(data.error || "Request failed");
}

priceElement.textContent =
  "₹" + Number(data.ltp).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

statusElement.textContent =
  "NSE • Last Traded Price";

} catch (error) {

console.error(error);

priceElement.textContent = "₹--";

statusElement.textContent =
  error.message || "Failed to fetch price";

} finally {

getPriceBtn.disabled = false;

}
}

getPriceBtn.addEventListener("click", getLTP);

symbolInput.addEventListener("keydown", function(event) {

if (event.key === "Enter") {
getLTP();
}

});