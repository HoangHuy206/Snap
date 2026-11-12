import UIKit
import WebKit
import Photos
import UniformTypeIdentifiers
import Capacitor

private final class VidQRBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(VidQRMediaPlugin())
        webView?.scrollView.minimumZoomScale = 1.0
        webView?.scrollView.maximumZoomScale = 1.0
        webView?.scrollView.bouncesZoom = false
    }
}

@objc(VidQRMediaPlugin)
public final class VidQRMediaPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VidQRMediaPlugin"
    public let jsName = "VidQRMedia"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "readClipboard", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveMediaFromUrl", returnType: CAPPluginReturnPromise),
    ]

    @objc func readClipboard(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["value": UIPasteboard.general.string ?? ""])
        }
    }

    @objc func saveMediaFromUrl(_ call: CAPPluginCall) {
        guard let rawUrl = call.getString("url")?.trimmingCharacters(in: .whitespacesAndNewlines),
              let targetUrl = URL(string: rawUrl) else {
            call.reject("Thiếu đường dẫn tệp cần tải.")
            return
        }

        let method = (call.getString("method") ?? "GET").uppercased()
        let body = call.getString("body") ?? ""
        let fallbackFilename = call.getString("filename") ?? "vidqr_media.mp4"
        let requestedKind = (call.getString("kind") ?? "").lowercased()

        let startDownload: () -> Void = {
            var request = URLRequest(url: targetUrl, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 300)
            request.httpMethod = method
            if method == "POST" && !body.isEmpty {
                request.setValue("application/json; charset=UTF-8", forHTTPHeaderField: "Content-Type")
                request.httpBody = body.data(using: .utf8)
            }

            let task = URLSession.shared.downloadTask(with: request) { tempLocalUrl, response, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }

                guard let httpResponse = response as? HTTPURLResponse else {
                    call.reject("Phản hồi máy chủ không hợp lệ.")
                    return
                }

                if !(200...299).contains(httpResponse.statusCode) {
                    if let tempUrl = tempLocalUrl,
                       let errData = try? Data(contentsOf: tempUrl),
                       let obj = try? JSONSerialization.jsonObject(with: errData) as? [String: Any],
                       let detail = obj["detail"] as? String,
                       !detail.isEmpty {
                        call.reject(detail)
                    } else {
                        call.reject("Tải media thất bại (HTTP \(httpResponse.statusCode)).")
                    }
                    return
                }

                guard let tempLocalUrl = tempLocalUrl else {
                    call.reject("Không nhận được dữ liệu tệp tải về.")
                    return
                }

                let disposition = httpResponse.value(forHTTPHeaderField: "Content-Disposition") ?? ""
                let mimeType = (httpResponse.mimeType ?? "").lowercased()
                let resolvedName = Self.resolveFilename(
                    disposition: disposition,
                    fallback: fallbackFilename,
                    mimeType: mimeType,
                    requestedKind: requestedKind
                )
                let actualKind = Self.resolveKind(mimeType: mimeType, filename: resolvedName, requestedKind: requestedKind)
                let ext = Self.extractExtension(from: resolvedName, kind: actualKind, mimeType: mimeType)

                let stagedUrl = FileManager.default.temporaryDirectory
                    .appendingPathComponent("vidqr_\(UUID().uuidString).\(ext)")

                do {
                    if FileManager.default.fileExists(atPath: stagedUrl.path) {
                        try FileManager.default.removeItem(at: stagedUrl)
                    }
                    try FileManager.default.moveItem(at: tempLocalUrl, to: stagedUrl)
                } catch {
                    call.reject("Không thể lưu tạm tệp trên máy: \(error.localizedDescription)")
                    return
                }

                if actualKind == "audio" {
                    let docsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                    let destUrl = Self.uniqueDestinationUrl(in: docsDir, filename: resolvedName)
                    do {
                        try FileManager.default.moveItem(at: stagedUrl, to: destUrl)
                        call.resolve([
                            "savedTo": "files",
                            "filename": destUrl.lastPathComponent,
                            "kind": actualKind,
                        ])
                    } catch {
                        try? FileManager.default.removeItem(at: stagedUrl)
                        call.reject("Không thể lưu file âm thanh: \(error.localizedDescription)")
                    }
                    return
                }

                PHPhotoLibrary.shared().performChanges({
                    if actualKind == "image" {
                        _ = PHAssetChangeRequest.creationRequestForAssetFromImage(atFileURL: stagedUrl)
                    } else {
                        _ = PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: stagedUrl)
                    }
                }, completionHandler: { success, saveError in
                    try? FileManager.default.removeItem(at: stagedUrl)
                    if success {
                        call.resolve([
                            "savedTo": "photos",
                            "filename": resolvedName,
                            "kind": actualKind,
                        ])
                    } else {
                        call.reject("Không thể lưu vào Ảnh: \(saveError?.localizedDescription ?? "Định dạng không được iOS hỗ trợ")")
                    }
                })
            }
            task.resume()
        }

        if requestedKind == "audio" {
            startDownload()
            return
        }

        Self.ensurePhotoAddPermission { granted in
            if granted {
                startDownload()
            } else {
                call.reject("Bạn chưa cấp quyền lưu vào Ảnh. Hãy mở Cài đặt → VidQR Studio → Ảnh và cho phép thêm ảnh.")
            }
        }
    }

    private static func ensurePhotoAddPermission(completion: @escaping (Bool) -> Void) {
        if #available(iOS 14, *) {
            let status = PHPhotoLibrary.authorizationStatus(for: .addOnly)
            if status == .authorized || status == .limited {
                completion(true)
            } else if status == .notDetermined {
                PHPhotoLibrary.requestAuthorization(for: .addOnly) { newStatus in
                    completion(newStatus == .authorized || newStatus == .limited)
                }
            } else {
                completion(false)
            }
        } else {
            let status = PHPhotoLibrary.authorizationStatus()
            if status == .authorized {
                completion(true)
            } else if status == .notDetermined {
                PHPhotoLibrary.requestAuthorization { newStatus in
                    completion(newStatus == .authorized)
                }
            } else {
                completion(false)
            }
        }
    }

    private static func resolveFilename(disposition: String, fallback: String, mimeType: String, requestedKind: String) -> String {
        var name = ""
        if let utfRange = disposition.range(of: "filename\\*=UTF-8''([^;\\r\\n]+)", options: [.regularExpression, .caseInsensitive]) {
            let rawPart = String(disposition[utfRange]).replacingOccurrences(of: "filename*=UTF-8''", with: "", options: .caseInsensitive)
            name = rawPart.removingPercentEncoding ?? rawPart
        } else if let asciiRange = disposition.range(of: "filename=\"?([^\";\\r\\n]+)\"?", options: [.regularExpression, .caseInsensitive]) {
            name = String(disposition[asciiRange])
                .replacingOccurrences(of: "filename=", with: "", options: .caseInsensitive)
                .trimmingCharacters(in: CharacterSet(charactersIn: "\" "))
        }

        if name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            name = fallback
        }

        let invalidChars = CharacterSet(charactersIn: "\\/:*?\"<>|\r\n")
        name = name.components(separatedBy: invalidChars).joined(separator: "_").trimmingCharacters(in: .whitespacesAndNewlines)
        if name.isEmpty { name = "vidqr_media" }

        if !(name as NSString).pathExtension.isEmpty {
            return name
        }
        let ext = extractExtension(from: name, kind: requestedKind, mimeType: mimeType)
        return "\(name).\(ext)"
    }

    private static func resolveKind(mimeType: String, filename: String, requestedKind: String) -> String {
        if mimeType.hasPrefix("image/") || requestedKind == "image" { return "image" }
        if mimeType.hasPrefix("audio/") || requestedKind == "audio" { return "audio" }
        let ext = (filename as NSString).pathExtension.lowercased()
        if ["jpg", "jpeg", "png", "webp", "gif", "heic"].contains(ext) { return "image" }
        if ["mp3", "m4a", "wav", "aac"].contains(ext) { return "audio" }
        return "video"
    }

    private static func extractExtension(from filename: String, kind: String, mimeType: String) -> String {
        let ext = (filename as NSString).pathExtension.lowercased()
        if !ext.isEmpty { return ext }
        if #available(iOS 14.0, *), !mimeType.isEmpty, let utType = UTType(mimeType: mimeType), let preferred = utType.preferredFilenameExtension {
            return preferred
        }
        if kind == "image" { return "jpg" }
        if kind == "audio" { return "m4a" }
        return "mp4"
    }

    private static func uniqueDestinationUrl(in directory: URL, filename: String) -> URL {
        var candidate = directory.appendingPathComponent(filename)
        if !FileManager.default.fileExists(atPath: candidate.path) { return candidate }
        let nsName = filename as NSString
        let stem = nsName.deletingPathExtension
        let ext = nsName.pathExtension
        var index = 1
        while FileManager.default.fileExists(atPath: candidate.path) {
            let nextName = ext.isEmpty ? "\(stem) (\(index))" : "\(stem) (\(index)).\(ext)"
            candidate = directory.appendingPathComponent(nextName)
            index += 1
        }
        return candidate
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var hasPlayedIntro = false

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let newWindow = UIWindow(windowScene: windowScene)
        newWindow.rootViewController = VidQRBridgeViewController()
        newWindow.makeKeyAndVisible()
        self.window = newWindow

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)

        if !hasPlayedIntro {
            hasPlayedIntro = true
            presentIntroOverlay(in: newWindow)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    private func presentIntroOverlay(in targetWindow: UIWindow) {
        let overlay = AppIntroOverlayView(frame: targetWindow.bounds)
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        targetWindow.addSubview(overlay)
        overlay.startAnimation {
            UIView.animate(
                withDuration: 0.42,
                delay: 0,
                options: [.curveEaseInOut],
                animations: {
                    overlay.alpha = 0
                    overlay.transform = CGAffineTransform(scaleX: 1.06, y: 1.06)
                },
                completion: { _ in
                    overlay.removeFromSuperview()
                }
            )
        }
    }
}

