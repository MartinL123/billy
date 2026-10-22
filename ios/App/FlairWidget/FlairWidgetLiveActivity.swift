//
//  FlairWidgetLiveActivity.swift
//  FlairWidget
//
//  Created by Martin Lanrezac on 22/10/2026.
//

import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// T-086 : la balade sur l'écran verrouillé et dans la Dynamic Island (Live Activity). L'app la démarre avec la balade
// du GPS (`startWalk`), la met à jour depuis le suivi GPS (toutes les 15 s au plus) et la termine à l'arrêt : pas de
// serveur, pas de push. Le chrono avance seul (`Text(timerInterval:)`), sans mise à jour.

// ——— Les deux types partagés : MÊME définition dans ios/App/App/FlairNativePlugin.swift (ActivityKit et App Intents
// les reconnaissent par leur nom et leurs champs). Toute modification se fait des deux côtés. ———

struct FlairWalkAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// Le départ de la balade : le chrono part de là.
        var startedAt: Date
        /// La distance parcourue (mêmes règles que `walkDistance` du JS : un point compte à 8 m ou plus du précédent).
        var distanceM: Double
        /// Les bouts de territoire découverts (donnés par le JS) ; 0 : rien à afficher.
        var discovered: Int
        /// Les « Repère » posés pendant la balade.
        var markers: Int
        /// Le GPS enregistre ; faux une fois la balade arrêtée (3 h, « Terminer »).
        var recording: Bool
        /// L'heure de l'arrêt : le chrono se fige.
        var endedAt: Date?
    }

    /// « Balade avec Billy »
    var dogName: String
}

/// « Repère » : marque l'endroit pour le raconter après la balade. Une `LiveActivityIntent` s'exécute dans l'app
/// (processus de l'app, réveillée en arrière-plan si besoin) : c'est la copie de l'app (`FlairNativePlugin.swift`) qui
/// enregistre la position. Celle-ci, dans l'extension, ne sert qu'à déclarer le bouton : elle ne fait rien.
struct PlaceMarkerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Poser un repère"
    static var description = IntentDescription("Marque l’endroit de la balade, pour raconter ensuite ce qui s’y est passé.")
    static var isDiscoverable = false

    init() {}

    func perform() async throws -> some IntentResult {
        .result()
    }
}

// ——— Textes (miroir de src/lib/route.ts : formatRouteDistance) ———

enum WalkText {
    static let nbsp = "\u{00A0}"

    /// « 650 m », « 1,4 km »
    static func distance(_ meters: Double) -> String {
        if meters < 1000 { return "\(Int((meters / 10).rounded()) * 10)\(nbsp)m" }
        return String(format: "%.1f", meters / 1000).replacingOccurrences(of: ".", with: ",") + "\(nbsp)km"
    }

    /// « Balade avec Billy »
    static func title(_ dogName: String) -> String {
        let name = dogName.trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? "Balade en cours" : "Balade avec \(name)"
    }

    /// « 3 bouts de territoire »
    static func discovered(_ n: Int) -> String {
        n == 1 ? "1 bout de territoire" : "\(n) bouts de territoire"
    }

    /// « 2 repères »
    static func markers(_ n: Int) -> String {
        n == 1 ? "1 repère" : "\(n) repères"
    }

    /// Durée figée à l'arrêt : « 32 min », « 1 h 05 ».
    static func duration(from start: Date, to end: Date) -> String {
        let minutes = max(0, Int(end.timeIntervalSince(start) / 60))
        if minutes < 60 { return "\(minutes)\(nbsp)min" }
        return "\(minutes / 60) h \(String(format: "%02d", minutes % 60))"
    }
}

// ——— Couleurs : le vert des tracés (#2F8F6B), plus clair sur fond sombre ———

extension Color {
    /// Vert des accents : #2F8F6B sur fond clair, #6CCB9F sur fond sombre (lisible sur les deux écrans verrouillés).
    static let flairRoute = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0x6C / 255, green: 0xCB / 255, blue: 0x9F / 255, alpha: 1) : UIColor(red: 0x2F / 255, green: 0x8F / 255, blue: 0x6B / 255, alpha: 1) })
    /// Fond du bouton « Repère » : plus foncé en clair (texte blanc ≥ 4,5:1), clair en sombre (texte foncé).
    static let flairButton = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0x6C / 255, green: 0xCB / 255, blue: 0x9F / 255, alpha: 1) : UIColor(red: 0x1F / 255, green: 0x6E / 255, blue: 0x52 / 255, alpha: 1) })
    static let flairOnButton = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0x0B / 255, green: 0x24 / 255, blue: 0x1A / 255, alpha: 1) : .white })
    /// La Dynamic Island est toujours noire : le vert clair.
    static let islandRoute = Color(red: 0x6C / 255, green: 0xCB / 255, blue: 0x9F / 255)
}

