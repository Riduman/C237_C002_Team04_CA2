(() => {
  const html = document.documentElement;
  const storedTheme = localStorage.getItem("vybe-theme");
  const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = storedTheme || (preferredDark ? "dark" : "light");

  function applyTheme(theme) {
    html.setAttribute("data-bs-theme", theme);
    localStorage.setItem("vybe-theme", theme);

    document.querySelectorAll("#themeToggle i").forEach((icon) => {
      icon.className = theme === "dark"
        ? "bi bi-sun"
        : "bi bi-moon-stars";
    });
  }

  function toggleTheme() {
    const currentTheme = html.getAttribute("data-bs-theme");
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  }

  applyTheme(initialTheme);

  document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);
  document
    .getElementById("settingsThemeToggle")
    ?.addEventListener("click", toggleTheme);

  const year = document.getElementById("currentYear");
  if (year) {
    year.textContent = new Date().getFullYear();
  }
})();
