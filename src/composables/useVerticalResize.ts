export function useVerticalResize(
  containerHeight: Ref<number>,
  minContainerHeight: number,
  maxContainerHeight: number
) {
  // 使用 Pointer Events 统一处理鼠标、触屏与触控笔
  // 避免在 maxTouchPoints > 0 的混合设备上误判，导致鼠标无法拖动
  function onResizePointerDown(e: PointerEvent) {
    if (e.button !== 0 && e.pointerType === 'mouse') {
      return
    }
    e.preventDefault()
    const dom = e.currentTarget as HTMLElement
    const startY = e.clientY
    const startHeight = containerHeight.value ?? minContainerHeight
    const pointerId = e.pointerId

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
      const delta = evt.clientY - startY
      const newHeight = Math.max(minContainerHeight, Math.min(maxContainerHeight, startHeight - delta))
      containerHeight.value = newHeight
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
