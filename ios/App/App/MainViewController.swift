import UIKit
import Capacitor

/// Le contrôleur de l'app : celui de Capacitor, plus le plugin local de Flair (`FlairNativePlugin`).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(FlairNativePlugin())
    }
}
