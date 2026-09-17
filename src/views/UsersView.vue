<script setup lang="ts">
import { ref } from 'vue'
import { useUsers } from '@/stores/useUsers'
import type { Role } from '@/types/nexo'

const users = useUsers()
const nome = ref('')
const papel = ref<Role>('Dev')
const editId = ref('')
const editNome = ref('')
const editPapel = ref<Role>('Dev')
const msg = ref('')

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
        <button type="button" class="rounded-btn border border-nexo-border px-2 py-1 text-xs" :disabled="u.id === users.state.currentUserId" @click="users.trocarUsuario(u.id)">
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
      <p>Permissões do papel atual: visualizar {{ users.pode('visualizar') ? '✔' : '✘' }} · propor {{ users.pode('propor') ? '✔' : '✘' }} · editar {{ users.pode('editar') ? '✔' : '✘' }} · aprovar G2 {{ users.pode('aprovar', { gate: 'G2' } as never) ? '✔' : '✘ (só PM)' }} · aprovar G3 {{ users.pode('aprovar', { gate: 'G3' } as never) ? '✔' : '✘ (Arq/TL/Seg)' }}</p>
    </div>
  </div>
</template>
