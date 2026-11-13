import { seasonsData } from './src/data/seasons.js';
import { createApp, shallowRef } from 'vue';
import ChapterNavigation from './src/components/ChapterNavigation.vue';
import ChapterBackground from './src/components/ChapterBackground.vue';
import { gsap } from 'gsap';

// 單次過場依真實經過時間收束，避免低幀率或分頁節流延長入口等待。
gsap.ticker.lagSmoothing(0);
document.documentElement.classList.add('gsap-motion');

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';


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

function finishPageTurn() {
    turnVersion += 1;
    turnAnimations.forEach(animation => animation.kill());
    turnAnimations = [];
    originalSlides.forEach((slide, index) => {
        const active = index === currentIndex;
        slide.classList.toggle('is-current', active);
        slide.classList.remove('is-turning');
        slide.setAttribute('aria-hidden', String(!active));
        slide.inert = !active;
        slide.style.removeProperty('z-index');
        slide.style.removeProperty('position');
        slide.style.removeProperty('opacity');
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
    const commitSlideChange = () => {
        currentIndex = nextIndex;
        cycleRotation += direction * 15;
        gsap.to(document.documentElement, { '--cycle-angle': `${cycleRotation}deg`, duration: reducedMotion.matches ? 0 : 0.98, ease: 'power2.out', overwrite: 'auto' });
        updateGalleryMeta(currentIndex);

        if (!reducedMotion.matches && direction === 1 && previousIndex === totalSlides - 1) {
            gsap.fromTo('.gallery-progress-orbit', { opacity: 0.65 }, { opacity: 1, duration: 0.9, ease: 'sine.out', clearProps: 'opacity', overwrite: 'auto' });
        }
    };

    if (reducedMotion.matches) {
        commitSlideChange();
        finishPageTurn();
        continueGalleryNavigation();
        continueQueuedSlideMove();
        return;
    }

    outgoing.classList.add('is-turning');
    outgoing.style.zIndex = '2';

    // 新圖解碼後疊入完整舊圖，文字與圖面共同淡入，避免交接時露底。
    try {
        await new Promise(resolve => {
            const timeline = gsap.timeline({ onComplete: () => resolve(), onInterrupt: () => resolve() });
            turnAnimations = [timeline];
            timeline
                .call(() => {
                    if (version !== turnVersion) return;
                    commitSlideChange();
                    outgoing.classList.remove('is-current');
                    outgoing.setAttribute('aria-hidden', 'true');
                    outgoing.inert = true;
                    incoming.classList.add('is-current', 'is-turning');
                    incoming.setAttribute('aria-hidden', 'false');
                    incoming.inert = false;
                    incoming.style.zIndex = '3';
                })
                .fromTo(incoming, { opacity: 0 }, { opacity: 1, duration: 0.68, ease: 'sine.inOut', immediateRender: false });
        });
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
   獨立章節與作品閱讀進度
========================= */

const pageSections = Array.from(document.querySelectorAll('.page-content'));
// 各章內容作為完整構圖等比例置中。
pageSections.forEach(section => {
    const content = document.createElement('div');
    content.className = 'chapter-page-fit';
    content.append(...section.childNodes);
    section.append(content);
});
const galleryProgressTerm = document.getElementById('galleryProgressTerm');
// 共用章節來源：選章寫入，Vue 導覽讀取；捲動只更新當前頁閱讀進度。
const currentChapter = shallowRef('intro');
createApp(ChapterNavigation, { currentChapter, navigate: navigateToSection }).mount('#chapter-navigation');
createApp(ChapterBackground, { currentChapter }).mount('#chapter-background');
let currentSection = 'intro';
let requestedChapter = 'intro';
let chapterTimeline;

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
}

function setCurrentSection(pageName) {
    if (!pageName) return;
    if (pageName === currentSection && document.body.dataset.section === pageName) return;
    currentSection = pageName;
    currentChapter.value = pageName;
    pageSections.forEach(section => {
        const active = section.id === `${pageName}-page`;
        section.classList.toggle('active', active);
        section.hidden = !active;
        section.inert = !active;
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
    requestedChapter = pageName;
    const wasSwitching = Boolean(chapterTimeline);
    chapterTimeline?.kill();
    chapterTimeline = null;
    const outgoing = document.getElementById(`${currentSection}-page`);
    const commit = () => {
        setCurrentSection(pageName);
        fitCurrentChapter();
        if (pageName === 'intro') startSolarAutoplay();
        else stopSolarAutoplay();
        targetPage.setAttribute('tabindex', '-1');
        targetPage.focus({ preventScroll: true });
    };

    if (reducedMotion.matches || document.hidden) {
        gsap.set(pageSections, { clearProps: 'opacity' });
        commit();
        return;
    }
    if (outgoing === targetPage && !wasSwitching) return;

    chapterTimeline = gsap.timeline({
        onComplete: () => {
            gsap.set(pageSections, { clearProps: 'opacity' });
            chapterTimeline = null;
        }
    });
    chapterTimeline
        .to(outgoing, { opacity: 0, duration: 0.22, ease: 'power1.inOut' })
        .call(commit)
        .fromTo(targetPage, { opacity: 0 }, { opacity: 1, duration: 0.48, ease: 'power2.out', immediateRender: false });
}

function fitCurrentChapter() {
    chapterFitFrame = 0;
    const section = document.getElementById(`${currentSection}-page`);
    const content = section.querySelector('.chapter-page-fit');
    const availableHeight = Math.max(1, section.clientHeight - 40);
    const scale = Math.min(1, availableHeight / Math.max(1, content.offsetHeight));
    content.style.setProperty('--chapter-fit-scale', String(scale));
}

let chapterFitFrame = 0;
function queueChapterFit() {
    if (chapterFitFrame) return;
    chapterFitFrame = requestAnimationFrame(fitCurrentChapter);
}

const chapterResizeObserver = new ResizeObserver(queueChapterFit);
pageSections.forEach(section => chapterResizeObserver.observe(section.querySelector('.chapter-page-fit')));
window.addEventListener('resize', queueChapterFit);
window.visualViewport?.addEventListener('resize', queueChapterFit);
document.fonts?.ready.then(queueChapterFit);
reducedMotion.addEventListener('change', () => {
    updateGalleryProgress(currentIndex);
    if (reducedMotion.matches && chapterTimeline) navigateToSection(requestedChapter);
    queueChapterFit();
});

updateGalleryProgress(0);
setCurrentSection('intro');
queueChapterFit();

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

function writeSolarPreview(termText, noteText) {
    solarTypingTimer?.kill();
    const version = ++solarPreviewVersion;
    gsap.killTweensOf(solarCenterTerm);
    solarCenterTerm.textContent = termText;
    solarCenterNote.textContent = '';
    if (reducedMotion.matches) {
        solarCenterNote.textContent = noteText;
        gsap.set(solarCenterTerm, { clearProps: 'opacity' });
        return;
    }
    const characters = Array.from(noteText);
    const typing = { count: 1 };
    solarTypingTimer = gsap.timeline()
        .fromTo(solarCenterTerm, { opacity: 0.18 }, { opacity: 1, duration: 0.76, ease: 'power1.out', clearProps: 'opacity' }, 0)
        .call(() => { solarCenterNote.textContent = characters[0] || ''; }, [], 0.42)
        .to(typing, {
            count: characters.length,
            duration: Math.max(0.096, (characters.length - 1) * 0.096),
            ease: 'none',
            onUpdate: () => {
                if (version === solarPreviewVersion) solarCenterNote.textContent = characters.slice(0, Math.floor(typing.count)).join('');
            }
        }, 0.42);
}

function followSolarTerm(term, index) {
    solarActiveIndex = index;
    const targetAngle = index * 15;
    const currentAngle = ((solarLeafAngle % 360) + 360) % 360;
    const shortestTurn = ((targetAngle - currentAngle + 540) % 360) - 180;
    solarLeafAngle += shortestTurn;
    gsap.to(solarCycle, { '--solar-leaf-angle': `${solarLeafAngle}deg`, duration: reducedMotion.matches ? 0 : 0.52, ease: 'power2.out', overwrite: 'auto' });
    const seasonIndex = Math.floor(index / 6);
    const previousAccent = getComputedStyle(solarCycle).getPropertyValue('--season-accent').trim();
    solarCycle.dataset.season = solarSeasons[seasonIndex];
    if (!reducedMotion.matches && previousAccent) {
        const nextAccent = getComputedStyle(solarCycle).getPropertyValue('--season-accent').trim();
        gsap.fromTo(solarCycle, { '--season-accent': previousAccent }, {
            '--season-accent': nextAccent, duration: 0.65, ease: 'sine.inOut',
            clearProps: '--season-accent', overwrite: 'auto'
        });
    }

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
        gsap.fromTo(trailPoint, { opacity: 0.62 }, { opacity: 0, duration: 1.1, ease: 'power1.out', onComplete: () => trailPoint.remove() });

    }
}

function previewSolarTerm(term, index) {
    if (!solarCycleVisible) return;
    writeSolarPreview(term.textContent.trim(), solarTermNotes[index]);
    solarCycle.classList.add('has-preview');
}

function clearSolarTermPreview() {
    solarHoverTimer?.kill();
    solarTypingTimer?.kill();
    solarPreviewVersion += 1;
    solarTerms.forEach(item => item.classList.remove('is-previewing'));
    solarCycle.classList.remove('is-previewing');
    solarCycle.classList.remove('has-preview');
    delete solarCycle.dataset.season;
    gsap.killTweensOf(solarCenterTerm);
    solarCenterTerm.textContent = '';
    solarCenterNote.textContent = '';
}

function stopSolarAutoplay() {
    solarAutoplayTimer?.kill();
    solarHoverTimer?.kill();
    solarTypingTimer?.kill();
    solarAutoplayTimer = undefined;
    solarPreviewVersion += 1;
    gsap.killTweensOf(solarCycle);
    solarTrailLayer.querySelectorAll('.solar-trail-point').forEach(point => {
        gsap.killTweensOf(point);
        point.remove();
    });
}

function runSolarAutoplayStep() {
    const entranceStillBlocking = entrance.open && !entrance.classList.contains('is-opening');
    if (document.hidden || entranceStillBlocking || currentSection !== 'intro') return;
    const index = solarAutoplayIndex;
    const term = solarTerms[index];

    solarHoverTimer?.kill();
    followSolarTerm(term, index);
    solarHoverTimer = gsap.delayedCall(reducedMotion.matches ? 0 : solarAutoplayPreviewDelay / 1000, () => {
        previewSolarTerm(term, index);
    });

    solarAutoplayTimer = gsap.delayedCall(solarAutoplayInterval / 1000, () => {
        solarAutoplayIndex = (index + 1) % solarTerms.length;
        runSolarAutoplayStep();
    });
}

function startSolarAutoplay(reset = false) {
    stopSolarAutoplay();
    if (reset) {
        solarAutoplayIndex = 0;
        solarLeafAngle = 0;
    }
    const entranceStillBlocking = entrance.open && !entrance.classList.contains('is-opening');
    if (!document.hidden && !entranceStillBlocking && currentSection === 'intro') runSolarAutoplayStep();
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
            solarHoverTimer?.kill();
            solarTypingTimer?.kill();
            solarPreviewVersion += 1;
            gsap.killTweensOf(solarCenterTerm);
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
    messageGroupAnimations.forEach(animation => animation.kill());
    messageGroupAnimations = [];
    currentMessageGroup = targetIndex;
    messageGroups.forEach((group, index) => {
        const active = index === targetIndex;
        group.classList.toggle('is-current', active);
        group.setAttribute('aria-hidden', String(!active));
        group.inert = !active;
        gsap.set(group, { clearProps: 'transform' });
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

    if (reducedMotion.matches) {
        finishMessageGroup(incomingIndex);
        return;
    }

    isMessagesAnimating = true;
    const transitionVersion = ++messageGroupVersion;
    const travel = direction > 0 ? 104 : -104;
    incoming.classList.add('is-current');
    incoming.removeAttribute('aria-hidden');
    incoming.inert = false;
    try {
        await new Promise(resolve => {
            const timeline = gsap.timeline({ onComplete: () => resolve(), onInterrupt: () => resolve() });
            messageGroupAnimations = [timeline];
            timeline
                .fromTo(outgoing, { xPercent: 0 }, { xPercent: -travel, duration: 0.68, ease: 'power2.inOut' }, 0)
                .fromTo(incoming, { xPercent: travel }, { xPercent: 0, duration: 0.68, ease: 'power2.inOut' }, 0);
        });
    } finally {
        if (transitionVersion === messageGroupVersion) finishMessageGroup(incomingIndex);
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

    gsap.to(rosterTrack, {
        '--roster-offset': `${currentRosterCard * -100}%`,
        duration: mobile && announce && !reducedMotion.matches ? 0.56 : 0,
        ease: 'power2.inOut', overwrite: 'auto'
    });
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
    if (reducedMotion.matches) {
        gsap.getTweensOf([document.documentElement, rosterTrack, galleryPage]).forEach(tween => tween.progress(1));
        document.querySelectorAll('button').forEach(button => {
            gsap.killTweensOf(button, '--press-scale');
            button.style.removeProperty('--press-scale');
        });
    }
});

// 動畫寫入獨立 scale 屬性，保留箭頭的 transform 定位。
document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.id === 'enterExhibition' || button.disabled || reducedMotion.matches) return;
    gsap.fromTo(button, { '--press-scale': 0.96 }, {
        '--press-scale': 1, duration: 0.26, ease: 'power2.out', overwrite: 'auto',
        onComplete: () => button.style.removeProperty('--press-scale')
    });
}, true);

// 圖案微互動由 GSAP 控制，事件委派涵蓋 Vue 導覽及輪播按鈕。
function animateButtonHover(event, entering) {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    const button = event.target.closest('button');
    if (!button || button.contains(event.relatedTarget)) return;
    const gem = button.querySelector('.menu-emblem');
    if (gem) gsap.to(gem, { rotation: entering ? 10 : 0, duration: 0.42, ease: 'power2.out', overwrite: 'auto' });
    const arrow = button.querySelector('svg:not(.menu-emblem)');
    if (arrow) gsap.to(arrow, { opacity: entering ? 1 : 0.78, duration: 0.26, ease: 'power1.out', overwrite: 'auto' });
}
document.addEventListener('pointerover', event => animateButtonHover(event, true));
document.addEventListener('pointerout', event => animateButtonHover(event, false));

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
const entranceArt = entrance.querySelector('.entrance-art');
const hasBackgroundMusic = Boolean(backgroundMusic.getAttribute('src')?.trim());
let enteringExhibition = false;
let musicFadeTween;
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
    musicFadeTween?.kill();
    musicStatus.textContent = '';
    backgroundMusic.volume = 0;
    // 直接在使用者點擊時開始播放，保留瀏覽器的互動授權。
    backgroundMusic.play().then(() => {
        if (request !== musicRequest) return;
        updateMusicControl();
        musicFadeTween = gsap.to(backgroundMusic, { volume: 0.22, duration: 1.8, ease: 'none' });
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
    musicFadeTween?.kill();
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

let entranceTimeline;
async function enterExhibition(withMusic = true) {
    if (enteringExhibition) return;
    enteringExhibition = true;
    resetExhibitionToStart();
    if (withMusic) startMusic();
    let entranceContext;
    let solarStarted = false;
    try {
        if (!reducedMotion.matches) {
            const bounds = entranceTrigger.getBoundingClientRect();
            const focusX = Math.max(0, Math.min(innerWidth, bounds.left + bounds.width / 2));
            const focusY = Math.max(0, Math.min(innerHeight, bounds.top + bounds.height / 2));
            entrance.style.setProperty('--entrance-focus-x', `${focusX}px`);
            entrance.style.setProperty('--entrance-focus-y', `${focusY}px`);
            const revealRadius = Math.hypot(Math.max(focusX, innerWidth - focusX), Math.max(focusY, innerHeight - focusY)) + 48;
            const ringBounds = solarCycle.getBoundingClientRect();
            const ringVisibleRadius = Math.hypot(ringBounds.left + ringBounds.width / 2 - focusX,
                ringBounds.top + ringBounds.height / 2 - focusY) + ringBounds.width * 0.2;
            // 保留封面原有底色，根節點交接後也不換成另一張實色幕。
            const coverBackground = getComputedStyle(document.querySelector('.site-paper-background')).backgroundImage;
            document.documentElement.classList.add('entrance-transitioning');
            entrance.classList.add('is-transitioning');

            const fadingElements = [
                entrance.querySelector('h1'),
                document.getElementById('entranceDescription'),
                document.getElementById('entranceMusicHint'),
                document.getElementById('enterQuietly')
            ].filter(element => element && !element.hidden);

            await new Promise(resolve => {
                entranceContext = gsap.context(() => {
                    gsap.set(entrance, { backgroundImage: coverBackground });
                    gsap.killTweensOf(entranceTrigger, '--proximity');
                    const prompt = entranceTrigger.querySelector('.entrance-prompt');
                    const dimmer = entrance.querySelector('.entrance-transition-dimmer');
                    entranceTimeline = gsap.timeline({ onComplete: () => resolve(), onInterrupt: () => resolve() });
                    entranceTimeline.to(fadingElements, { opacity: 0, duration: 1.05, ease: 'sine.inOut' }, 0);
                    if (entranceArt) {
                        entranceTimeline.to(entranceArt, { opacity: 0, duration: 1.05, ease: 'sine.inOut' }, 0);
                    }
                    entranceTimeline
                        .to(prompt, { scale: 1.38, duration: 0.9, ease: 'sine.inOut' }, 0)
                        .to(dimmer, { opacity: 0.65, duration: 0.95, ease: 'sine.inOut' }, 0)
                        .to(entranceTrigger, { opacity: 0, duration: 0.4, ease: 'sine.inOut' }, 0.75)
                        .call(() => {
                            entrance.classList.add('is-reveal-ready');
                            entrance.classList.add('is-opening');
                            document.body.classList.remove('entrance-open');
                            document.documentElement.classList.remove('entrance-open');
                        }, [], 1.15)
                        .fromTo(entrance, { '--entrance-reveal-radius': '-48px' }, {
                            '--entrance-reveal-radius': `${revealRadius}px`,
                            duration: 1.65, ease: 'sine.inOut', immediateRender: false,
                            onUpdate: () => {
                                const radius = parseFloat(entrance.style.getPropertyValue('--entrance-reveal-radius'));
                                if (!solarStarted && radius >= ringVisibleRadius) {
                                    // 真的露出節氣環後才啟動，且不受入口 context 清理影響。
                                    solarStarted = true;
                                    entranceContext.ignore(() => startSolarAutoplay(true));
                                }
                            }
                        }, 1.15);
                });
            });
        }
    } finally {
        entranceTimeline = null;
        resetExhibitionToStart();
        entrance.close();
        document.body.classList.remove('entrance-open');
        document.documentElement.classList.remove('entrance-open', 'entrance-transitioning');
        entrance.classList.remove('is-transitioning', 'is-reveal-ready', 'is-opening');
        ['--entrance-focus-x', '--entrance-focus-y'].forEach(name => entrance.style.removeProperty(name));
        entranceContext?.revert();
        if (!solarStarted) startSolarAutoplay(true);
        document.getElementById('chapterHome').focus({ preventScroll: true });
    }
}
reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) entranceTimeline?.progress(1);
});

document.getElementById('enterExhibition').addEventListener('click', () => enterExhibition());
document.getElementById('enterQuietly').addEventListener('click', () => enterExhibition(false));
// 依滑鼠與實際可點擊區域的距離，逐漸增強提示；不移動點擊區域。
const entranceTrigger = document.getElementById('enterExhibition');
let lastEntrancePointer = null;
let entranceKeyboardMode = false;
let entranceStrength = 0;

function setEntranceProximity(strength) {
    // 縮回比放大慢；只改文字，不改實際感應區域的尺寸。
    gsap.to(entranceTrigger, {
        '--proximity': strength,
        duration: reducedMotion.matches ? 0 : strength < entranceStrength ? 0.85 : 0.45,
        ease: 'power2.out', overwrite: 'auto'
    });
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
