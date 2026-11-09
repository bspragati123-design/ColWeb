const themeButton = document.getElementById("theme-toggle");

// Check saved theme or the visitor's system preference
const savedTheme = localStorage.getItem("theme");

const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)"
).matches;

let currentTheme = savedTheme ||
    (systemPrefersDark ? "dark" : "light");

// Apply theme
function applyTheme() {
    document.documentElement.setAttribute("data-theme", currentTheme);

    themeButton.textContent =
        currentTheme === "dark"
            ? "☀️ Light Mode"
            : "🌙 Dark Mode";
}

// Apply theme when page loads
applyTheme();

// Switch theme on button click
themeButton.addEventListener("click", () => {
    currentTheme = currentTheme === "light" ? "dark" : "light";

    applyTheme();

    localStorage.setItem("theme", currentTheme);
});