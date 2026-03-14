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

(function () {
    const drawer = document.querySelector('[data-settings-drawer]');
    const panel = drawer ? drawer.querySelector('.settings-drawer__panel') : null;
    const openButtons = document.querySelectorAll('[data-settings-drawer-open]');
    const closeButtons = document.querySelectorAll('[data-settings-drawer-close]');
    const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ];

    if (!drawer || !panel || openButtons.length === 0) {
        return;
    }

    let isClosing = false;
    let lastFocusedElement = null;

    const getFocusableElements = function () {
        return Array.from(panel.querySelectorAll(focusableSelectors.join(','))).filter((el) => {
            if (!el || typeof el.offsetParent === 'undefined') {
                return false;
            }

            return el.offsetParent !== null || el === document.activeElement;
        });
    };

    const handleKeydown = function (event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeDrawer();
            return;
        }

        if (event.key !== 'Tab') {
            return;
        }

        const focusable = getFocusableElements();
        if (focusable.length === 0) {
            event.preventDefault();
            panel.focus();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
            return;
        }

        if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const finishClose = function () {
        drawer.hidden = true;
        drawer.classList.remove('is-visible', 'is-closing');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeydown);

        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
        }

        lastFocusedElement = null;
        isClosing = false;
    };

    const openDrawer = function () {
        if (!drawer.hidden && !isClosing) {
            return;
        }

        if (isClosing) {
            drawer.classList.remove('is-closing');
            isClosing = false;
        }

        lastFocusedElement = document.activeElement;
        drawer.hidden = false;
        document.body.style.overflow = 'hidden';

        window.requestAnimationFrame(() => {
            drawer.classList.add('is-visible');
        });
        document.addEventListener('keydown', handleKeydown);

        window.requestAnimationFrame(() => {
            const focusable = getFocusableElements();
            if (focusable.length > 0) {
                focusable[0].focus();
                return;
            }

            panel.focus();
        });
    };

    const closeDrawer = function () {
        if (drawer.hidden || isClosing) {
            return;
        }

        isClosing = true;
        drawer.classList.remove('is-visible');
        drawer.classList.add('is-closing');
        window.setTimeout(finishClose, 220);
    };

    drawer.querySelectorAll('.settings-drawer__link').forEach((link) => {
        link.addEventListener('click', closeDrawer);
    });

    openButtons.forEach((btn) => btn.addEventListener('click', openDrawer));
    closeButtons.forEach((btn) => btn.addEventListener('click', closeDrawer));
})();
