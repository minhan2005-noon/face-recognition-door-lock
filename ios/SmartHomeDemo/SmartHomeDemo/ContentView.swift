import SwiftUI

struct ContentView: View {
    @AppStorage("apiBase") private var apiBase = DemoDefaults.apiBase
    @AppStorage("apiKey") private var apiKey = DemoDefaults.apiKey

    @StateObject private var camera = CameraManager()
    @State private var overview = SmartOverview.empty
    @State private var selectedDeviceId = "door_lock_001"
    @State private var selectedUserId = ""
    @State private var confidence = 0.92
    @State private var recognized = true
    @State private var voicePhrase = "bật đèn"
    @State private var statusMessage = "Sẵn sàng demo"
    @State private var isLoading = false

    private var client: APIClient {
        APIClient(apiBase: apiBase, apiKey: apiKey)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                CyberBackground()
                ScrollView {
                    VStack(spacing: 16) {
                        hero
                        homeStatusCard
                        faceStatusCard
                        cameraCard
                        quickControlCard
                        scenarioCard
                        voiceCard
                        connectionCard
                        historyCard
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Smart Home AI")
            .toolbarTitleDisplayMode(.inline)
            .task { await refresh() }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Trung tâm điều khiển an ninh")
                .font(.system(size: 34, weight: .heavy))
                .foregroundStyle(.white)
            Text("Theo dõi nhiệt độ trong phòng, ngoài phòng, đèn, TV, thang máy và cảnh báo người lạ.")
                .foregroundStyle(.white.opacity(0.72))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 16))
        .overlay(alignment: .trailing) {
            Image(systemName: "house.and.flag.circle.fill")
                .font(.system(size: 82))
                .foregroundStyle(.cyan.opacity(0.34))
                .padding(.trailing, 18)
        }
    }

