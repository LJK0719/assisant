// CSS 类型扩展，支持webkit前缀属性

declare global {
  interface CSSStyleDeclaration {
    webkitOverflowScrolling?: string;
    webkitTextSizeAdjust?: string;
    webkitUserSelect?: string;
    webkitTouchCallout?: string;
    webkitTapHighlightColor?: string;
    webkitAppearance?: string;
    webkitBackfaceVisibility?: string;
    webkitTransform?: string;
    webkitTransition?: string;
    webkitAnimation?: string;
    msOverflowStyle?: string;
    msTextSizeAdjust?: string;
    msUserSelect?: string;
    overflowScrolling?: string;
  }
}

export {};