private final class AppIntroOverlayView: UIView {
    private let bgGradient = CAGradientLayer()
    private let glowView = UIView()
    private let glowGradient = CAGradientLayer()
    private let emblemContainer = UIView()
    private let cardView = QrScannerEmblemView()
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()
    private let progressTrack = UIView()
    private let progressFill = UIView()
    private let progressFillGradient = CAGradientLayer()
    private var progressWidthConstraint: NSLayoutConstraint?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupViews()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupViews()
    }

    private func setupViews() {
        isUserInteractionEnabled = true

        bgGradient.colors = [
            UIColor(red: 0.027, green: 0.043, blue: 0.078, alpha: 1.0).cgColor,
            UIColor(red: 0.067, green: 0.094, blue: 0.176, alpha: 1.0).cgColor,
            UIColor(red: 0.039, green: 0.055, blue: 0.102, alpha: 1.0).cgColor,
        ]
        bgGradient.startPoint = CGPoint(x: 0.1, y: 0.0)
        bgGradient.endPoint = CGPoint(x: 0.9, y: 1.0)
        layer.addSublayer(bgGradient)

        glowView.translatesAutoresizingMaskIntoConstraints = false
        glowView.alpha = 0.0
        glowGradient.type = .radial
        glowGradient.colors = [
            UIColor(red: 0.388, green: 0.400, blue: 0.945, alpha: 0.42).cgColor,
            UIColor(red: 0.024, green: 0.714, blue: 0.831, alpha: 0.16).cgColor,
            UIColor.clear.cgColor,
        ]
        glowGradient.startPoint = CGPoint(x: 0.5, y: 0.5)
        glowGradient.endPoint = CGPoint(x: 1.0, y: 1.0)
        glowView.layer.addSublayer(glowGradient)
        addSubview(glowView)

        emblemContainer.translatesAutoresizingMaskIntoConstraints = false
        emblemContainer.alpha = 0
        emblemContainer.transform = CGAffineTransform(scaleX: 0.68, y: 0.68)
        addSubview(emblemContainer)

        cardView.translatesAutoresizingMaskIntoConstraints = false
        emblemContainer.addSubview(cardView)

        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.text = "VidQR Studio"
        titleLabel.font = UIFont.systemFont(ofSize: 28, weight: .bold)
        titleLabel.textColor = .white
        titleLabel.textAlignment = .center
        titleLabel.alpha = 0
        titleLabel.transform = CGAffineTransform(translationX: 0, y: 16)
        addSubview(titleLabel)

        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.text = "QR Video & File Động • Tải MXH Không Logo"
        subtitleLabel.font = UIFont.systemFont(ofSize: 13.5, weight: .medium)
        subtitleLabel.textColor = UIColor(red: 0.580, green: 0.639, blue: 0.722, alpha: 1.0)
        subtitleLabel.textAlignment = .center
        subtitleLabel.alpha = 0
        subtitleLabel.transform = CGAffineTransform(translationX: 0, y: 14)
        addSubview(subtitleLabel)

        progressTrack.translatesAutoresizingMaskIntoConstraints = false
        progressTrack.backgroundColor = UIColor(white: 1.0, alpha: 0.10)
        progressTrack.layer.cornerRadius = 2.5
        progressTrack.clipsToBounds = true
        progressTrack.alpha = 0
        addSubview(progressTrack)

        progressFill.translatesAutoresizingMaskIntoConstraints = false
        progressFill.layer.cornerRadius = 2.5
        progressFill.clipsToBounds = true
        progressFillGradient.colors = [
            UIColor(red: 0.388, green: 0.400, blue: 0.945, alpha: 1.0).cgColor,
            UIColor(red: 0.024, green: 0.714, blue: 0.831, alpha: 1.0).cgColor,
        ]
        progressFillGradient.startPoint = CGPoint(x: 0, y: 0.5)
        progressFillGradient.endPoint = CGPoint(x: 1, y: 0.5)
        progressFill.layer.addSublayer(progressFillGradient)
        progressTrack.addSubview(progressFill)

        let widthConstraint = progressFill.widthAnchor.constraint(equalToConstant: 0)
        progressWidthConstraint = widthConstraint

        NSLayoutConstraint.activate([
            glowView.centerXAnchor.constraint(equalTo: centerXAnchor),
            glowView.centerYAnchor.constraint(equalTo: centerYAnchor, constant: -36),
            glowView.widthAnchor.constraint(equalToConstant: 260),
            glowView.heightAnchor.constraint(equalToConstant: 260),

            emblemContainer.centerXAnchor.constraint(equalTo: centerXAnchor),
            emblemContainer.centerYAnchor.constraint(equalTo: centerYAnchor, constant: -42),
            emblemContainer.widthAnchor.constraint(equalToConstant: 108),
            emblemContainer.heightAnchor.constraint(equalToConstant: 108),

            cardView.topAnchor.constraint(equalTo: emblemContainer.topAnchor),
            cardView.bottomAnchor.constraint(equalTo: emblemContainer.bottomAnchor),
            cardView.leadingAnchor.constraint(equalTo: emblemContainer.leadingAnchor),
            cardView.trailingAnchor.constraint(equalTo: emblemContainer.trailingAnchor),

            titleLabel.topAnchor.constraint(equalTo: emblemContainer.bottomAnchor, constant: 22),
            titleLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            titleLabel.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 24),
            titleLabel.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -24),

            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 6),
            subtitleLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            subtitleLabel.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 24),
            subtitleLabel.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -24),

            progressTrack.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 24),
            progressTrack.centerXAnchor.constraint(equalTo: centerXAnchor),
            progressTrack.widthAnchor.constraint(equalToConstant: 148),
            progressTrack.heightAnchor.constraint(equalToConstant: 5),

            progressFill.leadingAnchor.constraint(equalTo: progressTrack.leadingAnchor),
            progressFill.topAnchor.constraint(equalTo: progressTrack.topAnchor),
            progressFill.bottomAnchor.constraint(equalTo: progressTrack.bottomAnchor),
            widthConstraint,
        ])
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        bgGradient.frame = bounds
        glowGradient.frame = glowView.bounds
        progressFillGradient.frame = progressFill.bounds
    }

    func startAnimation(onComplete: @escaping () -> Void) {
        layoutIfNeeded()

        UIView.animate(
            withDuration: 0.65,
            delay: 0.05,
            usingSpringWithDamping: 0.72,
            initialSpringVelocity: 0.6,
            options: [.curveEaseOut],
            animations: {
                self.emblemContainer.alpha = 1
                self.emblemContainer.transform = .identity
            }
        )

        UIView.animate(
            withDuration: 0.75,
            delay: 0.1,
            options: [.curveEaseOut],
            animations: {
                self.glowView.alpha = 1
                self.glowView.transform = CGAffineTransform(scaleX: 1.15, y: 1.15)
            }
        )

        UIView.animate(
            withDuration: 0.55,
            delay: 0.30,
            options: [.curveEaseOut],
            animations: {
                self.titleLabel.alpha = 1
                self.titleLabel.transform = .identity
            }
        )

        UIView.animate(
            withDuration: 0.55,
            delay: 0.45,
            options: [.curveEaseOut],
            animations: {
                self.subtitleLabel.alpha = 1
                self.subtitleLabel.transform = .identity
                self.progressTrack.alpha = 1
            }
        )

        cardView.startLaserScan()

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.50) { [weak self] in
            guard let self = self else { return }
            self.progressWidthConstraint?.constant = 148
            UIView.animate(withDuration: 1.25, delay: 0, options: [.curveEaseInOut]) {
                self.layoutIfNeeded()
            }
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.95) {
            onComplete()
        }
    }
}

