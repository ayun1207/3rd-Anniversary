import { seasonsData } from './src/data/seasons.js';

// 24 張圖片對應的低飽和度背景色列表
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const backgroundColors = seasonsData.map(season => season.tone);

const siteMenu = document.getElementById('siteMenu');
const menuToggle = document.getElementById('menuToggle');
let menuCloseTimer;
function openMenu() {
    clearTimeout(menuCloseTimer);
    updateScrollState();
    if (!siteMenu.open) siteMenu.show();
    document.body.classList.add('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    void siteMenu.offsetWidth;
    siteMenu.classList.add('is-open');
}

function closeMenu() {
    if (!siteMenu.open) return;
    clearTimeout(menuCloseTimer);
    siteMenu.classList.remove('is-open');
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650;
    menuCloseTimer = setTimeout(() => siteMenu.close(), delay);
}

siteMenu.addEventListener('click', (event) => {
    if (event.target === siteMenu) closeMenu();
});
document.addEventListener('pointerdown', (event) => {
    if (!siteMenu.open || !siteMenu.classList.contains('is-open')) return;
    if (event.target.closest('.menu-panel') || event.target === menuToggle) return;
    closeMenu();
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && siteMenu.open) {
        event.preventDefault();
        closeMenu();
    }
});
siteMenu.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeMenu();
});
siteMenu.addEventListener('close', () => {
    if (siteMenu.open) return;
    clearTimeout(menuCloseTimer);
    siteMenu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.focus({ preventScroll: true });
});

/* =========================
   作品手動切換初始化
========================= */

const originalSlides = Array.from(document.querySelectorAll('.slide-item'));
const totalSlides = originalSlides.length;
const galleryPage = document.getElementById('gallery-page');
const galleryLoadStatus = document.getElementById('galleryLoadStatus');

originalSlides.forEach((slide, index) => {
    const artwork = seasonsData[index];
    const image = slide.querySelector('.slide-image img');
    if (!artwork || !image) return;

    slide.dataset.artworkId = artwork.number;
    slide.classList.toggle('has-artwork', artwork.hasArtwork);
    image.alt = artwork.alt;
    if (!artwork.hasArtwork) return;

    slide.style.setProperty('--artwork-backdrop-image', `url("${artwork.image}")`);
    slide.style.setProperty('--artwork-backdrop-image-small', `url("${artwork.imageSmall}")`);
    image.dataset.src = artwork.image;
    image.dataset.srcset = `${artwork.imageSmall} ${artwork.imageSmallWidth}w, ${artwork.image} ${artwork.imageWidth}w`;
    image.dataset.sizes = '(max-width: 768px) 92vw, (max-width: 1552px) 76vw, 1180px';
    image.width = artwork.imageWidth;
    image.height = artwork.imageHeight;
});

let currentIndex = 0;
let isAnimating = false;
let queuedSlideDirection = 0;
let turnAnimations = [];
let turnVersion = 0;
let cycleRotation = 0;
let cycleCompleteTimer;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const slideImageLoads = new WeakMap();
const galleryImageWaitLimit = 8000;

document.documentElement.style.setProperty('--cycle-angle', '0deg');

function prepareSlideImage(index, { highPriority = false } = {}) {
    const normalizedIndex = (index + totalSlides) % totalSlides;
    const slide = originalSlides[normalizedIndex];
    const image = slide?.querySelector('.slide-image img');
    if (!image) return Promise.resolve(false);

    image.draggable = false;
    if (highPriority) image.fetchPriority = 'high';
    image.loading = 'eager';

    if (!image.getAttribute('srcset') && image.dataset.srcset) {
        image.srcset = image.dataset.srcset;
        image.sizes = image.dataset.sizes || '100vw';
    }
    if (!image.getAttribute('src') && image.dataset.src) {
        image.src = image.dataset.src;
    }

    if (!image.getAttribute('src')) {
        slide.classList.add('is-image-unavailable');
        return Promise.resolve(false);
    }

    if (slideImageLoads.has(image)) return slideImageLoads.get(image);

    const loadPromise = (async () => {
        if (!image.complete) {
            await new Promise(resolve => {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
            });
        }

        const loaded = image.naturalWidth > 0;
        if (loaded && typeof image.decode === 'function') {
            try {
                await image.decode();
            } catch {
                // 已完成的圖片仍可顯示；decode 失敗不應阻止換作。
            }
        }

        slide.classList.toggle('is-image-unavailable', !loaded);
        return loaded;
    })();

    slideImageLoads.set(image, loadPromise);
    return loadPromise;
}

function preloadAdjacentSlides(index) {
    window.setTimeout(() => {
        void prepareSlideImage(index + 1, { highPriority: true });
        void prepareSlideImage(index - 1);
    }, 0);
}

function continueGalleryNavigation() {
    preloadAdjacentSlides(currentIndex);
    if (!originalSlides[currentIndex]?.classList.contains('is-image-unavailable') && galleryLoadStatus) {
        galleryLoadStatus.textContent = '';
    }
}

function updateBackgroundColor() {
    galleryPage?.style.setProperty('--gallery-tone', backgroundColors[currentIndex]);
}

function finishPageTurn() {
    turnVersion += 1;
    turnAnimations.forEach(animation => animation.cancel());
    turnAnimations = [];
    originalSlides.forEach((slide, index) => {
        const active = index === currentIndex;
        slide.classList.toggle('is-current', active);
        slide.classList.remove('is-turning');
        slide.setAttribute('aria-hidden', String(!active));
        slide.inert = !active;
        slide.style.removeProperty('z-index');
        slide.style.removeProperty('position');
    });
    isAnimating = false;
}

