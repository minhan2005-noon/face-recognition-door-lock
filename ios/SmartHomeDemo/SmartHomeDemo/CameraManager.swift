import AVFoundation
import SwiftUI
import UIKit

@MainActor
final class CameraManager: NSObject, ObservableObject {
    @Published var statusText = "Chưa bật camera"
    @Published var isRunning = false
    @Published var snapshot: UIImage?

    let session = AVCaptureSession()
    private let output = AVCapturePhotoOutput()
    private var isConfigured = false

    func start() async {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            configureAndRun()
        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            granted ? configureAndRun() : markBlocked()
        default:
            markBlocked()
        }
    }

    func captureMockFace() {
        snapshot = UIImage(systemName: "faceid")
        statusText = "Đã chụp khuôn mặt"
    }

    private func markBlocked() {
        statusText = "Chưa được cấp quyền camera"
        isRunning = false
    }

    private func configureAndRun() {
        if !isConfigured {
            session.beginConfiguration()
            session.sessionPreset = .medium

            if let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
               let input = try? AVCaptureDeviceInput(device: camera),
               session.canAddInput(input) {
                session.addInput(input)
            }

            if session.canAddOutput(output) {
                session.addOutput(output)
            }

            session.commitConfiguration()
            isConfigured = true
        }

        Task.detached { [session] in
            if !session.isRunning {
                session.startRunning()
            }
        }

        statusText = "Camera đang chạy"
        isRunning = true
    }
}

struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.videoPreviewLayer.session = session
        view.videoPreviewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {
        uiView.videoPreviewLayer.session = session
    }
}

final class PreviewView: UIView {
    override class var layerClass: AnyClass {
        AVCaptureVideoPreviewLayer.self
    }

    var videoPreviewLayer: AVCaptureVideoPreviewLayer {
        layer as! AVCaptureVideoPreviewLayer
    }
}
