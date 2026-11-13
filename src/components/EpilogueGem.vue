<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { gsap } from 'gsap';

const props = defineProps({ currentChapter: { type: Object, required: true } });
const passages = [
    ['願來年仍可共觀春華、同聽夏雨、', '並賞秋月、相守冬雪；'],
    ['歲歲更迭，年年相續，', '縱時序流轉，亦願與君偕行。']
];
const lines = passages.map(parts => parts.join(''));
const trigger = ref(null);
const gem = ref(null);
const dialog = ref(null);
const shade = ref(null);
const panel = ref(null);
const mobilePreference = window.matchMedia('(max-width: 900px)');
const isMobile = ref(mobilePreference.matches);
const opened = ref(false);
const closing = ref(false);
const gemPosition = ref(null);
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let openingAnimation;
let writingAnimation;
let closingAnimation;
let gemAnimation;
let positionFrame;
let frameObserver;

function positionGem() {
    if (isMobile.value) {
        return;
    }
    const frame = document.querySelector('#thanks-page .text-container');
    if (!frame || props.currentChapter.value !== 'thanks') return;
    const bounds = frame.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    let left = bounds.right - 60;
    let top = bounds.bottom + 12;
    if (top + 68 > innerHeight - 12) {
        left = bounds.right + 12;
        top = bounds.bottom - 68;
        if (left + 60 > innerWidth - 12) {
            left = bounds.right - 80;
            top = bounds.bottom - 88;
        }
    }
    gemPosition.value = {
        left: `${Math.max(12, Math.min(left, innerWidth - 72))}px`,
        top: `${Math.max(12, Math.min(top, innerHeight - 80))}px`
    };
}

function queueGemPosition() {
    cancelAnimationFrame(positionFrame);
    if (props.currentChapter.value !== 'thanks') return;
    positionFrame = requestAnimationFrame(() => {
        positionFrame = requestAnimationFrame(positionGem);
    });
}

async function updateMobileLayout() {
    isMobile.value = mobilePreference.matches;
    await nextTick();
    positionGem();
}

function updateGemMotion() {
    gemAnimation?.kill();
    if (!gem.value) return;
    gsap.set(gem.value, { rotation: 8 });
    if (props.currentChapter.value !== 'thanks' || opened.value || document.hidden || motionPreference.matches) return;
    gemAnimation = gsap.timeline({ delay: 1.8, repeat: -1, repeatDelay: 4.8 })
        .to(gem.value, { rotation: -1, duration: 0.18, ease: 'sine.inOut' })
        .to(gem.value, { rotation: 20, duration: 0.26, ease: 'sine.inOut' })
        .to(gem.value, { rotation: 1, duration: 0.22, ease: 'sine.inOut' })
        .to(gem.value, { rotation: 12, duration: 0.18, ease: 'sine.inOut' })
        .to(gem.value, { rotation: 8, duration: 0.22, ease: 'sine.inOut' });
}

function completeWriting() {
    writingAnimation?.progress(1);
}

async function openEpilogue() {
    if (opened.value || props.currentChapter.value !== 'thanks') return;
    opened.value = true;
    await nextTick();
    dialog.value.showModal();
    const gem = trigger.value.getBoundingClientRect();
    const bounds = panel.value.getBoundingClientRect();
    const characters = panel.value.querySelectorAll('.epilogue-character');
    gsap.set(panel.value, {
        transformOrigin: `${gem.left + gem.width / 2 - bounds.left}px ${gem.top + gem.height / 2 - bounds.top}px`
    });
    if (motionPreference.matches) {
        gsap.set([shade.value, panel.value, ...characters], { opacity: 1 });
        gsap.set(panel.value, { scale: 1 });
        panel.value.focus({ preventScroll: true });
        return;
    }
    gsap.set(characters, { opacity: 0 });
    openingAnimation = gsap.timeline()
        .fromTo(shade.value, { opacity: 0 }, { opacity: 1, duration: 0.95, ease: 'sine.inOut' }, 0)
        .fromTo(panel.value, { opacity: 0, scale: 0.06 }, {
            opacity: 1, scale: 1, duration: 1.1, ease: 'power2.out'
        }, 0.12);
    writingAnimation = gsap.timeline({ delay: 0.85 });
    const endingStart = lines.join('').indexOf('亦願與君偕行');
    let position = 0;
    characters.forEach((character, index) => {
        const variation = Math.sin(index * 0.85) * 0.055 + Math.sin(index * 0.3) * 0.025;
        const endingProgress = Math.min(1, Math.max(0, (index - endingStart) / 5));
        const isEnding = index >= endingStart;
        const interval = isEnding
            ? 0.22 + endingProgress * 0.25 + variation * 0.5
            : Math.max(0.04, 0.1 + variation);
        const punctuationPause = /[、，；。]/u.test(character.textContent)
            ? 0.06 + Math.abs(Math.sin(index * 0.8)) * 0.08 : 0;
        writingAnimation.to(character, {
            opacity: 1, duration: 0.26 + endingProgress * 0.18, ease: 'sine.out'
        }, position);
        position += interval + punctuationPause;
    });
    panel.value.focus({ preventScroll: true });
}

