// 24 張圖片對應的低飽和度背景色列表
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const backgroundColors = [
    "#EFECE6",
    "#E6EBE0",
    "#EDF2F4",
    "#F4EAD4",
    "#F0E6EF",
    "#E2ECE9",
    "#EAE4E9",
    "#FFF1E6",
    "#FDE2E4",
    "#DBE7E4",
    "#E4C1F9",
    "#D6E2E9",
    "#E9ECEF",
    "#F3E9DC",
    "#D8E2DC",
    "#FFE5D9",
    "#ECE4DB",
    "#E0E1DD",
    "#F1FAEE",
    "#E8D8CE",
    "#DFE7FD",
    "#F0F3F4",
    "#EAD7D7",
    "#DCE1E3"
];

const siteMenu = document.getElementById('siteMenu');
const menuToggle = document.getElementById('menuToggle');
let menuCloseTimer;
let isPageSwitching = false;

function openMenu() {
    if (isPageSwitching) return;
    clearTimeout(menuCloseTimer);
    if (!siteMenu.open) siteMenu.showModal();
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

function displayPage(pageName, targetPage, targetButton) {
    finishPageTurn();
    if (pageName !== 'intro') restIntroBreeze();
    document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.classList.remove('active');
        button.removeAttribute('aria-current');
    });
    targetPage.classList.add('active');
    document.body.classList.toggle('intro-page-active', pageName === 'intro');
    document.body.classList.toggle('text-page-active', pageName === 'text' || pageName === 'messages' || pageName === 'thanks');
    targetButton.classList.add('active');
    targetButton.setAttribute('aria-current', 'page');
    document.getElementById('currentPageLabel').textContent = {
        intro: '理時序', gallery: '觀芳華', text: '繪春信', planning: '籌花事', messages: '寄語', thanks: '謝花人'
    }[pageName];
    if (pageName === 'gallery') {
        updateBackgroundColor();
    } else if (pageName === 'intro') {
        document.body.style.backgroundColor = '#F3EFE5';
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
    clearTimeout(menuCloseTimer);
    if (siteMenu.open) siteMenu.close();
    siteMenu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
}

async function switchPage(pageName) {
    const targetPage = document.getElementById(`${pageName}-page`);
    const targetButton = Array.from(document.querySelectorAll('.nav-btn')).find(button => button.dataset.page === pageName);
    const currentPage = document.querySelector('.page-content.active');
    if (!targetPage || !targetButton || !currentPage || isPageSwitching || currentPage === targetPage) return;
    if (reducedMotion.matches || typeof targetPage.animate !== 'function') {
        displayPage(pageName, targetPage, targetButton);
        return;
    }

    isPageSwitching = true;

    let leaveAnimation;
    let enterAnimation;

    try {
        leaveAnimation = currentPage.animate([
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(-6px)' }
        ], {
            duration: 180,
            easing: 'ease-in',
            fill: 'forwards'
        });

        await leaveAnimation.finished;
        displayPage(pageName, targetPage, targetButton);

        enterAnimation = targetPage.animate([
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], {
            duration: 320,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both'
        });

        await enterAnimation.finished;
    } catch {
        displayPage(pageName, targetPage, targetButton);
    } finally {
        leaveAnimation?.cancel();
        enterAnimation?.cancel();
        isPageSwitching = false;
        menuToggle.focus({ preventScroll: true });
    }
}

