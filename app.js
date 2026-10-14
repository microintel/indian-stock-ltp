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

// Safely parse a response as JSON, surfacing the real problem
// (empty body, HTML error page, non-2xx status) instead of
// letting a cryptic "Unexpected end of JSON input" bubble up.
async function safeJson(response) {

  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (parseError) {
    console.error("Non-JSON response:", text.slice(0, 300));
    throw new Error(
      `Server returned status ${response.status} with an invalid response`
    );
  }

  if (!response.ok) {
    throw new Error(
      (data && data.error) || `Request failed with status ${response.status}`
    );
  }

  if (data === null) {
    throw new Error(`Server returned an empty response (status ${response.status})`);
  }

  return data;
}

async function getLTP() {

  const symbol = symbolInput.value.trim().toUpperCase();

  if (!symbol) {
    statusElement.textContent = "Enter a stock symbol";
    return;
  }

  symbolElement.textContent = symbol;
  priceElement.textContent = "₹--";
  changeElement.textContent = "";
  statusElement.textContent = "Loading...";
  getPriceBtn.disabled = true;

  try {

    const response = await fetch(
      `/api/ltp?symbol=${encodeURIComponent(symbol)}`
    );

    const data = await safeJson(response);

    priceElement.textContent =
      "₹" + Number(data.ltp).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

    if (typeof data.change === "number" && typeof data.changePercent === "number") {
      const sign = data.change >= 0 ? "+" : "";
      changeElement.textContent =
        `${sign}${data.change.toFixed(2)} (${sign}${data.changePercent.toFixed(2)}%)`;
      changeElement.className = "change " + (data.change >= 0 ? "up" : "down");
    }

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

    renderChart(data.history);

  } catch (error) {

    console.error(error);
    statusElement.textContent = error.message || "Failed to load chart";

  }
}

function renderChart(history) {

  const labels = history.map(point => point.date);
  const closes = history.map(point => point.close);

  const isUp =
    closes.length > 1 && closes[closes.length - 1] >= closes[0];

  const lineColor = isUp ? "#0a8f4a" : "#d1332f";

  if (priceChart) {
    priceChart.destroy();
  }

  priceChart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        data: closes,
        borderColor: lineColor,
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => labels[items[0].dataIndex],
            label: (item) => "₹" + Number(item.raw).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })
          }
        }
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 6 },
          grid: { display: false }
        },
        y: {
          ticks: {
            callback: (value) => "₹" + value
          }
        }
      }
    }
  });
}

function loadAll() {
  getLTP();
  getChart(currentRange);
}

getPriceBtn.addEventListener("click", loadAll);

symbolInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    loadAll();
  }
});

rangeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    rangeButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentRange = btn.dataset.range;
    getChart(currentRange);
  });
});

// Initial load
loadAll();