    private var connectionCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Kết nối máy chủ")
                .font(.headline)
            TextField("Địa chỉ máy chủ", text: $apiBase)
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)
                .inputStyle()
            SecureField("Mã truy cập", text: $apiKey)
                .inputStyle()
            HStack {
                BubbleButton("Tải lại", systemImage: "arrow.clockwise") {
                    Task { await refresh() }
                }
                Spacer()
                Text(statusMessage)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
        .cardStyle()
    }

    private var homeStatusCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("Trạng thái trong nhà", systemImage: "house.fill")
                    .font(.headline)
                Spacer()
                Button {
                    Task { await refresh() }
                } label: {
                    Image(systemName: isLoading ? "arrow.triangle.2.circlepath" : "arrow.clockwise")
                        .font(.headline)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.cyan)
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                HomeStatusTile(
                    title: "Trong phòng",
                    value: indoorTemperatureText,
                    note: indoorTemperatureNote,
                    systemImage: "thermometer.medium",
                    tint: .orange,
                    isWarning: latestIndoorTemperatureValue >= 32
                )
                HomeStatusTile(
                    title: "Ngoài phòng",
                    value: outdoorTemperatureText,
                    note: outdoorTemperatureNote,
                    systemImage: "sun.max.fill",
                    tint: .yellow,
                    isWarning: latestOutdoorTemperatureValue >= 35
                )
                HomeStatusTile(
                    title: "Đèn",
                    value: isDeviceOn("socket_light_001") ? "Đang bật" : "Đang tắt",
                    note: "Phòng khách",
                    systemImage: isDeviceOn("socket_light_001") ? "lightbulb.fill" : "lightbulb",
                    tint: .yellow
                )
                HomeStatusTile(
                    title: "TV",
                    value: isDeviceOn("socket_tv_001") ? "Đang bật" : "Đang tắt",
                    note: "TV mô hình",
                    systemImage: "tv.fill",
                    tint: .cyan
                )
                HomeStatusTile(
                    title: "Thang máy",
                    value: elevatorRunning ? "Đang chạy" : "Đang đứng",
                    note: elevatorModeText,
                    systemImage: "arrow.up.arrow.down.square.fill",
                    tint: .mint,
                    isWarning: elevatorRunning
                )
            }
        }
        .cardStyle()
    }

    private var faceStatusCard: some View {
        let face = overview.faceStatus
        let isDanger = face?.detected == true && face?.isAllowed == false

        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: faceIconName)
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(isDanger ? .red : .mint)
                VStack(alignment: .leading, spacing: 4) {
                    Text(face?.title ?? "Chưa có lần quét mặt")
                        .font(.headline)
                    Text(face?.capturedAt ?? "Dashboard chưa gửi khuôn mặt nào")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.64))
                }
                Spacer()
            }

            Text(face?.detail ?? "Khi dashboard quét mặt ở cửa, kết quả sẽ hiện ở đây để biết đó là người thân, khách hay người lạ.")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background((isDanger ? Color.red : Color.mint).opacity(0.14), in: RoundedRectangle(cornerRadius: 12))

            if let confidence = face?.confidence {
                Text("Độ tin cậy: \(Int((confidence * 100).rounded()))%")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.72))
            }
        }
        .cardStyle()
    }

    private var cameraCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Camera nhận diện mặt", systemImage: "camera.viewfinder")
                .font(.headline)

            ZStack {
                CameraPreview(session: camera.session)
                    .opacity(camera.isRunning ? 1 : 0)
                if !camera.isRunning {
                    VStack(spacing: 8) {
                        Image(systemName: camera.snapshot == nil ? "faceid" : "checkmark.seal.fill")
                            .font(.system(size: 58))
                            .foregroundStyle(.cyan)
                        Text(camera.statusText)
                            .foregroundStyle(.white.opacity(0.82))
                    }
                }
                ScanLine()
            }
            .frame(height: 250)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(.cyan.opacity(0.25)))

            HStack {
                BubbleButton("Bật camera", systemImage: "video.fill") {
                    Task { await camera.start() }
                }
                BubbleButton("Chụp mô phỏng", systemImage: "faceid", secondary: true) {
                    camera.captureMockFace()
                    recognized = true
                    confidence = camera.isRunning ? 0.94 : 0.88
                }
            }

            Picker("Thiết bị", selection: $selectedDeviceId) {
                ForEach(overview.devices) { device in
                    Text(device.displayName).tag(device.id)
                }
            }
            .pickerStyle(.menu)

            Picker("Người dùng", selection: $selectedUserId) {
                Text("Người lạ").tag("")
                ForEach(overview.users.filter { $0.status == "active" }) { user in
                    Text(user.displayName).tag(user.id)
                }
            }
            .pickerStyle(.menu)

            Toggle("Nhận diện đúng người", isOn: $recognized)
            Slider(value: $confidence, in: 0...1)

            BubbleButton("Gửi kết quả nhận diện", systemImage: "lock.open.fill") {
                Task { await sendRecognition() }
            }
        }
        .cardStyle()
    }

    private var quickControlCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Điều khiển nhanh")
                .font(.headline)
            ForEach(overview.devices.filter { ["socket_light_001", "socket_tv_001", "socket_fan_001", "elevator_001"].contains($0.id) }) { device in
                DeviceRow(
                    device: device,
                    state: overview.states.first(where: { $0.deviceId == device.id }),
                    onTapOn: { Task { await command(device, action: device.type == "elevator" ? "goto_floor" : "on", value: device.type == "elevator" ? "2" : nil) } },
                    onTapOff: { Task { await command(device, action: "off") } }
                )
            }
        }
        .cardStyle()
    }

    private var scenarioCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Mô phỏng demo")
                .font(.headline)
            HStack {
                BubbleButton("Admin về nhà", systemImage: "person.badge.key.fill") {
                    Task { await simulate("admin_home") }
                }
                BubbleButton("Khách", systemImage: "person.fill.checkmark", secondary: true) {
                    Task { await simulate("guest_visit") }
                }
                BubbleButton("Người lạ", systemImage: "exclamationmark.triangle.fill", danger: true) {
                    Task { await simulate("unknown_alert") }
                }
            }
        }
        .cardStyle()
    }

    private var latestIndoorTemperatureValue: Double {
        overview.temperatures?.indoor?.value ??
        overview.sensors.first(where: { ["temperature_indoor", "temperature"].contains($0.sensorType) })?.value ??
        0
    }

    private var latestOutdoorTemperatureValue: Double {
        overview.temperatures?.outdoor?.value ??
        overview.sensors.first(where: { $0.sensorType == "temperature_outdoor" })?.value ??
        0
    }

    private var indoorTemperatureText: String {
        guard latestIndoorTemperatureValue > 0 else {
            return "Chưa có"
        }
        return "\(Int(latestIndoorTemperatureValue.rounded()))°C"
    }

    private var outdoorTemperatureText: String {
        guard latestOutdoorTemperatureValue > 0 else {
            return "Chưa có"
        }
        return "\(Int(latestOutdoorTemperatureValue.rounded()))°C"
    }

    private var indoorTemperatureNote: String {
        guard latestIndoorTemperatureValue > 0 else {
            return "Đợi node môi trường"
        }
        if latestIndoorTemperatureValue >= 32 {
            return "Phòng đang nóng"
        }
        if latestIndoorTemperatureValue <= 20 {
            return "Phòng hơi lạnh"
        }
        if let difference = overview.temperatures?.difference {
            return difference >= 0 ? "Cao hơn ngoài \(Int(difference.rounded()))°C" : "Mát hơn ngoài \(abs(Int(difference.rounded())))°C"
        }
        return "Trong mức dễ chịu"
    }

    private var outdoorTemperatureNote: String {
        guard latestOutdoorTemperatureValue > 0 else {
            return "Đợi cảm biến ngoài"
        }
        if latestOutdoorTemperatureValue >= 35 {
            return "Ngoài trời nóng"
        }
        if latestOutdoorTemperatureValue <= 18 {
            return "Ngoài trời lạnh"
        }
        return "Môi trường ổn"
    }

    private var elevatorRunning: Bool {
        let state = stateForDevice("elevator_001")
        return state?.powerState == "on" || state?.mode == "floor_2"
    }

    private var elevatorModeText: String {
        switch stateForDevice("elevator_001")?.mode {
        case "floor_1": return "Đang ở tầng 1"
        case "floor_2": return "Đang lên tầng 2"
        case "emergency": return "Mở khẩn cấp"
        default: return "Sẵn sàng"
        }
    }

    private var latestStrangerAttempt: AccessLog? {
        overview.logs.first { log in
            log.result == "denied" && ["unknown_user", "unknown_user_demo"].contains(log.reason ?? "")
        }
    }

    private var faceIconName: String {
        switch overview.faceStatus?.personType {
        case "owner", "admin", "family", "resident":
            return "person.crop.circle.badge.checkmark"
        case "guest":
            return "person.fill.checkmark"
        case "stranger":
            return "exclamationmark.shield.fill"
        default:
            return latestStrangerAttempt == nil ? "camera.viewfinder" : "exclamationmark.shield.fill"
        }
    }

    private func stateForDevice(_ id: String) -> DeviceState? {
        overview.states.first { $0.deviceId == id }
    }

    private func isDeviceOn(_ id: String) -> Bool {
        ["on", "unlock"].contains(stateForDevice(id)?.powerState ?? "")
    }

    private var voiceCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Điều khiển giọng nói")
                .font(.headline)
            TextField("Ví dụ: bật đèn, bật quạt, gọi thang máy tầng 2", text: $voicePhrase)
                .inputStyle()
            BubbleButton("Gửi lệnh", systemImage: "mic.fill") {
                Task { await sendVoice() }
            }
        }
        .cardStyle()
    }

    private var historyCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Lịch sử ra vào")
                .font(.headline)
            ForEach(overview.logs.prefix(6)) { log in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(log.resultText)
                            .font(.subheadline.weight(.bold))
                        Text(log.reason?.replacingOccurrences(of: "_", with: " ") ?? "Không có lý do")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.62))
                    }
                    Spacer()
                    Text(log.createdAt ?? "")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.45))
                }
                .padding(10)
                .background(.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 10))
            }
        }
        .cardStyle()
    }

    private func refresh() async {
        isLoading = true
        defer { isLoading = false }
        do {
            overview = try await client.overview()
            if !overview.devices.contains(where: { $0.id == selectedDeviceId }) {
                selectedDeviceId = overview.devices.first?.id ?? "door_lock_001"
            }
            if selectedUserId.isEmpty {
                selectedUserId = overview.users.first(where: { $0.status == "active" })?.id ?? ""
            }
            statusMessage = "Đã tải dữ liệu"
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func simulate(_ scenario: String) async {
        do {
            try await client.simulate(scenario)
            statusMessage = "Đã chạy mô phỏng"
            await refresh()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func sendVoice() async {
        do {
            try await client.sendVoice(voicePhrase)
            statusMessage = "Đã gửi lệnh giọng nói"
            await refresh()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func sendRecognition() async {
        do {
            try await client.sendRecognition(
                deviceId: selectedDeviceId,
                userId: selectedUserId.isEmpty ? nil : selectedUserId,
                confidence: confidence,
                recognized: recognized
            )
            statusMessage = "Đã gửi kết quả nhận diện"
            await refresh()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func command(_ device: Device, action: String, value: String? = nil) async {
        do {
            let channel = device.type == "elevator" ? "elevator" : nil
            try await client.sendDeviceCommand(deviceId: device.id, action: action, channel: channel, value: value)
            statusMessage = "Đã gửi lệnh thiết bị"
            await refresh()
        } catch {
            statusMessage = error.localizedDescription
        }
    }
}

struct MetricTile: View {
    let title: String
    let value: String
    let note: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.caption2.weight(.heavy))
                .foregroundStyle(.cyan)
            Text(value)
                .font(.title2.weight(.heavy))
            Text(note)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
    }
}

struct HomeStatusTile: View {
    let title: String
    let value: String
    let note: String
    let systemImage: String
    let tint: Color
    var isWarning = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: systemImage)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(tint)
                Spacer()
                Circle()
                    .fill(isWarning ? Color.red : tint)
                    .frame(width: 9, height: 9)
                    .shadow(color: (isWarning ? Color.red : tint).opacity(0.7), radius: 8)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title.uppercased())
                    .font(.caption2.weight(.heavy))
                    .foregroundStyle(.white.opacity(0.56))
                Text(value)
                    .font(.title3.weight(.heavy))
                    .foregroundStyle(.white)
                Text(note)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.62))
                    .lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 132, alignment: .leading)
        .padding(14)
        .background(
            LinearGradient(
                colors: [tint.opacity(isWarning ? 0.22 : 0.13), .white.opacity(0.055)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 16)
        )
        .overlay(RoundedRectangle(cornerRadius: 16).stroke((isWarning ? Color.red : tint).opacity(0.22)))
    }
}

