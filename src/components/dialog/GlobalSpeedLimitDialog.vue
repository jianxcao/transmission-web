<template>
  <n-modal
    v-model:show="show"
    preset="card"
    :title="title"
    :bordered="false"
    :class="$style.dialog"
    @after-enter="focusInput"
  >
    <n-form label-placement="left" :label-width="90">
      <n-form-item :label="$t('speedLimitDialog.limit')">
        <div class="flex items-center gap-2 w-full">
          <n-input-number
            ref="inputRef"
            v-model:value="limitValue"
            :min="1"
            :precision="0"
            :placeholder="$t('speedLimitDialog.unlimited')"
            class="flex-1"
            @keyup.enter="onSave"
          />
          <span class="whitespace-nowrap">KiB/s</span>
        </div>
      </n-form-item>
      <div class="text-xs opacity-60 pl-[90px]">{{ $t('speedLimitDialog.unlimitedHint') }}</div>
    </n-form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button :disabled="loading" @click="show = false">{{ $t('common.cancel') }}</n-button>
        <n-button type="primary" :loading="loading" @click="onSave">{{ $t('common.confirm') }}</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { rpc, type SessionSetArgs } from '@/api/rpc'
import { useSessionStore } from '@/store'
import { useMessage, type InputNumberInst } from 'naive-ui'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  direction: 'download' | 'upload'
}>()
const show = defineModel<boolean>('show', { required: true })
const emit = defineEmits<{
  saved: []
}>()

const { t: $t } = useI18n()
const message = useMessage()
const sessionStore = useSessionStore()
const inputRef = ref<InputNumberInst | null>(null)
const limitValue = ref<number | null>(null)
const loading = ref(false)

const title = computed(() =>
  props.direction === 'download'
    ? $t('speedLimitDialog.downloadTitle')
    : $t('speedLimitDialog.uploadTitle')
)
const limitKey = computed<'speed-limit-down' | 'speed-limit-up'>(() =>
  props.direction === 'download' ? 'speed-limit-down' : 'speed-limit-up'
)
const enabledKey = computed<'speed-limit-down-enabled' | 'speed-limit-up-enabled'>(() =>
  props.direction === 'download' ? 'speed-limit-down-enabled' : 'speed-limit-up-enabled'
)

function initValue() {
  const session = sessionStore.session
  const enabled = Boolean(session?.[enabledKey.value])
  const value = Number(session?.[limitKey.value])
  limitValue.value = enabled && Number.isFinite(value) && value > 0 ? value : null
}

function focusInput() {
  inputRef.value?.focus()
}

async function onSave() {
  if (loading.value) {
    return
  }

  const value = Number(limitValue.value)
  const enabled = Number.isFinite(value) && value > 0
  const args: SessionSetArgs = {
    [enabledKey.value]: enabled
  }
  if (enabled) {
    args[limitKey.value] = Math.round(value)
  }

  loading.value = true
  try {
    await rpc.sessionSet(args)
    await sessionStore.fetchSession()
    message.success($t('speedLimitDialog.saveSuccess'))
    emit('saved')
    show.value = false
  } catch {
    message.error($t('speedLimitDialog.saveFailed'))
  } finally {
    loading.value = false
  }
}

watch([show, () => props.direction], ([visible]) => {
  if (visible) {
    initValue()
  }
})
</script>

<style module lang="less">
.dialog {
  width: 420px !important;
  max-width: calc(100vw - 32px) !important;
}
</style>