function continueQueuedSlideMove() {
    if (!queuedSlideDirection) return;
    const direction = queuedSlideDirection;
    queuedSlideDirection = 0;
    window.setTimeout(() => void moveSlide(direction), 0);
}

async function moveSlide(direction) {
    if (direction !== 1 && direction !== -1) return;
    if (isAnimating) {
        queuedSlideDirection = direction;
        return;
    }

    isAnimating = true;
    const version = ++turnVersion;
    const previousIndex = currentIndex;
    const outgoing = originalSlides[currentIndex];
    const nextIndex = (currentIndex + direction + totalSlides) % totalSlides;
    const targetImage = originalSlides[nextIndex]?.querySelector('.slide-image img');
    const targetReady = Boolean(targetImage?.complete && targetImage.naturalWidth > 0);
    galleryPage?.classList.toggle('is-awaiting-image', !targetReady);
    if (!targetReady && galleryLoadStatus) galleryLoadStatus.textContent = '正在準備下一幅作品。';
    let waitTimer;
    const imageReady = await Promise.race([
        prepareSlideImage(nextIndex, { highPriority: true }),
        new Promise(resolve => {
            waitTimer = window.setTimeout(() => resolve(null), galleryImageWaitLimit);
        })
    ]);
    window.clearTimeout(waitTimer);
    galleryPage?.classList.remove('is-awaiting-image');
    if (imageReady === null) {
        if (galleryLoadStatus) galleryLoadStatus.textContent = '圖片仍在載入，請稍後再按一次。';
        if (version === turnVersion) {
            finishPageTurn();
            continueQueuedSlideMove();
        }
        return;
    }
    if (galleryLoadStatus) galleryLoadStatus.textContent = imageReady ? '' : '這幅作品的圖像尚未提供。';
    if (version !== turnVersion) return;

    const incoming = originalSlides[nextIndex];
    const galleryProgress = galleryProgressTerm?.closest('.gallery-scroll-progress');
    const progressOpacity = galleryProgress
        ? Number.parseFloat(getComputedStyle(galleryProgress).opacity) || 1
        : 1;
    const commitSlideChange = () => {
        currentIndex = nextIndex;
        cycleRotation += direction * 15;
        document.documentElement.style.setProperty('--cycle-angle', `${cycleRotation}deg`);
        updateGalleryMeta(currentIndex);

        if (!reducedMotion.matches && direction === 1 && previousIndex === totalSlides - 1) {
            clearTimeout(cycleCompleteTimer);
            document.body.classList.remove('cycle-complete');
            void document.body.offsetWidth;
            document.body.classList.add('cycle-complete');
            cycleCompleteTimer = setTimeout(() => {
                document.body.classList.remove('cycle-complete');
            }, 900);
        }
    };

    if (reducedMotion.matches || typeof outgoing.animate !== 'function') {
        commitSlideChange();
        finishPageTurn();
        continueGalleryNavigation();
        continueQueuedSlideMove();
        return;
    }

    outgoing.classList.add('is-turning');
    outgoing.style.zIndex = '2';

    const fadeOutAnimations = [
        outgoing.animate([
            { opacity: 1 },
            { opacity: 0 }
        ], { duration: 260, easing: 'ease-in', fill: 'forwards' })
    ];
    if (galleryProgress) {
        fadeOutAnimations.push(galleryProgress.animate([
            { opacity: progressOpacity },
            { opacity: 0 }
        ], { duration: 220, easing: 'ease-in', fill: 'forwards' }));
    }
    turnAnimations = fadeOutAnimations;

    // 目標圖片完成載入與解碼後，整張作品與文字共同淡出、交接、淡入。
    // 圖片本體不做 scale／translate，避免殘影與動畫結束時的亞像素晃動。
    try {
        await Promise.all(fadeOutAnimations.map(animation => animation.finished));
        if (version !== turnVersion) return;

        commitSlideChange();
        outgoing.classList.remove('is-current', 'is-turning');
        outgoing.setAttribute('aria-hidden', 'true');
        outgoing.inert = true;
        incoming.classList.add('is-current', 'is-turning');
        incoming.setAttribute('aria-hidden', 'false');
        incoming.inert = false;
        incoming.style.zIndex = '2';

        const fadeInAnimations = [
            incoming.animate([
                { opacity: 0 },
                { opacity: 1 }
            ], { duration: 420, easing: 'ease-out', fill: 'both' })
        ];
        if (galleryProgress) {
            fadeInAnimations.push(galleryProgress.animate([
                { opacity: 0 },
                { opacity: progressOpacity }
            ], { duration: 360, easing: 'ease-out', fill: 'both' }));
        }

        fadeOutAnimations.forEach(animation => animation.cancel());
        turnAnimations = fadeInAnimations;
        await Promise.all(fadeInAnimations.map(animation => animation.finished));
    } catch {
        // 換到其他分頁時取消動畫，由 finishPageTurn 完成定位。
    } finally {
        if (version === turnVersion) {
            finishPageTurn();
            continueGalleryNavigation();
            continueQueuedSlideMove();
        }
    }
}

reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
        finishPageTurn();
    }
});
finishPageTurn();
void prepareSlideImage(0, { highPriority: true }).then(() => {
    preloadAdjacentSlides(currentIndex);
});

/* =========================
   垂直章節與作品閱讀進度
========================= */

const pageSections = Array.from(document.querySelectorAll('.page-content'));
const galleryProgressTerm = document.getElementById('galleryProgressTerm');
let currentSection = 'intro';
let scrollFrame = 0;
let scrollSettleTimer;

