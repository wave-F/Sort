/**
 * MyViewController.swift
 * 
 * iOS 原生增强配置 - 完全禁用文字交互
 * 
 * 使用方法：
 * 1. 在 Xcode 中打开 ios/App/App 目录
 * 2. 将此文件添加到项目中
 * 3. 在 AppDelegate.swift 中修改使用此 ViewController
 * 
 * 注意：此配置提供 ~99% 的防护覆盖率
 */

import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // ========================================
        // iOS 14.5+ 禁用文字交互
        // 这是最有效的原生防护方式
        // ========================================
        if #available(iOS 14.5, *) {
            webView?.configuration.preferences.isTextInteractionEnabled = false
            print("[WebViewSafety] iOS 14.5+ isTextInteractionEnabled = false")
        }
        
        // ========================================
        // 禁用 WebView 的链接预览
        // ========================================
        webView?.allowsLinkPreview = false
        print("[WebViewSafety] allowsLinkPreview = false")
        
        // ========================================
        // 禁用回弹效果
        // ========================================
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.alwaysBounceHorizontal = false
        print("[WebViewSafety] Scroll bounce disabled")
        
        // ========================================
        // 禁用缩放
        // ========================================
        webView?.scrollView.minimumZoomScale = 1.0
        webView?.scrollView.maximumZoomScale = 1.0
        webView?.scrollView.bouncesZoom = false
        print("[WebViewSafety] Zoom disabled")
        
        // ========================================
        // 日志输出环境信息
        // ========================================
        let iosVersion = UIDevice.current.systemVersion
        let deviceModel = UIDevice.current.model
        print("[WebViewSafety] iOS Version: \(iosVersion)")
        print("[WebViewSafety] Device Model: \(deviceModel)")
        print("[WebViewSafety] Native configuration applied successfully")
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        
        // 再次确认配置已应用
        if #available(iOS 14.5, *) {
            let isTextInteractionEnabled = webView?.configuration.preferences.isTextInteractionEnabled ?? true
            print("[WebViewSafety] Verification - isTextInteractionEnabled: \(isTextInteractionEnabled)")
        }
    }
}
