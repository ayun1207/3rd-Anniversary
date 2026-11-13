<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { gsap } from 'gsap';
import spring from '../../images/backgrounds/32-2400.webp';
import springSmall from '../../images/backgrounds/32-1280.webp';
import autumn from '../../images/backgrounds/33-2400.webp';
import autumnSmall from '../../images/backgrounds/33-1280.webp';
import winter from '../../images/backgrounds/34-2400.webp';
import winterSmall from '../../images/backgrounds/34-1280.webp';

const props = defineProps({ currentChapter: { type: Object, required: true } });
const groups = [
    { src: spring, srcset: `${springSmall} 1280w, ${spring} 2400w` },
    { src: autumn, srcset: `${autumnSmall} 1280w, ${autumn} 2400w` },
    { src: winter, srcset: `${winterSmall} 1280w, ${winter} 2400w` }
];
const chapterGroups = { intro: 0, gallery: 0, text: 1, planning: 1, messages: 2, thanks: 2 };
const layers = ref([null, null]);
const elements = [];
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let activeLayer = 0;
let requestVersion = 0;
let transition;

watch(() => chapterGroups[props.currentChapter.value], async group => {
    const version = ++requestVersion;
    const asset = groups[group];
    const prepared = new Image();
    prepared.sizes = '100vw';
    prepared.srcset = asset.srcset;
    prepared.src = asset.src;
    try {
        await prepared.decode();
    } catch {
        // 載入失敗時保留已顯示的背景，下次選章可重新嘗試。
        return;
    }
    if (version !== requestVersion) return;
    transition?.kill();
    const incoming = 1 - activeLayer;
    gsap.set(elements[activeLayer], { opacity: 1, zIndex: 0 });
    gsap.set(elements[incoming], { opacity: 0, zIndex: 1 });
    layers.value[incoming] = asset;
    await nextTick();
    if (version !== requestVersion) return;
    const outgoing = activeLayer;
    activeLayer = incoming;
    transition = gsap.timeline({ onComplete: () => { layers.value[outgoing] = null; } })
        .to(elements[incoming], { opacity: 1, duration: motionPreference.matches ? 0 : 0.7, ease: 'sine.inOut' }, 0);
}, { immediate: true, flush: 'post' });

function updateMotionPreference() {
    if (motionPreference.matches) transition?.progress(1);
}
motionPreference.addEventListener('change', updateMotionPreference);

onBeforeUnmount(() => {
    ++requestVersion;
    transition?.kill();
    motionPreference.removeEventListener('change', updateMotionPreference);
});
</script>

<template>
    <div class="chapter-background" aria-hidden="true">
        <div class="chapter-background-art">
            <div v-for="(asset, index) in layers" :key="index" :ref="element => elements[index] = element" class="chapter-background-layer">
                <img v-if="asset" :src="asset.src" :srcset="asset.srcset" sizes="100vw" alt="" decoding="async" draggable="false">
            </div>
        </div>
    </div>
</template>
