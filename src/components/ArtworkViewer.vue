<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { gsap } from 'gsap';

const props = defineProps({
    stage: { type: Object, required: true },
    move: { type: Function, required: true },
    currentChapter: { type: Object, required: true },
    onRestore: { type: Function, required: true }
});
const dialog = ref(null);
const viewport = ref(null);
const closeButton = ref(null);
const opened = ref(false);
const zoom = ref(1);
const pointerFocus = ref(true);
const mobile = matchMedia('(max-width: 900px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let placeholder;
let transition;
let returnFocus;
let panX = 0;
let panY = 0;
let gesture;
let lastTap = 0;
let focusedSlide;
const slideObserver = new MutationObserver(() => {
    if (opened.value && props.stage.querySelector('.slide-item.is-current') !== focusedSlide) fitReading();
});

function paintZoom() {
    const limitX = Math.max(viewport.value.clientWidth / 4, (props.stage.offsetWidth * zoom.value - viewport.value.clientWidth) / 2 + 16);
    const limitY = Math.max(viewport.value.clientHeight / 4, (props.stage.offsetHeight * zoom.value - viewport.value.clientHeight) / 2 + 16);
    panX = Math.max(-limitX, Math.min(limitX, panX));
    panY = Math.max(-limitY, Math.min(limitY, panY));
    gsap.set(props.stage, { scale: zoom.value, x: panX, y: panY });
}

function resetZoom() {
    zoom.value = 1;
    panX = panY = 0;
    paintZoom();
}

function captionBounds(slide) {
    const caption = slide?.querySelector('.slide-caption:not([hidden])');
    if (!caption) return null;
    const rects = [...caption.querySelectorAll('h2, .caption-description')].flatMap(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
    });
    if (!rects.length) return null;
    const left = Math.min(...rects.map(rect => rect.left));
    const right = Math.max(...rects.map(rect => rect.right));
    const top = Math.min(...rects.map(rect => rect.top));
    const bottom = Math.max(...rects.map(rect => rect.bottom));
    return { left, right, top, bottom, width: right - left, height: bottom - top };
}

function fitReading() {
    resetZoom();
    focusedSlide = props.stage.querySelector('.slide-item.is-current');
    const stageRect = props.stage.getBoundingClientRect();
    const bounds = viewport.value.getBoundingClientRect();
    // 共用倍率依所有作品的實際文字邊界計算，包含超出 caption 容器的長行。
    const captions = [...props.stage.querySelectorAll('.slide-item')].map(captionBounds).filter(Boolean);
    const widest = Math.max(1, ...captions.map(text => text.width));
    const tallest = Math.max(1, ...captions.map(text => text.height));
    const readingZoom = Math.max(1, Math.min(2, (bounds.width - 32) / widest, (bounds.height - 32) / tallest));
    zoom.value = readingZoom;
    const text = captionBounds(focusedSlide);
    if (text) {
        // 在保留構圖的前提下平移，讓整段文字留在閱讀視窗安全範圍。
        const centerX = stageRect.left + stageRect.width / 2;
        const centerY = stageRect.top + stageRect.height / 2;
        const left = centerX + (text.left - centerX) * readingZoom;
        const right = centerX + (text.right - centerX) * readingZoom;
        const top = centerY + (text.top - centerY) * readingZoom;
        const bottom = centerY + (text.bottom - centerY) * readingZoom;
        panX = Math.max(bounds.left + 16 - left, Math.min(0, bounds.right - 16 - right));
        panY = Math.max(bounds.top + 16 - top, Math.min(0, bounds.bottom - 16 - bottom));
    }
    if (focusedSlide?.dataset.artworkId === '22') panX += bounds.width * 0.15;
    paintZoom();
}

async function openViewer(fromKeyboard = false) {
    if (opened.value || !mobile.matches || props.currentChapter.value !== 'gallery') return;
    returnFocus = document.activeElement;
    pointerFocus.value = !fromKeyboard;
    placeholder = document.createElement('div');
    const style = getComputedStyle(props.stage);
    Object.assign(placeholder.style, {
        width: `${props.stage.offsetWidth}px`, height: `${props.stage.offsetHeight}px`, margin: style.margin
    });
    props.stage.replaceWith(placeholder);
    // 作品 DOM、資料與切換仍由原展廳管理，視窗只管理閱讀尺寸與手勢。
    viewport.value.append(props.stage);
    opened.value = true;
    await nextTick();
    dialog.value.showModal();
    props.stage.closest('#gallery-page').classList.add('is-artwork-viewing');
    fitReading();
    slideObserver.observe(props.stage, { subtree: true, attributes: true, attributeFilter: ['class'] });
    transition = gsap.fromTo(dialog.value, { opacity: 0 }, {
        opacity: 1, duration: reducedMotion.matches ? 0 : 0.35, ease: 'sine.out'
    });
    closeButton.value.focus({ preventScroll: true });
}

function closeViewer() {
    if (!opened.value) return;
    transition?.kill();
    slideObserver.disconnect();
    props.stage.closest('#gallery-page').classList.remove('is-artwork-viewing');
    gsap.set(props.stage, { clearProps: 'transform' });
    placeholder.replaceWith(props.stage);
    placeholder = null;
    dialog.value.close();
    opened.value = false;
    zoom.value = 1;
    props.onRestore();
    if (props.currentChapter.value === 'gallery') returnFocus?.focus({ preventScroll: true });
}

function changeArtwork(direction) {
    void props.move(direction);
}

