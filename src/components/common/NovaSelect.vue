<script setup lang="ts">
import { VSelect } from 'vueui-nova-kit'
import type { VSelectOption } from 'vueui-nova-kit'
defineProps<{ modelValue?: string; value?: string; options: VSelectOption[]; label?: string; placeholder?: string; disabled?: boolean; id?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; change: [event: { target: { value: string } }] }>()
function update(value: string) { emit('update:modelValue', value); emit('change', { target: { value } }) }
</script>
<template><VSelect v-bind="$attrs" :model-value="modelValue ?? value ?? ''" :options="options" :label="label" :placeholder="placeholder" :disabled="disabled" :id="id" size="sm" @update:model-value="update" /></template>
