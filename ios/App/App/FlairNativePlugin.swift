import Foundation
import UIKit
import Capacitor
import CoreLocation
import HealthKit

/// Le pont entre l'app web et l'iPhone (phase 2, docs/ios.md) : les marches de l'Apple Watch (HealthKit, T-001) et la
/// balade enregistrée par le GPS de l'iPhone (T-036). Côté JS : `src/native/flair.ts`. Rien n'est écrit dans Santé.
@objc(FlairNativePlugin)
public class FlairNativePlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "FlairNativePlugin"
    public let jsName = "FlairNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getWalks", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startWalk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopWalk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelWalk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearWalk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "currentWalk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keepAwake", returnType: CAPPluginReturnPromise)
    ]

    private let health = HKHealthStore()
    /// Un point n'est gardé qu'à 5 m ou plus du précédent : assez pour le brouillard, sans noyer le pont JS.
    private let minStep: CLLocationDistance = 5

    private static func parseDate(_ text: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return withFraction.date(from: text) ?? ISO8601DateFormatter().date(from: text)
    }

    private static func format(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }

    /// `getWalks({ since })` : les marches et randonnées depuis `since` (ISO), avec leur tracé.
    /// Renvoie `{ available, walks: [{ uuid, start, end, type, points: [{ lat, lng, time }] }], withoutRoute, workouts }`.
    @objc func getWalks(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["available": false, "walks": [], "withoutRoute": 0, "workouts": 0])
            return
        }
        let since = call.getString("since").flatMap(FlairNativePlugin.parseDate) ?? Date().addingTimeInterval(-30 * 86400)
        let read: Set<HKObjectType> = [HKObjectType.workoutType(), HKSeriesType.workoutRoute()]
        // La demande ne s'affiche qu'une fois ; ensuite, iOS répond sans rien montrer (et ne dit jamais si la lecture est refusée).
        health.requestAuthorization(toShare: nil, read: read) { _, error in
            if let error = error {
                call.reject("Autorisation Santé impossible", nil, error)
                return
            }
            self.readWalks(since: since, call: call)
        }
    }

    private func readWalks(since: Date, call: CAPPluginCall) {
        let predicate = HKQuery.predicateForSamples(withStart: since, end: nil, options: .strictStartDate)
        let byStart = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let query = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [byStart]) { _, samples, error in
            if let error = error {
                call.reject("Lecture des séances impossible", nil, error)
                return
            }
            let workouts = (samples as? [HKWorkout]) ?? []
            let walks = workouts.filter { $0.workoutActivityType == .walking || $0.workoutActivityType == .hiking }
            let lock = NSLock()
            var results: [[String: Any]] = []
            var withoutRoute = 0
            let group = DispatchGroup()
            for workout in walks {
                group.enter()
                self.route(of: workout) { locations in
                    lock.lock()
                    if locations.count < 2 {
                        withoutRoute += 1
                    } else {
                        results.append([
                            "uuid": workout.uuid.uuidString,
                            "start": FlairNativePlugin.format(workout.startDate),
                            "end": FlairNativePlugin.format(workout.endDate),
                            "type": workout.workoutActivityType == .hiking ? "hiking" : "walking",
                            "points": locations.map { ["lat": $0.coordinate.latitude, "lng": $0.coordinate.longitude, "time": FlairNativePlugin.format($0.timestamp)] }
                        ])
                    }
                    lock.unlock()
                    group.leave()
                }
            }
            group.notify(queue: .global()) {
                let sorted = results.sorted { ($0["start"] as? String ?? "") < ($1["start"] as? String ?? "") }
                call.resolve(["available": true, "walks": sorted, "withoutRoute": withoutRoute, "workouts": workouts.count])
            }
        }
        health.execute(query)
    }

    /// Le tracé GPS d'une séance (vide pour une marche en intérieur ou sans GPS), allégé à un point tous les 5 m.
    private func route(of workout: HKWorkout, done: @escaping ([CLLocation]) -> Void) {
        let predicate = HKQuery.predicateForObjects(from: workout)
        let query = HKSampleQuery(sampleType: HKSeriesType.workoutRoute(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
            let routes = (samples as? [HKWorkoutRoute]) ?? []
            guard !routes.isEmpty else {
                done([])
                return
            }
            let lock = NSLock()
            var all: [CLLocation] = []
            let group = DispatchGroup()
            for route in routes {
                group.enter()
                var finished = false
                let routeQuery = HKWorkoutRouteQuery(route: route) { _, locations, isDone, _ in
                    lock.lock()
                    all.append(contentsOf: locations ?? [])
                    lock.unlock()
                    // Une erreur arrive sans `isDone` : la requête s'arrête quand même.
                    if (isDone || locations == nil) && !finished {
                        finished = true
                        group.leave()
                    }
                }
                self.health.execute(routeQuery)
            }
            group.notify(queue: .global()) {
                let ordered = all.sorted { $0.timestamp < $1.timestamp }
                var kept: [CLLocation] = []
                for location in ordered where location.horizontalAccuracy >= 0 {
                    if let last = kept.last, location.distance(from: last) < self.minStep { continue }
                    kept.append(location)
                }
                if let last = ordered.last, kept.last !== last, last.horizontalAccuracy >= 0 { kept.append(last) }
                done(kept)
            }
        }
        health.execute(query)
    }

    // MARK: - Balade enregistrée par l'iPhone (T-036)
    //
    // Démarrée et arrêtée seulement par les boutons de l'app. Autorisation « Pendant l'utilisation » : la pastille bleue
    // garde le GPS actif écran verrouillé. Chaque point est écrit tout de suite dans un fichier de l'app : si l'app est
    // tuée, la balade n'est pas perdue (`currentWalk` la retrouve, `startWalk` la reprend).

    /// Au-delà de 3 h, l'enregistrement s'arrête seul (une balade oubliée ne vide pas la batterie).
    private let maxDuration: TimeInterval = 3 * 3600
    /// Un point moins précis que 50 m est ignoré (sous un pont, en intérieur).
    private let maxAccuracy: CLLocationAccuracy = 50
    private var location: CLLocationManager?
    private var pendingStart: CAPPluginCall?
    private var recording = false

    private var walkDir: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("balade-en-cours", isDirectory: true)
    }
    private var stateFile: URL { walkDir.appendingPathComponent("etat.json") }
    private var pointsFile: URL { walkDir.appendingPathComponent("points.txt") }

    private func readState() -> [String: Any]? {
        guard let data = try? Data(contentsOf: stateFile) else { return nil }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }

    private func writeState(_ state: [String: Any]) {
        try? FileManager.default.createDirectory(at: walkDir, withIntermediateDirectories: true)
        if let data = try? JSONSerialization.data(withJSONObject: state) { try? data.write(to: stateFile, options: .atomic) }
    }

    /// Les points enregistrés : une ligne « lat,lng,heure » par point.
    private func readPoints() -> [[String: Any]] {
        guard let text = try? String(contentsOf: pointsFile, encoding: .utf8) else { return [] }
        return text.split(separator: "\n").compactMap { line in
            let parts = line.split(separator: ",")
            guard parts.count == 3, let lat = Double(parts[0]), let lng = Double(parts[1]) else { return nil }
            return ["lat": lat, "lng": lng, "time": String(parts[2])]
        }
    }

    private func append(_ point: CLLocation) {
        let line = "\(point.coordinate.latitude),\(point.coordinate.longitude),\(FlairNativePlugin.format(point.timestamp))\n"
        guard let data = line.data(using: .utf8) else { return }
        if let handle = try? FileHandle(forWritingTo: pointsFile) {
            handle.seekToEndOfFile()
            handle.write(data)
            handle.closeFile()
        } else {
            try? data.write(to: pointsFile)
        }
    }

    private func walkSummary() -> [String: Any] {
        guard let state = readState(), let startedAt = state["startedAt"] as? String else { return ["active": false, "recording": false, "points": []] }
        var summary: [String: Any] = ["active": true, "recording": recording, "startedAt": startedAt, "autoStopped": state["autoStopped"] as? Bool ?? false, "stopped": state["stoppedAt"] != nil, "points": readPoints()]
        if let stoppedAt = state["stoppedAt"] as? String { summary["stoppedAt"] = stoppedAt }
        return summary
    }

    /// `startWalk()` : démarre une balade, ou reprend celle en cours (app tuée). Refuse si la position n'est pas autorisée.
    @objc func startWalk(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let manager = self.location ?? CLLocationManager()
            self.location = manager
            manager.delegate = self
            switch manager.authorizationStatus {
            case .notDetermined:
                self.pendingStart = call
                manager.requestWhenInUseAuthorization()
            case .denied, .restricted:
                call.reject("La position n'est pas autorisée", "denied")
            default:
                self.begin(call)
            }
        }
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard let call = pendingStart, manager.authorizationStatus != .notDetermined else { return }
        pendingStart = nil
        if manager.authorizationStatus == .denied || manager.authorizationStatus == .restricted {
            call.reject("La position n'est pas autorisée", "denied")
        } else {
            begin(call)
        }
    }

    private func begin(_ call: CAPPluginCall) {
        guard let manager = location else { return }
        if var state = readState() {
            // Une balade déjà arrêtée (« Terminer », ou plus de 3 h) ne repart jamais (R-043) : elle attend d'être
            // enregistrée ou effacée.
            let started = (state["startedAt"] as? String).flatMap(FlairNativePlugin.parseDate) ?? Date()
            if state["stoppedAt"] != nil || Date().timeIntervalSince(started) > maxDuration {
                if state["stoppedAt"] == nil {
                    state["autoStopped"] = true
                    state["stoppedAt"] = FlairNativePlugin.format(started.addingTimeInterval(maxDuration))
                    writeState(state)
                }
                call.resolve(walkSummary())
                return
            }
        } else {
            writeState(["startedAt": FlairNativePlugin.format(Date())])
        }
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 5
        manager.activityType = .fitness
        manager.allowsBackgroundLocationUpdates = true
        manager.pausesLocationUpdatesAutomatically = false
        manager.showsBackgroundLocationIndicator = true
        manager.startUpdatingLocation()
        recording = true
        call.resolve(walkSummary())
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard recording, let state = readState(), let started = (state["startedAt"] as? String).flatMap(FlairNativePlugin.parseDate) else { return }
        for point in locations where point.horizontalAccuracy >= 0 && point.horizontalAccuracy <= maxAccuracy {
            append(point)
            notifyListeners("walkPoint", data: ["lat": point.coordinate.latitude, "lng": point.coordinate.longitude, "time": FlairNativePlugin.format(point.timestamp)])
        }
        if Date().timeIntervalSince(started) > maxDuration {
            stopUpdates()
            // Le chrono se fige à l'heure de l'arrêt (R-043) : départ + 3 h.
            let stoppedAt = FlairNativePlugin.format(started.addingTimeInterval(maxDuration))
            var stopped = state
            stopped["autoStopped"] = true
            stopped["stoppedAt"] = stoppedAt
            writeState(stopped)
            notifyListeners("walkStopped", data: ["stoppedAt": stoppedAt])
        }
    }

    private func stopUpdates() {
        location?.stopUpdatingLocation()
        location?.allowsBackgroundLocationUpdates = false
        recording = false
    }

    /// `stopWalk()` : arrête le GPS et renvoie la balade (`startedAt`, `points`). Le fichier est GARDÉ (R-042) : il n'est
    /// effacé que par `clearWalk()`, une fois la balade enregistrée. Si l'enregistrement échoue ou si l'app est fermée,
    /// la balade reste « à enregistrer ».
    @objc func stopWalk(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopUpdates()
            if var state = self.readState(), state["stoppedAt"] == nil {
                state["stoppedAt"] = FlairNativePlugin.format(Date())
                self.writeState(state)
            }
            call.resolve(self.walkSummary())
        }
    }

    /// `clearWalk()` : efface la balade, seulement après un enregistrement réussi.
    @objc func clearWalk(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            try? FileManager.default.removeItem(at: self.walkDir)
            call.resolve()
        }
    }

    /// `cancelWalk()` : arrête sans rien garder.
    @objc func cancelWalk(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopUpdates()
            try? FileManager.default.removeItem(at: self.walkDir)
            call.resolve()
        }
    }

    /// `currentWalk()` : la balade en cours (ou celle d'avant si l'app a été tuée), sans rien changer.
    @objc func currentWalk(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(self.walkSummary()) }
    }

    /// `keepAwake({ on })` : l'écran reste allumé tant que l'écran « Balade en cours » est affiché.
    @objc func keepAwake(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = on
            call.resolve()
        }
    }
}
