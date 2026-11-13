<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { gsap } from 'gsap';

const props = defineProps({ currentChapter: { type: Object, required: true }, navigate: { type: Function, required: true } });
const chapters = [
    { id: 'intro', label: '理時序' },
    { id: 'gallery', label: '觀芳華' },
    { id: 'text', label: '繪春信' },
    { id: 'planning', label: '籌花事' },
    { id: 'messages', label: '寄墨箋' },
    { id: 'thanks', label: '銘同錄' }
];
const expanded = ref(false);
const pointerFocus = ref(true);
const root = ref(null);
const trigger = ref(null);
const links = ref(null);
const indicator = ref(null);
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let indicatorTween;
let resizeObserver;
let indicatorPlaced = false;
async function updateIndicator() {
    await nextTick();
    if (!links.value || !indicator.value) return;
    const active = links.value.querySelector('[aria-current]');
    indicatorTween?.kill();
    if (!active || !active.getClientRects().length) {
        gsap.set(indicator.value, { opacity: 0 });
        indicatorPlaced = false;
        return;
    }
    indicatorTween = gsap.to(indicator.value, {
        x: active.offsetLeft + active.offsetWidth * 0.2,
        y: active.offsetTop + active.offsetHeight - 5,
        width: active.offsetWidth * 0.6,
        opacity: 0.85,
        duration: motionPreference.matches || !indicatorPlaced ? 0 : 0.38,
        ease: 'power2.inOut', overwrite: true
    });
    indicatorPlaced = true;
}
watch([() => props.currentChapter.value, expanded], updateIndicator);
const currentLabel = computed(() => chapters.find(chapter => chapter.id === props.currentChapter.value)?.label || chapters[0].label);
function selectChapter(id) {
    expanded.value = false;
    props.navigate(id);
}
function closeOutside(event) {
    pointerFocus.value = true;
    if (!root.value?.contains(event.target)) expanded.value = false;
}
function showKeyboardFocus() {
    pointerFocus.value = false;
}
function closeWithEscape(event) {
    if (event.key !== 'Escape' || !expanded.value) return;
    expanded.value = false;
    trigger.value?.focus();
    event.stopPropagation();
}
onMounted(() => {
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', showKeyboardFocus, true);
    motionPreference.addEventListener('change', updateIndicator);
    resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(root.value);
    document.fonts?.ready.then(updateIndicator);
    updateIndicator();
});
onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', closeOutside);
    document.removeEventListener('keydown', showKeyboardFocus, true);
    motionPreference.removeEventListener('change', updateIndicator);
    resizeObserver?.disconnect();
    indicatorTween?.kill();
});
</script>

<template>
    <nav ref="root" class="chapter-navigation" :class="{ 'is-expanded': expanded, 'has-pointer-focus': pointerFocus }" aria-label="章節導覽"
        @keydown="closeWithEscape" @focusout="event => { if (!root.contains(event.relatedTarget)) expanded = false; }">
        <button id="chapterHome" class="menu-toggle chapter-home" type="button" aria-label="回到理時序" @click="selectChapter('intro')">
            <svg class="menu-emblem" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                <defs>
                    <linearGradient id="menuGemBlueOrange" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stop-color="#8DB7DD" />
                        <stop offset="0.42" stop-color="#DCEBF7" />
                        <stop offset="1" stop-color="#FCC26F" />
                    </linearGradient>
                    <linearGradient id="menuGemOrangePink" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stop-color="#FCC26F" />
                        <stop offset="0.42" stop-color="#FEE4BC" />
                        <stop offset="1" stop-color="#F3A4B0" />
                    </linearGradient>
                </defs>
                <polygon class="menu-diamond" points="7,16 12,5 17,16 12,27" transform="rotate(-8 12 16)" fill="url(#menuGemBlueOrange)" />
                <polygon class="menu-diamond" points="14,16 19,5 24,16 19,27" transform="rotate(6 19 16)" fill="url(#menuGemOrangePink)" />
            </svg>
        </button>
        <button ref="trigger" class="chapter-navigation-trigger" type="button" :aria-expanded="expanded" aria-controls="chapter-navigation-links" @click="expanded = !expanded">
            <span>{{ currentLabel }}</span><span class="chapter-navigation-chevron" aria-hidden="true"></span>
        </button>
        <div id="chapter-navigation-links" ref="links" class="chapter-navigation-links">
            <span ref="indicator" class="chapter-navigation-indicator" aria-hidden="true"></span>
            <button v-for="chapter in chapters" :key="chapter.id" type="button" class="chapter-navigation-link" :aria-current="currentChapter.value === chapter.id ? 'location' : undefined" @click="selectChapter(chapter.id)">
                {{ chapter.label }}
            </button>
        </div>
    </nav>
</template>

<style>
.chapter-navigation.has-pointer-focus :focus-visible { outline: none; }
</style>