function finishClosing() {
    dialog.value.close();
    gsap.set([panel.value, shade.value], { clearProps: 'all' });
    opened.value = false;
    closing.value = false;
    if (props.currentChapter.value === 'thanks') trigger.value?.focus({ preventScroll: true });
}

function closeEpilogue(immediate = false) {
    if (!opened.value || closing.value) return;
    closing.value = true;
    openingAnimation?.kill();
    writingAnimation?.kill();
    if (immediate || motionPreference.matches) {
        finishClosing();
        return;
    }
    closingAnimation = gsap.timeline({ onComplete: finishClosing })
        .to(panel.value, { opacity: 0, duration: 0.32, ease: 'sine.inOut' }, 0)
        .to(shade.value, { opacity: 0, duration: 0.5, ease: 'sine.inOut' }, 0.08);
}

function updateMotionPreference() {
    updateGemMotion();
    if (!motionPreference.matches) return;
    openingAnimation?.progress(1);
    completeWriting();
    closingAnimation?.progress(1);
}
watch(() => props.currentChapter.value, chapter => {
    if (chapter !== 'thanks') closeEpilogue(true);
    else queueGemPosition();
});
watch([() => props.currentChapter.value, opened], updateGemMotion, { flush: 'post' });
onMounted(() => {
    updateGemMotion();
    queueGemPosition();
    const frame = document.querySelector('#thanks-page .text-container');
    frameObserver = new ResizeObserver(queueGemPosition);
    if (frame) frameObserver.observe(frame);
    window.addEventListener('resize', queueGemPosition);
    mobilePreference.addEventListener('change', updateMobileLayout);
    document.addEventListener('visibilitychange', updateGemMotion);
});
motionPreference.addEventListener('change', updateMotionPreference);
onBeforeUnmount(() => {
    cancelAnimationFrame(positionFrame);
    frameObserver?.disconnect();
    window.removeEventListener('resize', queueGemPosition);
    mobilePreference.removeEventListener('change', updateMobileLayout);
    gemAnimation?.kill();
    openingAnimation?.kill();
    writingAnimation?.kill();
    closingAnimation?.kill();
    dialog.value?.close();
    motionPreference.removeEventListener('change', updateMotionPreference);
    document.removeEventListener('visibilitychange', updateGemMotion);
});
</script>

<template>
    <Teleport to="#thanks-page .text-container" :disabled="!isMobile">
    <button v-show="currentChapter.value === 'thanks'" ref="trigger" type="button"
        class="epilogue-gem-trigger" :style="isMobile ? null : gemPosition" aria-label="開啟藏在寶石裡的結語" aria-haspopup="dialog" @click="openEpilogue">
        <span ref="gem" class="epilogue-gem season-gem" aria-hidden="true">
            <span class="gem-face gem-face-blue"></span>
            <span class="gem-face gem-face-gold"></span>
            <span class="gem-face gem-face-blue-depth"></span>
            <span class="gem-face gem-face-pink-depth"></span>
        </span>
    </button>
    </Teleport>
    <dialog ref="dialog" class="epilogue-dialog" aria-labelledby="epilogueTitle" aria-describedby="epilogueDescription"
        @cancel.prevent="closeEpilogue()" @keydown.tab.prevent>
        <div ref="shade" class="epilogue-shade" aria-hidden="true" @click="closeEpilogue()"></div>
        <section ref="panel" class="epilogue-panel" tabindex="-1">
            <h2 id="epilogueTitle" class="epilogue-accessible">結語</h2>
            <p id="epilogueDescription" class="epilogue-accessible">{{ lines.join('') }}</p>
            <p class="epilogue-writing" aria-hidden="true">
                <span v-for="(parts, lineIndex) in passages" :key="lineIndex" class="epilogue-line" aria-hidden="true">
                    <span v-for="(part, partIndex) in parts" :key="partIndex" class="epilogue-segment">
                        <span v-for="(character, index) in Array.from(part)" :key="index" class="epilogue-character">{{ character }}</span>
                    </span>
                </span>
            </p>
        </section>
    </dialog>
</template>

