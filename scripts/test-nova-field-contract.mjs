import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import NovaField from '../src/components/common/NovaField.vue'

const textHtml = await renderToString(createSSRApp({
  render: () => h(NovaField, { value: 'Checkout Web' })
}))
assert.match(textHtml, /value="Checkout Web"/)
assert.doesNotMatch(textHtml, /value="false"/)

const emptyTextHtml = await renderToString(createSSRApp({
  render: () => h(NovaField)
}))
assert.doesNotMatch(emptyTextHtml, /value="false"/)

console.log('test-nova-field-contract: ok')
