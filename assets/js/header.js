(function () {
    const html = document.documentElement;
    const body = document.body;
    const nav = document.querySelector('[data-nav]');
    const navToggle = document.querySelector('[data-nav-toggle]');
    const navClose = document.querySelector('[data-nav-close]');
    const navBackdrop = document.querySelector('[data-nav-backdrop]');

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
        const closeNav = function () {
            nav.classList.remove('nav--open');
            body.classList.remove('nav-drawer-open');
            navToggle.setAttribute('aria-expanded', 'false');
            if (navBackdrop) {
                navBackdrop.hidden = true;
            }
        };

        const openNav = function () {
            nav.classList.add('nav--open');
            body.classList.add('nav-drawer-open');
            navToggle.setAttribute('aria-expanded', 'true');
            if (navBackdrop) {
                navBackdrop.hidden = false;
            }
        };

        navToggle.addEventListener('click', function () {
            if (nav.classList.contains('nav--open')) {
                closeNav();
                return;
            }

            openNav();
        });

        if (navClose) {
            navClose.addEventListener('click', closeNav);
        }

        if (navBackdrop) {
            navBackdrop.addEventListener('click', closeNav);
        }

        nav.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', closeNav);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeNav();
            }
        });
    }

    const ensurePwaHeadTags = function () {
        if (!document.head.querySelector('link[rel="manifest"]')) {
            const manifest = document.createElement('link');
            manifest.rel = 'manifest';
            manifest.href = 'manifest.webmanifest';
            document.head.appendChild(manifest);
        }

        if (!document.head.querySelector('meta[name="theme-color"]')) {
            const metaTheme = document.createElement('meta');
            metaTheme.name = 'theme-color';
            metaTheme.content = '#0a66c2';
            document.head.appendChild(metaTheme);
        }
    };

    const registerServiceWorker = function () {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => {
                // Fail silently for non-supporting environments.
            });
        });
    };

    const isStandalone = function () {
        return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    };

    const createBanner = function (title, description, primaryLabel, onPrimary, secondaryLabel, onSecondary) {
        const banner = document.createElement('div');
        banner.className = 'pwa-banner';
        banner.style.position = 'fixed';
        banner.style.right = '16px';
        banner.style.bottom = '16px';
        banner.style.width = 'min(92vw, 360px)';
        banner.style.background = 'var(--surface)';
        banner.style.color = 'var(--text-color)';
        banner.style.border = '1px solid rgba(10, 102, 194, 0.2)';
        banner.style.boxShadow = '0 10px 26px rgba(0, 0, 0, 0.15)';
        banner.style.borderRadius = '12px';
        banner.style.padding = '14px';
        banner.style.zIndex = '1100';

        const heading = document.createElement('h4');
        heading.textContent = title;
        heading.style.margin = '0 0 6px';

        const text = document.createElement('p');
        text.textContent = description;
        text.style.margin = '0 0 12px';
        text.style.color = 'var(--muted-text)';

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';

        const primary = document.createElement('button');
        primary.className = 'cta-button';
        primary.type = 'button';
        primary.textContent = primaryLabel;
        primary.addEventListener('click', () => onPrimary(banner));

        const secondary = document.createElement('button');
        secondary.className = 'cta-button';
        secondary.type = 'button';
        secondary.textContent = secondaryLabel;
        secondary.style.background = '#6b7280';
        secondary.addEventListener('click', () => onSecondary(banner));

        actions.appendChild(primary);
        actions.appendChild(secondary);

        banner.appendChild(heading);
        banner.appendChild(text);
        banner.appendChild(actions);
        document.body.appendChild(banner);
    };

    const setupInstallPrompt = function () {
        const isAuth = window.TUMAMI_IS_AUTHENTICATED === true;
        const isLoginPage = window.location.pathname.endsWith('/login.php') || window.location.pathname.endsWith('login.php');
        if ((!isAuth && !isLoginPage) || isStandalone()) {
            return;
        }

        const acceptedKey = 'tumami_pwa_installed';
        const dismissKey = 'tumami_pwa_install_dismissed_until';

        if (window.localStorage.getItem(acceptedKey) === 'true') {
            return;
        }

        const dismissedUntil = Number(window.localStorage.getItem(dismissKey) || '0');
        if (dismissedUntil > Date.now()) {
            return;
        }

        let deferredPrompt = null;

        const showInstallBanner = function () {
            if (!deferredPrompt || document.querySelector('.pwa-banner')) {
                return;
            }

            createBanner(
                'Install Tumame app',
                'Install the app for faster access and smoother location permissions. Already installed users will not see this again.',
                'Install App',
                async (banner) => {
                    try {
                        await deferredPrompt.prompt();
                        const choice = await deferredPrompt.userChoice;
                        if (choice && choice.outcome === 'accepted') {
                            window.localStorage.setItem(acceptedKey, 'true');
                            banner.remove();
                        }
                    } catch (_error) {
                        // ignore prompt failures
                    } finally {
                        deferredPrompt = null;
                    }
                },
                'Not now',
                (banner) => {
                    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                    window.localStorage.setItem(dismissKey, String(Date.now() + sevenDaysMs));
                    banner.remove();
                }
            );
        };

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            deferredPrompt = event;
            showInstallBanner();
        });

        window.addEventListener('appinstalled', () => {
            window.localStorage.setItem(acceptedKey, 'true');
            const banner = document.querySelector('.pwa-banner');
            if (banner) {
                banner.remove();
            }
        });
    };

    const setupInstalledGpsNudge = function () {
        if (!isStandalone()) {
            return;
        }

        const runnerPage = window.location.pathname.endsWith('/dashboard_runner.php') || window.location.pathname.endsWith('dashboard_runner.php');
        if (!runnerPage) {
            return;
        }

        const gpsGrantedKey = 'tumami_pwa_gps_granted';
        if (window.localStorage.getItem(gpsGrantedKey) === 'true') {
            return;
        }

        if (document.querySelector('.pwa-banner')) {
            return;
        }

        createBanner(
            'Enable GPS for live tasks',
            'Turn on location permission to keep your runner tracking accurate inside the app.',
            'Enable GPS',
            (banner) => {
                if (!navigator.geolocation) {
                    return;
                }

                navigator.geolocation.getCurrentPosition(() => {
                    window.localStorage.setItem(gpsGrantedKey, 'true');
                    banner.remove();
                }, () => {
                    // keep banner visible for retry
                }, { enableHighAccuracy: true, timeout: 12000 });
            },
            'Later',
            (banner) => banner.remove()
        );
    };

    ensurePwaHeadTags();
    registerServiceWorker();
    setupInstallPrompt();
    setupInstalledGpsNudge();
})();
