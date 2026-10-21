import UIKit
import Capacitor

/// Le contrôleur de l'app : celui de Capacitor, plus le plugin local de Flair (`FlairNativePlugin`).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(FlairNativePlugin())
        // R-078 : glisser depuis le bord gauche revient à l'écran précédent, comme dans toutes les apps iPhone.
        // (Coupé pendant une balade en cours : FlairNative.setBackGesture.)
        webView?.allowsBackForwardNavigationGestures = true
    }
}