<style scoped>
.epilogue-gem-trigger {
    position: fixed;
    z-index: 35;
    display: grid;
    place-items: center;
    width: 60px;
    height: 68px;
    padding: 0;
    border: 0;
    background: transparent;
    filter: drop-shadow(0 0 8px rgba(211, 231, 234, 0.45));
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}
.epilogue-gem {
    position: relative;
    width: 30px;
    height: 43px;
    transform: rotate(8deg);
    background: linear-gradient(140deg, #f4fcff, #8db7dd 42%, #ffd6ac 67%, #f3a4b0);
}
.gem-face {
    position: absolute;
    inset: 1px;
}
.gem-face-blue {
    clip-path: polygon(50% 0, 50% 44%, 0 50%);
    background: linear-gradient(125deg, #f5fcff, #8db7dd 72%, #6e94b4);
}
.gem-face-gold {
    clip-path: polygon(50% 0, 100% 50%, 50% 44%);
    background: linear-gradient(145deg, #fffdef, #ffe4b7 48%, #c89d62);
}
.gem-face-blue-depth {
    clip-path: polygon(0 50%, 50% 44%, 50% 100%);
    background: linear-gradient(120deg, #bcd9ec, #6b91b5 48%, #526a8c);
}
.gem-face-pink-depth {
    clip-path: polygon(50% 44%, 100% 50%, 50% 100%);
    background: linear-gradient(145deg, #f9d4b9, #f3a4b0 48%, #a46c86);
}
.epilogue-gem::before {
    content: '';
    position: absolute;
    z-index: 1;
    left: calc(50% - 0.5px);
    top: 2%;
    width: 1px;
    height: 94%;
    background: linear-gradient(180deg, rgba(255, 255, 248, 0.95), rgba(255, 255, 248, 0.55) 44%, transparent);
}
.epilogue-gem::after {
    content: '';
    position: absolute;
    z-index: 1;
    inset: 0;
    background: radial-gradient(ellipse at 45% 38%, rgba(255, 255, 246, 0.72), transparent 32%);
}
.epilogue-gem-trigger:hover {
    filter: brightness(1.12) drop-shadow(0 0 8px rgba(211, 231, 234, 0.45));
}
.epilogue-gem-trigger:focus-visible { outline: 1px solid #f4e6c9; outline-offset: 2px; border-radius: 16px; }
.epilogue-dialog {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 24px;
    border: 0;
    background: transparent;
    overflow: auto;
    box-sizing: border-box;
}
.epilogue-dialog[open] { display: grid; place-items: center; }
.epilogue-dialog::backdrop { background: transparent; }
.epilogue-shade {
    position: fixed;
    inset: 0;
    background: rgba(19, 34, 31, 0.72);
}
.epilogue-panel {
    position: relative;
    box-sizing: border-box;
    width: min(980px, 100%);
    padding: clamp(44px, 4vw, 58px) clamp(28px, 3vw, 44px);
    border: 2px solid transparent;
    border-radius: 32px;
    background:
        linear-gradient(145deg, rgba(235, 246, 255, 0.22) 0%, transparent 30% 68%, rgba(243, 164, 176, 0.1)) padding-box,
        linear-gradient(115deg, rgba(141, 183, 221, 0.12), transparent 36% 64%, rgba(252, 194, 111, 0.08)) padding-box,
        linear-gradient(155deg, #62796f, #50685e) padding-box,
        linear-gradient(125deg, #8db7dd, #dcebf7 30%, #fcc26f 64%, #f3a4b0) border-box;
    box-shadow:
        inset 0 1px 0 rgba(243, 250, 255, 0.5),
        inset 1px 0 10px rgba(141, 183, 221, 0.12),
        inset -1px 0 10px rgba(243, 164, 176, 0.1),
        0 0 12px rgba(220, 235, 247, 0.1),
        0 18px 50px rgba(13, 31, 26, 0.16);
}
.epilogue-panel::before {
    content: '';
    position: absolute;
    inset: 8px;
    border: 1px solid rgba(220, 235, 247, 0.23);
    border-radius: 24px;
    pointer-events: none;
}
.epilogue-writing {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: #f5f3e6;
    font: inherit;
    font-size: clamp(26px, 2.5vw, 36px);
    font-weight: 300;
    line-height: 1.9;
    letter-spacing: 0.055em;
    text-align: center;
    text-shadow:
        0 -0.5px 0 rgba(255, 255, 243, 0.2),
        0 1px 2px rgba(33, 53, 44, 0.25),
        0 4px 8px rgba(33, 53, 44, 0.14);
}
.epilogue-line { display: block; }
.epilogue-writing,
.epilogue-writing * {
    font-family: var(--artwork-font) !important;
}
.epilogue-character { opacity: 0; }
.epilogue-panel:focus { outline: none; }
.epilogue-accessible {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}
@media (max-width: 900px) {
    .epilogue-gem-trigger { position: absolute; right: 8px; bottom: 8px; }
}
@media (max-width: 768px) {
    .epilogue-dialog { padding: 22px; }
    .epilogue-panel { padding: 56px 22px 36px; border-radius: 26px; }
    .epilogue-panel::before { border-radius: 18px; }
    .epilogue-writing { font-size: clamp(20px, 5.6vw, 26px); line-height: 1.9; letter-spacing: 0.03em; }
    .epilogue-line + .epilogue-line { margin-top: 0.7em; }
    .epilogue-segment { display: block; white-space: nowrap; }
}
</style>
