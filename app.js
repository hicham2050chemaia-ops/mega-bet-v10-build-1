
const API_URL = "https://mega-bet-api.hicham2050chemaia.workers.dev/fixtures";
const CACHE_TIME = 2 * 60 * 1000;

let activeFilter = "all";
let matches = [];

const list = document.querySelector("#matchList");
const dataMode = document.querySelector("#dataMode");
const note = document.querySelector("#matches .note");

const liveStatuses = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];
const finishedStatuses = ["FT", "AET", "PEN"];

function getToday() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const part = type => parts.find(p => p.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function getMatchState(status) {
  if (liveStatuses.includes(status)) return "live";
  if (finishedStatuses.includes(status)) return "finished";
  return "upcoming";
}

function getMatchTime(match) {
  const status = match.fixture.status.short;

  if (getMatchState(status) === "live") {
    return status === "HT" ? "استراحة" : "مباشر";
  }

  if (getMatchState(status) === "finished") {
    return "نهاية";
  }

  return new Intl.DateTimeFormat("ar-MA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca"
  }).format(new Date(match.fixture.date));
}

function renderMatches() {
  const filtered = matches.filter(match => {
    const state = getMatchState(match.fixture.status.short);
    return activeFilter === "all" || state === activeFilter;
  });

  if (!filtered.length) {
    list.innerHTML = '<p class="note">لا توجد مباريات في هذا التصنيف اليوم.</p>';
    return;
  }

  list.innerHTML = filtered.map(match => {
    const home = escapeHTML(match.teams.home.name);
    const away = escapeHTML(match.teams.away.name);
    const league = escapeHTML(match.league.name);
    const state = getMatchState(match.fixture.status.short);
    const time = escapeHTML(getMatchTime(match));

    const score = state === "upcoming"
      ? time
      : `${match.goals.home ?? 0} - ${match.goals.away ?? 0}`;

    return `
      <article class="match">
        <div class="team">
          <span class="crest">⚽</span>
          <span>${home}</span>
        </div>
        <div class="score">
          <b>${score}</b>
          <small>${league} · ${time}</small>
        </div>
        <div class="team">
          <span>${away}</span>
          <span class="crest">⚽</span>
        </div>
      </article>
    `;
  }).join("");
}

async function loadMatches(force = false) {
  const today = getToday();
  const cacheKey = `mega-bet-matches-${today}`;

  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");

      if (cached && Date.now() - cached.time < CACHE_TIME) {
        matches = cached.matches;
        dataMode.textContent = "بيانات محفوظة مؤقتاً";
        note.textContent = "يتم تحديث البيانات تلقائياً عند انتهاء مدة التخزين.";
        renderMatches();
        return;
      }
    } catch (_) {}
  }

  list.innerHTML = '<p class="note">جاري تحميل مباريات اليوم...</p>';
  dataMode.textContent = "جاري الاتصال";

  try {
    const response = await fetch(
      `${API_URL}?date=${today}`,
      { method: "GET" }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length) {
      throw new Error("API_LIMIT");
    }

    if (!Array.isArray(data.response)) {
      throw new Error("INVALID_DATA");
    }

    matches = data.response;

    localStorage.setItem(cacheKey, JSON.stringify({
      time: Date.now(),
      matches
    }));

    dataMode.textContent = "مباريات حقيقية";
    note.textContent = "المصدر: API-Football · توقيت المغرب";
    renderMatches();

  } catch (error) {
    dataMode.textContent = "تعذر الاتصال";
    list.innerHTML = `
      <p class="note">
        تعذر تحميل المباريات. تحقق من اتصال الإنترنت أو حدّ الطلبات.
      </p>
      <button id="retryMatches" class="filter">إعادة المحاولة</button>
    `;

    document.querySelector("#retryMatches")
      ?.addEventListener("click", () => loadMatches(true));
  }
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(item =>
      item.classList.remove("active")
    );

    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderMatches();
  });
});

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(item =>
      item.classList.remove("active")
    );

    button.classList.add("active");

    document.querySelectorAll("main .panel").forEach(panel =>
      panel.classList.add("hidden")
    );

    document.getElementById(button.dataset.tab)?.classList.remove("hidden");
  });
});

let deferredPrompt;

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event;
  document.querySelector("#installBtn")?.classList.remove("hidden");
});

document.querySelector("#installBtn")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.querySelector("#installBtn")?.classList.add("hidden");
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(console.error);
  });
}

loadMatches();
