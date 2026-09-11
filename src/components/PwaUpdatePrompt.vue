<script setup lang="ts">
import { h } from 'vue'
import { NButton, NSpace, NText, useMessage } from 'naive-ui'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useI18n } from '@/composables/useI18n'

const message = useMessage()
const { t } = useI18n()

let updateMessage: ReturnType<typeof message.create> | null = null
const updating = ref(false)

const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: !import.meta.env.DEV,
  onRegisterError(error) {
    console.error('PWA service worker registration failed', error)
  }
})

// 开发环境不使用 PWA，但旧版本可能已经注册过 Service Worker；启动时移除它，避免拦截 RPC。
if (import.meta.env.DEV) {
  onMounted(() => {
    void navigator.serviceWorker?.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister()
      })
    })
  })
}

function closeUpdateMessage() {
  needRefresh.value = false
  updateMessage?.destroy()
  updateMessage = null
}

async function refreshApp() {
  updating.value = true
  updateMessage && (updateMessage.content = renderUpdateMessage)
  try {
    await updateServiceWorker(true)
  } catch (error) {
    console.error('PWA service worker update failed', error)
    updating.value = false
    updateMessage && (updateMessage.content = renderUpdateMessage)
    message.error(t('pwa.updateFailed'))
  }
}

function renderUpdateMessage() {
  return h(
    NSpace,
    {
      vertical: true,
      size: 8
    },
    {
      default: () => [
        h(NText, { strong: true }, { default: () => t('pwa.updateTitle') }),
        h('span', t('pwa.updateDescription')),
        h(
          NSpace,
          { size: 8 },
          {
            default: () => [
              h(
                NButton,
                {
                  size: 'small',
                  type: 'primary',
                  loading: updating.value,
                  onClick: refreshApp
                },
                { default: () => t('pwa.updateNow') }
              ),
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  disabled: updating.value,
                  onClick: closeUpdateMessage
                },
                { default: () => t('common.close') }
              )
            ]
          }
        )
      ]
    }
  )
}

function showUpdateMessage() {
  if (updateMessage) {
    updateMessage.content = renderUpdateMessage
    return
  }

  updateMessage = message.create(renderUpdateMessage, {
    type: 'info',
    duration: 0,
    closable: true,
    keepAliveOnHover: true,
    onClose() {
      updateMessage = null
      needRefresh.value = false
    }
  })
}

watch(needRefresh, (value) => {
  if (value) {
    showUpdateMessage()
  }
})
</script>

<template></template>
