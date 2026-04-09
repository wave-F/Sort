/**
 * WebView Safety Module
 * iOS WebView 触摸安全模块
 * 
 * 功能：
 * - 禁用双击放大镜
 * - 防止长按触发系统菜单
 * - 防止文字选择
 * - 保留所有游戏触摸交互
 * 
 * 验证依据：
 * - MDN: touch-action "allows JS events to fire normally"
 * - MDN: user-select "only affects text selection, not event dispatching"
 * - Apple WWDC 2019: 官方演示 canvas 使用 touch-action: none
 * - Stack Overflow: Phaser/Three.js 开发者验证方案有效
 * 
 * 兼容性：iOS 9.3+, Android 全版本, 桌面浏览器
 */

(function(global) {
  'use strict';

  /**
   * WebViewSafety 主类
   */
  class WebViewSafety {
    
    // ============================================
    // 静态属性
    // ============================================
    
    static _initialized = false;
    static _isIOS = false;
    static _config = {
      preventDoubleTap: true,
      preventLongPress: true,
      preventSelection: true,
      preventContextMenu: true,
      injectCSS: true,
      doubleTapThreshold: 300,  // ms - 双击判定时间
      // 注意：longPressThreshold 已移除，长按防护完全依赖 CSS (-webkit-touch-callout: none)
    };
    
    // ============================================
    // 公开 API
    // ============================================
    
    /**
     * 初始化安全模块
     * @param {Object} options - 配置选项
     * @param {boolean} options.preventDoubleTap - 防止双击放大镜 (默认 true)
     * @param {boolean} options.preventLongPress - 防止长按菜单 (默认 true)
     * @param {boolean} options.preventSelection - 防止文字选择 (默认 true)
     * @param {boolean} options.preventContextMenu - 防止右键菜单 (默认 true)
     * @param {boolean} options.injectCSS - 自动注入 CSS (默认 true，如已引入 CSS 文件请设为 false)
     * @param {number} options.doubleTapThreshold - 双击判定时间 ms (默认 300)
     * @returns {Object} { initialized: boolean, isIOS: boolean }
     */
    static init(options = {}) {
      if (this._initialized) {
        return { initialized: true, isIOS: this._isIOS };
      }
      
      // 合并配置
      this._config = { ...this._config, ...options };
      
      // 检测 iOS 环境
      this._isIOS = this._detectIOS();
      
      console.log(`[WebViewSafety] Initializing... iOS detected: ${this._isIOS}`);
      
      // 注入 CSS（如果启用且未通过外部文件加载）
      if (this._config.injectCSS) {
        this._injectCSS();
      }
      
      // 设置事件拦截（仅 iOS 需要，但在所有平台应用以保持一致性）
      if (this._config.preventDoubleTap) {
        this._setupDoubleTapPrevention();
      }
      
      if (this._config.preventLongPress) {
        this._setupLongPressPrevention();
      }
      
      if (this._config.preventSelection) {
        this._setupSelectionPrevention();
      }
      
      if (this._config.preventContextMenu) {
        this._setupContextMenuPrevention();
      }
      
      this._initialized = true;
      console.log('[WebViewSafety] Initialized successfully');
      
      return { initialized: true, isIOS: this._isIOS };
    }
    
    /**
     * 为特定元素启用文字选择（如输入框）
     * @param {HTMLElement} element - 目标元素
     */
    static enableSelectionFor(element) {
      if (!element) return;
      
      element.style.webkitUserSelect = 'text';
      element.style.userSelect = 'text';
      element.style.webkitTouchCallout = 'default';
      element.setAttribute('data-selection-enabled', 'true');
    }
    
    /**
     * 为特定元素禁用安全措施（如需要长按功能的 UI）
     * @param {HTMLElement} element - 目标元素
     */
    static disableFor(element) {
      if (!element) return;
      
      element.style.webkitUserSelect = 'auto';
      element.style.userSelect = 'auto';
      element.style.webkitTouchCallout = 'default';
      element.style.touchAction = 'auto';
      element.setAttribute('data-safety-disabled', 'true');
    }
    
    /**
     * 为特定元素重新启用安全措施
     * @param {HTMLElement} element - 目标元素
     */
    static enableFor(element) {
      if (!element) return;
      
      element.style.webkitUserSelect = 'none';
      element.style.userSelect = 'none';
      element.style.webkitTouchCallout = 'none';
      element.style.touchAction = 'none';
      element.removeAttribute('data-safety-disabled');
    }
    
    /**
     * 检查是否已初始化
     * @returns {boolean}
     */
    static get isInitialized() {
      return this._initialized;
    }
    
    /**
     * 检查是否为 iOS 设备
     * @returns {boolean}
     */
    static get isIOS() {
      return this._isIOS;
    }
    
    /**
     * 获取当前配置
     * @returns {Object}
     */
    static get config() {
      return { ...this._config };
    }
    
    // ============================================
    // 私有方法
    // ============================================
    
    /**
     * 检测是否为 iOS 设备
     * @returns {boolean}
     */
    static _detectIOS() {
      if (typeof navigator === 'undefined') return false;
      
      // 方法 1: userAgent 检测
      const isIOSUserAgent = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // 方法 2: 检测 iPad (iOS 13+ 伪装成 Mac)
      const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
      
      // 方法 3: 检测 Capacitor iOS
      const isCapacitorIOS = typeof window !== 'undefined' && 
                             window.Capacitor && 
                             window.Capacitor.getPlatform && 
                             window.Capacitor.getPlatform() === 'ios';
      
      return isIOSUserAgent || isIPadOS || isCapacitorIOS;
    }
    
    /**
     * 注入安全 CSS
     * 注意：此 CSS 是简化版本，完整功能请使用独立的 webview-safety.css 文件
     */
    static _injectCSS() {
      if (typeof document === 'undefined') return;
      if (document.getElementById('webview-safety-css-injected')) return;
      
      // 检查是否已加载外部 CSS 文件（避免重复）
      const existingLink = document.querySelector('link[href*="webview-safety"]');
      if (existingLink) {
        console.log('[WebViewSafety] External CSS detected, skipping injection');
        return;
      }
      
      const style = document.createElement('style');
      style.id = 'webview-safety-css-injected';
      style.textContent = `
        /* WebViewSafety 自动注入样式 (简化版) */
        /* 完整功能请使用 webview-safety.css 文件 */
        
        html, body {
          margin: 0;
          padding: 0;
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        
        /* 游戏画布核心防护 */
        canvas,
        .game-container,
        .game-canvas,
        [data-game-element],
        [data-no-select] {
          touch-action: none;
          -ms-touch-action: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
          -webkit-user-drag: none;
          user-select: none;
          pointer-events: auto;
        }
        
        /* 按钮快速响应 */
        button,
        .btn,
        .button,
        [data-clickable],
        [role="button"] {
          touch-action: manipulation;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
          -webkit-appearance: none;
          user-select: none;
        }
        
        /* 滑块控件 */
        input[type="range"],
        .slider,
        [data-slider] {
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          touch-action: pan-x;
          user-select: none;
        }
        
        /* 可滚动容器 */
        .scrollable,
        .ui-layer,
        .ui-panel,
        [data-scrollable],
        [data-scrollable-y] {
          touch-action: pan-y;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          -webkit-user-select: none;
          user-select: none;
        }
        
        .scrollable-x,
        [data-scrollable-x] {
          touch-action: pan-x;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          -webkit-user-select: none;
          user-select: none;
        }
        
        .scrollable-both,
        [data-scrollable-both] {
          touch-action: pan-x pan-y;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          -webkit-user-select: none;
          user-select: none;
        }
        
        /* 输入框恢复选择 */
        input[type="text"],
        input[type="password"],
        input[type="email"],
        input[type="number"],
        input[type="tel"],
        input[type="url"],
        input[type="search"],
        textarea,
        [contenteditable="true"],
        .text-input,
        [data-text-input],
        [data-selection-enabled="true"] {
          -webkit-user-select: text !important;
          -webkit-touch-callout: default !important;
          user-select: text !important;
          touch-action: manipulation;
        }
        
        /* 安全禁用的元素 */
        [data-safety-disabled="true"] {
          -webkit-user-select: auto !important;
          -webkit-touch-callout: default !important;
          user-select: auto !important;
          touch-action: auto !important;
        }
        
        /* 拖动状态 */
        .dragging,
        [data-dragging="true"] {
          touch-action: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
        }
        
        /* 禁用状态 */
        .disabled,
        [disabled],
        [data-disabled="true"] {
          pointer-events: none;
          opacity: 0.5;
        }
        
        /* Safe Area 适配 */
        .safe-area-container {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
        
        /* 全屏游戏模式 */
        html.fullscreen-game,
        html.fullscreen-game body {
          position: fixed;
          width: 100%;
          height: 100%;
          overflow: hidden;
          touch-action: none;
        }
      `;
      
      // 插入到 head 最前面，允许外部 CSS 覆盖
      const head = document.head || document.getElementsByTagName('head')[0];
      if (head.firstChild) {
        head.insertBefore(style, head.firstChild);
      } else {
        head.appendChild(style);
      }
      
      console.log('[WebViewSafety] CSS injected');
    }
    
    /**
     * 双击放大镜拦截
     * 原理：检测短时间内的两次 touchstart，阻止第二次的默认行为
     */
    static _setupDoubleTapPrevention() {
      if (typeof document === 'undefined') return;
      
      let lastTouchTime = 0;
      let lastTouchX = 0;
      let lastTouchY = 0;
      const threshold = this._config.doubleTapThreshold;
      const distanceThreshold = 30; // 像素，允许手指微小移动
      
      document.addEventListener('touchstart', (e) => {
        const now = Date.now();
        const touch = e.touches[0];
        const timeDiff = now - lastTouchTime;
        
        // 计算两次触摸的距离
        const dx = touch.clientX - lastTouchX;
        const dy = touch.clientY - lastTouchY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 如果是快速双击（时间短且位置接近）
        if (timeDiff < threshold && timeDiff > 0 && distance < distanceThreshold) {
          // 阻止默认行为（放大镜）
          e.preventDefault();
          // 不阻止传播，让游戏事件继续
        }
        
        lastTouchTime = now;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
      }, { passive: false });
    }
    
    /**
     * 长按菜单拦截
     */
    static _setupLongPressPrevention() {
      if (typeof document === 'undefined') return;
      
      // 针对 canvas 和游戏元素的 touchstart
      // 注意：使用 passive: true 不阻止事件，只用于标记
      const gameElements = document.querySelectorAll('canvas, .game-container, [data-game-element]');
      
      gameElements.forEach(element => {
        // 为游戏元素添加标记
        element.setAttribute('data-game-element', 'true');
      });
      
      // 监听动态添加的元素
      if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) { // Element node
                if (node.tagName === 'CANVAS' || 
                    node.classList.contains('game-container')) {
                  node.setAttribute('data-game-element', 'true');
                }
              }
            });
          });
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    }
    
    /**
     * 文字选择拦截
     */
    static _setupSelectionPrevention() {
      if (typeof document === 'undefined') return;
      
      // 阻止 selectstart 事件
      document.addEventListener('selectstart', (e) => {
        const target = e.target;
        
        // 允许输入框和可编辑元素
        if (this._isEditableElement(target)) {
          return true;
        }
        
        // 检查是否有 data-selection-enabled 属性
        if (target.closest && target.closest('[data-selection-enabled="true"]')) {
          return true;
        }
        
        // 检查是否有 data-safety-disabled 属性
        if (target.closest && target.closest('[data-safety-disabled="true"]')) {
          return true;
        }
        
        e.preventDefault();
        return false;
      });
      
      // 在 touchend 时清除意外的选择
      document.addEventListener('touchend', () => {
        // 延迟清除，避免干扰正常的输入框操作
        setTimeout(() => {
          const selection = window.getSelection();
          const activeElement = document.activeElement;
          
          // 如果当前焦点不在输入框，清除选择
          if (selection && selection.rangeCount > 0 && !this._isEditableElement(activeElement)) {
            // 检查选择的内容是否在可编辑区域
            const anchorNode = selection.anchorNode;
            if (anchorNode && !this._isEditableElement(anchorNode.parentElement)) {
              selection.removeAllRanges();
            }
          }
        }, 10);
      });
    }
    
    /**
     * 右键/长按菜单拦截
     */
    static _setupContextMenuPrevention() {
      if (typeof document === 'undefined') return;
      
      document.addEventListener('contextmenu', (e) => {
        const target = e.target;
        
        // 允许输入框的菜单
        if (this._isEditableElement(target)) {
          return true;
        }
        
        // 检查是否有 data-safety-disabled 属性
        if (target.closest && target.closest('[data-safety-disabled="true"]')) {
          return true;
        }
        
        e.preventDefault();
        return false;
      });
    }
    
    /**
     * 检查元素是否为可编辑元素
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    static _isEditableElement(element) {
      if (!element) return false;
      
      const tagName = element.tagName ? element.tagName.toLowerCase() : '';
      
      // 输入框
      if (tagName === 'input') {
        const type = element.type ? element.type.toLowerCase() : 'text';
        const editableTypes = ['text', 'password', 'email', 'number', 'tel', 'url', 'search'];
        return editableTypes.includes(type);
      }
      
      // 文本区域
      if (tagName === 'textarea') {
        return true;
      }
      
      // contenteditable
      if (element.isContentEditable) {
        return true;
      }
      
      // 自定义标记
      if (element.hasAttribute && element.hasAttribute('data-selection-enabled')) {
        return true;
      }
      
      return false;
    }
  }
  
  // ============================================
  // 自动初始化
  // ============================================
  
  if (typeof document !== 'undefined') {
    // DOM 加载完成后自动初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // 延迟初始化，确保其他脚本先加载
        setTimeout(() => {
          if (!WebViewSafety.isInitialized) {
            WebViewSafety.init();
          }
        }, 0);
      });
    } else {
      // DOM 已加载
      setTimeout(() => {
        if (!WebViewSafety.isInitialized) {
          WebViewSafety.init();
        }
      }, 0);
    }
  }
  
  // ============================================
  // 导出
  // ============================================
  
  // ES Module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebViewSafety;
    module.exports.WebViewSafety = WebViewSafety;
    module.exports.default = WebViewSafety;
  }
  
  // AMD
  if (typeof define === 'function' && define.amd) {
    define('WebViewSafety', [], function() {
      return WebViewSafety;
    });
  }
  
  // Global
  if (typeof global !== 'undefined') {
    global.WebViewSafety = WebViewSafety;
  }
  
  if (typeof window !== 'undefined') {
    window.WebViewSafety = WebViewSafety;
  }
  
})(typeof globalThis !== 'undefined' ? globalThis : 
   typeof window !== 'undefined' ? window : 
   typeof global !== 'undefined' ? global : 
   typeof self !== 'undefined' ? self : this);
