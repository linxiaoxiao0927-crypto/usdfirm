import UIKit
import WebKit
import SafariServices

private enum AppConfig {
    static let appTitle = "USDFirm"
    static let subtitleZh = "美元稳定币底层发行与储备金协议"
    static let subtitleEn = "USDF Stablecoin Issuance & PoR"
    static let primaryURL = URL(string: "https://www.usdfirm.com/")!
    static let fallbackURL: URL? = nil
    static let allowedHosts: Set<String> = ["usdfirm.com", "www.usdfirm.com"]
    static let oledBlack = UIColor.black
    static let accentColor = UIColor(
        red: 10.0 / 255.0,
        green: 132.0 / 255.0,
        blue: 1.0,
        alpha: 1.0
    )
}

private enum Copy {
    static var isChinese: Bool {
        let lang = Locale.preferredLanguages.first?.lowercased() ?? "zh"
        return lang.hasPrefix("zh")
    }

    static var subtitle: String {
        isChinese ? AppConfig.subtitleZh : AppConfig.subtitleEn
    }

    static var errorTitle: String {
        isChinese ? "安全节点暂不可达" : "Node Connection Interrupted"
    }

    static var retryLabel: String {
        isChinese ? "立即重试" : "Retry Now"
    }

    static var switchFallbackLabel: String {
        isChinese ? "切换至官方备用节点" : "Switch to Official Backup Node"
    }

    static var toggleTechCodeLabel: String {
        isChinese ? "查看错误码" : "Technical Code"
    }

    static var okLabel: String {
        isChinese ? "确定" : "OK"
    }

    static var cancelLabel: String {
        isChinese ? "取消" : "Cancel"
    }

    static func message(for errorCode: String) -> String {
        switch errorCode {
        case "ERR_NET_OFFLINE":
            return isChinese
                ? "当前设备未连接到网络，请检查 Wi-Fi 或蜂窝数据后重试。"
                : "Your device appears offline. Check Wi-Fi or cellular data and retry."
        case "ERR_NET_TIMEOUT":
            return isChinese
                ? "连接目标安全节点超时，请检查当前网络环境后重试。"
                : "Connection to the secure node timed out. Please check your network and retry."
        case "ERR_TLS_SECURITY":
            return isChinese
                ? "TLS 安全证书校验未通过，为保护资金安全已拦截此次连接。"
                : "TLS security validation failed. Connection blocked to protect session integrity."
        case "ERR_HTTP_5XX":
            return isChinese
                ? "上游网关响应异常，请稍候重试或切换至官方备用入口。"
                : "Upstream gateway returned a temporary error. Please retry shortly."
        case "ERR_WEBPROCESS_TERMINATED":
            return isChinese
                ? "页面渲染进程多次异常中断，已隔离保护会话，请点击重试恢复。"
                : "Web rendering process stopped repeatedly. Session safely isolated; tap retry to recover."
        default:
            return isChinese
                ? "暂无法访问应用主节点，请确认网络畅通后重试。"
                : "Unable to reach the primary application node. Please check connectivity and retry."
        }
    }
}

final class MainViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!
    private let progressView = UIProgressView(progressViewStyle: .bar)
    private let refreshControl = UIRefreshControl()
    private var progressObserver: NSKeyValueObservation?
    private var currentActiveURL: URL = AppConfig.primaryURL
    private var hasCompletedInitialLoad = false
    private var splashSafetyWorkItem: DispatchWorkItem?
    private var processCrashCount = 0

    private let loadingOverlay = UIView()
    private let splashImageView = UIImageView()
    private let spinner = UIActivityIndicatorView(style: .medium)

    private let errorOverlay = UIView()
    private let errorCard = UIView()
    private let errorDescLabel = UILabel()
    private let errorCodeToggleBtn = UIButton(type: .system)
    private let errorCodeBadge = UILabel()
    private var currentTechCode: String = ""

    override var preferredStatusBarStyle: UIStatusBarStyle {
        .lightContent
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        overrideUserInterfaceStyle = .dark
        view.backgroundColor = AppConfig.oledBlack

        configureWebView()
        configureProgressView()
        configureLoadingOverlay()
        configureErrorOverlay()

        loadTarget(AppConfig.primaryURL)
    }

    deinit {
        progressObserver?.invalidate()
        splashSafetyWorkItem?.cancel()
    }

    private func loadRandomSofaYesLogo() -> UIImage? {
        let idx = Int.random(in: 1...7)
        if let path = Bundle.main.path(forResource: "sofayes-\(idx)", ofType: "png"),
           let img = UIImage(contentsOfFile: path) {
            return img
        }
        return UIImage(named: "sofayes-\(idx).png")
    }

    private func configureWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()
        config.applicationNameForUserAgent = "ShineMightIOS/2.0 (\(AppConfig.appTitle))"