function closeMenuImmediately() {
    clearTimeout(menuCloseTimer);
    if (siteMenu.open) siteMenu.close();
    siteMenu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
}

function updateGalleryProgress(index) {
    const boundedIndex = Math.max(0, Math.min(totalSlides - 1, index));
    queuedSlideDirection = 0;
    currentIndex = boundedIndex;
    updateGalleryMeta(boundedIndex);
    finishPageTurn();
}

function updateGalleryMeta(index) {
    const boundedIndex = Math.max(0, Math.min(totalSlides - 1, index));
    const galleryTitle = originalSlides[boundedIndex]?.querySelector('h2')?.textContent.trim() || '';
    galleryProgressTerm.textContent = galleryTitle.split(/[｜|]/, 1)[0].trim();
    updateBackgroundColor();
}

function setCurrentSection(pageName) {
    if (!pageName) return;
    if (pageName === currentSection && document.body.dataset.section === pageName) return;
    currentSection = pageName;
    pageSections.forEach(section => {
        section.classList.toggle('active', section.id === `${pageName}-page`);
    });
    document.querySelectorAll('.nav-btn').forEach(button => {
        const active = button.dataset.page === pageName;
        button.classList.toggle('active', active);
        if (active) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
    });

    document.body.classList.toggle('gallery-section-active', pageName === 'gallery');
    document.body.dataset.section = pageName;
    document.getElementById('currentPageLabel').textContent = {
        intro: '理時序',
        gallery: '觀芳華',
        text: '繪春信',
        planning: '籌花事',
        messages: '寄墨箋',
        thanks: '銘同錄'
    }[pageName];
    if (pageName === 'gallery') updateGalleryMeta(currentIndex);
}

function navigateToSection(pageName) {
    const targetPage = document.getElementById(`${pageName}-page`);
    if (!targetPage) return;
    closeMenuImmediately();
    setCurrentSection(pageName);
    targetPage.scrollIntoView({
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
        block: 'start'
    });
}

function updateScrollState() {
    scrollFrame = 0;
    const scrollRoot = document.scrollingElement || document.documentElement;
    const maximumScroll = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
    const pageProgress = maximumScroll > 0 ? scrollRoot.scrollTop / maximumScroll : 0;
    const markerHeight = 44;
    const markerTravel = Math.max(0, window.innerHeight - markerHeight);
    document.documentElement.style.setProperty(
        '--section-marker-top',
        `${Math.min(1, Math.max(0, pageProgress)) * markerTravel}px`
    );
    const sectionLine = Math.min(window.innerHeight * 0.34, 300);
    let visibleSection = pageSections[0];
    pageSections.forEach(section => {
        if (section.getBoundingClientRect().top <= sectionLine) visibleSection = section;
    });
    const remainingScroll = scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight;
    const finalSection = pageSections[pageSections.length - 1];
    const finalSectionLine = Math.min(window.innerHeight * 0.55, 460);
    const finalSectionReached = finalSection.getBoundingClientRect().top <= finalSectionLine;
    const atPageEnd = remainingScroll <= Math.max(8, window.innerHeight * 0.01);
    if (finalSectionReached || atPageEnd) visibleSection = finalSection;
    setCurrentSection(visibleSection.id.replace('-page', ''));
}

function queueScrollState() {
    clearTimeout(scrollSettleTimer);
    scrollSettleTimer = setTimeout(updateScrollState, 120);
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(updateScrollState);
}

window.addEventListener('scroll', queueScrollState, { passive: true });
window.addEventListener('scrollend', updateScrollState);
window.addEventListener('resize', queueScrollState);
window.addEventListener('pageshow', queueScrollState);
reducedMotion.addEventListener('change', () => {
    updateGalleryProgress(currentIndex);
    queueScrollState();
});

updateGalleryProgress(0);
queueScrollState();

/* =========================
   主要內容重複進入視窗
========================= */

const contentRevealTargets = Array.from(document.querySelectorAll([
    '.gallery-section-heading',
    '.gallery-stage',
    '#text-page .text-container',
    '#planning-page .text-container',
    '#messages-page .messages-container',
    '#thanks-page .text-container',
    '.site-epilogue-final'
].join(', ')));

if (contentRevealTargets.length && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('has-content-reveal');

    const contentRevealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const target = entry.target;
            if (entry.isIntersecting) {
                target.classList.add('is-content-visible');
                return;
            }

            const exitedAboveViewport = entry.boundingClientRect.bottom <= 0;
            target.style.setProperty('--content-reveal-y', exitedAboveViewport ? '-20px' : '24px');
            target.classList.remove('is-content-visible');
        });
    }, {
        threshold: 0.14,
        rootMargin: '0px 0px -7% 0px'
    });

    contentRevealTargets.forEach((target) => {
        const startsAboveViewport = target.getBoundingClientRect().bottom <= 0;
        target.style.setProperty('--content-reveal-y', startsAboveViewport ? '-20px' : '24px');
        target.classList.add('content-reveal');
        contentRevealObserver.observe(target);
    });
}

/* =========================
   序章節氣環預覽
========================= */

const solarCycle = document.querySelector('.solar-cycle');
const solarTerms = Array.from(document.querySelectorAll('.solar-term'));
const solarCenterTerm = document.getElementById('solarCenterTerm');
const solarCenterNote = document.getElementById('solarCenterNote');
const solarTrailLayer = document.querySelector('.solar-trail-layer');
let solarLeafAngle = 0;
let solarTypingTimer;
let solarHoverTimer;
let solarPreviewVersion = 0;
let solarAutoplayTimer;
let solarAutoplayIndex = 0;
let solarActiveIndex = 0;
let solarCycleVisible = true;
const solarAutoplayInterval = 2200;
const solarAutoplayPreviewDelay = 120;
const solarTermNotes = seasonsData.map(season => season.note);
const solarSeasons = ['spring', 'summer', 'autumn', 'winter'];
const solarSeasonTrailColors = [
    'rgba(177, 197, 164, 0.62)',
    'rgba(218, 190, 146, 0.6)',
    'rgba(207, 174, 165, 0.58)',
    'rgba(171, 193, 208, 0.62)'
];

