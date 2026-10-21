<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VTextarea } from 'vueui-nova-kit'
const props = withDefaults(defineProps<{ modelValue?: string; value?: string; label?: string; placeholder?: string; rows?: number | string; disabled?: boolean; readonly?: boolean; name?: string; id?: string }>(), { rows: 3 })
const emit = defineEmits<{ 'update:modelValue': [value: string]; change: [event: { target: { value: string } }] }>()
const draft = ref(props.modelValue ?? props.value ?? '')
watch(() => props.modelValue ?? props.value ?? '', value => { draft.value = value })
function update(value: string) { draft.value = value; emit('update:modelValue', value) }
function blur() { emit('change', { target: { value: draft.value } }) }
const rowCount = computed(() => Number(props.rows) || 3)
</script>
<template><VTextarea v-bind="$attrs" :model-value="draft" :label="label" :placeholder="placeholder" :rows="rowCount" :disabled="disabled" :readonly="readonly" :name="name" :id="id" size="sm" @update:model-value="update" @blur="blur" /></template>