#if targetEnvironment(simulator)
        // Avoid Intel x86_64 Simulator GPUProcess synchronous XPC hangs on full-screen 2D Canvas.
        let simulatorSafeCanvasJS = """
        (function() {
          try {
            var proto = window.HTMLCanvasElement && window.HTMLCanvasElement.prototype;
            if (proto && proto.getContext && !proto.__smPatched2D) {
              var origGetContext = proto.getContext;
              proto.getContext = function(type, attrs) {
                if (type === '2d') {
                  var merged = Object.assign({}, attrs || {}, { willReadFrequently: true });
                  return origGetContext.call(this, type, merged);
                }
                return origGetContext.apply(this, arguments);
              };
              proto.__smPatched2D = true;
            }
            if (!window.__smPatchedRAF) {
              window.requestAnimationFrame = function(cb) {
                return window.setTimeout(function() { cb(Date.now()); }, 60);
              };
              window.cancelAnimationFrame = function(id) {
                window.clearTimeout(id);
              };
              window.__smPatchedRAF = true;
            }
          } catch (e) {}
        })();
        """
        let script = WKUserScript(
            source: simulatorSafeCanvasJS,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        config.userContentController.addUserScript(script)
#endif

        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = AppConfig.oledBlack
        webView.scrollView.backgroundColor = AppConfig.oledBlack
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.decelerationRate = .normal
        webView.scrollView.indicatorStyle = .white

        refreshControl.tintColor = AppConfig.accentColor
        refreshControl.addTarget(self, action: #selector(handlePullToRefresh), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl

        view.addSubview(webView)
        // Pin edge-to-edge so iOS status bar floats cleanly over pure transparent header
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        progressObserver = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] view, _ in
            guard let self = self else { return }
            let progress = Float(view.estimatedProgress)
            self.progressView.isHidden = progress >= 1.0
            self.progressView.setProgress(progress, animated: true)
        }
    }

    private func configureProgressView() {
        progressView.translatesAutoresizingMaskIntoConstraints = false
        progressView.trackTintColor = UIColor.white.withAlphaComponent(0.04)
        progressView.progressTintColor = AppConfig.accentColor
        progressView.isHidden = true
        view.addSubview(progressView)

        NSLayoutConstraint.activate([
            progressView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progressView.heightAnchor.constraint(equalToConstant: 1.5),
        ])
    }

    private func configureLoadingOverlay() {
        loadingOverlay.translatesAutoresizingMaskIntoConstraints = false
        loadingOverlay.backgroundColor = AppConfig.oledBlack
        view.addSubview(loadingOverlay)

        splashImageView.translatesAutoresizingMaskIntoConstraints = false
        splashImageView.contentMode = .scaleAspectFit
        splashImageView.image = loadRandomSofaYesLogo()

        let appLabel = UILabel()
        appLabel.translatesAutoresizingMaskIntoConstraints = false
        appLabel.text = AppConfig.appTitle.uppercased()
        appLabel.font = .monospacedSystemFont(ofSize: 11, weight: .semibold)
        appLabel.textColor = UIColor.white.withAlphaComponent(0.45)
        appLabel.textAlignment = .center

        let subtitleLabel = UILabel()
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.text = Copy.subtitle
        subtitleLabel.font = .systemFont(ofSize: 12, weight: .medium)
        subtitleLabel.textColor = UIColor.white.withAlphaComponent(0.32)
        subtitleLabel.textAlignment = .center
        subtitleLabel.numberOfLines = 1

        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.color = UIColor.white.withAlphaComponent(0.45)
        spinner.startAnimating()

        let centerStack = UIStackView(arrangedSubviews: [splashImageView, appLabel, subtitleLabel, spinner])
        centerStack.translatesAutoresizingMaskIntoConstraints = false
        centerStack.axis = .vertical
        centerStack.alignment = .center
        centerStack.spacing = 12
        loadingOverlay.addSubview(centerStack)

        let footerLabel = UILabel()
        footerLabel.translatesAutoresizingMaskIntoConstraints = false
        footerLabel.text = "SHINEMIGHT"
        footerLabel.font = .systemFont(ofSize: 11, weight: .semibold)
        footerLabel.textColor = UIColor.white.withAlphaComponent(0.35)
        footerLabel.textAlignment = .center
        loadingOverlay.addSubview(footerLabel)

        NSLayoutConstraint.activate([
            loadingOverlay.topAnchor.constraint(equalTo: view.topAnchor),
            loadingOverlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            loadingOverlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            loadingOverlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            splashImageView.widthAnchor.constraint(equalToConstant: 184),
            splashImageView.heightAnchor.constraint(equalToConstant: 112),

            centerStack.centerXAnchor.constraint(equalTo: loadingOverlay.centerXAnchor),
            centerStack.centerYAnchor.constraint(equalTo: loadingOverlay.centerYAnchor, constant: -16),
            centerStack.leadingAnchor.constraint(greaterThanOrEqualTo: loadingOverlay.leadingAnchor, constant: 24),
            centerStack.trailingAnchor.constraint(lessThanOrEqualTo: loadingOverlay.trailingAnchor, constant: -24),

            footerLabel.centerXAnchor.constraint(equalTo: loadingOverlay.centerXAnchor),
            footerLabel.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
        ])
    }

    private func configureErrorOverlay() {
        errorOverlay.translatesAutoresizingMaskIntoConstraints = false
        errorOverlay.backgroundColor = AppConfig.oledBlack.withAlphaComponent(0.96)
        errorOverlay.isHidden = true
        view.addSubview(errorOverlay)

        errorCard.translatesAutoresizingMaskIntoConstraints = false
        errorCard.backgroundColor = UIColor(white: 1.0, alpha: 0.08)
        errorCard.layer.cornerRadius = 22
        errorCard.layer.borderWidth = 0
        errorOverlay.addSubview(errorCard)

        let titleLabel = UILabel()
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.text = Copy.errorTitle
        titleLabel.font = .systemFont(ofSize: 18, weight: .bold)
        titleLabel.textColor = .white
        titleLabel.textAlignment = .center

        errorDescLabel.translatesAutoresizingMaskIntoConstraints = false
        errorDescLabel.font = .systemFont(ofSize: 14, weight: .regular)
        errorDescLabel.textColor = UIColor(white: 0.78, alpha: 1.0)
        errorDescLabel.textAlignment = .center
        errorDescLabel.numberOfLines = 0

        errorCodeToggleBtn.translatesAutoresizingMaskIntoConstraints = false
        errorCodeToggleBtn.setTitle(Copy.toggleTechCodeLabel, for: .normal)
        errorCodeToggleBtn.setTitleColor(UIColor(white: 0.60, alpha: 1.0), for: .normal)
        errorCodeToggleBtn.titleLabel?.font = .systemFont(ofSize: 12, weight: .medium)
        errorCodeToggleBtn.addTarget(self, action: #selector(toggleErrorCode), for: .touchUpInside)

        errorCodeBadge.translatesAutoresizingMaskIntoConstraints = false
        errorCodeBadge.font = .monospacedSystemFont(ofSize: 11, weight: .medium)
        errorCodeBadge.textColor = AppConfig.accentColor
        errorCodeBadge.textAlignment = .center
        errorCodeBadge.numberOfLines = 0
        errorCodeBadge.isHidden = true

        let retryBtn = UIButton(type: .system)
        retryBtn.translatesAutoresizingMaskIntoConstraints = false
        retryBtn.setTitle(Copy.retryLabel, for: .normal)
        retryBtn.setTitleColor(.white, for: .normal)
        retryBtn.backgroundColor = AppConfig.accentColor
        retryBtn.titleLabel?.font = .systemFont(ofSize: 15, weight: .bold)
        retryBtn.layer.cornerRadius = 14
        retryBtn.heightAnchor.constraint(equalToConstant: 44).isActive = true
        retryBtn.addTarget(self, action: #selector(handleRetryTapped), for: .touchUpInside)

        var arranged: [UIView] = [titleLabel, errorDescLabel, errorCodeToggleBtn, errorCodeBadge, retryBtn]

        if AppConfig.fallbackURL != nil {
            let fallbackBtn = UIButton(type: .system)
            fallbackBtn.translatesAutoresizingMaskIntoConstraints = false
            fallbackBtn.setTitle(Copy.switchFallbackLabel, for: .normal)
            fallbackBtn.setTitleColor(.white, for: .normal)
            fallbackBtn.backgroundColor = UIColor.white.withAlphaComponent(0.08)
            fallbackBtn.layer.borderWidth = 0
            fallbackBtn.titleLabel?.font = .systemFont(ofSize: 14, weight: .semibold)
            fallbackBtn.layer.cornerRadius = 14
            fallbackBtn.heightAnchor.constraint(equalToConstant: 42).isActive = true
            fallbackBtn.addTarget(self, action: #selector(handleFallbackTapped), for: .touchUpInside)
            arranged.append(fallbackBtn)
        }

        let stack = UIStackView(arrangedSubviews: arranged)
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.alignment = .fill
        stack.spacing = 12
        errorCard.addSubview(stack)

        NSLayoutConstraint.activate([
            errorOverlay.topAnchor.constraint(equalTo: view.topAnchor),
            errorOverlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            errorOverlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            errorOverlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            errorCard.centerXAnchor.constraint(equalTo: errorOverlay.centerXAnchor),
            errorCard.centerYAnchor.constraint(equalTo: errorOverlay.centerYAnchor),
            errorCard.widthAnchor.constraint(equalToConstant: 316),

            stack.topAnchor.constraint(equalTo: errorCard.topAnchor, constant: 24),
            stack.bottomAnchor.constraint(equalTo: errorCard.bottomAnchor, constant: -24),
            stack.leadingAnchor.constraint(equalTo: errorCard.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: errorCard.trailingAnchor, constant: -20),
        ])
    }

    private func loadTarget(_ url: URL) {
        currentActiveURL = url
        errorOverlay.isHidden = true
        URLCache.shared.removeAllCachedResponses()
        var req = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: 20)
        req.setValue("ShineMight-Mobile/2.0", forHTTPHeaderField: "X-Client-Shell")
        let cacheTypes: Set<String> = [
            WKWebsiteDataTypeDiskCache,
            WKWebsiteDataTypeMemoryCache,
            WKWebsiteDataTypeServiceWorkerRegistrations
        ]
        WKWebsiteDataStore.default().removeData(ofTypes: cacheTypes, modifiedSince: .distantPast) { [weak self] in
            DispatchQueue.main.async {
                self?.webView.load(req)
            }
        }
    }

    private func dismissInitialLoading() {
        guard !hasCompletedInitialLoad else { return }
        hasCompletedInitialLoad = true
        splashSafetyWorkItem?.cancel()
        splashSafetyWorkItem = nil
        UIView.animate(withDuration: 0.22, animations: {
            self.loadingOverlay.alpha = 0
        }, completion: { _ in
            self.loadingOverlay.isHidden = true
            self.spinner.stopAnimating()
        })
    }

    private func showError(code: String, rawCode: Int) {
        dismissInitialLoading()
        refreshControl.endRefreshing()
        errorDescLabel.text = Copy.message(for: code)
        currentTechCode = "\(code) (status=\(rawCode))"
        errorCodeBadge.text = currentTechCode
        errorCodeBadge.isHidden = true
        errorOverlay.isHidden = false
    }

    @objc private func handlePullToRefresh() {
        processCrashCount = 0
        if webView.url == nil {
            loadTarget(currentActiveURL)
        } else {
            webView.reload()
        }
    }

    @objc private func handleRetryTapped() {
        processCrashCount = 0
        loadTarget(webView.url ?? currentActiveURL)
    }

    @objc private func handleFallbackTapped() {
        processCrashCount = 0
        if let fallback = AppConfig.fallbackURL {
            loadTarget(fallback)
        }
    }

    @objc private func toggleErrorCode() {
        errorCodeBadge.isHidden.toggle()
    }

    private func openIsolatedExternal(_ url: URL) {
        guard let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" else {
            UIApplication.shared.open(url)
            return
        }
        let safari = SFSafariViewController(url: url)
        safari.preferredBarTintColor = AppConfig.oledBlack
        safari.preferredControlTintColor = AppConfig.accentColor
        present(safari, animated: true)
    }

    // MARK: - WKNavigationDelegate

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        let isMainFrame = navigationAction.targetFrame?.isMainFrame ?? false
        guard let scheme = url.scheme?.lowercased() else {
            decisionHandler(.cancel)
            return
        }

        if scheme != "http" && scheme != "https" {
            if isMainFrame || navigationAction.targetFrame == nil {
                UIApplication.shared.open(url)
            }
            decisionHandler(.cancel)
            return
        }

        let host = url.host?.lowercased() ?? ""
        if navigationAction.targetFrame == nil {
            if AppConfig.allowedHosts.contains(host) {
                webView.load(navigationAction.request)
            } else {
                openIsolatedExternal(url)
            }
            decisionHandler(.cancel)
            return
        }

        if isMainFrame && !AppConfig.allowedHosts.contains(host) {
            openIsolatedExternal(url)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationResponse: WKNavigationResponse,
        decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
    ) {
        if navigationResponse.isForMainFrame,
           let http = navigationResponse.response as? HTTPURLResponse,
           http.statusCode >= 502 {
            decisionHandler(.cancel)
            showError(code: "ERR_HTTP_5XX", rawCode: http.statusCode)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        guard !hasCompletedInitialLoad else { return }
        splashSafetyWorkItem?.cancel()
        let item = DispatchWorkItem { [weak self] in
            self?.dismissInitialLoading()
        }
        splashSafetyWorkItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.4, execute: item)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        processCrashCount = 0
        refreshControl.endRefreshing()
        errorOverlay.isHidden = true
        dismissInitialLoading()
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        processCrashCount += 1
        if processCrashCount <= 2 {
            errorOverlay.isHidden = true
            if webView.url != nil {
                webView.reload()
            } else {
                loadTarget(currentActiveURL)
            }
        } else {
            showError(code: "ERR_WEBPROCESS_TERMINATED", rawCode: processCrashCount)
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        handleNavigationError(error)
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        handleNavigationError(error)
    }

    private func handleNavigationError(_ error: Error) {
        let nsErr = error as NSError
        if nsErr.domain == NSURLErrorDomain && nsErr.code == NSURLErrorCancelled {
            return
        }
        if nsErr.domain == "WebKitErrorDomain" && nsErr.code == 102 {
            return
        }

        let mappedCode: String
        switch nsErr.code {
        case NSURLErrorNotConnectedToInternet, NSURLErrorNetworkConnectionLost, NSURLErrorDataNotAllowed:
            mappedCode = "ERR_NET_OFFLINE"
        case NSURLErrorTimedOut:
            mappedCode = "ERR_NET_TIMEOUT"
        case NSURLErrorSecureConnectionFailed,
             NSURLErrorServerCertificateHasBadDate,
             NSURLErrorServerCertificateUntrusted,
             NSURLErrorServerCertificateHasUnknownRoot,
             NSURLErrorServerCertificateNotYetValid:
            mappedCode = "ERR_TLS_SECURITY"
        default:
            mappedCode = "ERR_GATEWAY_UNREACHABLE"
        }
        showError(code: mappedCode, rawCode: nsErr.code)
    }

    // MARK: - WKUIDelegate

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            let host = url.host?.lowercased() ?? ""
            if AppConfig.allowedHosts.contains(host) {
                webView.load(navigationAction.request)
            } else {
                openIsolatedExternal(url)
            }
        }
        return nil
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        let alert = UIAlertController(title: AppConfig.appTitle, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: Copy.okLabel, style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        let alert = UIAlertController(title: AppConfig.appTitle, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: Copy.cancelLabel, style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: Copy.okLabel, style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void
    ) {
        let alert = UIAlertController(title: AppConfig.appTitle, message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: Copy.cancelLabel, style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: Copy.okLabel, style: .default) { _ in
            completionHandler(alert.textFields?.first?.text)
        })
        present(alert, animated: true)
    }
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.overrideUserInterfaceStyle = .dark
        window.backgroundColor = AppConfig.oledBlack
        window.rootViewController = MainViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}
