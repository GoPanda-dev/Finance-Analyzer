document.addEventListener("DOMContentLoaded", function() {
    const themeToggleButton = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");

    // Check for saved user preference, if any, on load of the website
    const currentTheme = localStorage.getItem("theme") || "light-theme";
    document.body.classList.add(currentTheme);
    if (currentTheme === "dark-theme") {
        themeIcon.classList.replace("fa-moon", "fa-sun");
    }

    themeToggleButton.addEventListener("click", function() {
        document.body.classList.toggle("light-theme");
        document.body.classList.toggle("dark-theme");

        const theme = document.body.classList.contains("dark-theme") ? "dark-theme" : "light-theme";
        localStorage.setItem("theme", theme);

        // Toggle icon
        if (theme === "dark-theme") {
            themeIcon.classList.replace("fa-moon", "fa-sun");
        } else {
            themeIcon.classList.replace("fa-sun", "fa-moon");
        }
    });
});
