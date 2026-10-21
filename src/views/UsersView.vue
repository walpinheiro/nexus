<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUsers } from '@/stores/useUsers'
import LucideIcon from '@/components/common/LucideIcon.vue'
import type { Role } from '@/types/nexo'
import { useProjects } from '@/stores/useProjects'
import { VButton, VCard, VBadge, VDialog, VTextInput, VSelect, VEmptyState } from 'vueui-nova-kit'

const users = useUsers()
const projects = useProjects()
const nome = ref('')
const papel = ref<Role>('Dev')
const editId = ref('')
const editNome = ref('')
const editPapel = ref<Role>('Dev')
const msg = ref('')
const papeis: { value: Role; label: string }[] = [
  { value: 'PM', label: 'Product Manager' }, { value: 'PO', label: 'Product Owner' }, { value: 'Negocio', label: 'Negócio' },
  { value: 'UX', label: 'UX' }, { value: 'Arquiteto', label: 'Arquiteto' }, { value: 'TechLead', label: 'Tech Lead' },
  { value: 'Dev', label: 'Desenvolvimento' }, { value: 'QA', label: 'QA' }, { value: 'Seguranca', label: 'Segurança' }
]

const usuarioAtual = computed(() =>
  users.state.usuarios.find((x) => x.id === users.state.currentUserId),
)

function criar() {
  if (!nome.value.trim()) {
    msg.value = 'Informe o nome.'
    return
  }
  users.criarUsuario(nome.value.trim(), papel.value, projects.state.atualId)
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
  if (users.editarUsuario(editId.value, editNome.value, editPapel.value, projects.state.atualId)) {
    msg.value = 'Usuário atualizado.'
    editId.value = ''
  }
}
function remover(id: string) {
  msg.value = users.removerUsuario(id) ? 'Usuário removido.' : 'Não é possível remover o último usuário.'
}
</script>

