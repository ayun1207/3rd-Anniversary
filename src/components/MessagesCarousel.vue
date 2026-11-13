<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { gsap } from 'gsap';
import { messagePages } from '../data/messages.js';

const props = defineProps({ currentChapter: { type: Object, required: true } });
const mobileMedia = matchMedia('(max-width: 900px)');
const motionMedia = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = ref(mobileMedia.matches);
const currentPage = ref(0);
const incomingPage = ref(null);
const isPageSwitching = ref(false);
const groups = [];
const dialog = ref(null);
const selectedNote = ref(null);
const pointerFocus = ref(false);
let timeline;
let dialogTween;
let version = 0;
let noteVersion = 0;
let returnFocus;
let touchStart;
let suppressClickUntil = 0;
const preparedImages = new Map();
let preloadTimer;
let preloadSources = [];
let preloadWorkers = 0;

function isReadingMessages() {
    return props.currentChapter.value === 'messages' || (mobile.value && props.currentChapter.value === 'thanks');
}

function prepareImage(src, srcset, priority = 'auto') {
    const key = srcset ? `${srcset}:${innerWidth}:${devicePixelRatio}` : src;
    if (!preparedImages.has(key)) {
        const image = new Image();
        image.fetchPriority = priority;
        const entry = { image, ready: false, promise: null };
        if (srcset) {
            image.sizes = '(max-width: 768px) calc(100vw - 36px), 76vw';
            image.srcset = srcset;
        }
        image.src = src;
        let timer;
        const timeout = new Promise(resolve => { timer = window.setTimeout(() => resolve(false), 10000); });
        const prepared = Promise.race([image.decode().then(() => true, () => false), timeout]).then(ready => {
            window.clearTimeout(timer);
            entry.ready = ready;
            entry.image = null;
            if (!ready) preparedImages.delete(key);
            return ready;
        });
        entry.promise = prepared;
        preparedImages.set(key, entry);
    } else if (priority === 'high' && preparedImages.get(key).image) {
        preparedImages.get(key).image.fetchPriority = 'high';
    }
    return preparedImages.get(key).promise;
}

async function preloadNextNote() {
    try {
        while (preloadSources.length) {
            await prepareImage(preloadSources.shift(), undefined, 'low');
        }
    } finally {
        --preloadWorkers;
    }
}

function scheduleNotePreload() {
    window.clearTimeout(preloadTimer);
    preloadSources = [];
    if (!mobile.value || props.currentChapter.value !== 'messages' || document.hidden) return;
    const pageCount = messagePages.length;
    const nextPage = messagePages[(currentPage.value + 1) % pageCount];
    const previousPage = messagePages[(currentPage.value - 1 + pageCount) % pageCount];
    // 先準備切頁需要的縮圖，再處理當頁點擊放大使用的清晰圖。
    preloadSources = [
        ...nextPage.notes.map(note => note.small),
        ...previousPage.notes.map(note => note.small),
        ...messagePages[currentPage.value].notes.map(note => note.src)
    ];
    preloadTimer = window.setTimeout(() => {
        while (preloadWorkers < 2 && preloadSources.length) {
            ++preloadWorkers;
            void preloadNextNote();
        }
    }, 0);
}

function finishPage(target = currentPage.value) {
    ++version;
    timeline?.kill();
    timeline = null;
    currentPage.value = target;
    incomingPage.value = null;
    gsap.set(groups.filter(Boolean), { clearProps: 'transform' });
    isPageSwitching.value = false;
}

