import Capacitor
import CoreHaptics

@objc(CustomHapticsPlugin)
public class CustomHapticsPlugin: CAPPlugin, CAPBridgedPlugin {

    // MARK: - CAPBridgedPlugin 协议 (替代 CAP_PLUGIN ObjC 宏)

    public let identifier = "CustomHaptics"
    public let jsName = "CustomHaptics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "impact", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "notification", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selection", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playTransient", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playContinuous", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playPattern", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playBundled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkSupport", returnType: CAPPluginReturnPromise),
    ]

    private var engine: CHHapticEngine?
    private let engineQueue = DispatchQueue(label: "com.customhaptics.engine")

    // MARK: - 引擎管理

    /// 懒初始化 CHHapticEngine，自动处理重启
    /// 必须在 engineQueue 上调用
    private func ensureEngine() throws -> CHHapticEngine {
        if let engine = self.engine {
            return engine
        }
        let engine = try CHHapticEngine()
        engine.playsHapticsOnly = true
        engine.resetHandler = { [weak self] in
            self?.engineQueue.async {
                do {
                    try self?.engine?.start()
                } catch {
                    self?.engine = nil
                }
            }
        }
        engine.stoppedHandler = { [weak self] _ in
            self?.engineQueue.async {
                self?.engine = nil
            }
        }
        try engine.start()
        self.engine = engine
        return engine
    }

    // MARK: - 层级 1：UIFeedbackGenerator

    @objc func impact(_ call: CAPPluginCall) {
        let style = call.getString("style") ?? "medium"

        DispatchQueue.main.async {
            let feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle
            switch style {
            case "light":  feedbackStyle = .light
            case "heavy":  feedbackStyle = .heavy
            case "rigid":  feedbackStyle = .rigid
            case "soft":   feedbackStyle = .soft
            default:       feedbackStyle = .medium
            }

            let generator = UIImpactFeedbackGenerator(style: feedbackStyle)
            generator.prepare()
            generator.impactOccurred()
            call.resolve()
        }
    }

    @objc func notification(_ call: CAPPluginCall) {
        let type = call.getString("type") ?? "success"

        DispatchQueue.main.async {
            let feedbackType: UINotificationFeedbackGenerator.FeedbackType
            switch type {
            case "warning": feedbackType = .warning
            case "error":   feedbackType = .error
            default:        feedbackType = .success
            }

            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            generator.notificationOccurred(feedbackType)
            call.resolve()
        }
    }

    @objc func selection(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let generator = UISelectionFeedbackGenerator()
            generator.prepare()
            generator.selectionChanged()
            call.resolve()
        }
    }

    // MARK: - 层级 2：CoreHaptics 参数化

    @objc func playTransient(_ call: CAPPluginCall) {
        let intensity = Float(call.getDouble("intensity") ?? 0.5)
        let sharpness = Float(call.getDouble("sharpness") ?? 0.5)

        engineQueue.async { [weak self] in
            do {
                let engine = try self?.ensureEngine()
                let event = CHHapticEvent(
                    eventType: .hapticTransient,
                    parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
                    ],
                    relativeTime: 0
                )
                let pattern = try CHHapticPattern(events: [event], parameters: [])
                let player = try engine?.makePlayer(with: pattern)
                try player?.start(atTime: 0)
                call.resolve()
            } catch {
                call.reject("playTransient failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func playContinuous(_ call: CAPPluginCall) {
        let intensity = Float(call.getDouble("intensity") ?? 0.5)
        let sharpness = Float(call.getDouble("sharpness") ?? 0.5)
        let duration = call.getDouble("duration") ?? 0.3

        engineQueue.async { [weak self] in
            do {
                let engine = try self?.ensureEngine()
                let event = CHHapticEvent(
                    eventType: .hapticContinuous,
                    parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
                    ],
                    relativeTime: 0,
                    duration: duration
                )
                let pattern = try CHHapticPattern(events: [event], parameters: [])
                let player = try engine?.makePlayer(with: pattern)
                try player?.start(atTime: 0)
                call.resolve()
            } catch {
                call.reject("playContinuous failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - 层级 3：AHAP 模式播放

    /// 从 JSON Data 创建 CHHapticPattern (参考 HabbyHaptic 的 initWithDictionary 方式)
    private func createPattern(from data: Data) throws -> CHHapticPattern {
        guard let dict = try JSONSerialization.jsonObject(with: data) as? [CHHapticPattern.Key: Any] else {
            throw NSError(domain: "CustomHaptics", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid AHAP JSON structure"])
        }
        return try CHHapticPattern(dictionary: dict)
    }

    /// 接收 AHAP JSON string，解析为 Dictionary 后播放
    @objc func playPattern(_ call: CAPPluginCall) {
        guard let ahapJson = call.getString("ahapJson"),
              let ahapData = ahapJson.data(using: .utf8) else {
            call.reject("Missing or invalid ahapJson parameter")
            return
        }

        engineQueue.async { [weak self] in
            do {
                let engine = try self?.ensureEngine()
                let pattern = try self?.createPattern(from: ahapData)
                guard let pattern = pattern else {
                    call.reject("Failed to create pattern")
                    return
                }
                let player = try engine?.makePlayer(with: pattern)
                try player?.start(atTime: 0)
                call.resolve()
            } catch {
                call.reject("playPattern failed: \(error.localizedDescription)")
            }
        }
    }

    /// 按文件名从 iOS Bundle 播放 .ahap 或 .hahap
    /// 搜索顺序: ahap/ 子目录 → Bundle 根目录 → Capacitor web 资源目录 (public/assets)
    @objc func playBundled(_ call: CAPPluginCall) {
        guard let name = call.getString("name") else {
            call.reject("Missing name parameter")
            return
        }

        engineQueue.async { [weak self] in
            do {
                let bundle = Bundle.main
                // 搜索顺序: ahap/ 子目录 → 根目录 → Capacitor public/assets
                let url = bundle.url(forResource: name, withExtension: "ahap", subdirectory: "ahap")
                    ?? bundle.url(forResource: name, withExtension: "hahap", subdirectory: "ahap")
                    ?? bundle.url(forResource: name, withExtension: "ahap")
                    ?? bundle.url(forResource: name, withExtension: "hahap")
                    ?? bundle.url(forResource: name, withExtension: "ahap", subdirectory: "public/assets")
                    ?? bundle.url(forResource: name, withExtension: "hahap", subdirectory: "public/assets")

                guard let fileURL = url else {
                    call.reject("File not found: \(name).ahap or \(name).hahap")
                    return
                }

                let data = try Data(contentsOf: fileURL)
                let engine = try self?.ensureEngine()
                let pattern = try self?.createPattern(from: data)
                guard let pattern = pattern else {
                    call.reject("Failed to create pattern from file")
                    return
                }
                let player = try engine?.makePlayer(with: pattern)
                try player?.start(atTime: 0)
                call.resolve()
            } catch {
                call.reject("playBundled failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - 通用控制

    @objc func stop(_ call: CAPPluginCall) {
        engineQueue.async { [weak self] in
            guard let engine = self?.engine else {
                call.resolve()
                return
            }
            engine.stop(completionHandler: { [weak self] error in
                self?.engineQueue.async {
                    self?.engine = nil
                }
                if let error = error {
                    call.reject("stop failed: \(error.localizedDescription)")
                } else {
                    call.resolve()
                }
            })
        }
    }

    @objc func checkSupport(_ call: CAPPluginCall) {
        let capabilities = CHHapticEngine.capabilitiesForHardware()
        call.resolve([
            "haptics": capabilities.supportsHaptics,
            "audio": capabilities.supportsAudio
        ])
    }

    deinit {
        let engine = self.engine
        engine?.stop(completionHandler: nil)
    }
}
