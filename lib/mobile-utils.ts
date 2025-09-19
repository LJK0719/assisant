/**
 * 移动端优化工具函数
 */

// 检测是否为移动设备
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// 检测是否为触摸设备
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// 获取安全区域信息
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 };
  
  const style = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0,
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)')) || 0,
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)')) || 0,
  };
}

// 防止iOS Safari橡皮筋效果
export function preventBounceScroll(element: HTMLElement | null) {
  if (!element) return;
  
  let startY = 0;
  let startX = 0;
  
  const handleTouchStart = (e: TouchEvent) => {
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    const scrollTop = element.scrollTop;
    const scrollLeft = element.scrollLeft;
    const scrollHeight = element.scrollHeight;
    const scrollWidth = element.scrollWidth;
    const clientHeight = element.clientHeight;
    const clientWidth = element.clientWidth;
    
    const deltaY = y - startY;
    const deltaX = x - startX;
    
    // 垂直滚动边界检查
    if (
      (deltaY > 0 && scrollTop === 0) ||
      (deltaY < 0 && scrollTop >= scrollHeight - clientHeight)
    ) {
      e.preventDefault();
    }
    
    // 水平滚动边界检查
    if (
      (deltaX > 0 && scrollLeft === 0) ||
      (deltaX < 0 && scrollLeft >= scrollWidth - clientWidth)
    ) {
      e.preventDefault();
    }
  };
  
  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
  };
}

// 触摸反馈
export function addTouchFeedback(element: HTMLElement | null, className = 'touch-active') {
  if (!element) return;
  
  const handleTouchStart = () => {
    element.classList.add(className);
  };
  
  const handleTouchEnd = () => {
    element.classList.remove(className);
  };
  
  element.addEventListener('touchstart', handleTouchStart);
  element.addEventListener('touchend', handleTouchEnd);
  element.addEventListener('touchcancel', handleTouchEnd);
  
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchcancel', handleTouchEnd);
  };
}

// 获取设备像素比
export function getDevicePixelRatio(): number {
  return typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
}

// 检测屏幕方向
export function getOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') return 'portrait';
  
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

// 监听屏幕方向变化
export function onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void) {
  if (typeof window === 'undefined') return () => {};
  
  const handleOrientationChange = () => {
    callback(getOrientation());
  };
  
  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('resize', handleOrientationChange);
  
  return () => {
    window.removeEventListener('orientationchange', handleOrientationChange);
    window.removeEventListener('resize', handleOrientationChange);
  };
}

// 优化触摸滚动性能
export function optimizeScrolling(element: HTMLElement | null) {
  if (!element) return;
  
  // 设置webkit滚动优化
  if (element.style.webkitOverflowScrolling !== undefined) {
    element.style.webkitOverflowScrolling = 'touch';
  }
  if (element.style.overflowScrolling !== undefined) {
    element.style.overflowScrolling = 'touch';
  }
  
  // 添加will-change属性优化性能
  element.style.willChange = 'scroll-position';
  
  return () => {
    if (element.style.webkitOverflowScrolling !== undefined) {
      element.style.webkitOverflowScrolling = '';
    }
    if (element.style.overflowScrolling !== undefined) {
      element.style.overflowScrolling = '';
    }
    element.style.willChange = '';
  };
}

// 检测是否支持PWA
export function isPWACapable(): boolean {
  if (typeof window === 'undefined') return false;
  
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// 获取状态栏高度（iOS）
export function getStatusBarHeight(): number {
  if (typeof window === 'undefined') return 0;
  
  const style = getComputedStyle(document.documentElement);
  const topInset = style.getPropertyValue('env(safe-area-inset-top)');
  
  return parseInt(topInset) || (isMobileDevice() ? 20 : 0);
}
