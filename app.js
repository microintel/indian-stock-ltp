
const symbolInput = document.getElementById("symbolInput");
const getPriceBtn = document.getElementById("getPriceBtn");

const symbolElement = document.getElementById("symbol");
const priceElement = document.getElementById("price");
const changeElement = document.getElementById("change");
const statusElement = document.getElementById("status");

const rangeButtons = document.querySelectorAll(".range-btn");
const chartCanvas = document.getElementById("priceChart");

let priceChart = null;
let currentRange = "1y";
let chartJsPromise = null;

// Load Chart.js safely. If the primary CDN is unavailable,
// try a fallback CDN before rendering the chart.
function ensureChartJs() {
  if (typeof window.Chart !== "undefined") {
    return Promise.resolve(window.Chart);
  }

  if (chartJsPromise) {
    return chartJsPromise;
  }

  chartJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js";

    script.onload = () => {
      if (typeof window.Chart !== "undefined") {
        resolve(window.Chart);
      } else {
        reject(new Error("Chart.js could not initialize."));
      }
    };

    script.onerror = () => {
      // Retry using an alternative CDN.
      const fallbackScript = document.createElement("script");

      fallbackScript.src =
        "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";

      fallbackScript.onload = () => {
        if (typeof window.Chart !== "undefined") {
          resolve(window.Chart);
        } else {
          chartJsPromise = null;
          reject(new Error("Chart.js could not initialize."));
        }
      };

      fallbackScript.onerror = () => {
        chartJsPromise = null;
        reject(
          new Error(
            "Unable to load Chart.js. Check your internet connection and refresh."
          )
        );
      };

      document.head.appendChild(fallbackScript);
    };

    document.head.appendChild(script);
  });

  return chartJsPromise;
}

// Safely parse JSON responses and show useful API errors.
async function safeJson(response) {
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Invalid API response:", text.slice(0, 300));

    throw new Error(
      `Server returned an invalid response (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      (data && data.error) ||
        `Request failed with status ${response.status}.`
    );
  }

  if (data === null) {
    throw new Error(
      `Server returned an empty response (HTTP ${response.status}).`
    );
  }

  return data;
}

// Fetch the latest traded price for the entered symbol.
async function getLTP() {
  const symbol = symbolInput.value.trim().toUpperCase();

  if (!symbol) {
    statusElement.textContent = "Enter a stock symbol.";
    return;
  }

  symbolElement.textContent = symbol;
  priceElement.textContent = "₹--";
  changeElement.textContent = "";
  statusElement.textContent = "Loading stock price...";

  try {
    const response = await fetch(
      `/api/ltp?symbol=${encodeURIComponent(symbol)}`
    );

    const data = await safeJson(response);
    const ltp = Number(data.ltp);

    if (!Number.isFinite(ltp)) {
      throw new Error("The API did not return a valid stock price.");
    }

    priceElement.textContent =
      "₹" +
      ltp.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

    if (
      Number.isFinite(Number(data.change)) &&
      Number.isFinite(Number(data.changePercent))
    ) {
      const change = Number(data.change);
      const changePercent = Number(data.changePercent);
      const sign = change >= 0 ? "+" : "";

      changeElement.textContent =
        `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;

      changeElement.className =
        "change " + (change >= 0 ? "up" : "down");
    }

    statusElement.textContent = "NSE • Last Traded Price";
  } catch (error) {
    console.error("LTP error:", error);

    priceElement.textContent = "₹--";
    statusElement.textContent =
      error.message || "Failed to fetch stock price.";
  }
}

// Fetch historical prices for the selected range.
async function getChart(range) {
  const symbol = symbolInput.value.trim().toUpperCase();

  if (!symbol) {
    return;
  }

  try {
    const response = await fetch(
      `/api/chart?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`
    );

    const data = await safeJson(response);

    await ensureChartJs();

    renderChart(data.history);
  } catch (error) {
    console.error("Chart error:", error);

    statusElement.textContent =
      error.message || "Failed to load the stock chart.";
  }
}

// Render the historical price chart.
function renderChart(history) {
  if (!chartCanvas) {
    console.error('Canvas element "#priceChart" was not found.');
    return;
  }

  if (!Array.isArray(history) || history.length === 0) {
    throw new Error("No historical prices available for this symbol.");
  }

  const validHistory = history.filter((point) => {
    return (
      point &&
      point.date &&
      point.close !== null &&
      point.close !== "" &&
      Number.isFinite(Number(point.close))
    );
  });

  if (validHistory.length === 0) {
    throw new Error("No valid historical prices are available.");
  }

  const labels = validHistory.map((point) => point.date);
  const closes = validHistory.map((point) => Number(point.close));

  const isUp =
    closes.length > 1 &&
    closes[closes.length - 1] >= closes[0];

  const lineColor = isUp ? "#00d68f" : "#ff5b65";

  // Remove the previous chart before drawing another.
  if (priceChart) {
    priceChart.destroy();
  }

  priceChart = new window.Chart(chartCanvas, {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: "Stock Price",
          data: closes,
          borderColor: lineColor,
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.15,
          fill: false
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index"
      },

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          callbacks: {
            title: (items) => {
              return labels[items[0].dataIndex];
            },

            label: (item) => {
              return (
                "₹" +
                Number(item.raw).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
              );
            }
          }
        }
      },

      scales: {
        x: {
          ticks: {
            color: "#a3a3a3",
            maxTicksLimit: 6
          },

          grid: {
            display: false
          },

          border: {
            color: "#262626"
          }
        },

        y: {
          ticks: {
            color: "#a3a3a3",

            callback: (value) => {
              return "₹" + Number(value).toLocaleString("en-IN");
            }
          },

          grid: {
            color: "#262626"
          },

          border: {
            display: false
          }
        }
      }
    }
  });

  // Expose the instance so the index page can access it if needed.
  window.microStockChart = priceChart;
}

// Load the price and chart together.
async function loadAll() {
  await Promise.allSettled([
    getLTP(),
    getChart(currentRange)
  ]);
}

// Fetch stock data when the button is clicked.
if (getPriceBtn) {
  getPriceBtn.addEventListener("click", loadAll);
}

// Allow Enter to fetch stock data.
if (symbolInput) {
  symbolInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      loadAll();
    }
  });
}

// Handle chart-range buttons.
rangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    rangeButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    currentRange = button.dataset.range || "1y";

    getChart(currentRange);
  });
});

// Initial page load.
loadAll();
