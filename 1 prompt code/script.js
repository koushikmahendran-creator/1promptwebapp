const cityInput = document.getElementById("cityInput");
const weatherResult = document.getElementById("weatherResult");
const forecastResult = document.getElementById("forecastResult");
const weatherBg = document.getElementById("weatherBg");
const streakCount = document.getElementById("streakCount");
const badges = document.getElementById("badges");
const posts = document.getElementById("posts");

const weatherCodes = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Foggy",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  95: "Thunderstorm"
};

let streak = Number(localStorage.getItem("weatherStreak")) || 0;
let lastCheck = localStorage.getItem("lastCheckDate");

updateBadges();
loadPosts();

async function getWeather() {
  const city = cityInput.value.trim();

  if (!city) {
    weatherResult.innerHTML = "<p>Please enter a city name.</p>";
    return;
  }

  weatherResult.innerHTML = "<p>Loading weather data...</p>";

  try {
    // First API call: converts city name into latitude and longitude
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      weatherResult.innerHTML = "<p>City not found. Try another city.</p>";
      return;
    }

    const place = geoData.results[0];
    const lat = place.latitude;
    const lon = place.longitude;

    // Second API call: gets current weather and 7-day forecast
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto`;

    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    displayCurrentWeather(place, weatherData);
    displayForecast(weatherData);
    updateStreak();
  } catch (error) {
    weatherResult.innerHTML = "<p>Something went wrong. Please try again.</p>";
  }
}

function displayCurrentWeather(place, data) {
  const current = data.current;
  const condition = weatherCodes[current.weather_code] || "Weather unavailable";
  const emoji = getWeatherEmoji(current.weather_code);

  setBackground(current.weather_code);

  weatherResult.innerHTML = `
    <div class="weather-main">
      <div>
        <h2>${emoji} ${place.name}, ${place.country || ""}</h2>
        <p class="temp">${Math.round(current.temperature_2m)}°C</p>
        <h3>${condition}</h3>
      </div>

      <div class="detail-box">
        <p>💧 Humidity: <strong>${current.relative_humidity_2m}%</strong></p>
        <p>🌬️ Wind Speed: <strong>${current.wind_speed_10m} km/h</strong></p>
        <p>🕒 Updated: <strong>${new Date(current.time).toLocaleString()}</strong></p>
        <p>🎯 Weather Tip: <strong>${getWeatherTip(current.temperature_2m, current.weather_code)}</strong></p>
      </div>
    </div>
  `;
}

function displayForecast(data) {
  forecastResult.innerHTML = "";

  data.daily.time.forEach((day, index) => {
    const code = data.daily.weather_code[index];
    const emoji = getWeatherEmoji(code);
    const condition = weatherCodes[code] || "Weather";

    forecastResult.innerHTML += `
      <div class="forecast-day">
        <h3>${new Date(day).toLocaleDateString("en-US", { weekday: "short" })}</h3>
        <div style="font-size: 40px;">${emoji}</div>
        <p>${condition}</p>
        <p>High: <strong>${Math.round(data.daily.temperature_2m_max[index])}°C</strong></p>
        <p>Low: <strong>${Math.round(data.daily.temperature_2m_min[index])}°C</strong></p>
        <p>Rain: <strong>${data.daily.precipitation_probability_max[index]}%</strong></p>
      </div>
    `;
  });
}

function getWeatherEmoji(code) {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2 || code === 3) return "☁️";
  if ([51, 53, 55, 61, 63, 65, 80].includes(code)) return "🌧️";
  if ([71, 73, 75].includes(code)) return "❄️";
  if (code === 95) return "⛈️";
  if ([45, 48].includes(code)) return "🌫️";
  return "🌤️";
}

function setBackground(code) {
  weatherBg.className = "weather-bg";

  if (code === 0 || code === 1) {
    weatherBg.classList.add("sunny");
    document.body.style.background = "linear-gradient(135deg, #fde68a, #93c5fd, #fef3c7)";
  } else if (code === 2 || code === 3 || code === 45 || code === 48) {
    weatherBg.classList.add("cloudy");
    document.body.style.background = "linear-gradient(135deg, #c7d2fe, #e0f2fe, #f8fafc)";
  } else if ([51, 53, 55, 61, 63, 65, 80, 95].includes(code)) {
    weatherBg.classList.add("rainy");
    document.body.style.background = "linear-gradient(135deg, #bfdbfe, #a7f3d0, #e0f2fe)";
  } else if ([71, 73, 75].includes(code)) {
    weatherBg.classList.add("snowy");
    document.body.style.background = "linear-gradient(135deg, #f8fafc, #dbeafe, #cffafe)";
  }
}

function getWeatherTip(temp, code) {
  if (temp >= 28) return "Stay hydrated and wear sunscreen.";
  if (temp <= 0) return "Bundle up, it is freezing!";
  if ([61, 63, 65, 80].includes(code)) return "Take an umbrella.";
  if ([71, 73, 75].includes(code)) return "Wear warm boots and be careful outside.";
  return "Great day to check the forecast before going out.";
}

function updateStreak() {
  const today = new Date().toDateString();

  if (lastCheck !== today) {
    streak++;
    lastCheck = today;
    localStorage.setItem("weatherStreak", streak);
    localStorage.setItem("lastCheckDate", today);
  }

  updateBadges();
}

function updateBadges() {
  streakCount.textContent = streak;
  badges.innerHTML = "";

  if (streak >= 1) addBadge("🌟 First Forecast");
  if (streak >= 3) addBadge("🔥 3-Day Streak");
  if (streak >= 5) addBadge("🌈 Weather Explorer");
  if (streak >= 7) addBadge("🏆 Forecast Champion");

  if (streak === 0) {
    badges.innerHTML = "<p>No badges yet. Search weather to earn one!</p>";
  }
}

function addBadge(text) {
  badges.innerHTML += `<span class="badge">${text}</span>`;
}

function addPost() {
  const input = document.getElementById("communityInput");
  const text = input.value.trim();

  if (!text) return;

  const savedPosts = JSON.parse(localStorage.getItem("weatherPosts")) || [];
  savedPosts.unshift(text);

  localStorage.setItem("weatherPosts", JSON.stringify(savedPosts));
  input.value = "";
  loadPosts();
}

function loadPosts() {
  const savedPosts = JSON.parse(localStorage.getItem("weatherPosts")) || [];
  posts.innerHTML = "";

  savedPosts.forEach(post => {
    posts.innerHTML += `<div class="post">🌍 ${post}</div>`;
  });
}

// Press Enter to search
cityInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    getWeather();
  }
});