async function movePage(direction) {
    if (isPageSwitching.value) return;
    isPageSwitching.value = true;
    const turn = ++version;
    const target = (currentPage.value + direction + messagePages.length) % messagePages.length;
    const page = messagePages[target];
    let ready;
    if (mobile.value) {
        ready = (await Promise.all(page.notes.map(note => prepareImage(note.small, undefined, 'high')))).every(Boolean);
    } else {
        ready = await prepareImage(page.src, `${page.small} 1200w, ${page.src} 2400w`);
    }
    if (turn !== version) return;
    if (!ready) {
        finishPage();
        return;
    }
    if (motionMedia.matches) {
        finishPage(target);
        return;
    }
    incomingPage.value = target;
    await nextTick();
    if (turn !== version) return;
    const travel = direction > 0 ? 104 : -104;
    timeline = gsap.timeline({ onComplete: () => finishPage(target) })
        .fromTo(groups[currentPage.value], { xPercent: 0 }, { xPercent: -travel, duration: 0.68, ease: 'power2.inOut' }, 0)
        .fromTo(groups[target], { xPercent: travel }, { xPercent: 0, duration: 0.68, ease: 'power2.inOut' }, 0);
}

async function openNote(note, event) {
    if (!mobile.value || isPageSwitching.value || performance.now() < suppressClickUntil) return;
    const trigger = event.currentTarget;
    const request = ++noteVersion;
    pointerFocus.value = event.detail > 0;
    returnFocus = trigger;
    selectedNote.value = { ...note, displaySrc: preparedImages.get(note.src)?.ready ? note.src : note.small };
    const prepared = prepareImage(note.src, undefined, 'high');
    await nextTick();
    if (request !== noteVersion || !mobile.value || !isReadingMessages()) return;
    dialog.value.showModal();
    dialog.value.focus({ preventScroll: true });
    dialogTween?.kill();
    dialogTween = gsap.fromTo(dialog.value, { opacity: 0, scale: 0.97 }, {
        opacity: 1, scale: 1, duration: motionMedia.matches ? 0 : 0.28, ease: 'sine.out'
    });
    void prepared.then(ready => {
        if (ready && request === noteVersion && selectedNote.value) selectedNote.value.displaySrc = note.src;
    });
}

function closeNote() {
    ++noteVersion;
    dialogTween?.kill();
    if (!dialog.value?.open) return;
    dialog.value.close();
    selectedNote.value = null;
    if (isReadingMessages()) returnFocus?.focus({ preventScroll: true });
}

function startSwipe(event) {
    touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
}

function endSwipe(event) {
    if (!touchStart || event.touches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.hypot(dx, dy) > 10) suppressClickUntil = performance.now() + 400;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && !(window.visualViewport?.scale > 1.01)) {
        event.preventDefault();
        void movePage(dx < 0 ? 1 : -1);
    }
}

function changeMedia() {
    closeNote();
    mobile.value = mobileMedia.matches;
    finishPage();
}
function changeMotion() {
    if (motionMedia.matches) {
        finishPage(incomingPage.value ?? currentPage.value);
        dialogTween?.progress(1);
    }
}
watch(() => props.currentChapter.value, () => {
    if (!isReadingMessages()) {
        closeNote();
        finishPage();
    }
});
watch([currentPage, mobile, () => props.currentChapter.value], scheduleNotePreload, { immediate: true });
document.addEventListener('visibilitychange', scheduleNotePreload);
mobileMedia.addEventListener('change', changeMedia);
motionMedia.addEventListener('change', changeMotion);
onBeforeUnmount(() => {
    preloadSources = [];
    window.clearTimeout(preloadTimer);
    closeNote();
    finishPage();
    mobileMedia.removeEventListener('change', changeMedia);
    motionMedia.removeEventListener('change', changeMotion);
    document.removeEventListener('visibilitychange', scheduleNotePreload);
});
</script>