private final class QrScannerEmblemView: UIView {
    private let borderLayer = CAGradientLayer()
    private let borderMask = CAShapeLayer()
    private let qrShapeLayer = CAShapeLayer()
    private let playCircleLayer = CAGradientLayer()
    private let playIconLayer = CAShapeLayer()
    private let laserView = UIView()
    private let laserGradient = CAGradientLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        backgroundColor = UIColor(red: 0.082, green: 0.114, blue: 0.212, alpha: 0.96)
        layer.cornerRadius = 26
        layer.shadowColor = UIColor(red: 0.388, green: 0.400, blue: 0.945, alpha: 1.0).cgColor
        layer.shadowOpacity = 0.45
        layer.shadowRadius = 20
        layer.shadowOffset = CGSize(width: 0, height: 8)

        borderLayer.colors = [
            UIColor(red: 0.494, green: 0.525, blue: 0.988, alpha: 0.95).cgColor,
            UIColor(red: 0.024, green: 0.714, blue: 0.831, alpha: 0.95).cgColor,
        ]
        borderLayer.startPoint = CGPoint(x: 0, y: 0)
        borderLayer.endPoint = CGPoint(x: 1, y: 1)
        borderMask.fillColor = UIColor.clear.cgColor
        borderMask.strokeColor = UIColor.white.cgColor
        borderMask.lineWidth = 2.4
        borderLayer.mask = borderMask
        layer.addSublayer(borderLayer)

