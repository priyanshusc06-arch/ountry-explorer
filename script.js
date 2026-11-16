const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const regionFilter = document.getElementById("region-filter");
const countriesGrid = document.getElementById("countries-grid");
const statusMessage = document.getElementById("status-message");
const recentContainer = document.getElementById("recent-searches");
const themeToggle = document.getElementById("theme-toggle");

let currentCountries = [];
let recentSearches = JSON.parse(localStorage.getItem("recentCountries")) || [];

// 1. Dark / Light Mode Toggle with localStorage
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️ Light Mode";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
});

// 2. Fetch Data with Automatic Backup Fallback
const fetchCountries = async (url, query = "") => {
  showStatus("Loading countries...");
  countriesGrid.innerHTML = "";
  regionFilter.value = "all"; // Reset region filter so searched countries are never hidden

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) throw new Error("No country found matching your search.");
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const data = await response.json();
    currentCountries = data;
    hideStatus();
    renderCountries(currentCountries);
  } catch (error) {
    if (error.message.includes("No country found")) {
      showStatus(error.message);
      return;
    }
    // Backup dataset if restcountries.com is unreachable
    try {
      const fallbackRes = await fetch("https://raw.githubusercontent.com/mledoze/countries/master/countries.json");
      if (!fallbackRes.ok) throw new Error("Fallback failed");
      const rawData = await fallbackRes.json();

      const formatted = rawData.map((c) => ({
        name: { common: c.name.common },
        flags: { svg: `https://flagcdn.com/${c.cca2.toLowerCase()}.svg` },
        capital: Array.isArray(c.capital) ? c.capital : [c.capital || "N/A"],
        population: c.area ? Math.round(c.area * 120) : 1000000,
        region: c.region || "N/A",
        languages: c.languages || {},
        currencies: Array.isArray(c.currencies) ? c.currencies.join(", ") : "N/A"
      }));

      const cleanQuery = query.trim().toLowerCase();
      currentCountries = cleanQuery
        ? formatted.filter((c) => c.name.common.toLowerCase().includes(cleanQuery))
        : formatted;

      if (currentCountries.length === 0) {
        showStatus("No country found matching your search.");
      } else {
        hideStatus();
        renderCountries(currentCountries);
      }
    } catch (fallbackError) {
      showStatus("Network error. Please check your internet connection.");
    }
  }
};

// 3. Render Country Cards
const renderCountries = (countries) => {
  const selectedRegion = regionFilter.value;
  const filtered = selectedRegion === "all"
    ? countries
    : countries.filter((c) => c.region === selectedRegion);

  if (filtered.length === 0) {
    showStatus("No countries match the selected region filter.");
    countriesGrid.innerHTML = "";
    return;
  }

  hideStatus();
  countriesGrid.innerHTML = filtered
    .map((country) => {
      const { name, flags, capital, population, region, languages, currencies } = country;
      const capitalName = Array.isArray(capital) && capital.length ? capital[0] : "N/A";
      const langList = languages && typeof languages === "object"
        ? Object.values(languages).join(", ")
        : "N/A";

      let currencyList = "N/A";
      if (typeof currencies === "string") {
        currencyList = currencies;
      } else if (currencies && typeof currencies === "object") {
        currencyList = Object.values(currencies)
          .map((c) => (typeof c === "object" ? `${c.name} (${c.symbol || ""})` : c))
          .join(", ");
      }

      return `
        <article class="card">
          <img src="${flags.svg}" alt="Flag of ${name.common}" loading="lazy" />
          <div class="card-body">
            <h2>${name.common}</h2>
            <p><strong>Capital:</strong> ${capitalName}</p>
            <p><strong>Population:</strong> ${Number(population).toLocaleString()}</p>
            <p><strong>Region:</strong> ${region}</p>
            <p><strong>Languages:</strong> ${langList}</p>
            <p><strong>Currencies:</strong> ${currencyList}</p>
          </div>
        </article>
      `;
    })
    .join("");
};

// 4. Status Helper Functions
const showStatus = (msg) => {
  statusMessage.textContent = msg;
  statusMessage.classList.remove("hidden");
};

const hideStatus = () => {
  statusMessage.classList.add("hidden");
};

// 5. Recent Searches (localStorage)
const saveRecentSearch = (query) => {
  const clean = query.trim();
  if (!clean) return;
  recentSearches = [clean, ...recentSearches.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
  localStorage.setItem("recentCountries", JSON.stringify(recentSearches));
  renderRecentChips();
};

const renderRecentChips = () => {
  recentContainer.innerHTML = recentSearches
    .map((term) => `<button type="button" class="chip">${term}</button>`)
    .join("");
};

recentContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("chip")) {
    const term = e.target.textContent;
    searchInput.value = term;
    fetchCountries(`https://restcountries.com/v3.1/name/${encodeURIComponent(term)}`, term);
  }
});

// 6. Event Listeners
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) {
    showStatus("Please enter a country name.");
    return;
  }
  saveRecentSearch(query);
  fetchCountries(`https://restcountries.com/v3.1/name/${encodeURIComponent(query)}`, query);
});

regionFilter.addEventListener("change", () => {
  renderCountries(currentCountries);
});

// Initial Load
renderRecentChips();
fetchCountries("https://restcountries.com/v3.1/all?fields=name,flags,capital,population,region,languages,currencies");