function typeSolarText(target, text, delay, version, onComplete) {
    const characters = Array.from(text);
    let position = 0;
    target.textContent = '';

    const writeNextCharacter = () => {
        if (version !== solarPreviewVersion) return;
        target.textContent += characters[position];
        position += 1;

        if (position < characters.length) {
            solarTypingTimer = setTimeout(writeNextCharacter, delay);
        } else if (onComplete) {
            solarTypingTimer = setTimeout(() => {
                if (version === solarPreviewVersion) onComplete();
            }, 130);
        }
    };

    writeNextCharacter();
}

function writeSolarPreview(termText, noteText) {
    clearTimeout(solarTypingTimer);
    const version = ++solarPreviewVersion;
    solarCenterTerm.getAnimations().forEach(animation => animation.cancel());
    solarCenterTerm.textContent = termText;
    solarCenterNote.textContent = '';

    if (reducedMotion.matches) {
        solarCenterNote.textContent = noteText;
        return;
    }

    solarCenterTerm.animate([
        { opacity: 0.18 },
        { opacity: 1 }
    ], {
        duration: 760,
        easing: 'ease-out',
        fill: 'both'
    });

    solarTypingTimer = setTimeout(() => {
        if (version === solarPreviewVersion) {
            typeSolarText(solarCenterNote, noteText, 96, version);
        }
    }, 420);
}

function followSolarTerm(term, index) {
    solarActiveIndex = index;
    const targetAngle = index * 15;
    const currentAngle = ((solarLeafAngle % 360) + 360) % 360;
    const shortestTurn = ((targetAngle - currentAngle + 540) % 360) - 180;
    solarLeafAngle += shortestTurn;
    solarCycle.style.setProperty('--solar-leaf-angle', `${solarLeafAngle}deg`);
    const seasonIndex = Math.floor(index / 6);
    solarCycle.dataset.season = solarSeasons[seasonIndex];

    // Keep the background clock advancing while avoiding off-screen trail and
    // label work that cannot be seen, especially on mobile devices.
    if (!solarCycleVisible) return;

    solarTerms.forEach(item => item.classList.toggle('is-previewing', item === term));
    solarCycle.classList.add('is-previewing');

    if (!reducedMotion.matches) {
        const trailPoint = document.createElement('span');
        trailPoint.className = 'solar-trail-point';
        trailPoint.style.setProperty('--trail-angle', `${targetAngle}deg`);
        trailPoint.style.setProperty('--trail-color', solarSeasonTrailColors[seasonIndex]);
        solarTrailLayer.append(trailPoint);
        setTimeout(() => trailPoint.remove(), 1150);

    }
}

function previewSolarTerm(term, index) {
    if (!solarCycleVisible) return;
    writeSolarPreview(term.textContent.trim(), solarTermNotes[index]);
    solarCycle.classList.add('has-preview');
}

function clearSolarTermPreview() {
    clearTimeout(solarHoverTimer);
    clearTimeout(solarTypingTimer);
    solarPreviewVersion += 1;
    solarTerms.forEach(item => item.classList.remove('is-previewing'));
    solarCycle.classList.remove('is-previewing');
    solarCycle.classList.remove('has-preview');
    delete solarCycle.dataset.season;
    solarCenterTerm.getAnimations().forEach(animation => animation.cancel());
    solarCenterTerm.textContent = '';
    solarCenterNote.textContent = '';
}

function stopSolarAutoplay() {
    clearTimeout(solarAutoplayTimer);
    clearTimeout(solarHoverTimer);
    clearTimeout(solarTypingTimer);
    solarAutoplayTimer = undefined;
    solarPreviewVersion += 1;
}

function runSolarAutoplayStep() {
    const entranceStillBlocking = entrance.open && !entrance.classList.contains('is-opening');
    if (document.hidden || entranceStillBlocking) return;
    const index = solarAutoplayIndex;
    const term = solarTerms[index];

    clearTimeout(solarHoverTimer);
    followSolarTerm(term, index);
    solarHoverTimer = setTimeout(() => {
        previewSolarTerm(term, index);
    }, reducedMotion.matches ? 0 : solarAutoplayPreviewDelay);

    solarAutoplayTimer = setTimeout(() => {
        solarAutoplayIndex = (index + 1) % solarTerms.length;
        runSolarAutoplayStep();
    }, solarAutoplayInterval);
}

function startSolarAutoplay(reset = false) {
    stopSolarAutoplay();
    if (reset) {
        solarAutoplayIndex = 0;
        solarLeafAngle = 0;
    }
    const entranceStillBlocking = entrance.open && !entrance.classList.contains('is-opening');
    if (!document.hidden && !entranceStillBlocking) runSolarAutoplayStep();
}

