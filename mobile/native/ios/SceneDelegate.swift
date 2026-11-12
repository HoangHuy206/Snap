import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var hasPlayedIntro = false

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let newWindow = UIWindow(windowScene: windowScene)
        newWindow.rootViewController = CAPBridgeViewController()
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
