<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUsers } from '@/stores/useUsers'
import LucideIcon from '@/components/common/LucideIcon.vue'
import type { Role } from '@/types/nexo'

const users = useUsers()
const nome = ref('')
const papel = ref<Role>('Dev')
const editId = ref('')
const editNome = ref('')
const editPapel = ref<Role>('Dev')
const msg = ref('')

const usuarioAtual = computed(() =>
  users.state.usuarios.find((x) => x.id === users.state.currentUserId),
)

function criar() {
  if (!nome.value.trim()) {
    msg.value = 'Informe o nome.'
    return
  }
  users.criarUsuario(nome.value.trim(), papel.value)
  nome.value = ''
  msg.value = 'Usuário criado.'
}
function iniciarEdicao(id: string) {
  const u = users.state.usuarios.find((x) => x.id === id)
  if (!u) return
  editId.value = id
  editNome.value = u.nome
  editPapel.value = u.papel
}
function salvarEdicao() {
  if (users.editarUsuario(editId.value, editNome.value, editPapel.value)) {
    msg.value = 'Usuário atualizado.'
    editId.value = ''
  }
}
function remover(id: string) {
  msg.value = users.removerUsuario(id) ? 'Usuário removido.' : 'Não é possível remover o último usuário.'
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-bold">Usuários — CRUD + role switcher (permissão real)</h1>
    <section class="rounded-card border border-nexo-primary bg-nexo-primary-soft/40 p-4 text-sm" aria-live="polite">
      <h2 class="text-base font-semibold">Usuário atual</h2>
      <p v-if="usuarioAtual" class="mt-1">
        <span class="font-semibold">{{ usuarioAtual.nome }}</span>
        <span class="text-nexo-muted"> (id: {{ usuarioAtual.id }} · papel: {{ usuarioAtual.papel }})</span>
      </p>
      <p v-else class="mt-1 text-nexo-muted">Nenhum usuário selecionado.</p>
      <p class="mt-1 text-nexo-muted">A troca de papel para teste é feita aqui: use o botão "Usar este papel" na linha do usuário desejado.</p>
    </section>
    <p v-if="msg" class="text-sm text-nexo-approved">{{ msg }}</p>
    <form class="flex gap-2 text-sm" @submit.prevent="criar">
      <input v-model="nome" placeholder="Nome" aria-label="Nome do usuário" class="rounded-btn border border-nexo-border px-3 py-1.5" />
      <select v-model="papel" aria-label="Papel" class="rounded-btn border border-nexo-border px-2 py-1.5">
        <option>PM</option><option>UX</option><option>Arquiteto</option><option>TechLead</option><option>Dev</option><option>QA</option><option>Seguranca</option>
      </select>
      <button type="submit" class="rounded-btn bg-nexo-primary px-3 py-1.5 font-semibold text-white">Criar</button>
    </form>
    <ul class="space-y-2">
      <li v-for="u in users.state.usuarios" :key="u.id" class="flex flex-wrap items-center gap-2 text-sm">
        <span class="w-64">{{ u.nome }} — {{ u.papel }}</span>
        <button type="button" class="rounded-btn border border-nexo-border px-3 py-1.5 text-sm min-h-[32px]" :disabled="u.id === users.state.currentUserId" @click="users.trocarUsuario(u.id)">
          {{ u.id === users.state.currentUserId ? 'Atual' : 'Usar este papel' }}
        </button>
        <button type="button" class="rounded-btn border border-nexo-border px-2 py-1 text-xs" @click="iniciarEdicao(u.id)">Editar</button>
        <button type="button" class="rounded-btn border border-nexo-blocked-border px-2 py-1 text-xs text-nexo-blocked" @click="remover(u.id)">Remover</button>
        <span v-if="editId === u.id" class="flex gap-2">
          <input v-model="editNome" class="rounded-btn border border-nexo-border px-2 py-1 text-xs" aria-label="Editar nome" />
          <select v-model="editPapel" class="rounded-btn border border-nexo-border px-2 py-1 text-xs" aria-label="Editar papel">
            <option>PM</option><option>UX</option><option>Arquiteto</option><option>TechLead</option><option>Dev</option><option>QA</option><option>Seguranca</option>
          </select>
          <button type="button" class="rounded-btn bg-nexo-primary px-2 py-1 text-xs text-white" @click="salvarEdicao()">Salvar</button>
        </span>
      </li>
    </ul>
    <div class="text-xs text-nexo-muted">
      <p class="flex flex-wrap items-center gap-1">Permissões do papel atual:
        <span class="inline-flex items-center gap-0.5">visualizar <LucideIcon :name="users.pode('visualizar') ? 'check' : 'x'" :size="12" /></span> ·
        <span class="inline-flex items-center gap-0.5">propor <LucideIcon :name="users.pode('propor') ? 'check' : 'x'" :size="12" /></span> ·
        <span class="inline-flex items-center gap-0.5">editar <LucideIcon :name="users.pode('editar') ? 'check' : 'x'" :size="12" /></span> ·
        <span class="inline-flex items-center gap-0.5">aprovar G2 <LucideIcon :name="users.pode('aprovar', { gate: 'G2' } as never) ? 'check' : 'x'" :size="12" /><span v-if="!users.pode('aprovar', { gate: 'G2' } as never)">(só PM)</span></span> ·
        <span class="inline-flex items-center gap-0.5">aprovar G3 <LucideIcon :name="users.pode('aprovar', { gate: 'G3' } as never) ? 'check' : 'x'" :size="12" /><span v-if="!users.pode('aprovar', { gate: 'G3' } as never)">(Arq/TL/Seg)</span></span>
      </p>
    </div>
  </div>
</template>
