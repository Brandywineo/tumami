(function () {
    const html = document.documentElement;
    const nav = document.querySelector('[data-nav]');
    const navToggle = document.querySelector('[data-nav-toggle]');

    const applyTheme = function (theme) {
        if (theme === 'dark') {
            html.setAttribute('data-theme', 'dark');
            return;
        }

        if (theme === 'light') {
            html.setAttribute('data-theme', 'light');
            return;
        }

        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    };

    const theme = document.cookie
        .split('; ')
        .find((row) => row.startsWith('tumami_theme='))
        ?.split('=')[1];

    applyTheme(theme || 'system');

    if (nav && navToggle) {
        navToggle.addEventListener('click', function () {
            const isOpen = nav.classList.toggle('nav--open');
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    }
})();
