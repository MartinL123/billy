import Foundation
import UIKit
import Capacitor
import CoreLocation
import HealthKit
import UserNotifications
import CoreMotion

/// Le pont entre l'app web et l'iPhone (phase 2, docs/ios.md) : les marches de l'Apple Watch (HealthKit, T-001) et la
/// balade enregistrée par le GPS de l'iPhone (T-036). Côté JS : `src/native/flair.ts`. Rien n'est écrit dans Santé.
@objc(FlairNativePlugin)
public class FlairNativePlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "FlairNativePlugin"
    public let jsName = "FlairNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getWalks", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "healthWindow", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startWalk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopWalk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelWalk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearWalk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "currentWalk", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keepAwake", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "markSaved", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pendingSent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBackGesture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setWatchNotify", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "motionStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "motionWalks", returnType: CAPPluginReturnPromise)
    ]

    private let health = HKHealthStore()

    /// T-084 : une marche de la Watch arrive pendant que l'app est ouverte : le JS lance l'import (`watchArrived`).
    override public func load() {
        NotificationCenter.default.addObserver(forName: WatchArrivals.arrived, object: nil, queue: .main) { [weak self] _ in
            self?.notifyListeners("watchArrived", data: [:])
        }
    }

    /// `setWatchNotify({ optedIn, enabled, dogName })` (T-084) : ce qu'il faut savoir pour annoncer seul une balade de la
    /// Watch, réveillé par Santé sans le JS. Lecture des marches choisie (R-079) : l'observation de Santé démarre.
    @objc func setWatchNotify(_ call: CAPPluginCall) {
        WatchArrivals.shared.configure(optedIn: call.getBool("optedIn") ?? false, enabled: call.getBool("enabled") ?? true, dogName: call.getString("dogName") ?? "")
        call.resolve()
    }

    // MARK: - Mouvements et forme (T-085, V6 § 5)
    //
    // Sans Watch : l'iPhone sait quand on a marché, jamais où (aucune position). Le JS choisit la marche à proposer
    // (`src/lib/motionWalks.ts`) : « Vous avez marché 35 min vers 8 h. C'était une sortie avec Billy ? ».

    private let motion = CMMotionActivityManager()

    /// `motionStatus()` : `{ available, status: 'granted' | 'denied' | 'prompt' }`, sans rien demander.
    @objc func motionStatus(_ call: CAPPluginCall) {
        guard CMMotionActivityManager.isActivityAvailable() else {
            call.resolve(["available": false, "status": "denied"])
            return
        }
        let status: String
        switch CMMotionActivityManager.authorizationStatus() {
        case .authorized: status = "granted"
        case .notDetermined: status = "prompt"
        default: status = "denied"
        }
        call.resolve(["available": true, "status": status])
    }

    /// `motionWalks({ since })` : les périodes « à pied » (confiance moyenne ou haute) depuis `since`, brutes, en heures ISO :
    /// `{ periods: [{ start, end }] }`. La première fois, iOS demande l'accès (texte `NSMotionUsageDescription`) ; refusé :
    /// aucune période, jamais d'erreur.
    @objc func motionWalks(_ call: CAPPluginCall) {
        guard CMMotionActivityManager.isActivityAvailable() else {
            call.resolve(["periods": []])
            return
        }
        let now = Date()
        let since = call.getString("since").flatMap(FlairNativePlugin.parseDate) ?? now.addingTimeInterval(-7 * 86400)
        motion.queryActivityStarting(from: since, to: now, to: OperationQueue.main) { activities, error in
            guard error == nil, let activities = activities else {
                call.resolve(["periods": []])
                return
            }
            var periods: [[String: String]] = []
            var walkingSince: Date?
            for activity in activities {
                let walking = activity.walking && activity.confidence != .low
                if walking, walkingSince == nil { walkingSince = activity.startDate }
                if !walking, let start = walkingSince {
                    periods.append(["start": FlairNativePlugin.format(start), "end": FlairNativePlugin.format(activity.startDate)])
                    walkingSince = nil
                }
            }
            if let start = walkingSince { periods.append(["start": FlairNativePlugin.format(start), "end": FlairNativePlugin.format(now)]) }
            call.resolve(["periods": periods])
        }
    }

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

    /// Un point pour le JS (V6 § 2.1) : `lat`, `lng`, `time`, et `alt` (m), `speed` (m/s), `accuracy` (m) quand iOS les
    /// connaît (une valeur négative veut dire « inconnue » : elle n'est pas envoyée).
    private static func pointData(_ location: CLLocation) -> [String: Any] {
        var data: [String: Any] = ["lat": location.coordinate.latitude, "lng": location.coordinate.longitude, "time": format(location.timestamp)]
        if location.verticalAccuracy >= 0 { data["alt"] = location.altitude }
        if location.speed >= 0 { data["speed"] = location.speed }
        if location.horizontalAccuracy >= 0 { data["accuracy"] = location.horizontalAccuracy }
        return data
    }

    /// T-080 : rythme cardiaque, pas et énergie active, lus en plus des séances et de leur tracé (V6 § 2.2).
    private let heartRate = HKQuantityType.quantityType(forIdentifier: .heartRate)!
    private let stepCount = HKQuantityType.quantityType(forIdentifier: .stepCount)!
    private let activeEnergy = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!

    /// `getWalks({ since })` : les marches et randonnées depuis `since` (ISO), avec leur tracé.
    /// Renvoie `{ available, walks: [{ uuid, start, end, type, points: [{ lat, lng, time, alt?, speed?, accuracy? }],
    /// hr?: [{ time, bpm }], steps?, energy? (kcal), weather?: { tempC, humidity? (%) }, pauses?: [{ start, end }] }],
    /// withoutRoute, workouts }`. Les heures sont en ISO ; le JS les ramène en minutes ou secondes depuis le départ.
    @objc func getWalks(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["available": false, "walks": [], "withoutRoute": 0, "workouts": 0])
            return
        }
        let since = call.getString("since").flatMap(FlairNativePlugin.parseDate) ?? Date().addingTimeInterval(-30 * 86400)
        let read: Set<HKObjectType> = [HKObjectType.workoutType(), HKSeriesType.workoutRoute(), heartRate, stepCount, activeEnergy]
        // La demande ne s'affiche qu'une fois par type ; ensuite, iOS répond sans rien montrer (et ne dit jamais si la
        // lecture est refusée). Les trois types ajoutés par la T-080 sont demandés à la première lecture qui suit.
        health.requestAuthorization(toShare: nil, read: read) { _, error in
            if let error = error {
                call.reject("Autorisation Santé impossible", nil, error)
                return
            }
            self.readWalks(since: since, call: call)
        }
    }

    /// `healthWindow({ start, end })` (T-080) : le cœur, les pas et l'énergie que Santé a sur la fenêtre d'une balade du
    /// GPS de Flair (Watch au poignet). Ne demande jamais l'autorisation : sans lecture permise, renvoie `{}`.
    @objc func healthWindow(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let start = call.getString("start").flatMap(FlairNativePlugin.parseDate),
              let end = call.getString("end").flatMap(FlairNativePlugin.parseDate),
              end > start else {
            call.resolve([:])
            return
        }
        healthData(from: start, to: end) { call.resolve($0) }
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
                    if locations.count < 2 {
                        lock.lock()
                        withoutRoute += 1
                        lock.unlock()
                        group.leave()
                        return
                    }
                    self.healthData(from: workout.startDate, to: workout.endDate) { extra in
                        var walk: [String: Any] = [
                            "uuid": workout.uuid.uuidString,
                            "start": FlairNativePlugin.format(workout.startDate),
                            "end": FlairNativePlugin.format(workout.endDate),
                            "type": workout.workoutActivityType == .hiking ? "hiking" : "walking",
                            "points": locations.map { FlairNativePlugin.pointData($0) }
                        ]
                        walk.merge(extra) { _, new in new }
                        if let weather = FlairNativePlugin.weather(of: workout) { walk["weather"] = weather }
                        let pauses = FlairNativePlugin.pauses(of: workout)
                        if !pauses.isEmpty { walk["pauses"] = pauses }
                        lock.lock()
                        results.append(walk)
                        lock.unlock()
                        group.leave()
                    }
                }
            }
            group.notify(queue: .global()) {
                let sorted = results.sorted { ($0["start"] as? String ?? "") < ($1["start"] as? String ?? "") }
                call.resolve(["available": true, "walks": sorted, "withoutRoute": withoutRoute, "workouts": workouts.count])
            }
        }
        health.execute(query)
    }

    /// Le cœur (échantillons datés, bpm), les pas et l'énergie active (kcal) sur une fenêtre. Ce qui manque (rien
    /// mesuré, lecture refusée) est absent : jamais d'erreur.
    private func healthData(from start: Date, to end: Date, done: @escaping ([String: Any]) -> Void) {
        let window = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
        let lock = NSLock()
        var data: [String: Any] = [:]
        let group = DispatchGroup()

        group.enter()
        let byStart = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let hrQuery = HKSampleQuery(sampleType: heartRate, predicate: window, limit: HKObjectQueryNoLimit, sortDescriptors: [byStart]) { _, samples, _ in
            let bpm = HKUnit.count().unitDivided(by: .minute())
            let hr: [[String: Any]] = ((samples as? [HKQuantitySample]) ?? []).map {
                ["time": FlairNativePlugin.format($0.startDate), "bpm": $0.quantity.doubleValue(for: bpm)]
            }
            if !hr.isEmpty {
                lock.lock()
                data["hr"] = hr
                lock.unlock()
            }
            group.leave()
        }
        health.execute(hrQuery)

        // Somme sur la fenêtre (Santé évite de compter deux fois les pas de l'iPhone et de la Watch).
        let sums: [(HKQuantityType, String, HKUnit)] = [(stepCount, "steps", .count()), (activeEnergy, "energy", .kilocalorie())]
        for (type, key, unit) in sums {
            group.enter()
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: window, options: .cumulativeSum) { _, statistics, _ in
                if let sum = statistics?.sumQuantity()?.doubleValue(for: unit), sum > 0 {
                    lock.lock()
                    data[key] = sum
                    lock.unlock()
                }
                group.leave()
            }
            health.execute(query)
        }

        group.notify(queue: .global()) { done(data) }
    }

    /// La météo notée par la Watch dans la séance (température en °C, humidité en %), si elle y est.
    private static func weather(of workout: HKWorkout) -> [String: Any]? {
        guard let temperature = workout.metadata?[HKMetadataKeyWeatherTemperature] as? HKQuantity,
              temperature.is(compatibleWith: .degreeCelsius()) else { return nil }
        var weather: [String: Any] = ["tempC": temperature.doubleValue(for: .degreeCelsius())]
        if let humidity = workout.metadata?[HKMetadataKeyWeatherHumidity] as? HKQuantity, humidity.is(compatibleWith: .percent()) {
            weather["humidity"] = humidity.doubleValue(for: .percent()) * 100
        }
        return weather
    }

    /// Les pauses de la séance (pause / reprise, à la main ou automatiques), en heures ISO. Une pause jamais reprise
    /// dure jusqu'à la fin de la séance.
    private static func pauses(of workout: HKWorkout) -> [[String: String]] {
        let events = (workout.workoutEvents ?? []).sorted { $0.dateInterval.start < $1.dateInterval.start }
        var out: [[String: String]] = []
        var pausedAt: Date?
        for event in events {
            switch event.type {
            case .pause, .motionPaused:
                if pausedAt == nil { pausedAt = event.dateInterval.start }
            case .resume, .motionResumed:
                if let start = pausedAt {
                    out.append(["start": format(start), "end": format(event.dateInterval.start)])
                    pausedAt = nil
                }
            default:
                break
            }
        }
        if let start = pausedAt { out.append(["start": format(start), "end": format(workout.endDate)]) }
        return out
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
    /// T-061 : les balades enregistrées dans la base locale mais pas encore arrivées au serveur (hors ligne) ; une
    /// par dossier, nommé par l'entrée. Effacées seulement quand l'envoi est confirmé (`clearSent`).
    private var sentDir: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("balades-a-envoyer", isDirectory: true)
    }
    private var pointsFile: URL { walkDir.appendingPathComponent("points.txt") }

    private func readState() -> [String: Any]? {
        guard let data = try? Data(contentsOf: stateFile) else { return nil }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }

    /// Écrit l'état de la balade. Faux si l'écriture a échoué (stockage plein, T-062) : jamais d'échec muet au départ.
    @discardableResult
    private func writeState(_ state: [String: Any]) -> Bool {
        do {
            try FileManager.default.createDirectory(at: walkDir, withIntermediateDirectories: true)
            let data = try JSONSerialization.data(withJSONObject: state)
            try data.write(to: stateFile, options: .atomic)
            return true
        } catch {
            return false
        }
    }

    /// Les points enregistrés : une ligne « lat,lng,heure,altitude,vitesse,précision » par point (V6 § 2.1 ; les trois
    /// derniers vides s'ils sont inconnus). Les lignes d'avant la V6 (« lat,lng,heure ») restent lisibles.
    private func readPoints() -> [[String: Any]] {
        guard let text = try? String(contentsOf: pointsFile, encoding: .utf8) else { return [] }
        return text.split(separator: "\n").compactMap { line in
            let parts = line.split(separator: ",", omittingEmptySubsequences: false)
            guard parts.count >= 3, let lat = Double(parts[0]), let lng = Double(parts[1]) else { return nil }
            var point: [String: Any] = ["lat": lat, "lng": lng, "time": String(parts[2])]
            if parts.count >= 6 {
                if let alt = Double(parts[3]) { point["alt"] = alt }
                if let speed = Double(parts[4]) { point["speed"] = speed }
                if let accuracy = Double(parts[5]) { point["accuracy"] = accuracy }
            }
            return point
        }
    }

    /// Ajoute un point au fichier. Faux si l'écriture a échoué (stockage plein) : l'écran le dit (`walkError`, T-062).
    private func append(_ point: CLLocation) -> Bool {
        let alt = point.verticalAccuracy >= 0 ? "\(point.altitude)" : ""
        let speed = point.speed >= 0 ? "\(point.speed)" : ""
        let line = "\(point.coordinate.latitude),\(point.coordinate.longitude),\(FlairNativePlugin.format(point.timestamp)),\(alt),\(speed),\(point.horizontalAccuracy)\n"
        guard let data = line.data(using: .utf8) else { return false }
        do {
            if FileManager.default.fileExists(atPath: pointsFile.path) {
                let handle = try FileHandle(forWritingTo: pointsFile)
                defer { try? handle.close() }
                try handle.seekToEnd()
                try handle.write(contentsOf: data)
            } else {
                try data.write(to: pointsFile)
            }
            return true
        } catch {
            return false
        }
    }

    private func walkSummary() -> [String: Any] {
        guard let state = readState(), let startedAt = state["startedAt"] as? String else { return ["active": false, "recording": false, "points": []] }
        var summary: [String: Any] = ["active": true, "recording": recording, "startedAt": startedAt, "autoStopped": state["autoStopped"] as? Bool ?? false, "stopped": state["stoppedAt"] != nil, "points": readPoints()]
        if let stoppedAt = state["stoppedAt"] as? String { summary["stoppedAt"] = stoppedAt }
        if let savedAs = state["savedAs"] as? String { summary["savedAs"] = savedAs }
        // T-060 : « Position exacte » coupée dans Réglages : les points (plusieurs centaines de mètres) seront écartés.
        if let manager = location { summary["reducedAccuracy"] = manager.accuracyAuthorization == .reducedAccuracy }
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
        // T-061 : la balade d'avant est enregistrée mais attend le réseau : sa copie part dans « à envoyer », on repart à zéro.
        if let state = readState(), let savedAs = state["savedAs"] as? String {
            try? FileManager.default.createDirectory(at: sentDir, withIntermediateDirectories: true)
            let target = sentDir.appendingPathComponent(savedAs, isDirectory: true)
            try? FileManager.default.removeItem(at: target)
            try? FileManager.default.moveItem(at: walkDir, to: target)
        }
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
        } else if !writeState(["startedAt": FlairNativePlugin.format(Date())]) {
            // T-062 : impossible d'écrire sur l'iPhone (stockage plein) : on ne démarre pas une balade qui serait perdue.
            call.reject("Stockage de l'iPhone plein", "storage")
            return
        }
        // T-060 : position approximative → iOS demande la position exacte pour cette balade (clé « balade » de
        // NSLocationTemporaryUsageDescriptionDictionary). Refusée : l'écran l'annonce, et la sortie pourra être notée.
        if manager.accuracyAuthorization == .reducedAccuracy {
            manager.requestTemporaryFullAccuracyAuthorization(withPurposeKey: "balade")
        }
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 5
        manager.activityType = .fitness
        manager.allowsBackgroundLocationUpdates = true
        manager.pausesLocationUpdatesAutomatically = false
        manager.showsBackgroundLocationIndicator = true
        manager.startUpdatingLocation()
        recording = true
        scheduleAutoStop()
        call.resolve(walkSummary())
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard recording, let state = readState(), let started = (state["startedAt"] as? String).flatMap(FlairNativePlugin.parseDate) else { return }
        // La précision du GPS, même quand le point est écarté : l'écran annonce un signal faible (V5, T-051).
        if let last = locations.last {
            notifyListeners("walkSignal", data: ["accuracy": last.horizontalAccuracy, "time": FlairNativePlugin.format(last.timestamp)])
        }
        // Au-delà de départ + 3 h, plus aucun point n'est gardé (T-062).
        let limit = started.addingTimeInterval(maxDuration)
        for point in locations where point.horizontalAccuracy >= 0 && point.horizontalAccuracy <= maxAccuracy && point.timestamp <= limit {
            if !append(point) {
                notifyListeners("walkError", data: ["code": "storage"])
                continue
            }
            notifyListeners("walkPoint", data: FlairNativePlugin.pointData(point))
        }
        if Date() > limit { autoStop() }
    }

    private var autoStopTimer: Timer?

    /// T-062 : l'arrêt à 3 h ne dépend plus de l'arrivée d'un point (téléphone posé) : un minuteur à départ + 3 h.
    private func scheduleAutoStop() {
        autoStopTimer?.invalidate()
        guard let started = (readState()?["startedAt"] as? String).flatMap(FlairNativePlugin.parseDate) else { return }
        let delay = max(1, started.addingTimeInterval(maxDuration).timeIntervalSinceNow)
        autoStopTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in self?.autoStop() }
    }

    /// Arrêt automatique (R-043) : le chrono se fige à départ + 3 h.
    private func autoStop() {
        guard recording, var state = readState(), state["stoppedAt"] == nil, let started = (state["startedAt"] as? String).flatMap(FlairNativePlugin.parseDate) else { return }
        stopUpdates()
        let stoppedAt = FlairNativePlugin.format(started.addingTimeInterval(maxDuration))
        state["autoStopped"] = true
        state["stoppedAt"] = stoppedAt
        writeState(state)
        notifyListeners("walkStopped", data: ["stoppedAt": stoppedAt])
    }

    private func stopUpdates() {
        autoStopTimer?.invalidate()
        autoStopTimer = nil
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

    /// `markSaved({ entryId })` (T-061) : la balade est dans la base locale mais pas encore au serveur. Le fichier est
    /// gardé ; l'accueil ne la propose plus « à enregistrer ».
    @objc func markSaved(_ call: CAPPluginCall) {
        let entryId = call.getString("entryId") ?? ""
        DispatchQueue.main.async {
            if var state = self.readState(), !entryId.isEmpty {
                state["savedAs"] = entryId
                self.writeState(state)
            }
            call.resolve()
        }
    }

    /// `pendingSent()` (T-061) : les entrées dont la copie attend la confirmation d'envoi.
    @objc func pendingSent(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var ids = (try? FileManager.default.contentsOfDirectory(atPath: self.sentDir.path)) ?? []
            if let savedAs = self.readState()?["savedAs"] as? String { ids.append(savedAs) }
            call.resolve(["ids": ids])
        }
    }

    /// `clearSent({ ids })` (T-061) : l'envoi au serveur est confirmé, les copies peuvent partir.
    @objc func clearSent(_ call: CAPPluginCall) {
        let ids = (call.getArray("ids") as? [String]) ?? []
        DispatchQueue.main.async {
            for id in ids { try? FileManager.default.removeItem(at: self.sentDir.appendingPathComponent(id, isDirectory: true)) }
            if let savedAs = self.readState()?["savedAs"] as? String, ids.contains(savedAs) {
                try? FileManager.default.removeItem(at: self.walkDir)
            }
            call.resolve()
        }
    }

    /// `setBackGesture({ on })` (R-078) : le retour par glissement depuis le bord gauche, coupé pendant une balade.
    @objc func setBackGesture(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? true
        DispatchQueue.main.async {
            self.bridge?.webView?.allowsBackForwardNavigationGestures = on
            call.resolve()
        }
    }

    /// `haptic({ type })` (R-080) : « success » (balade gardée, sortie notée, étape validée) ou « selection » (le
    /// panneau de la carte s'arrête sur un cran). Rien sur les taps ordinaires.
    @objc func haptic(_ call: CAPPluginCall) {
        let type = call.getString("type") ?? "success"
        DispatchQueue.main.async {
            if type == "selection" {
                UISelectionFeedbackGenerator().selectionChanged()
            } else {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            }
            call.resolve()
        }
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

/// T-084 (spec V6 § 4) : les balades de la Watch arrivent seules. Santé réveille l'app quand une séance arrive sur
/// l'iPhone (`HKObserverQuery` + `enableBackgroundDelivery`, entitlement `healthkit.background-delivery`) ; l'app lit les
/// marches et randonnées en extérieur avec tracé, garde leur UUID (« à importer ») et programme UNE notification locale
/// par balade, jamais entre 22 h et 7 h (elle attend 7 h). Toucher la notification ouvre `#/balade/arrivee` (côté JS :
/// `WatchArrivalBridge`), où l'import habituel tourne. Sans réveil possible (compte gratuit, refus) : rien ne se passe,
/// l'import à l'ouverture reste. Miroir testé du texte et de l'heure : `src/lib/watchArrival.ts`.
final class WatchArrivals {
    static let shared = WatchArrivals()
    /// Posté quand une balade arrive app ouverte : le plugin prévient le JS, qui importe tout de suite.
    static let arrived = Notification.Name("FlairWatchArrived")

    // Copiés depuis le JS par `setWatchNotify` (UserDefaults : lisibles au réveil, avant tout chargement de la page).
    private static let optedInKey = "flair.montre"
    private static let enabledKey = "flair.notif-balade"
    private static let dogNameKey = "flair.prenom"
    /// Depuis quand annoncer (le choix de lire les marches) : jamais les marches d'avant.
    private static let sinceKey = "flair.watch-depuis"
    /// Dernière lecture : la suivante repart un jour avant (une séance arrive parfois sur l'iPhone après coup).
    private static let lastReadKey = "flair.watch-lu"
    /// Les balades annoncées (« à importer ») : UUID → départ ISO. Jamais deux notifications pour la même balade.
    private static let announcedKey = "flair.watch-annoncees"

    private let health = HKHealthStore()
    private let defaults = UserDefaults.standard
    private let queue = DispatchQueue(label: "fr.lanrezac.billy.watch-arrivals")
    private var observer: HKObserverQuery?

    func configure(optedIn: Bool, enabled: Bool, dogName: String) {
        defaults.set(optedIn, forKey: WatchArrivals.optedInKey)
        defaults.set(enabled, forKey: WatchArrivals.enabledKey)
        defaults.set(dogName, forKey: WatchArrivals.dogNameKey)
        if optedIn { DispatchQueue.main.async { self.start() } }
    }

    /// Au lancement (`AppDelegate`, aussi quand Santé relance l'app en arrière-plan) et au choix de lire les marches.
    func start() {
        guard observer == nil, HKHealthStore.isHealthDataAvailable(), defaults.bool(forKey: WatchArrivals.optedInKey) else { return }
        if defaults.object(forKey: WatchArrivals.sinceKey) == nil {
            defaults.set(Date().timeIntervalSince1970, forKey: WatchArrivals.sinceKey)
        }
        let query = HKObserverQuery(sampleType: HKObjectType.workoutType(), predicate: nil) { [weak self] _, completion, error in
            guard let self = self, error == nil else {
                completion()
                return
            }
            self.check(completion)
        }
        observer = query
        health.execute(query)
        health.enableBackgroundDelivery(for: HKObjectType.workoutType(), frequency: .immediate) { _, _ in
            // Refusé (profil sans l'entitlement, lecture non autorisée) : pas de réveil, l'import à l'ouverture reste.
        }
    }

    /// Lit les séances arrivées et annonce les nouvelles balades. Une lecture à la fois (`queue` attend la fin de chacune,
    /// les réponses de Santé arrivent sur d'autres fils) ; `completion` prévient Santé.
    private func check(_ completion: @escaping () -> Void) {
        queue.async {
            guard self.defaults.bool(forKey: WatchArrivals.optedInKey) else {
                completion()
                return
            }
            let done = DispatchSemaphore(value: 0)
            let since = Date(timeIntervalSince1970: self.defaults.double(forKey: WatchArrivals.sinceKey))
            let lastRead = self.defaults.object(forKey: WatchArrivals.lastReadKey) as? Double
            let from = max(since, lastRead.map { Date(timeIntervalSince1970: $0).addingTimeInterval(-86400) } ?? since)
            let readAt = Date()
            let predicate = HKQuery.predicateForSamples(withStart: from.addingTimeInterval(-6 * 3600), end: nil, options: [])
            let byEnd = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: true)
            let query = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [byEnd]) { _, samples, _ in
                let announced = self.announced()
                let walks = ((samples as? [HKWorkout]) ?? []).filter { workout in
                    (workout.workoutActivityType == .walking || workout.workoutActivityType == .hiking)
                        && workout.endDate > since
                        && (workout.metadata?[HKMetadataKeyIndoorWorkout] as? Bool) != true
                        && announced[workout.uuid.uuidString] == nil
                }
                self.withRoute(walks) { fresh in
                    self.announce(fresh) {
                        self.defaults.set(readAt.timeIntervalSince1970, forKey: WatchArrivals.lastReadKey)
                        done.signal()
                    }
                }
            }
            self.health.execute(query)
            _ = done.wait(timeout: .now() + 25)
            completion()
        }
    }

    private func announced() -> [String: String] {
        (defaults.dictionary(forKey: WatchArrivals.announcedKey) as? [String: String]) ?? [:]
    }

    /// Seulement les séances avec un tracé GPS (une marche en intérieur ou sans GPS n'est pas une balade à montrer).
    private func withRoute(_ walks: [HKWorkout], done: @escaping ([HKWorkout]) -> Void) {
        let lock = NSLock()
        var kept: [HKWorkout] = []
        let group = DispatchGroup()
        for workout in walks {
            group.enter()
            let query = HKSampleQuery(sampleType: HKSeriesType.workoutRoute(), predicate: HKQuery.predicateForObjects(from: workout), limit: 1, sortDescriptors: nil) { _, samples, _ in
                if !(samples ?? []).isEmpty {
                    lock.lock()
                    kept.append(workout)
                    lock.unlock()
                }
                group.leave()
            }
            health.execute(query)
        }
        group.notify(queue: .global()) { done(kept.sorted { $0.endDate < $1.endDate }) }
    }

    private func announce(_ walks: [HKWorkout], done: @escaping () -> Void) {
        guard !walks.isEmpty else {
            done()
            return
        }
        // Sur le fil principal (état de l'app) ; jamais sur `queue`, qui attend la fin de cette lecture.
        DispatchQueue.main.async {
            let active = UIApplication.shared.applicationState == .active
            do {
                var announced = self.announced()
                // Gardées 14 jours : assez pour ne jamais annoncer deux fois, sans grossir sans fin.
                let limit = Date().addingTimeInterval(-14 * 86400)
                announced = announced.filter { (WatchArrivals.parse($0.value) ?? Date()) > limit }
                let enabled = self.defaults.object(forKey: WatchArrivals.enabledKey) as? Bool ?? true
                for workout in walks {
                    let start = WatchArrivals.format(workout.startDate)
                    announced[workout.uuid.uuidString] = start
                    // App ouverte : le JS importe tout de suite (bandeau « Voir »), pas de notification en plus.
                    if enabled && !active { self.notify(workout, start: start) }
                }
                self.defaults.set(announced, forKey: WatchArrivals.announcedKey)
                if active { NotificationCenter.default.post(name: WatchArrivals.arrived, object: nil) }
                done()
            }
        }
    }

    private func notify(_ workout: HKWorkout, start: String) {
        let content = UNMutableNotificationContent()
        content.title = WatchArrivals.title(dogName: defaults.string(forKey: WatchArrivals.dogNameKey) ?? "")
        content.body = WatchArrivals.body(distance: WatchArrivals.distance(of: workout), seconds: workout.duration)
        content.sound = .default
        // `cap_extra` : lu par @capacitor/local-notifications comme `notification.extra` quand on la touche.
        content.userInfo = ["cap_extra": ["kind": "balade", "uuid": workout.uuid.uuidString, "start": start]]
        var trigger: UNNotificationTrigger?
        if let at = WatchArrivals.deliveryDate(Date()) {
            trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: at), repeats: false)
        }
        let request = UNNotificationRequest(identifier: "balade-\(workout.uuid.uuidString)", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    // MARK: - Miroir de src/lib/watchArrival.ts (mêmes règles, mêmes textes)

    /// Rien entre 22 h et 7 h : la date de 7 h suivante ; sinon nil (tout de suite).
    static func deliveryDate(_ now: Date) -> Date? {
        let calendar = Calendar.current
        let hour = calendar.component(.hour, from: now)
        if hour >= 7 && hour < 22 { return nil }
        var day = calendar.startOfDay(for: now)
        if hour >= 22 { day = calendar.date(byAdding: .day, value: 1, to: day) ?? day }
        return calendar.date(bySettingHour: 7, minute: 0, second: 0, of: day)
    }

    /// « Belle balade avec Billy ! »
    static func title(dogName: String) -> String {
        let name = dogName.trimmingCharacters(in: .whitespaces)
        return "Belle balade avec \(name.isEmpty ? "votre chien" : name)\u{00A0}!"
    }

    /// « 2,1 km · 32 min. Touchez pour voir ce qu’il a découvert. »
    static func body(distance: Double, seconds: Double) -> String {
        let nbsp = "\u{00A0}"
        let length: String
        if distance < 1000 {
            length = "\(max(10, Int((distance / 10).rounded()) * 10))\(nbsp)m"
        } else {
            length = String(format: "%.1f", distance / 1000).replacingOccurrences(of: ".", with: ",") + "\(nbsp)km"
        }
        let minutes = max(1, Int((seconds / 60).rounded()))
        let duration: String
        if minutes < 60 {
            duration = "\(minutes)\(nbsp)min"
        } else if minutes % 60 == 0 {
            duration = "\(minutes / 60) h"
        } else {
            duration = "\(minutes / 60) h \(String(format: "%02d", minutes % 60))"
        }
        return "\(length) · \(duration). Touchez pour voir ce qu’il a découvert."
    }

    private static func distance(of workout: HKWorkout) -> Double {
        if #available(iOS 16.0, *), let type = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning),
           let sum = workout.statistics(for: type)?.sumQuantity() {
            return sum.doubleValue(for: .meter())
        }
        return workout.totalDistance?.doubleValue(for: .meter()) ?? 0
    }

    private static func format(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }

    private static func parse(_ text: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return withFraction.date(from: text) ?? ISO8601DateFormatter().date(from: text)
    }
}