if (solarCycle && 'IntersectionObserver' in window) {
    const solarCycleBounds = solarCycle.getBoundingClientRect();
    solarCycleVisible = solarCycleBounds.bottom >= -180
        && solarCycleBounds.top <= window.innerHeight + 180;

    const solarCycleVisibilityObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;

        const wasVisible = solarCycleVisible;
        solarCycleVisible = entry.isIntersecting;

        if (!solarCycleVisible) {
            clearTimeout(solarHoverTimer);
            clearTimeout(solarTypingTimer);
            solarPreviewVersion += 1;
            solarCenterTerm.getAnimations().forEach(animation => animation.cancel());
            return;
        }

        if (!wasVisible && !document.hidden && !entrance.open) {
            const activeTerm = solarTerms[solarActiveIndex];
            if (activeTerm) {
                followSolarTerm(activeTerm, solarActiveIndex);
                previewSolarTerm(activeTerm, solarActiveIndex);
            }
        }
    }, {
        rootMargin: '180px 0px',
        threshold: 0
    });

    solarCycleVisibilityObserver.observe(solarCycle);
}

/* =========================
   後段章節標題交錯與寄語橫向循環
========================= */

    document.querySelectorAll('.section-label').forEach((label) => {
        const chapterMatch = label.textContent.match(/\d+/);
        if (!chapterMatch) return;

        const chapterNumber = Number.parseInt(chapterMatch[0], 10);
        if (chapterNumber < 3) return;

        const section = label.closest('section');
        const title = section
            ? Array.from(section.querySelectorAll('h1, h2, h3')).find((heading) => (
                Boolean(label.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING)
            ))
            : null;
        const side = chapterNumber % 2 === 1 ? 'right' : 'left';

        if (side === 'right') {
            label.classList.add('chapter-heading-right');
        }
        if (title) {
            title.classList.add('chapter-display-title', `chapter-heading-${side}`);
        }
    });

    const messagesTrack = document.getElementById('messagesTrack');
const messagesViewport = document.getElementById('messagesViewport');
const messagesPrev = document.getElementById('messagesPrev');
const messagesNext = document.getElementById('messagesNext');
const messagesStatus = document.getElementById('messagesStatus');
const messageSheets = messagesTrack ? Array.from(messagesTrack.querySelectorAll('.message-sheet')) : [];
const messageGroups = [];
let currentMessageGroup = 0;
    let isMessagesAnimating = false;
    let messageGroupVersion = 0;
let messageGroupAnimations = [];
let messagesTouchStartX = 0;
let messagesTouchStartY = 0;

if (messagesTrack) {
    messageSheets.forEach(sheet => {
        const group = document.createElement('div');
        group.className = 'message-group';
        group.dataset.count = '1';
        group.setAttribute('role', 'group');
        group.append(sheet);
        messagesTrack.append(group);
        messageGroups.push(group);
    });
}

    function finishMessageGroup(targetIndex = currentMessageGroup) {
        messageGroupVersion += 1;
    messageGroupAnimations.forEach(animation => animation.cancel());
    messageGroupAnimations = [];
    currentMessageGroup = targetIndex;
    messageGroups.forEach((group, index) => {
        const active = index === targetIndex;
        group.classList.toggle('is-current', active);
        group.setAttribute('aria-hidden', String(!active));
        group.inert = !active;
    });
    if (messagesStatus) {
        messagesStatus.textContent = `第 ${targetIndex + 1} 頁，共 ${messageGroups.length} 頁`;
    }
    isMessagesAnimating = false;
}

async function moveMessageGroup(direction) {
    if (messageGroups.length <= 1 || isMessagesAnimating) return;
    const outgoingIndex = currentMessageGroup;
    const incomingIndex = (outgoingIndex + direction + messageGroups.length) % messageGroups.length;
    const outgoing = messageGroups[outgoingIndex];
    const incoming = messageGroups[incomingIndex];

    if (reducedMotion.matches || typeof incoming.animate !== 'function') {
        finishMessageGroup(incomingIndex);
        return;
    }

    isMessagesAnimating = true;
    const transitionVersion = ++messageGroupVersion;
    const travel = direction > 0 ? 104 : -104;
    incoming.classList.add('is-current');
    incoming.removeAttribute('aria-hidden');
    incoming.inert = false;
    const transitionOptions = {
        duration: 680,
        easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
        fill: 'forwards'
    };
    const outgoingAnimation = outgoing.animate([
        { transform: 'translate3d(0, 0, 0)' },
        { transform: `translate3d(${-travel}%, 0, 0)` }
    ], transitionOptions);
    const incomingAnimation = incoming.animate([
        { transform: `translate3d(${travel}%, 0, 0)` },
        { transform: 'translate3d(0, 0, 0)' }
    ], transitionOptions);
    messageGroupAnimations = [outgoingAnimation, incomingAnimation];

    try {
        await Promise.all(messageGroupAnimations.map(animation => animation.finished));
    } catch {
        // 快速切換或 reduced-motion 變更時，由 finishMessageGroup 統一復原。
    } finally {
        if (transitionVersion === messageGroupVersion) {
            finishMessageGroup(incomingIndex);
        }
    }
}

if (messagesPrev && messagesNext && messagesViewport) {
    const hasMultipleGroups = messageGroups.length > 1;
    messagesPrev.hidden = !hasMultipleGroups;
    messagesNext.hidden = !hasMultipleGroups;
    messagesPrev.addEventListener('click', () => moveMessageGroup(-1));
    messagesNext.addEventListener('click', () => moveMessageGroup(1));
    messagesViewport.addEventListener('touchstart', event => {
        messagesTouchStartX = event.changedTouches[0].clientX;
        messagesTouchStartY = event.changedTouches[0].clientY;
    }, { passive: true });
    messagesViewport.addEventListener('touchend', event => {
        const deltaX = event.changedTouches[0].clientX - messagesTouchStartX;
        const deltaY = event.changedTouches[0].clientY - messagesTouchStartY;
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
            moveMessageGroup(deltaX < 0 ? 1 : -1);
        }
    }, { passive: true });
    finishMessageGroup(0);
}