/// Le chrono depuis le départ (avance seul), ou la durée figée à l'arrêt.
struct WalkClock: View {
    let state: FlairWalkAttributes.ContentState

    var body: some View {
        if let end = state.endedAt, !state.recording {
            Text(WalkText.duration(from: state.startedAt, to: end))
        } else {
            Text(timerInterval: state.startedAt...state.startedAt.addingTimeInterval(3 * 3600), countsDown: false)
        }
    }
}

/// Le bouton « Repère » (iOS 17 : bouton interactif, sans ouvrir l'app).
struct MarkerButton: View {
    var island = false

    var body: some View {
        Button(intent: PlaceMarkerIntent()) {
            Label("Repère", systemImage: "flag.fill")
                .font(.subheadline.weight(.bold))
                .frame(maxWidth: island ? nil : .infinity, minHeight: 44)
                .padding(.horizontal, 16)
                .foregroundStyle(island ? Color.black : Color.flairOnButton)
                .background(island ? Color.islandRoute : Color.flairButton, in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Poser un repère ici")
    }
}

/// L'écran verrouillé (et la bannière) : « Balade avec Billy », le chrono, la distance, les découvertes, « Repère ».
struct WalkLockScreen: View {
    let context: ActivityViewContext<FlairWalkAttributes>

    var body: some View {
        let state = context.state
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "pawprint.fill")
                    .foregroundStyle(Color.flairRoute)
                    .accessibilityHidden(true)
                Text(WalkText.title(context.attributes.dogName))
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                Spacer(minLength: 4)
                if state.markers > 0 {
                    Text(WalkText.markers(state.markers))
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }
            HStack(alignment: .firstTextBaseline) {
                WalkClock(state: state)
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .lineLimit(1)
                Spacer(minLength: 8)
                VStack(alignment: .trailing, spacing: 2) {
                    Text(WalkText.distance(state.distanceM))
                        .font(.title3.weight(.bold))
                        .monospacedDigit()
                    if state.discovered > 0 {
                        Text(WalkText.discovered(state.discovered))
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.flairRoute)
                    }
                }
            }
            if state.recording {
                MarkerButton()
            } else {
                Text("Arrêtée. Ouvrez Flair pour garder la balade.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
    }
}

struct FlairWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FlairWalkAttributes.self) { context in
            WalkLockScreen(context: context)
                .activitySystemActionForegroundColor(Color.flairRoute)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text(WalkText.title(context.attributes.dogName)).lineLimit(1)
                    } icon: {
                        Image(systemName: "pawprint.fill").foregroundStyle(Color.islandRoute)
                    }
                    .font(.subheadline.weight(.semibold))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(WalkText.distance(context.state.distanceM))
                        .font(.subheadline.weight(.bold))
                        .monospacedDigit()
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(alignment: .center) {
                        VStack(alignment: .leading, spacing: 2) {
                            WalkClock(state: context.state)
                                .font(.system(size: 28, weight: .bold, design: .rounded))
                                .monospacedDigit()
                                .lineLimit(1)
                            if context.state.discovered > 0 {
                                Text(WalkText.discovered(context.state.discovered))
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(Color.islandRoute)
                            }
                        }
                        Spacer(minLength: 8)
                        if context.state.recording { MarkerButton(island: true) }
                    }
                }
            } compactLeading: {
                Image(systemName: "pawprint.fill")
                    .foregroundStyle(Color.islandRoute)
                    .accessibilityLabel(WalkText.title(context.attributes.dogName))
            } compactTrailing: {
                WalkClock(state: context.state)
                    .monospacedDigit()
                    .frame(maxWidth: 52)
                    .foregroundStyle(Color.islandRoute)
            } minimal: {
                Image(systemName: "pawprint.fill")
                    .foregroundStyle(Color.islandRoute)
                    .accessibilityLabel(WalkText.title(context.attributes.dogName))
            }
            .keylineTint(Color.islandRoute)
        }
    }
}

extension FlairWalkAttributes {
    fileprivate static var preview: FlairWalkAttributes {
        FlairWalkAttributes(dogName: "Billy")
    }
}

extension FlairWalkAttributes.ContentState {
    fileprivate static var walking: FlairWalkAttributes.ContentState {
        .init(startedAt: Date().addingTimeInterval(-14 * 60), distanceM: 1380, discovered: 3, markers: 1, recording: true, endedAt: nil)
    }

    fileprivate static var stopped: FlairWalkAttributes.ContentState {
        .init(startedAt: Date().addingTimeInterval(-3 * 3600), distanceM: 9200, discovered: 0, markers: 0, recording: false, endedAt: Date())
    }
}

#Preview("Écran verrouillé", as: .content, using: FlairWalkAttributes.preview) {
    FlairWidgetLiveActivity()
} contentStates: {
    FlairWalkAttributes.ContentState.walking
    FlairWalkAttributes.ContentState.stopped
}