/* 理時序的主要入口使用跨頁視覺延續；選單仍沿用一般切頁。 */
async function enterGalleryFromIntro() {
    const targetPage = document.getElementById('gallery-page');
    const targetButton = document.querySelector('.nav-btn[data-page="gallery"]');
    const currentPage = document.querySelector('.page-content.active');

    if (!targetPage || !targetButton || !currentPage || isPageSwitching || currentPage === targetPage) return;
    if (currentPage.id !== 'intro-page' || siteMenu.open || reducedMotion.matches || typeof targetPage.animate !== 'function') {
        await switchPage('gallery');
        return;
    }

    const introCopy = currentPage.querySelector('.intro-copy');
    const sourceCycle = currentPage.querySelector('.solar-cycle');
    const targetSlide = originalSlides[currentIndex];
    const targetImage = targetSlide?.querySelector('.slide-image');
    const targetCaption = targetSlide?.querySelector('.slide-caption');
    const targetOrbit = targetSlide?.querySelector('.cycle-orbit');

    if (!introCopy || !sourceCycle || !targetImage || !targetCaption || !targetOrbit) {
        await switchPage('gallery');
        return;
    }

    isPageSwitching = true;
    finishPageTurn();
    restIntroBreeze();
    targetPage.classList.add('gallery-entry-stage');
    targetPage.inert = true;
    targetPage.setAttribute('aria-hidden', 'true');
    void targetPage.offsetWidth;

    const sourceRect = sourceCycle.getBoundingClientRect();
    const targetRect = targetOrbit.getBoundingClientRect();
    const sourceIsVisible = sourceRect.width > 0 && sourceRect.height > 0
        && sourceRect.bottom > 0 && sourceRect.top < window.innerHeight;
    const targetIsVisible = targetRect.width > 0 && targetRect.height > 0;

    targetImage.style.opacity = '0';
    targetCaption.style.opacity = '0';
    targetOrbit.style.opacity = '0';
    targetPage.style.backgroundColor = backgroundColors[currentIndex];

    try {
        if (sourceIsVisible && targetIsVisible) {
            galleryEntryProxy = sourceCycle.cloneNode(true);
            galleryEntryProxy.classList.add('solar-cycle-transition');
            galleryEntryProxy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
            galleryEntryProxy.setAttribute('aria-hidden', 'true');
            galleryEntryProxy.inert = true;
            Object.assign(galleryEntryProxy.style, {
                left: `${sourceRect.left}px`,
                top: `${sourceRect.top}px`,
                width: `${sourceRect.width}px`,
                height: `${sourceRect.height}px`
            });
            document.body.append(galleryEntryProxy);
            sourceCycle.style.visibility = 'hidden';

            const sourceCenterX = sourceRect.left + sourceRect.width / 2;
            const sourceCenterY = sourceRect.top + sourceRect.height / 2;
            const targetCenterX = targetRect.left + targetRect.width / 2;
            const targetCenterY = targetRect.top + targetRect.height / 2;
            const targetScale = targetRect.width / sourceRect.width;

            galleryEntryAnimations.push(galleryEntryProxy.animate([
                { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1, filter: 'blur(0)' },
                {
                    transform: `translate3d(${targetCenterX - sourceCenterX}px, ${targetCenterY - sourceCenterY}px, 0) scale(${targetScale})`,
                    opacity: 0.22,
                    filter: 'blur(1px)'
                }
            ], {
                duration: 900,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                fill: 'forwards'
            }));
        }

        galleryEntryAnimations.push(
            introCopy.animate([
                { opacity: 1, transform: 'translateY(0)' },
                { opacity: 0, transform: 'translateY(-4px)' }
            ], { duration: 240, easing: 'ease-out', fill: 'forwards' }),
            targetPage.animate([
                { backgroundColor: 'rgba(239, 236, 230, 0)' },
                { backgroundColor: backgroundColors[currentIndex] }
            ], { duration: 900, easing: 'ease-in-out', fill: 'both' }),
            targetImage.animate([
                { opacity: 0, filter: 'blur(8px)', transform: 'scale(0.985)' },
                { opacity: 1, filter: 'blur(0)', transform: 'scale(1)' }
            ], {
                duration: 760,
                delay: 170,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                fill: 'both'
            }),
            targetCaption.animate([
                { opacity: 0 },
                { opacity: 1 }
            ], { duration: 420, delay: 500, easing: 'ease-out', fill: 'both' })
        );

        await Promise.all(galleryEntryAnimations.map(animation => animation.finished));
    } catch {
        // reduced-motion 在途中啟用或動畫被取消時，直接完成到作品頁。
    } finally {
        displayPage('gallery', targetPage, targetButton);
        targetPage.classList.remove('gallery-entry-stage');
        targetPage.inert = false;
        targetPage.removeAttribute('aria-hidden');
        targetPage.style.removeProperty('background-color');
        targetImage.style.removeProperty('opacity');
        targetCaption.style.removeProperty('opacity');
        targetOrbit.style.removeProperty('opacity');
        sourceCycle.style.removeProperty('visibility');
        galleryEntryAnimations.forEach(animation => animation.cancel());
        galleryEntryAnimations = [];
        galleryEntryProxy?.remove();
        galleryEntryProxy = null;

        if (!reducedMotion.matches && typeof targetOrbit.animate === 'function') {
            targetOrbit.animate([
                { opacity: 0.2, filter: 'blur(1px)' },
                { opacity: 1, filter: 'blur(0)' }
            ], { duration: 260, easing: 'ease-out' });
        }

        isPageSwitching = false;
        menuToggle.focus({ preventScroll: true });
    }
}