<template>
  <div class="users-page">
    <header class="users-heading"><div><span class="users-eyebrow">GOVERNANÇA DO PROJETO</span><h1>Pessoas e papéis</h1><p>Gerencie quem participa de {{ projects.atual?.titulo }} e veja as permissões por papel.</p></div><VButton variant="primary" @click="nome = ''; papel = 'Dev'; editId = ''; msg = ''"><template #icon><LucideIcon name="plus" :size="16" /></template>Adicionar pessoa</VButton></header>
    <VCard class="users-current" variant="filled" title="Usuário atual" :description="usuarioAtual ? `${usuarioAtual.nome} · ${usuarioAtual.papel}` : 'Nenhum usuário selecionado.'"><template #header-trailing><VBadge variant="primary" size="sm">{{ projects.atual?.titulo }}</VBadge></template><template #default><p>Troque o usuário ativo para verificar como os papéis habilitam ações nos gates.</p></template></VCard>
    <VDialog :model-value="!!msg" title="Atualização" :description="msg" variant="basic" confirm-text="Entendi" @confirm="msg = ''" @close="msg = ''" />
    <form class="users-create" @submit.prevent="criar"><VTextInput v-model="nome" label="Nome" placeholder="Nome da pessoa" required /><VSelect v-model="papel" label="Papel" :options="papeis" /><VButton type="submit" variant="primary">Adicionar ao projeto</VButton></form>
    <div class="users-list" aria-label="Pessoas do projeto">
      <VCard v-for="u in users.state.usuarios.filter((user) => user.projeto_ids.includes(projects.state.atualId))" :key="u.id" class="users-person" variant="outlined">
        <template #title><strong>{{ u.nome }}</strong></template><template #description><span class="users-person-role">{{ papeis.find((r) => r.value === u.papel)?.label ?? u.papel }}</span><code>{{ u.id }}</code></template>
        <template #default><div class="users-person-actions"><VBadge :variant="u.id === users.state.currentUserId ? 'primary' : 'neutral'" size="sm">{{ u.id === users.state.currentUserId ? 'Atual' : 'Participante' }}</VBadge><VButton variant="outline" size="sm" :disabled="u.id === users.state.currentUserId" @click="users.trocarUsuario(u.id)">{{ u.id === users.state.currentUserId ? 'Em uso' : 'Usar este papel' }}</VButton><VButton variant="ghost" size="sm" @click="iniciarEdicao(u.id)">Editar</VButton><VButton variant="destructive" size="sm" @click="remover(u.id)">Remover</VButton></div><div v-if="editId === u.id" class="users-edit"><VTextInput v-model="editNome" label="Nome" /><VSelect v-model="editPapel" label="Papel" :options="papeis" /><VButton variant="primary" size="sm" @click="salvarEdicao">Salvar</VButton></div></template>
      </VCard>
      <VEmptyState v-if="users.state.usuarios.filter((user) => user.projeto_ids.includes(projects.state.atualId)).length === 0" title="Ainda não há pessoas neste projeto" description="Adicione alguém para habilitar colaboração e revisão dos gates." variant="create" />
    </div>
    <VCard class="users-permissions" variant="outlined" title="Permissões do papel atual" :description="usuarioAtual ? `Acesso local de ${usuarioAtual.nome}; mudanças de papel refletem nos gates do projeto.` : ''">
      <template #default><div class="users-permission-grid"><span>Visualizar <VBadge :variant="users.pode('visualizar') ? 'success' : 'danger'" size="sm">{{ users.pode('visualizar') ? 'Permitido' : 'Sem acesso' }}</VBadge></span><span>Propor <VBadge :variant="users.pode('propor') ? 'success' : 'danger'" size="sm">{{ users.pode('propor') ? 'Permitido' : 'Sem acesso' }}</VBadge></span><span>Editar <VBadge :variant="users.pode('editar') ? 'success' : 'danger'" size="sm">{{ users.pode('editar') ? 'Permitido' : 'Sem acesso' }}</VBadge></span><span>Aprovar G2 <VBadge :variant="users.pode('aprovar', { gate: 'G2' } as never) ? 'success' : 'danger'" size="sm">{{ users.pode('aprovar', { gate: 'G2' } as never) ? 'Permitido' : 'Sem acesso' }}</VBadge></span><span>Aprovar G3 <VBadge :variant="users.pode('aprovar', { gate: 'G3' } as never) ? 'success' : 'danger'" size="sm">{{ users.pode('aprovar', { gate: 'G3' } as never) ? 'Permitido' : 'Sem acesso' }}</VBadge></span></div></template>
    </VCard>
    <p class="users-limitation">Os papéis e permissões deste MVP são simulados localmente no navegador; não substituem autenticação e autorização no servidor.</p>
  </div>
</template>

<style scoped>
.users-page{max-width:1180px;margin:0 auto;padding:10px 4px 40px}.users-heading{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:19px}.users-eyebrow{color:var(--v-color-primary-text);font-size:10px;font-weight:750;letter-spacing:.12em}.users-heading h1{margin:7px 0 4px;font-size:26px;letter-spacing:-.04em;color:var(--v-color-text)}.users-heading p,.users-current p{margin:0;color:var(--v-color-text-muted);font-size:12px}.users-create{display:grid;grid-template-columns:minmax(220px,1fr) minmax(210px,.7fr) auto;align-items:end;gap:12px;margin:16px 0}.users-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.users-person{min-width:0}.users-person-role{margin-right:10px}.users-person code{color:var(--v-color-text-muted);font-size:10px}.users-person-actions{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:13px}.users-edit{display:grid;grid-template-columns:1fr 1fr auto;align-items:end;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--v-color-border)}.users-permission-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.users-permission-grid span{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px;border:1px solid var(--v-color-border);border-radius:8px;color:var(--v-color-text-muted);font-size:11px}.users-permissions{margin-top:16px}.users-limitation{margin-top:12px;color:var(--v-color-text-muted);font-size:10px}@media(max-width:650px){.users-heading{align-items:flex-start}.users-heading h1{font-size:22px}.users-create,.users-list,.users-permission-grid{grid-template-columns:1fr}.users-edit{grid-template-columns:1fr}.users-person-actions{align-items:flex-start}}
</style>
