import Foundation

struct APIClient {
    var apiBase: String
    var apiKey: String

    func overview() async throws -> SmartOverview {
        let response: APIResponse<SmartOverview> = try await request(path: "/smart-home/overview", method: "GET")
        return response.data ?? .empty
    }

    func faceStatus() async throws -> FaceStatus {
        let response: APIResponse<FaceStatus> = try await request(path: "/smart-home/face-status", method: "GET")
        return response.data ?? FaceStatus(
            detected: false,
            eventId: nil,
            userId: nil,
            userName: nil,
            role: nil,
            deviceId: nil,
            deviceName: nil,
            recognized: nil,
            confidence: nil,
            decision: nil,
            access: nil,
            personType: "none",
            personLabel: "Chưa có khuôn mặt",
            isFamily: false,
            capturedAt: nil,
            message: "Chưa có lần quét mặt nào."
        )
    }

    func sendTemperatures(indoor: Double, outdoor: Double) async throws {
        let _: APIResponse<EmptyPayload> = try await request(
            path: "/smart-home/temperatures",
            method: "POST",
            body: [
                "indoor": indoor,
                "outdoor": outdoor,
                "unit": "C"
            ]
        )
    }

    func simulate(_ scenario: String) async throws {
        let _: APIResponse<EmptyPayload> = try await request(
            path: "/smart-home/simulate",
            method: "POST",
            body: ["scenario": scenario]
        )
    }

    func sendVoice(_ phrase: String) async throws {
        let _: APIResponse<EmptyPayload> = try await request(
            path: "/smart-home/voice-command",
            method: "POST",
            body: ["phrase": phrase]
        )
    }

    func sendRecognition(deviceId: String, userId: String?, confidence: Double, recognized: Bool) async throws {
        var body: [String: Any] = [
            "deviceId": deviceId,
            "confidence": confidence,
            "recognized": recognized
        ]
        if let userId, !userId.isEmpty {
            body["userId"] = userId
        }

        let _: APIResponse<EmptyPayload> = try await request(
            path: "/recognition-events",
            method: "POST",
            body: body
        )
    }

    func sendDeviceCommand(deviceId: String, action: String, channel: String? = nil, value: String? = nil) async throws {
        var body: [String: Any] = [
            "action": action,
            "source": "ios-demo",
            "reason": "Điều khiển từ app iOS"
        ]
        if let channel { body["channel"] = channel }
        if let value { body["value"] = value }

        let _: APIResponse<EmptyPayload> = try await request(
            path: "/smart-home/devices/\(deviceId)/command",
            method: "POST",
            body: body
        )
    }

    private func request<T: Decodable>(path: String, method: String, body: [String: Any]? = nil) async throws -> APIResponse<T> {
        let trimmedBase = apiBase.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: "\(trimmedBase)\(path)") else {
            throw DemoError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !apiKey.isEmpty {
            request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        }

        if let body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            throw DemoError.http(http.statusCode)
        }

        return try JSONDecoder().decode(APIResponse<T>.self, from: data)
    }
}

enum DemoError: LocalizedError {
    case badURL
    case http(Int)

    var errorDescription: String? {
        switch self {
        case .badURL:
            return "Địa chỉ máy chủ không hợp lệ."
        case .http(let code):
            return "Máy chủ trả lỗi \(code)."
        }
    }
}