const rosterTrack = document.getElementById('commissionRoster');
const rosterViewport = document.getElementById('rosterViewport');
const rosterPrev = document.getElementById('rosterPrev');
const rosterNext = document.getElementById('rosterNext');
const rosterStatus = document.getElementById('rosterStatus');
const rosterCards = rosterTrack
    ? Array.from(rosterTrack.querySelectorAll('.commission-roster-card'))
    : [];
const rosterMobile = window.matchMedia('(max-width: 700px)');
let currentRosterCard = 0;
let rosterTouchStartX = 0;
let rosterTouchStartY = 0;

function updateRosterCarousel(targetIndex = currentRosterCard, announce = true) {
    if (!rosterTrack || !rosterCards.length) return;
    currentRosterCard = (targetIndex + rosterCards.length) % rosterCards.length;
    const mobile = rosterMobile.matches;

    rosterTrack.style.setProperty('--roster-offset', `${currentRosterCard * -100}%`);
    rosterCards.forEach((card, index) => {
        const active = index === currentRosterCard;
        if (mobile) {
            card.setAttribute('aria-hidden', String(!active));
            card.inert = !active;
        } else {
            card.removeAttribute('aria-hidden');
            card.inert = false;
        }
    });

    if (rosterPrev && rosterNext) {
        const hideControls = !mobile || rosterCards.length <= 1;
        rosterPrev.hidden = hideControls;
        rosterNext.hidden = hideControls;
    }
    if (announce && rosterStatus && mobile) {
        rosterStatus.textContent = `第 ${currentRosterCard + 1} 組，共 ${rosterCards.length} 組`;
    }
}

function moveRosterCard(direction) {
    if (!rosterMobile.matches || rosterCards.length <= 1) return;
    updateRosterCarousel(currentRosterCard + direction);
}

if (rosterTrack && rosterViewport && rosterPrev && rosterNext) {
    rosterPrev.addEventListener('click', () => moveRosterCard(-1));
    rosterNext.addEventListener('click', () => moveRosterCard(1));
    rosterViewport.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        moveRosterCard(event.key === 'ArrowRight' ? 1 : -1);
    });
    rosterViewport.addEventListener('touchstart', event => {
        rosterTouchStartX = event.changedTouches[0].clientX;
        rosterTouchStartY = event.changedTouches[0].clientY;
    }, { passive: true });
    rosterViewport.addEventListener('touchend', event => {
        const deltaX = event.changedTouches[0].clientX - rosterTouchStartX;
        const deltaY = event.changedTouches[0].clientY - rosterTouchStartY;
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
            moveRosterCard(deltaX < 0 ? 1 : -1);
        }
    }, { passive: true });
    rosterMobile.addEventListener('change', () => updateRosterCarousel(currentRosterCard, false));
    updateRosterCarousel(0, false);
}

reducedMotion.addEventListener('change', () => {
    if (isMessagesAnimating) finishMessageGroup(currentMessageGroup);
});

// 使用獨立的 scale 動畫，避免覆蓋箭頭本身的垂直定位。
const buttonAnimations = new WeakMap();
document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.id === 'enterExhibition' || button.disabled || reducedMotion.matches || typeof button.animate !== 'function') return;
    buttonAnimations.get(button)?.cancel();
    buttonAnimations.set(button, button.animate([
        { scale: '0.97' },
        { scale: '1' }
    ], { duration: 220, easing: 'ease-out' }));
}, true);

/* 手機左右滑動 */
const carouselViewport = document.querySelector('.carousel-viewport');

let touchStartX = 0;
let touchStartY = 0;

carouselViewport.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    void moveSlide(event.key === 'ArrowRight' ? 1 : -1);
});

carouselViewport.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
}, { passive: true });

carouselViewport.addEventListener('touchend', (event) => {
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    /* 至少滑動 50px 才判定為有效手勢 */
    const swipeThreshold = 50;

    /* 水平距離必須大於 50px 且大於垂直距離，避免上下滑頁面時誤切圖片 */
    if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
        /* 往左滑 → 下一張 */
        if (deltaX < 0) {
            moveSlide(1);
        }
        /* 往右滑 → 上一張 */
        else {
            moveSlide(-1);
        }
    }
}, { passive: true });

/* 開場與背景音樂：play 必須在點擊事件內立即呼叫，不等待淡出結束。 */
const entrance = document.getElementById('entrance');
const backgroundMusic = document.getElementById('backgroundMusic');
const musicToggle = document.getElementById('musicToggle');
const musicStatus = document.getElementById('musicStatus');
const entranceTransitionCurtain = entrance.querySelector('.entrance-transition-curtain');
const temporalSculpture = document.querySelector('.temporal-sculpture');
const hasBackgroundMusic = Boolean(backgroundMusic.getAttribute('src')?.trim());
let enteringExhibition = false;
let musicFadeFrame;
let musicRequest = 0;
let wantsMusic = false;

function resetExhibitionToStart() {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    root.style.scrollBehavior = previousScrollBehavior;
    setCurrentSection('intro');
}

musicToggle.hidden = !hasBackgroundMusic;
document.getElementById('enterQuietly').hidden = !hasBackgroundMusic;
document.getElementById('entranceMusicHint').hidden = !hasBackgroundMusic;

function updateMusicControl() {
    const playing = !backgroundMusic.paused;
    musicToggle.textContent = playing ? '音樂 / 暫停' : '音樂 / 播放';
    musicToggle.setAttribute('aria-label', playing ? '暫停背景音樂' : '播放背景音樂');
}