<template>
    <div class="messages-carousel" :class="{ 'has-pointer-focus': pointerFocus }"
        @pointerdown.capture="pointerFocus = true" @keydown.capture="pointerFocus = false">
        <button id="messagesPrev" class="messages-arrow messages-prev" type="button" aria-label="上一頁寄語" @click="movePage(-1)">
            <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M19 5l-6 11 6 11" /></svg>
        </button>
        <div id="messagesViewport" class="messages-viewport" role="region" aria-label="寄語輪播" tabindex="0"
            @keydown.left.prevent="movePage(-1)" @keydown.right.prevent="movePage(1)"
            @touchstart.passive="startSwipe" @touchend="endSwipe" @touchcancel="touchStart = null">
            <div id="messagesTrack" class="messages-track">
                <div v-for="(page, index) in messagePages" :key="page.sheet" :ref="element => groups[index] = element"
                    class="message-group" :class="{ 'is-current': index === currentPage || index === incomingPage }" data-count="1" role="group"
                    :aria-label="`第 ${index + 1} 頁`" :aria-hidden="index !== currentPage && index !== incomingPage" :inert="index !== currentPage && index !== incomingPage">
                    <div v-if="mobile" class="message-note-board" :style="{ aspectRatio: `${page.width} / ${page.height}` }">
                        <button v-for="note in page.notes" :key="note.id" type="button" class="message-note"
                            :style="{ left: `${note.x}%`, top: `${note.y}%`, width: `${note.width}%`, height: `${note.height}%` }"
                            :aria-label="`放大第 ${note.id} 則寄語`" aria-haspopup="dialog" @click="openNote(note, $event)">
                            <img v-if="index === currentPage || index === incomingPage" :src="note.small" :width="note.imageWidth" :height="note.imageHeight" alt="" loading="lazy" decoding="async" draggable="false">
                        </button>
                    </div>
                    <figure v-else class="message-sheet" :style="{ aspectRatio: `${page.width} / ${page.height}` }">
                        <picture v-if="index === currentPage || index === incomingPage">
                            <source :srcset="`${page.small} 1200w, ${page.src} 2400w`" sizes="(max-width: 768px) calc(100vw - 36px), 76vw" type="image/webp">
                            <img :src="page.src" :width="page.width" :height="page.height" :alt="`三周年寄語留言卡第 ${index + 1} 頁`" loading="lazy" decoding="async">
                        </picture>
                    </figure>
                </div>
            </div>
        </div>
        <button id="messagesNext" class="messages-arrow messages-next" type="button" aria-label="下一頁寄語" @click="movePage(1)">
            <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M13 5l6 11-6 11" /></svg>
        </button>
        <p id="messagesStatus" class="messages-status" role="status" aria-live="polite">第 {{ currentPage + 1 }} 頁，共 {{ messagePages.length }} 頁</p>
        <dialog ref="dialog" class="message-note-dialog" tabindex="-1" :aria-label="selectedNote ? `第 ${selectedNote.id} 則寄語，點周圍空白處關閉` : '寄語'"
            @click="event => { if (event.target === dialog) closeNote(); }" @cancel.prevent="closeNote" @keydown.tab.prevent @touchmove.prevent>
            <img v-if="selectedNote" :src="selectedNote.displaySrc" :width="selectedNote.imageWidth" :height="selectedNote.imageHeight"
                :style="{ aspectRatio: `${selectedNote.imageWidth} / ${selectedNote.imageHeight}` }" :alt="`第 ${selectedNote.id} 則寄語`" draggable="false">
        </dialog>
    </div>
</template>

<style>
#messages-carousel-root { display: contents; }
.message-note-board { position: relative; width: 100%; }
#messages-page .message-note {
    position: absolute;
    display: block;
    min-width: 0;
    min-height: 0;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    cursor: zoom-in;
}
.message-note img { display: block; width: 100%; height: 100%; object-fit: contain; }
.message-note:focus-visible { outline: 2px solid #506c60; outline-offset: 3px; }
.messages-carousel.has-pointer-focus .message-note:focus-visible { outline: none; }
#messages-page .message-note-dialog {
    position: fixed;
    inset: 0;
    width: min(94vw, 520px);
    max-width: none;
    height: fit-content;
    max-height: calc(100dvh - 160px);
    margin: auto;
    padding: 0;
    border: 0;
    background: transparent;
    overflow: hidden;
    outline: none;
    touch-action: none;
}
.message-note-dialog::backdrop { background: rgba(22, 35, 30, 0.68); }
.message-note-dialog img { display: block; width: 100%; height: auto; max-height: calc(100dvh - 160px); object-fit: contain; }
</style>
