import { type RefObject, useEffect } from "react";

function canScrollVertically(element: HTMLElement, deltaY: number): boolean {
  const maxScrollTop = element.scrollHeight - element.clientHeight;
  if (maxScrollTop <= 0) return false;
  if (deltaY < 0) return element.scrollTop > 0;
  if (deltaY > 0) return element.scrollTop < maxScrollTop - 1;
  return true;
}

function scrollAncestorOrWindow(start: HTMLElement, deltaY: number, deltaX: number) {
  let node: HTMLElement | null = start.parentElement;

  while (node) {
    const style = window.getComputedStyle(node);
    const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY);
    const maxScrollTop = node.scrollHeight - node.clientHeight;

    if (canScrollY && maxScrollTop > 0) {
      node.scrollTop += deltaY;
      node.scrollLeft += deltaX;
      return;
    }

    node = node.parentElement;
  }

  window.scrollBy({ top: deltaY, left: deltaX, behavior: "auto" });
}

export function useDocumentViewerWheelChaining(
  scrollContainerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onWheel = (event: WheelEvent) => {
      const { deltaY, deltaX } = event;
      if (deltaY === 0 && deltaX === 0) return;

      if (!canScrollVertically(container, deltaY)) {
        event.preventDefault();
        scrollAncestorOrWindow(container, deltaY, deltaX);
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [scrollContainerRef]);
}

export function useDocumentViewerMiddleMousePan(
  scrollContainerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    const stopPanning = () => {
      if (!isPanning) return;
      isPanning = false;
      container.style.cursor = "";
      container.style.removeProperty("user-select");
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 1) return;
      event.preventDefault();
      isPanning = true;
      startX = event.clientX;
      startY = event.clientY;
      scrollLeft = container.scrollLeft;
      scrollTop = container.scrollTop;
      container.style.cursor = "grabbing";
      container.style.userSelect = "none";
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isPanning) return;
      event.preventDefault();
      container.scrollLeft = scrollLeft - (event.clientX - startX);
      container.scrollTop = scrollTop - (event.clientY - startY);
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 1) stopPanning();
    };

    const onAuxClick = (event: MouseEvent) => {
      if (event.button === 1) event.preventDefault();
    };

    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("auxclick", onAuxClick);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      stopPanning();
      container.removeEventListener("mousedown", onMouseDown);
      container.removeEventListener("auxclick", onAuxClick);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [scrollContainerRef]);
}