function startMusic() {
    if (!hasBackgroundMusic) return;
    wantsMusic = true;
    const request = ++musicRequest;
    cancelAnimationFrame(musicFadeFrame);
    musicStatus.textContent = '';
    backgroundMusic.volume = 0;
    // 直接在使用者點擊時開始播放，保留瀏覽器的互動授權。
    backgroundMusic.play().then(() => {
        if (request !== musicRequest) return;
        updateMusicControl();
        const start = performance.now();
        const fadeIn = now => {
            const progress = Math.min((now - start) / 1800, 1);
            backgroundMusic.volume = 0.22 * progress;
            if (progress < 1) musicFadeFrame = requestAnimationFrame(fadeIn);
        };
        musicFadeFrame = requestAnimationFrame(fadeIn);
    }).catch(() => {
        if (request !== musicRequest) return;
        wantsMusic = false;
        updateMusicControl();
        musicStatus.textContent = '音樂暫時無法播放，仍可繼續欣賞作品。';
    });
}

function pauseMusic() {
    wantsMusic = false;
    musicRequest += 1;
    cancelAnimationFrame(musicFadeFrame);
    backgroundMusic.pause();
    musicStatus.textContent = '';
    updateMusicControl();
}

musicToggle.addEventListener('click', () => {
    if (wantsMusic) pauseMusic();
    else startMusic();
});
backgroundMusic.addEventListener('play', updateMusicControl);
backgroundMusic.addEventListener('pause', updateMusicControl);
backgroundMusic.addEventListener('error', () => {
    if (!hasBackgroundMusic) return;
    pauseMusic();
    musicStatus.textContent = '音樂暫時無法播放，仍可繼續欣賞作品。';
});

async function enterExhibition(withMusic = true) {
    if (enteringExhibition) return;
    enteringExhibition = true;
    resetExhibitionToStart();
    if (withMusic) startMusic();
    const transitionAnimations = [];
    let sculptureFocusAnimation;
    let solarAutoplayStartedDuringEntrance = false;
    try {
        if (!reducedMotion.matches && typeof entrance.animate === 'function') {
            const triggerBounds = entranceTrigger.getBoundingClientRect();
            const focusX = Math.max(0, Math.min(window.innerWidth, triggerBounds.left + triggerBounds.width / 2));
            const focusY = Math.max(0, Math.min(window.innerHeight, triggerBounds.top + triggerBounds.height / 2));
            entranceTransitionCurtain.style.setProperty('--entrance-focus-x', `${focusX}px`);
            entranceTransitionCurtain.style.setProperty('--entrance-focus-y', `${focusY}px`);
            entrance.style.setProperty('--entrance-focus-x', `${focusX}px`);
            entrance.style.setProperty('--entrance-focus-y', `${focusY}px`);
            document.documentElement.classList.add('entrance-transitioning');
            entrance.classList.add('is-transitioning');

            const fadingElements = [
                entrance.querySelector('h1'),
                document.getElementById('entranceDescription'),
                document.getElementById('entranceMusicHint'),
                document.getElementById('enterQuietly')
            ].filter(element => element && !element.hidden);

            const focusAnimations = fadingElements.map(element => element.animate([
                { opacity: 1, transform: 'translate3d(0, 0, 0)' },
                { opacity: 0, transform: 'translate3d(0, -8px, 0)' }
            ], {
                duration: 650,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards'
            }));

            const entranceAtmosphere = entrance.querySelector('.entrance-atmosphere');
            if (entranceAtmosphere) {
                focusAnimations.push(entranceAtmosphere.animate([
                    { opacity: 1 },
                    { opacity: 0 }
                ], {
                    duration: 780,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    fill: 'forwards'
                }));
            }

            if (temporalSculpture) {
                sculptureFocusAnimation = temporalSculpture.animate([
                    { opacity: Number.parseFloat(getComputedStyle(temporalSculpture).opacity) || 1 },
                    { opacity: 0 }
                ], {
                    duration: 700,
                    easing: 'ease-in-out',
                    fill: 'forwards'
                });
                focusAnimations.push(sculptureFocusAnimation);
            }

            transitionAnimations.push(...focusAnimations);
            // 不等待封面所有元素完全消失；讓退場與圓形開口重疊，避免空白底色停頓。
            await new Promise(resolve => window.setTimeout(resolve, 300));

            // 入口與光暈先完整退場，避免圓形遮罩邊緣穿過文字。
            const entranceExitAnimation = entranceTrigger.animate([
                { opacity: 1, transform: 'scale(1.08)' },
                { opacity: 0, transform: 'scale(1.16)' }
            ], {
                duration: 210,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards'
            });
            transitionAnimations.push(entranceExitAnimation);
            await Promise.race([
                entranceExitAnimation.finished,
                new Promise(resolve => window.setTimeout(resolve, 250))
            ]);

            const revealStartRadius = Math.hypot(triggerBounds.width, triggerBounds.height) / 2 + 28;
            entrance.style.setProperty('--entrance-reveal-start-radius', `${revealStartRadius}px`);
            entrance.classList.add('is-reveal-ready');
            getComputedStyle(entrance).getPropertyValue('--entrance-reveal-radius');
            await new Promise(resolve => requestAnimationFrame(resolve));
            entrance.classList.add('is-opening');

            // 直接在真實封面上打開圓形缺口；內頁本身不再參與裁切動畫。
            document.body.classList.remove('entrance-open');
            document.documentElement.classList.remove('entrance-open');
            await new Promise(resolve => window.setTimeout(resolve, 650));
            startSolarAutoplay(true);
            solarAutoplayStartedDuringEntrance = true;
            await new Promise(resolve => window.setTimeout(resolve, 800));
        }
    } finally {
        resetExhibitionToStart();
        entrance.close();
        document.body.classList.remove('entrance-open');
        document.documentElement.classList.remove('entrance-open');
        document.documentElement.classList.remove('entrance-transitioning');
        entrance.classList.remove('is-transitioning', 'is-reveal-ready', 'is-opening');
        entranceTransitionCurtain.style.removeProperty('--entrance-focus-x');
        entranceTransitionCurtain.style.removeProperty('--entrance-focus-y');
        entrance.style.removeProperty('--entrance-focus-x');
        entrance.style.removeProperty('--entrance-focus-y');
        entrance.style.removeProperty('--entrance-reveal-start-radius');
        transitionAnimations.forEach(animation => animation.cancel());

        if (sculptureFocusAnimation && temporalSculpture) {
            sculptureFocusAnimation.cancel();
            const targetOpacity = Number.parseFloat(getComputedStyle(temporalSculpture).opacity) || 0.44;
            temporalSculpture.animate([
                { opacity: 0 },
                { opacity: targetOpacity }
            ], {
                duration: 720,
                easing: 'ease-out'
            });
        }

        if (!solarAutoplayStartedDuringEntrance) startSolarAutoplay(true);
        menuToggle.focus({ preventScroll: true });
    }
}

