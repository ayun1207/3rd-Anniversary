export const desktopPointerMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
export const mobileLayoutMedia = window.matchMedia('(max-width: 900px) and (hover: none)');
export const mobileRosterMedia = window.matchMedia('(max-width: 700px) and (hover: none)');

// 桌機頁面縮放保留原構圖，交由原生捲軸瀏覽放大後的範圍。
export function setupDesktopViewport(scroller) {
    const root = document.documentElement;
    let basePixelRatio = devicePixelRatio;
    let previousPixelRatio = devicePixelRatio;
    let gutter = innerWidth - scroller.clientWidth;
    let pointer = null;
    let anchor = null;
    let pointerFrame = 0;
    let zoomFrame = 0;

    function updateLayoutSize() {
        const ratio = devicePixelRatio / basePixelRatio;
        const width = Math.max(1024, innerWidth * ratio);
        const height = innerHeight * ratio;
        root.style.setProperty('--desktop-viewport-width', `${width}px`);
        root.style.setProperty('--desktop-canvas-width', `${width - gutter}px`);
        root.style.setProperty('--desktop-vw', `${width / 100}px`);
        root.style.setProperty('--desktop-vh', `${height / 100}px`);
    }

    function captureAnchor() {
        pointerFrame = 0;
        if (!desktopPointerMedia.matches || !pointer) return;
        const target = document.elementFromPoint(pointer.x, pointer.y);
        if (!target) { anchor = null; return; }
        const surface = target.closest('dialog[open]') || scroller;
        if (surface === scroller && !scroller.contains(target)) { anchor = null; return; }
        const element = target.closest('img, h1, h2, p, .solar-cycle, .text-container, .messages-container, .gallery-sticky-shell')
            || target.closest('.chapter-page-fit, .entrance-layout');
        if (!element) { anchor = null; return; }
        const bounds = element.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        anchor = {
            element,
            surface,
            x: (pointer.x - bounds.left) / bounds.width,
            y: (pointer.y - bounds.top) / bounds.height,
            clientX: pointer.x,
            clientY: pointer.y,
            pixelRatio: devicePixelRatio
        };
    }

    function queueAnchor() {
        if (!pointerFrame) pointerFrame = requestAnimationFrame(captureAnchor);
    }

    function rememberPointer(event) {
        if (!desktopPointerMedia.matches) return;
        pointer = { x: event.clientX, y: event.clientY };
        queueAnchor();
    }

    function updateScrollPosition() {
        if (!desktopPointerMedia.matches) return;
        root.style.setProperty('--desktop-scroll-x', `${scroller.scrollLeft}px`);
        queueAnchor();
    }

    function resize() {
        if (!desktopPointerMedia.matches) return;
        const nextPixelRatio = devicePixelRatio;
        if (Math.abs(nextPixelRatio - previousPixelRatio) < 0.001) {
            updateLayoutSize();
            queueAnchor();
            return;
        }
        previousPixelRatio = nextPixelRatio;
        const saved = anchor;
        cancelAnimationFrame(zoomFrame);
        zoomFrame = requestAnimationFrame(() => {
            if (!saved?.element.isConnected || !saved.surface.contains(saved.element)) return;
            const bounds = saved.element.getBoundingClientRect();
            if (!bounds.width || !bounds.height) return;
            const ratio = saved.pixelRatio / nextPixelRatio;
            const clientX = saved.clientX * ratio;
            const clientY = saved.clientY * ratio;
            saved.surface.scrollLeft += bounds.left + bounds.width * saved.x - clientX;
            saved.surface.scrollTop += bounds.top + bounds.height * saved.y - clientY;
            pointer = { x: clientX, y: clientY };
            updateScrollPosition();
        });
    }

    function updateMode() {
        root.classList.toggle('desktop-layout', desktopPointerMedia.matches);
        if (desktopPointerMedia.matches) {
            basePixelRatio = previousPixelRatio = devicePixelRatio;
            gutter = innerWidth - scroller.clientWidth;
            updateLayoutSize();
            updateScrollPosition();
        } else {
            cancelAnimationFrame(zoomFrame);
            cancelAnimationFrame(pointerFrame);
            pointerFrame = 0;
            for (const name of ['--desktop-viewport-width', '--desktop-canvas-width', '--desktop-vw', '--desktop-vh', '--desktop-scroll-x']) {
                root.style.removeProperty(name);
            }
            anchor = pointer = null;
        }
    }

    document.addEventListener('pointermove', rememberPointer, { passive: true });
    document.addEventListener('wheel', event => {
        if (!event.ctrlKey || !desktopPointerMedia.matches) return;
        pointer = { x: event.clientX, y: event.clientY };
        captureAnchor();
    }, { passive: true, capture: true });
    scroller.addEventListener('scroll', updateScrollPosition, { passive: true });
    window.addEventListener('resize', resize);
    desktopPointerMedia.addEventListener('change', updateMode);
    updateMode();
}
