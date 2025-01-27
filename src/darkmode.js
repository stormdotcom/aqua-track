document.addEventListener('DOMContentLoaded', () => {

    tailwind.config = {
        darkMode: 'class',
        // ... any other configuration options
    }

    console.log('DOM fully loaded and parsed');

    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    if (!themeToggleBtn) {
        console.error('Theme toggle button not found');
        return;
    }

    console.log('Theme toggle button found');

    function setTheme(isDark) {
        console.log('Setting theme:', isDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }    

    themeToggleBtn.addEventListener('click', () => {
        console.log('Theme toggle button clicked');
        const isDark = !htmlElement.classList.contains('dark');
        setTheme(isDark);
    });

    // Check for saved theme preference or prefer-color-scheme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    console.log('Saved theme:', savedTheme);
    console.log('Prefers dark:', prefersDark);

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        setTheme(true);
    } else {
        setTheme(false);
    }
});