document.getElementById('enterExhibition').addEventListener('click', () => enterExhibition());
document.getElementById('enterQuietly').addEventListener('click', () => enterExhibition(false));
// 依滑鼠與實際可點擊區域的距離，逐漸增強提示；不移動點擊區域。
const entranceTrigger = document.getElementById('enterExhibition');
let lastEntrancePointer = null;
let entranceKeyboardMode = false;
let entranceStrength = 0;

function setEntranceProximity(strength) {
    // 縮回比放大慢；只改文字，不改實際感應區域的尺寸。
    entranceTrigger.style.setProperty('--response-duration', strength < entranceStrength ? '850ms' : '450ms');
    entranceTrigger.style.setProperty('--proximity', strength.toFixed(4));
    entranceStrength = strength;
}

function refreshEntranceProximity() {
    if (!entrance.open || enteringExhibition) return;
    if (entranceKeyboardMode && entranceTrigger === document.activeElement) {
        setEntranceProximity(1);
        return;
    }
    if (!lastEntrancePointer) {
        // 重新整理時滑鼠可能已停在入口上，不必先點擊才能啟用。
        setEntranceProximity(entranceTrigger.matches(':hover') ? 1 : 0);
        return;
    }
    const rect = entranceTrigger.getBoundingClientRect();
    const dx = Math.max(rect.left - lastEntrancePointer.x, 0, lastEntrancePointer.x - rect.right);
    const dy = Math.max(rect.top - lastEntrancePointer.y, 0, lastEntrancePointer.y - rect.bottom);
    const progress = Math.max(0, 1 - Math.hypot(dx, dy) / 320);
    // 平滑曲線的兩端斜率為零，避免進出感應邊界時突然改變。
    setEntranceProximity(progress * progress * (3 - 2 * progress));
}

function trackEntrancePointer(event) {
    if (!entrance.open || enteringExhibition || event.pointerType === 'touch') return;
    entranceKeyboardMode = false;
    lastEntrancePointer = { x: event.clientX, y: event.clientY };
    refreshEntranceProximity();
}

function clearEntranceProximity() {
    lastEntrancePointer = null;
    setEntranceProximity(0);
}

// 載入就註冊在視窗捕獲階段；不依賴點擊、焦點或音樂播放狀態。
window.addEventListener('keydown', event => {
    if (entrance.open && event.key === 'Tab') entranceKeyboardMode = true;
}, true);
window.addEventListener('pointermove', trackEntrancePointer, { capture: true, passive: true });
window.addEventListener('mousemove', trackEntrancePointer, { capture: true, passive: true });
window.addEventListener('pointerover', trackEntrancePointer, { capture: true, passive: true });
document.documentElement.addEventListener('pointerleave', clearEntranceProximity);
window.addEventListener('blur', clearEntranceProximity);
window.addEventListener('focus', refreshEntranceProximity);
window.addEventListener('pageshow', refreshEntranceProximity);
window.addEventListener('resize', refreshEntranceProximity);
entrance.addEventListener('scroll', refreshEntranceProximity, { passive: true });
entranceTrigger.addEventListener('focus', refreshEntranceProximity);
entranceTrigger.addEventListener('blur', refreshEntranceProximity);
entrance.addEventListener('close', clearEntranceProximity);
entrance.addEventListener('cancel', event => {
    event.preventDefault();
    enterExhibition(false);
});
resetExhibitionToStart();
entrance.showModal();
entrance.focus({ preventScroll: true });
document.body.classList.add('entrance-open');
document.documentElement.classList.add('entrance-open');
requestAnimationFrame(() => {
    resetExhibitionToStart();
    document.documentElement.classList.remove('entrance-pending');
    refreshEntranceProximity();
});

window.addEventListener('pageshow', () => {
    if (!entrance.open) return;
    resetExhibitionToStart();
    requestAnimationFrame(resetExhibitionToStart);
});

/* 漸進式 Vite 遷移期間，保留現有 HTML inline handler 的公開介面。 */
Object.assign(window, {
    openMenu,
    closeMenu,
    navigateToSection,
    moveSlide
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopSolarAutoplay();
    else if (!entrance.open) startSolarAutoplay();
});

reducedMotion.addEventListener('change', () => {
    if (!entrance.open && !document.hidden) startSolarAutoplay();
});