        qrShapeLayer.fillColor = UIColor(white: 1.0, alpha: 0.92).cgColor
        qrShapeLayer.fillRule = .evenOdd
        layer.addSublayer(qrShapeLayer)

        playCircleLayer.colors = [
            UIColor(red: 0.388, green: 0.400, blue: 0.945, alpha: 1.0).cgColor,
            UIColor(red: 0.024, green: 0.714, blue: 0.831, alpha: 1.0).cgColor,
        ]
        playCircleLayer.startPoint = CGPoint(x: 0, y: 0)
        playCircleLayer.endPoint = CGPoint(x: 1, y: 1)
        playCircleLayer.cornerRadius = 11
        layer.addSublayer(playCircleLayer)

        playIconLayer.fillColor = UIColor.white.cgColor
        playCircleLayer.addSublayer(playIconLayer)

        laserView.isUserInteractionEnabled = false
        laserView.alpha = 0
        laserGradient.colors = [
            UIColor.clear.cgColor,
            UIColor(red: 0.133, green: 0.827, blue: 0.933, alpha: 0.95).cgColor,
            UIColor.clear.cgColor,
        ]
        laserGradient.startPoint = CGPoint(x: 0, y: 0.5)
        laserGradient.endPoint = CGPoint(x: 1, y: 0.5)
        laserView.layer.addSublayer(laserGradient)
        addSubview(laserView)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let b = bounds
        borderLayer.frame = b
        borderMask.path = UIBezierPath(roundedRect: b.insetBy(dx: 1.2, dy: 1.2), cornerRadius: 25).cgPath

