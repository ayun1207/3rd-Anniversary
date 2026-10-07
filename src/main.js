
const messageComposerRoot = document.getElementById('messageComposerApp')

if (messageComposerRoot) {
  createApp(MessageComposer).mount(messageComposerRoot)
}
import { createApp } from 'vue'
import MessageComposer from './components/MessageComposer.vue'