struct DeviceRow: View {
    let device: Device
    let state: DeviceState?
    let onTapOn: () -> Void
    let onTapOff: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(device.displayName)
                        .font(.subheadline.weight(.bold))
                    Text(device.groupName)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.62))
                }
                Spacer()
                Text(state?.stateText ?? "Chưa rõ")
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(.cyan.opacity(0.16), in: Capsule())
            }
            HStack {
                BubbleButton(device.type == "elevator" ? "Tầng 2" : "Bật", systemImage: "bolt.fill", action: onTapOn)
                BubbleButton("Tắt", systemImage: "power", secondary: true, action: onTapOff)
            }
        }
        .padding(12)
        .background(.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 12))
    }
}

struct BubbleButton: View {
    let title: String
    let systemImage: String
    var secondary = false
    var danger = false
    let action: () -> Void

    init(_ title: String, systemImage: String, secondary: Bool = false, danger: Bool = false, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.secondary = secondary
        self.danger = danger
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(.caption.weight(.heavy))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
        }
        .buttonStyle(.plain)
        .foregroundStyle(danger ? .black : (secondary ? .white : .black))
        .background(background, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.white.opacity(0.12)))
    }

    private var background: some ShapeStyle {
        if danger {
            return AnyShapeStyle(LinearGradient(colors: [.red.opacity(0.9), .orange.opacity(0.86)], startPoint: .topLeading, endPoint: .bottomTrailing))
        }
        if secondary {
            return AnyShapeStyle(Color.white.opacity(0.08))
        }
        return AnyShapeStyle(LinearGradient(colors: [.cyan, .mint], startPoint: .topLeading, endPoint: .bottomTrailing))
    }
}

