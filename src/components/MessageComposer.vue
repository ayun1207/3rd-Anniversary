<script setup>
import { computed, nextTick, ref } from 'vue'

const author = ref('')
const text = ref('')
const submittedMessages = ref([])
const status = ref('')
const nextId = ref(1)

const canSubmit = computed(() => author.value.trim() && text.value.trim())

async function submitMessage() {
  if (!canSubmit.value) {
    status.value = '請先填寫寄語與署名。'
    return
  }

  const id = nextId.value++
  submittedMessages.value.push({
    id,
    author: author.value.trim(),
    text: text.value.trim(),
    lane: (id - 1) % 4,
    duration: 15 + ((id * 3) % 6)
  })
  author.value = ''
  text.value = ''
  status.value = '已暫存於本次瀏覽；重新整理後會消失。'
  await nextTick()
}
</script>

<template>
  <section class="message-composer" aria-labelledby="messageComposerTitle">
    <div
      v-if="submittedMessages.length"
      class="message-stream"
      aria-label="本次瀏覽新增的寄語"
    >
      <article
        v-for="message in submittedMessages"
        :key="message.id"
        class="message-meteor"
        :style="{
          '--message-lane': message.lane,
          '--message-duration': `${message.duration}s`
        }"
      >
        <p>{{ message.text }}</p>
        <footer>{{ message.author }}</footer>
      </article>
    </div>

    <form class="message-form" @submit.prevent="submitMessage">
      <div class="message-form-heading">
        <h2 id="messageComposerTitle">留下寄語</h2>
        <p>僅暫存於本次瀏覽</p>
      </div>
      <label>
        <span>寄語</span>
        <textarea v-model="text" maxlength="120" rows="3" required></textarea>
      </label>
      <label>
        <span>署名</span>
        <input v-model="author" maxlength="24" required>
      </label>
      <button type="submit" :aria-disabled="!canSubmit">送出</button>
      <p class="message-form-status" role="status" aria-live="polite">{{ status }}</p>
    </form>
  </section>
</template>

<style scoped>
.message-composer {
  width: min(1040px, 88vw);
  margin: clamp(46px, 7vw, 86px) auto 0;
}

.message-stream {
  position: relative;
  height: 210px;
  margin-bottom: 30px;
  overflow: hidden;
  border-block: 1px solid rgba(117, 105, 81, 0.13);
  mask-image: linear-gradient(90deg, transparent, #000 9%, #000 91%, transparent);
}

.message-meteor {
  position: absolute;
  top: calc(18px + var(--message-lane) * 46px);
  left: 100%;
  min-width: 230px;
  max-width: min(420px, 72vw);
  padding: 10px 16px;
  border: 1px solid rgba(117, 105, 81, 0.14);
  background: rgba(250, 247, 240, 0.68);
  color: #4f5d55;
  box-shadow: 0 8px 26px rgba(65, 57, 45, 0.04);
  animation: message-drift var(--message-duration) linear infinite;
}

.message-meteor p { line-height: 1.8; }
.message-meteor footer { margin-top: 4px; text-align: right; color: #7b7467; font-size: 0.72rem; }

.message-form {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(180px, 0.55fr) auto;
  gap: 18px;
  align-items: end;
  padding: clamp(22px, 3vw, 34px);
  border: 1px solid rgba(117, 105, 81, 0.18);
  background: rgba(248, 244, 235, 0.58);
  box-shadow: inset 0 0 0 5px rgba(255, 253, 248, 0.22), 0 18px 48px rgba(65, 57, 45, 0.045);
  backdrop-filter: blur(10px);
}

.message-form-heading { grid-column: 1 / -1; display: flex; align-items: baseline; justify-content: space-between; gap: 20px; }
.message-form-heading h2 { color: #46534c; font-size: 1.05rem; font-weight: 400; letter-spacing: 0.18em; }
.message-form-heading p { color: #878174; font-size: 0.7rem; letter-spacing: 0.08em; }
.message-form label { display: grid; gap: 7px; color: #6b7068; font-size: 0.74rem; letter-spacing: 0.12em; }
.message-form input,
.message-form textarea {
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid rgba(117, 105, 81, 0.3);
  border-radius: 0;
  background: rgba(255, 253, 248, 0.44);
  color: #3f4d46;
  font: inherit;
  resize: vertical;
}
.message-form input:focus-visible,
.message-form textarea:focus-visible,
.message-form button:focus-visible { outline: 2px solid rgba(143, 121, 89, 0.72); outline-offset: 3px; }
.message-form button {
  min-height: 44px;
  padding: 10px 20px;
  border: 1px solid rgba(117, 105, 81, 0.3);
  background: rgba(244, 238, 226, 0.78);
  color: #46534c;
  cursor: pointer;
}
.message-form-status { grid-column: 1 / -1; min-height: 1.4em; color: #6e786e; font-size: 0.72rem; }

@keyframes message-drift {
  from { transform: translateX(4vw); opacity: 0; }
  8%, 88% { opacity: 1; }
  to { transform: translateX(calc(-100vw - 100%)); opacity: 0; }
}

@media (max-width: 700px) {
  .message-form { grid-template-columns: 1fr; }
  .message-form-heading,
  .message-form-status { grid-column: 1; }
  .message-form-heading { align-items: flex-start; flex-direction: column; gap: 5px; }
}

@media (prefers-reduced-motion: reduce) {
  .message-stream { height: auto; max-height: 260px; overflow-y: auto; padding-block: 12px; }
  .message-meteor { position: relative; inset: auto; margin: 8px auto; animation: none; }
}
</style>
