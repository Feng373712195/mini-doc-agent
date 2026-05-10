## Vue 最佳实践

### 组件通信最佳实践

const props = defineProps<{
open: boolean
}>();

const emit = defineEmits<{
'update:open': [value: boolean]
}>();

const openProxy = computed({
get: () => props.open,
set: (value) => emit('update:open', value)
});