        let qrPath = UIBezierPath()
        let corners = [
            CGPoint(x: 20, y: 20),
            CGPoint(x: b.width - 42, y: 20),
            CGPoint(x: 20, y: b.height - 42),
        ]
        for origin in corners {
            let outer = UIBezierPath(roundedRect: CGRect(x: origin.x, y: origin.y, width: 22, height: 22), cornerRadius: 5)
            let innerHole = UIBezierPath(roundedRect: CGRect(x: origin.x + 4.5, y: origin.y + 4.5, width: 13, height: 13), cornerRadius: 2.5)
            let dot = UIBezierPath(roundedRect: CGRect(x: origin.x + 8, y: origin.y + 8, width: 6, height: 6), cornerRadius: 1.5)
            qrPath.append(outer)
            qrPath.append(innerHole)
            qrPath.append(dot)
        }
        let accentBlocks = [
            CGRect(x: b.width - 40, y: b.height - 40, width: 8, height: 8),
            CGRect(x: b.width - 28, y: b.height - 40, width: 8, height: 8),
            CGRect(x: b.width - 40, y: b.height - 28, width: 8, height: 8),
            CGRect(x: b.width - 28, y: b.height - 28, width: 8, height: 8),
        ]
        for rect in accentBlocks {
            qrPath.append(UIBezierPath(roundedRect: rect, cornerRadius: 2))
        }
        qrShapeLayer.path = qrPath.cgPath

        let centerFrame = CGRect(x: (b.width - 26) / 2, y: (b.height - 26) / 2, width: 26, height: 26)
        playCircleLayer.frame = centerFrame
        playCircleLayer.cornerRadius = 8

        let tri = UIBezierPath()
        tri.move(to: CGPoint(x: 9.5, y: 7))
        tri.addLine(to: CGPoint(x: 19, y: 13))
        tri.addLine(to: CGPoint(x: 9.5, y: 19))
        tri.close()
        playIconLayer.path = tri.cgPath

        laserView.frame = CGRect(x: 12, y: 18, width: b.width - 24, height: 4)
        laserGradient.frame = laserView.bounds
    }

    func startLaserScan() {
        layoutIfNeeded()
        laserView.alpha = 1
        let scan = CABasicAnimation(keyPath: "position.y")
        scan.fromValue = 20.0
        scan.toValue = bounds.height - 20.0
        scan.duration = 0.72
        scan.autoreverses = true
        scan.repeatCount = 2
        scan.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        laserView.layer.add(scan, forKey: "laserScan")
    }
}