function touchDistance(touches) {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function startGesture(event) {
    event.stopPropagation();
    if (event.touches.length > 1) lastTap = 0;
    gesture = {
        x: event.touches[0].clientX, y: event.touches[0].clientY,
        panX, panY, scale: zoom.value,
        distance: event.touches.length > 1 ? touchDistance(event.touches) : 0
    };
}

function moveGesture(event) {
    event.stopPropagation();
    if (!gesture) return;
    if (event.touches.length > 1 && gesture.distance) {
        zoom.value = Math.max(1, Math.min(3, gesture.scale * touchDistance(event.touches) / gesture.distance));
        paintZoom();
    } else if (!gesture.distance) {
        panX = gesture.panX + event.touches[0].clientX - gesture.x;
        panY = gesture.panY + event.touches[0].clientY - gesture.y;
        paintZoom();
    }
}

function endGesture(event) {
    event.stopPropagation();
    if (!gesture) return;
    if (event.touches.length) {
        startGesture(event);
        return;
    }
    const dx = event.changedTouches[0].clientX - gesture.x;
    const dy = event.changedTouches[0].clientY - gesture.y;
    if (!gesture.distance && Math.hypot(dx, dy) < 10) {
        const now = performance.now();
        if (now - lastTap < 300) {
            if (zoom.value > 1) {
                resetZoom();
            } else {
                fitReading();
            }
        }
        lastTap = now;
    } else {
        lastTap = 0;
    }
    gesture = null;
}

function handleKey(event) {
    pointerFocus.value = false;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        changeArtwork(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (event.key === 'Tab') {
        const buttons = [...dialog.value.querySelectorAll('button')].filter(button => !props.stage.contains(button));
        const index = buttons.indexOf(document.activeElement);
        event.preventDefault();
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    }
}

function updateMedia() {
    if (!mobile.matches) closeViewer();
    if (reducedMotion.matches) transition?.progress(1);
    if (opened.value) fitReading();
}
watch(() => props.currentChapter.value, chapter => { if (chapter !== 'gallery') closeViewer(); });
mobile.addEventListener('change', updateMedia);
reducedMotion.addEventListener('change', updateMedia);
window.addEventListener('resize', updateMedia);
onBeforeUnmount(() => {
    closeViewer();
    transition?.kill();
    mobile.removeEventListener('change', updateMedia);
    reducedMotion.removeEventListener('change', updateMedia);
    window.removeEventListener('resize', updateMedia);
});
defineExpose({ openViewer });
</script>

<template>
    <dialog ref="dialog" class="artwork-viewer" :class="{ 'has-pointer-focus': pointerFocus }" aria-label="放大閱讀作品"
        @pointerdown.capture="pointerFocus = true" @cancel.prevent="closeViewer" @keydown.capture="handleKey">
        <div class="artwork-viewer-shade" aria-hidden="true" @click="closeViewer"></div>
        <button ref="closeButton" class="artwork-viewer-close" type="button" aria-label="關閉放大作品" @click="closeViewer">×</button>
        <div ref="viewport" class="artwork-viewer-viewport"
            @click="event => { if (event.target === viewport) closeViewer(); }"
            @touchstart.capture="startGesture" @touchmove.capture.prevent="moveGesture"
            @touchend.capture="endGesture" @touchcancel.capture="gesture = null"></div>
        <div class="artwork-viewer-controls" @click.self="closeViewer">
            <button type="button" aria-label="上一張作品" @click="changeArtwork(-1)">‹</button>
            <button type="button" aria-label="下一張作品" @click="changeArtwork(1)">›</button>
        </div>
    </dialog>
</template>

<style>
#gallery-page .artwork-viewer {
    --viewer-top: max(138px, calc(env(safe-area-inset-top) + 138px));
    --viewer-bottom: max(76px, calc(env(safe-area-inset-bottom) + 76px));
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    overflow: hidden;
    color: #f2f4eb;
}
#gallery-page .artwork-viewer[open] { display: grid; place-items: center; }
#gallery-page.is-artwork-viewing .gallery-sticky-shell { visibility: hidden; }
.artwork-viewer::backdrop { background: transparent; }
.artwork-viewer-shade { position: absolute; inset: 0; background: rgba(24, 39, 33, 0.62); }
.artwork-viewer-viewport {
    position: absolute;
    inset: var(--viewer-top) 0 var(--viewer-bottom);
    display: grid;
    place-items: center;
    width: 100%;
    height: auto;
    overflow: hidden;
    touch-action: none;
}
#gallery-page .artwork-viewer .gallery-stage {
    width: min(calc(100vw - 16px), calc((100dvh - var(--viewer-top) - var(--viewer-bottom)) * 2000 / 1126));
    height: auto;
    min-height: 0;
    aspect-ratio: 2000 / 1126;
    margin: 0;
    flex: none;
    transform-origin: center;
}
#gallery-page .artwork-viewer .gallery-stage .arrow-btn { display: none; }
.artwork-viewer-close,
.artwork-viewer-controls button {
    position: relative;
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #f2f4eb;
    font: inherit;
    font-size: 40px;
}
.artwork-viewer-close { position: absolute; right: max(12px, env(safe-area-inset-right)); top: max(78px, calc(env(safe-area-inset-top) + 78px)); z-index: 2; font-size: 30px; }
.artwork-viewer-controls { position: absolute; bottom: max(12px, env(safe-area-inset-bottom)); left: 12px; right: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.artwork-viewer button:focus-visible { outline: 1px solid #e0eade; border-radius: 8px; }
.artwork-viewer.has-pointer-focus button:focus-visible { outline: none; }
</style>
