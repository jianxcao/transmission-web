export function useResize(containerWidth: Ref<number>, minContainerWidth: number, maxContainerWidth: number) {
  // 使用 Pointer Events 统一处理鼠标、触屏与触控笔
  // 避免在 maxTouchPoints > 0 的混合设备上误判，导致鼠标无法拖动
  function onResizePointerDown(e: PointerEvent) {
    // 仅响应主按键（鼠标左键 / 触屏 / 笔）
    if (e.button !== 0 && e.pointerType === 'mouse') {
      return
    }
    e.preventDefault()
    const dom = e.currentTarget as HTMLElement
    const startX = e.clientX
    const startWidth = containerWidth.value ?? minContainerWidth
    const pointerId = e.pointerId

    // 锁定 pointer，确保拖出元素后仍能持续接收事件
    try {
      dom.setPointerCapture(pointerId)
    } catch {
      // 忽略不支持的浏览器
    }
    dom.classList.add('active')

    function onMove(evt: PointerEvent) {
      if (evt.pointerId !== pointerId) {
        return
      }
      const newWidth = Math.max(minContainerWidth, Math.min(maxContainerWidth, startWidth + evt.clientX - startX))
      containerWidth.value = newWidth
    }

    function cleanup() {
      dom.classList.remove('active')
      try {
        dom.releasePointerCapture(pointerId)
      } catch {
        // 忽略不支持的浏览器
      }
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerup', cleanup)
      dom.removeEventListener('pointercancel', cleanup)
    }

    dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerup', cleanup)
    dom.addEventListener('pointercancel', cleanup)
  }

  return {
    onResizePointerDown
  }
}
