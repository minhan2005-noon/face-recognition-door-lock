import Foundation

struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let message: String?
    let data: T?
}

struct SmartOverview: Decodable {
    let devices: [Device]
    let states: [DeviceState]
    let sensors: [SensorReading]
    let logs: [AccessLog]
    let users: [DemoUser]
    let temperatures: TemperatureStatus?
    let faceStatus: FaceStatus?

    static let empty = SmartOverview(devices: [], states: [], sensors: [], logs: [], users: [], temperatures: nil, faceStatus: nil)
}

struct TemperatureStatus: Decodable, Hashable {
    let indoor: SensorReading?
    let outdoor: SensorReading?
    let difference: Double?
    let unit: String?
    let updatedAt: String?
}

struct FaceStatus: Decodable, Hashable {
    let detected: Bool
    let eventId: String?
    let userId: String?
    let userName: String?
    let role: String?
    let deviceId: String?
    let deviceName: String?
    let recognized: Bool?
    let confidence: Double?
    let decision: String?
    let access: String?
    let personType: String?
    let personLabel: String?
    let isFamily: Bool?
    let capturedAt: String?
    let message: String?

    var title: String {
        guard detected else { return "Chưa có lần quét mặt" }
        switch personType {
        case "owner": return "Đã nhận diện chủ nhà"
        case "admin": return "Đã nhận diện quản trị viên"
        case "family", "resident": return "Đã nhận diện người thân"
        case "guest": return "Đã nhận diện khách"
        default: return "Có người lạ cố mở cửa"
        }
    }

    var detail: String {
        if let message { return message }
        return detected ? "Đã nhận dữ liệu từ camera cửa." : "Dashboard chưa gửi khuôn mặt nào."
    }

    var isAllowed: Bool {
        access == "allowed"
    }
}

struct Device: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let type: String
    let status: String
    let batteryLevel: Int?
    let lastSeenAt: String?

    var displayName: String {
        switch id {
        case "door_lock_001": return "Khóa cửa chính"
        case "socket_light_001": return "Đèn phòng khách"
        case "socket_fan_001": return "Quạt phòng khách"
        case "socket_tv_001": return "TV mô hình"
        case "elevator_001": return "Thang máy 2 tầng"
        case "env_node_001": return "Node môi trường"
        default: return name.replacingOccurrences(of: "_", with: " ")
        }
    }

    var groupName: String {
        switch type {
        case "door_lock": return "Khóa cửa"
        case "smart_socket": return "Ổ cắm thông minh"
        case "elevator": return "Thang máy"
        case "environment": return "Môi trường"
        default: return type.replacingOccurrences(of: "_", with: " ")
        }
    }
}

struct DeviceState: Decodable, Identifiable, Hashable {
    var id: String { deviceId }
    let deviceId: String
    let powerState: String?
    let mode: String?
    let updatedAt: String?

    var stateText: String {
        switch powerState {
        case "on": return "Đang bật"
        case "off": return "Đang tắt"
        case "unlock": return "Đang mở"
        case "locked", "lock": return "Đang khóa"
        case "emergency_open": return "Mở khẩn cấp"
        default: return "Chưa rõ"
        }
    }
}

struct SensorReading: Decodable, Identifiable, Hashable {
    let id: String
    let deviceId: String
    let sensorType: String
    let value: Double
    let unit: String?
    let capturedAt: String?

    var displayType: String {
        switch sensorType {
        case "light": return "Ánh sáng"
        case "temperature", "temperature_indoor": return "Nhiệt độ trong phòng"
        case "temperature_outdoor": return "Nhiệt độ ngoài phòng"
        case "gas": return "Gas/khói"
        case "flame": return "Lửa"
        default: return sensorType.replacingOccurrences(of: "_", with: " ")
        }
    }
}

struct AccessLog: Decodable, Identifiable, Hashable {
    let id: String
    let deviceId: String?
    let userId: String?
    let action: String
    let result: String
    let reason: String?
    let createdAt: String?

    var resultText: String {
        switch result {
        case "allowed": return "Cho phép"
        case "denied": return "Từ chối"
        case "queued": return "Đang chờ"
        default: return result.replacingOccurrences(of: "_", with: " ")
        }
    }

    var reasonText: String {
        switch reason {
        case "unknown_user", "unknown_user_demo":
            return "Người lạ bị từ chối mở cửa"
        case "guest_missing_schedule":
            return "Khách chưa được cấp lịch vào nhà"
        case "guest_expired":
            return "Khách đã hết thời hạn"
        case "guest_within_schedule":
            return "Khách hợp lệ trong khung giờ"
        case "recognized_owner":
            return "Đã nhận diện chủ nhà"
        case "recognized_admin":
            return "Đã nhận diện quản trị viên"
        default:
            return reason?.replacingOccurrences(of: "_", with: " ") ?? "Không có lý do"
        }
    }
}

struct DemoUser: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let role: String
    let status: String

    var displayName: String {
        let lower = name.lowercased()
        if lower.contains("admin") { return "Quản trị viên Demo" }
        if lower.contains("owner") { return "Chủ nhà Demo" }
        if lower.contains("guest") && lower.contains("schedule") { return "Khách chưa cấp lịch" }
        if lower.contains("guest") { return "Khách Demo" }
        return name.replacingOccurrences(of: "_", with: " ")
    }
}

struct CommandResult: Decodable {
    let command: DeviceCommand?
}

struct DeviceCommand: Decodable, Identifiable {
    let id: String
    let deviceId: String?
    let action: String?
    let status: String?
}

struct EmptyPayload: Decodable {}