struct CyberBackground: View {
    var body: some View {
        LinearGradient(colors: [Color.black, Color(red: 0.02, green: 0.08, blue: 0.09), Color.black], startPoint: .topLeading, endPoint: .bottomTrailing)
            .ignoresSafeArea()
            .overlay {
                TimelineView(.animation) { timeline in
                    let time = timeline.date.timeIntervalSinceReferenceDate
                    Canvas { context, size in
                        for index in 0..<28 {
                            let x = (Double(index) * 51 + time * 18).truncatingRemainder(dividingBy: max(size.width, 1))
                            let y = (Double(index * 37) + sin(time + Double(index)) * 22).truncatingRemainder(dividingBy: max(size.height, 1))
                            let rect = CGRect(x: x, y: y, width: 2, height: 2)
                            context.fill(Path(ellipseIn: rect), with: .color(.cyan.opacity(0.42)))
                        }
                    }
                }
            }
    }
}

struct ScanLine: View {
    var body: some View {
        TimelineView(.animation) { timeline in
            let phase = timeline.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 2.0) / 2.0
            Rectangle()
                .fill(.cyan.opacity(0.22))
                .frame(height: 56)
                .blur(radius: 18)
                .offset(y: CGFloat(phase) * 250 - 125)
        }
        .allowsHitTesting(false)
    }
}

extension View {
    func cardStyle() -> some View {
        padding(14)
            .background(.white.opacity(0.075), in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(.cyan.opacity(0.14)))
    }

    func inputStyle() -> some View {
        padding(11)
            .background(.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(.cyan.opacity(0.16)))
            .foregroundStyle(.white)
    }
}
