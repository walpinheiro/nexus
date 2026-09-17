import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'
import { useProjects } from '@/stores/useProjects'
import { useProject } from '@/stores/useProject'
import { useGraph } from '@/stores/useGraph'
import { useGate } from '@/stores/useGate'
import { useUsers } from '@/stores/useUsers'
import { useUI } from '@/stores/useUI'
import '@/assets/main.css'
import '@/components/studio/m3/m3.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Instancia as stores para forçar o persist eager do seed,
// garantindo as chaves nexo.v1.* no localStorage em fresh profile.
// useProjects primeiro: cria/migra namespaces por projeto.
useProjects(pinia)
useProject(pinia)
useGraph(pinia)
useGate(pinia)
useUsers(pinia)
useUI(pinia)

app.use(router)
app.mount('#app')
