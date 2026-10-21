<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VTextInput, VNumberInput, VPasswordInput, VCheckbox, VSearchField } from 'vueui-nova-kit'
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue?: string | number | boolean
  value?: string | number | boolean
  checked?: boolean
  type?: string
  label?: string
  placeholder?: string
  helperText?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  min?: number | string
  max?: number | string
  step?: number | string
  name?: string
  id?: string
}>(), {
  type: 'text',
  modelValue: undefined,
  value: undefined,
  checked: undefined
})
const emit = defineEmits<{ 'update:modelValue': [value: string | number | boolean]; change: [event: { target: { value: string | number | boolean; checked: boolean } }]; input: [event: { target: { value: string | number | boolean } }] }>()
const current = computed(() => props.modelValue ?? props.value ?? props.checked ?? '')
const draft = ref<string | number | boolean>(current.value)
const root = ref<HTMLElement | null>(null)
watch(current, value => { draft.value = value })
function update(value: string | number | null | boolean) { draft.value = value ?? ''; emit('update:modelValue', draft.value); emit('input', { target: { value: draft.value } }); if (props.type === 'checkbox') changed() }
function changed() { const value = draft.value; emit('change', { target: { value, checked: Boolean(value) } }) }
const n = (value: number | string | undefined) => value === undefined ? undefined : Number(value)
function focus() { root.value?.querySelector('input')?.focus() }
defineExpose({ focus })
</script>
<template>
  <div ref="root" class="min-w-0">
    <VCheckbox v-if="type === 'checkbox'" v-bind="$attrs" :model-value="Boolean(current)" :label="label" :disabled="disabled" :required="required" :name="name" :id="id" @update:model-value="update" />
    <VNumberInput v-else-if="type === 'number'" v-bind="$attrs" :model-value="n(current as number | string)" :label="label" :placeholder="placeholder" :helper-text="helperText" :disabled="disabled" :readonly="readonly" :required="required" :min="n(min)" :max="n(max)" :step="n(step)" :name="name" :id="id" size="sm" @update:model-value="update" @blur="changed" />
    <VPasswordInput v-else-if="type === 'password'" v-bind="$attrs" :model-value="String(current)" :label="label" :placeholder="placeholder" :helper-text="helperText" :disabled="disabled" :readonly="readonly" :required="required" :name="name" :id="id" size="sm" @update:model-value="update" @blur="changed" />
    <VSearchField v-else-if="type === 'search'" v-bind="$attrs" :model-value="String(current)" :label="label" :placeholder="placeholder" :disabled="disabled" :name="name" :id="id" size="sm" clearable @update:model-value="update" />
    <VTextInput v-else v-bind="$attrs" :model-value="String(current)" :label="label" :placeholder="placeholder" :helper-text="helperText" :disabled="disabled" :readonly="readonly" :required="required" :name="name" :id="id" :type="(type === 'email' || type === 'url' || type === 'tel') ? type : 'text'" size="sm" @update:model-value="update" @blur="changed" />
  </div>
</template>
