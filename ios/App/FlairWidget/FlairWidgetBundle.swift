//
//  FlairWidgetBundle.swift
//  FlairWidget
//
//  Created by Martin Lanrezac on 22/10/2026.
//

import WidgetKit
import SwiftUI

/// L'extension de Flair (T-086) : seulement la Live Activity de la balade. Pas de widget d'écran d'accueil.
@main
struct FlairWidgetBundle: WidgetBundle {
    var body: some Widget {
        FlairWidgetLiveActivity()
    }
}