/* =========================
   輪播初始化
========================= */

const originalSlides = Array.from(document.querySelectorAll('.slide-item'));
const totalSlides = originalSlides.length;

let currentIndex = 0;
let isAnimating = false;
let turnAnimations = [];
let galleryEntryAnimations = [];
let galleryEntryProxy = null;
let turnVersion = 0;
let cycleRotation = 0;
let cycleCompleteTimer;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const slideImageLoads = new WeakMap();

document.documentElement.style.setProperty('--cycle-angle', '0deg');

function prepareSlideImage(index, { highPriority = false } = {}) {
    const normalizedIndex = (index + totalSlides) % totalSlides;
    const slide = originalSlides[normalizedIndex];
    const image = slide?.querySelector('.slide-image img');
    if (!image) return Promise.resolve(false);

    if (highPriority) image.fetchPriority = 'high';
    image.loading = 'eager';

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

function preloadFollowingSlide(index) {
    window.setTimeout(() => {
        void prepareSlideImage(index + 1, { highPriority: true });
    }, 0);
}

function updateBackgroundColor() {
    document.getElementById('gallery-page')?.style.setProperty('--gallery-tone', backgroundColors[currentIndex]);
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
    });
    isAnimating = false;
}

async function moveSlide(direction) {
    if (isAnimating) return;
    if (direction !== 1 && direction !== -1) return;

    isAnimating = true;
    const version = ++turnVersion;
    const previousIndex = currentIndex;
    const outgoing = originalSlides[currentIndex];
    const nextIndex = (currentIndex + direction + totalSlides) % totalSlides;
    await prepareSlideImage(nextIndex, { highPriority: true });
    if (version !== turnVersion) return;

    currentIndex = nextIndex;
    const incoming = originalSlides[currentIndex];

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

    updateBackgroundColor();

    if (reducedMotion.matches || typeof outgoing.animate !== 'function') {
        finishPageTurn();
        preloadFollowingSlide(currentIndex);
        return;
    }

    outgoing.classList.remove('is-current');
    outgoing.classList.add('is-turning');
    outgoing.setAttribute('aria-hidden', 'true');
    outgoing.inert = true;
        incoming.classList.add('is-current');
        incoming.style.position = 'absolute';
    incoming.setAttribute('aria-hidden', 'false');
    incoming.inert = false;
    const outgoingImage = outgoing.querySelector('.slide-image');
    outgoing.style.zIndex = '2';
    incoming.style.zIndex = '1';

    // 新圖完整墊在下方，舊圖逐漸透明，避免兩張同時變透明造成閃白。
    // 文字維持原位，先淡出再淡入。
    turnAnimations = [
        outgoingImage.animate([
            { opacity: 1 },
            { opacity: 0 }
        ], { duration: 860, easing: 'ease-in-out', fill: 'forwards' }),
        outgoing.querySelector('.slide-caption').animate([
            { opacity: 1 },
            { opacity: 0 }
        ], { duration: 240, easing: 'ease-out', fill: 'forwards' }),
        incoming.querySelector('.slide-caption').animate([
            { opacity: 0 },
            { opacity: 1 }
        ], { duration: 560, delay: 180, easing: 'ease-out', fill: 'both' })
    ];
    try {
        await Promise.all(turnAnimations.map(animation => animation.finished));
    } catch {
        // 換到其他分頁時取消動畫，由 finishPageTurn 完成定位。
    } finally {
        if (version === turnVersion) {
            finishPageTurn();
            preloadFollowingSlide(currentIndex);
        }
    }
}

reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
        finishPageTurn();
        galleryEntryAnimations.forEach(animation => animation.cancel());
    }
});
finishPageTurn();
void prepareSlideImage(0, { highPriority: true }).then(() => {
    preloadFollowingSlide(0);
});

/* =========================
   垂直章節與作品閱讀進度
========================= */

const pageSections = Array.from(document.querySelectorAll('.page-content'));
const galleryProgressTerm = document.getElementById('galleryProgressTerm');
const galleryProgressNumber = document.getElementById('galleryProgressNumber');
const galleryPage = document.getElementById('gallery-page');
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
    currentIndex = boundedIndex;
    updateGalleryMeta(boundedIndex);
    finishPageTurn();
}

function updateGalleryMeta(index) {
    const boundedIndex = Math.max(0, Math.min(totalSlides - 1, index));
    galleryProgressTerm.textContent = originalSlides[boundedIndex]?.querySelector('h2')?.textContent.trim() || '';
    galleryProgressNumber.textContent = String(boundedIndex + 1).padStart(2, '0');
    updateBackgroundColor();
}

function setCurrentSection(pageName) {
    if (!pageName) return;
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

    document.body.classList.toggle('intro-page-active', pageName === 'intro');
    document.body.classList.toggle('gallery-section-active', pageName === 'gallery');
    document.body.classList.toggle('text-page-active', pageName === 'text' || pageName === 'messages' || pageName === 'thanks');
    document.getElementById('currentPageLabel').textContent = {
        intro: '理時序',
        gallery: '觀芳華',
        text: '繪春信',
        planning: '籌花事',
        messages: '寄語',
        thanks: '謝花人'
    }[pageName];
    document.documentElement.style.setProperty('--section-marker-top', {
        intro: '14%',
        gallery: '30%',
        planning: '46%',
        text: '62%',
        messages: '78%',
        thanks: '92%'
    }[pageName]);

    if (pageName !== 'intro' && typeof restIntroBreeze === 'function') restIntroBreeze();
    if (pageName === 'intro') document.body.style.backgroundColor = '#F3EFE5';
    else if (pageName === 'gallery') updateGalleryMeta(currentIndex);
    else document.body.style.backgroundColor = '#F5F2EC';
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
    const sectionLine = Math.min(window.innerHeight * 0.34, 300);
    let visibleSection = pageSections[0];
    pageSections.forEach(section => {
        if (section.getBoundingClientRect().top <= sectionLine) visibleSection = section;
    });
    const scrollRoot = document.scrollingElement || document.documentElement;
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
const solarAutoplayInterval = 2200;
const solarAutoplayPreviewDelay = 520;
const solarTermNotes = [
    '風開始有了方向',
    '細雨輕輕落進春天',
    '雷聲喚醒沉睡的土地',
    '晝與夜在此刻平衡',
    '天光澄澈，萬物明淨',
    '雨水滋養新生的穀物',
    '日光漸長，夏意初醒',
    '萬物將滿，仍留一線餘地',
    '種子趕在盛夏前落土',
    '白晝走到一年最長',
    '熱意從風裡慢慢升起',
    '盛夏抵達最深之處',
    '第一縷涼意穿過長夏',
    '暑氣在日暮裡緩緩退去',
    '清晨開始凝結微光',
    '晝夜再次平分秋色',
    '露水帶來更深的涼意',
    '草木收起最後的秋色',
    '萬物開始向內收藏',
    '初雪尚輕，冬意漸濃',
    '天地逐漸歸於寂靜',
    '長夜走到盡頭，微光將返',
    '寒意停在歲末的風裡',
    '一年最冷，也最接近新生'
];
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
    const targetAngle = index * 15;
    const currentAngle = ((solarLeafAngle % 360) + 360) % 360;
    const shortestTurn = ((targetAngle - currentAngle + 540) % 360) - 180;
    solarLeafAngle += shortestTurn;
    solarCycle.style.setProperty('--solar-leaf-angle', `${solarLeafAngle}deg`);
    const seasonIndex = Math.floor(index / 6);
    solarCycle.dataset.season = solarSeasons[seasonIndex];
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
    solarCenterTerm.textContent = '歲·律';
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
    if (document.hidden || entrance.open) return;
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
    if (!document.hidden && !entrance.open) runSolarAutoplayStep();
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
const messageCards = messagesTrack ? Array.from(messagesTrack.querySelectorAll('.message-card')) : [];
const messageGroups = [];
let currentMessageGroup = 0;
    let isMessagesAnimating = false;
    let messageGroupVersion = 0;
let messageGroupAnimations = [];
let messagesTouchStartX = 0;
let messagesTouchStartY = 0;

if (messagesTrack) {
    for (let index = 0; index < messageCards.length; index += 4) {
        const group = document.createElement('div');
        const cards = messageCards.slice(index, index + 4);
        group.className = 'message-group';
        group.dataset.count = String(cards.length);
        group.setAttribute('role', 'group');
        cards.forEach(card => group.append(card));
        messagesTrack.append(group);
        messageGroups.push(group);
    }
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
        group.style.removeProperty('transform');
            group.style.removeProperty('opacity');
            group.style.removeProperty('position');
    });
    if (messagesStatus) {
        messagesStatus.textContent = `第 ${targetIndex + 1} 組，共 ${messageGroups.length} 組`;
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
    incoming.classList.add('is-current');
    incoming.removeAttribute('aria-hidden');
    incoming.inert = false;
    const offset = direction > 0 ? 38 : -38;
    messageGroupAnimations = [
        outgoing.animate([
            { opacity: 1, transform: 'translateX(0)' },
            { opacity: 0, transform: `translateX(${-offset}px)` }
        ], { duration: 520, easing: 'ease-in-out', fill: 'forwards' }),
        incoming.animate([
            { opacity: 0, transform: `translateX(${offset}px)` },
            { opacity: 1, transform: 'translateX(0)' }
        ], { duration: 620, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' })
    ];

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

/* 初始化：Splash 關閉後先顯示理時序。 */
document.body.classList.add('intro-page-active');
document.body.style.backgroundColor = '#F3EFE5';

/* 開場與背景音樂：play 必須在點擊事件內立即呼叫，不等待淡出結束。 */
const entrance = document.getElementById('entrance');
const backgroundMusic = document.getElementById('backgroundMusic');
const musicToggle = document.getElementById('musicToggle');
const musicStatus = document.getElementById('musicStatus');
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
    try {
        if (!reducedMotion.matches && typeof entrance.animate === 'function') {
            await entrance.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: 1100, easing: 'ease-in-out', fill: 'forwards'
            }).finished;
        }
    } finally {
        resetExhibitionToStart();
        entrance.close();
        document.body.classList.remove('entrance-open');
        document.documentElement.classList.remove('entrance-open');
        startSolarAutoplay(true);
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

// 四季裝飾移至「理時序」，置於內容後方且不接收點擊或鍵盤焦點。
const introPage = document.getElementById('intro-page');
const breezeLayer = document.createElement('div');
breezeLayer.className = 'intro-breeze';
breezeLayer.setAttribute('aria-hidden', 'true');
breezeLayer.inert = true;
introPage.prepend(breezeLayer);
// 四季各六枚裝飾，中央留給企劃文字與節氣環。
const breezeLayout = [
    [8, 14, 28, -35], [21, 9, 18, 25], [33, 18, 21, 55], [12, 33, 23, 15], [24, 28, 15, -50], [5, 46, 19, 45],
    [70, 10, 24, -30], [87, 15, 29, 40], [95, 34, 19, -15], [79, 30, 20, 65], [91, 48, 24, -45], [62, 17, 16, 20],
    [7, 65, 27, -45], [20, 73, 19, 35], [11, 90, 23, 65], [34, 86, 26, -25], [26, 94, 16, 15], [5, 80, 18, -10],
    [81, 67, 14, 0], [94, 75, 22, 0], [72, 87, 17, 0], [89, 94, 12, 0], [61, 92, 20, 0], [95, 58, 15, 0]
];
const breezeColors = ['#bc8085', '#7a9671', '#bd9255', '#9baeb6'];
const breezeSeasons = ['spring', 'summer', 'autumn', 'winter'];
const breezeMotes = breezeLayout.map(([x, y, size, tilt], index) => {
    const anchor = document.createElement('span');
    anchor.className = 'breeze-anchor';
    anchor.style.left = `${x}%`;
    anchor.style.top = `${y}%`;
    anchor.style.setProperty('--size', `${size}px`);
    anchor.style.setProperty('--tilt', `${tilt}deg`);
    anchor.dataset.season = breezeSeasons[Math.floor(index / 6)];
    anchor.style.setProperty('--petal-color', breezeColors[Math.floor(index / 6)]);
    const shape = document.createElement('span');
    shape.className = 'breeze-shape';
    anchor.append(shape);
    breezeLayer.append(anchor);
    return { anchor, shape, tilt };
});
let breezeFrame = 0;
let breezeRestTimer;

function restIntroBreeze() {
    cancelAnimationFrame(breezeFrame);
    clearTimeout(breezeRestTimer);
    breezeFrame = 0;
    breezeMotes.forEach(({ shape }) => {
        shape.classList.remove('is-stirred');
        shape.style.removeProperty('transform');
        shape.style.removeProperty('opacity');
    });
}

function updateIntroBreeze(x, y) {
    if (entrance.open || !introPage.classList.contains('active') || reducedMotion.matches || document.hidden) return;
    breezeMotes.forEach(({ anchor, shape, tilt }) => {
        if (!anchor.getClientRects().length) return;
        const rect = anchor.getBoundingClientRect();
        const dx = rect.left - x;
        const dy = rect.top - y;
        const distance = Math.hypot(dx, dy);
        const progress = Math.max(0, 1 - distance / 240);
        const strength = progress * progress * (3 - 2 * progress);
        if (!strength) {
            shape.classList.remove('is-stirred');
            shape.style.removeProperty('transform');
            shape.style.removeProperty('opacity');
            return;
        }
        const offsetX = dx / Math.max(distance, 1) * strength * 26;
        const offsetY = (dy / Math.max(distance, 1) * 12 - 6) * strength;
        shape.classList.add('is-stirred');
        shape.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) rotate(${tilt + strength * (dx < 0 ? -24 : 24)}deg) scale(${1 + strength * 0.18})`;
        shape.style.opacity = String(0.72 + strength * 0.23);
    });
}

function queueIntroBreeze(x, y) {
    if (entrance.open || !introPage.classList.contains('active') || reducedMotion.matches) return;
    cancelAnimationFrame(breezeFrame);
    clearTimeout(breezeRestTimer);
    breezeFrame = requestAnimationFrame(() => {
        breezeFrame = 0;
        updateIntroBreeze(x, y);
    });
    // 滑鼠停下後餘韻慢慢消散，不持續執行動畫迴圈。
    breezeRestTimer = setTimeout(restIntroBreeze, 280);
}

window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') queueIntroBreeze(event.clientX, event.clientY);
}, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) restIntroBreeze(); });
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) restIntroBreeze(); });
