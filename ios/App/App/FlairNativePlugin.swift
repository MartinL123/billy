import Foundation
import Capacitor
import CoreLocation
import HealthKit

/// Le pont entre l'app web et l'iPhone (phase 2, docs/ios.md) : les marches de l'Apple Watch (HealthKit).
/// Côté JS : `src/native/flair.ts`. Rien n'est écrit dans Santé : Flair ne fait que lire.
@objc(FlairNativePlugin)
public class FlairNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FlairNativePlugin"
    public let jsName = "FlairNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getWalks", returnType: CAPPluginReturnPromise)
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
}
