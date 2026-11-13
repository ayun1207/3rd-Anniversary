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
const mobile = matchMedia('(max-width: 900px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let placeholder;
let transition;
let returnFocus;
let panX = 0;
let panY = 0;
let gesture;
let lastTap = 0;

function paintZoom() {
    const limitX = props.stage.offsetWidth * (zoom.value - 1) / 2;
    const limitY = props.stage.offsetHeight * (zoom.value - 1) / 2;
    panX = Math.max(-limitX, Math.min(limitX, panX));
    panY = Math.max(-limitY, Math.min(limitY, panY));
    gsap.set(props.stage, { scale: zoom.value, x: panX, y: panY });
}

function resetZoom() {
    zoom.value = 1;
    panX = panY = 0;
    paintZoom();
}

async function openViewer() {
    if (opened.value || !mobile.matches || props.currentChapter.value !== 'gallery') return;
    returnFocus = document.activeElement;
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
    resetZoom();
    transition = gsap.fromTo(dialog.value, { opacity: 0 }, {
        opacity: 1, duration: reducedMotion.matches ? 0 : 0.35, ease: 'sine.out'
    });
    closeButton.value.focus({ preventScroll: true });
}

function closeViewer() {
    if (!opened.value) return;
    transition?.kill();
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
    resetZoom();
    void props.move(direction);
}

function touchDistance(touches) {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function startGesture(event) {
    event.stopPropagation();
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
    } else if (zoom.value > 1 && !gesture.distance) {
        panX = gesture.panX + event.touches[0].clientX - gesture.x;
        panY = gesture.panY + event.touches[0].clientY - gesture.y;
        paintZoom();
    }
}

function endGesture(event) {
    event.stopPropagation();
    if (!gesture || event.touches.length) return;
    const dx = event.changedTouches[0].clientX - gesture.x;
    const dy = event.changedTouches[0].clientY - gesture.y;
    if (!gesture.distance && zoom.value === 1 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        changeArtwork(dx < 0 ? 1 : -1);
    } else if (!gesture.distance && Math.hypot(dx, dy) < 10) {
        const now = performance.now();
        if (now - lastTap < 300) {
            zoom.value = zoom.value > 1 ? 1 : 2;
            panX = panY = 0;
            paintZoom();
        }
        lastTap = now;
    }
    gesture = null;
}

function handleKey(event) {
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
    if (opened.value) resetZoom();
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
    <dialog ref="dialog" class="artwork-viewer" aria-label="放大閱讀作品" @cancel.prevent="closeViewer" @keydown.capture="handleKey">
        <div class="artwork-viewer-shade" aria-hidden="true" @click="closeViewer"></div>
        <button ref="closeButton" class="artwork-viewer-close" type="button" aria-label="關閉放大作品" @click="closeViewer">×</button>
        <div ref="viewport" class="artwork-viewer-viewport"
            @touchstart.capture="startGesture" @touchmove.capture.prevent="moveGesture"
            @touchend.capture="endGesture" @touchcancel.capture="gesture = null"></div>
        <div class="artwork-viewer-controls">
            <button type="button" aria-label="上一張作品" @click="changeArtwork(-1)">‹</button>
            <p>{{ zoom > 1 ? '拖曳查看細節 · 箭頭換作 · 輕點兩下還原' : '左右滑動換作 · 雙指或輕點兩下縮放' }}</p>
            <button type="button" aria-label="下一張作品" @click="changeArtwork(1)">›</button>
        </div>
    </dialog>
</template>

<style>
#gallery-page .artwork-viewer {
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
.artwork-viewer::backdrop { background: transparent; }
.artwork-viewer-shade { position: absolute; inset: 0; background: rgba(24, 39, 33, 0.62); }
.artwork-viewer-viewport {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: calc(100% - 140px);
    overflow: hidden;
    touch-action: none;
}
#gallery-page .artwork-viewer .gallery-stage {
    width: min(calc(100vw - 16px), calc((100dvh - 140px) * 2000 / 1126));
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
.artwork-viewer-close { position: absolute; right: max(12px, env(safe-area-inset-right)); top: max(12px, env(safe-area-inset-top)); z-index: 2; font-size: 30px; }
.artwork-viewer-controls { position: absolute; bottom: max(12px, env(safe-area-inset-bottom)); left: 12px; right: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.artwork-viewer-controls p { font-size: 12px; line-height: 1.6; text-align: center; }
.artwork-viewer button:focus-visible { outline: 1px solid #e0eade; border-radius: 8px; }
</style>
