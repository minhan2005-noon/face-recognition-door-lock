# face-recognition-door-lock
An AI-powered smart door lock system that uses facial recognition to identify authorized users and automatically unlock the door.
# Face Recognition Door Lock

An AI-powered smart door lock system that uses facial recognition technology to authenticate authorized users and automatically unlock a door. The system combines computer vision, embedded hardware, and IoT communication to provide a secure and convenient access control solution.

## Features

* Real-time face detection and recognition
* Automatic door unlocking for authorized users
* User enrollment and face database management
* Access logging and monitoring
* Embedded hardware integration
* Optional remote monitoring through a web dashboard
* Support for camera modules such as ESP32-CAM or USB cameras
* Secure authentication and access control

## System Architecture

```text
Camera
   │
   ▼
Face Detection
   │
   ▼
Face Recognition
   │
   ├── Authorized User ──► Unlock Door
   │
   └── Unknown User ─────► Access Denied
```

## Project Structure

```text
face-recognition-door-lock/
│
├── firmware/
│   ├── esp32/
│   │   ├── main/
│   │   ├── include/
│   │   ├── lib/
│   │   └── platformio.ini
│   │
│   └── arduino/
│       ├── src/
│       └── include/
│
├── ai-model/
│   ├── dataset/
│   │   ├── authorized_users/
│   │   └── test_images/
│   │
│   ├── training/
│   │   ├── train.py
│   │   └── preprocess.py
│   │
│   ├── inference/
│   │   ├── face_detector.py
│   │   ├── recognizer.py
│   │   └── embeddings.py
│   │
│   └── models/
│       ├── face_recognition_model.onnx
│       └── labels.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── app.js
│   │
│   ├── database/
│   │   ├── migrations/
│   │   └── schema.sql
│   │
│   └── package.json
│
├── dashboard/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── hardware/
│   ├── schematic/
│   ├── pcb/
│   ├── wiring/
│   └── components/
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── setup.md
│   └── troubleshooting.md
│
├── logs/
│   ├── access_logs/
│   └── system_logs/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── hardware/
│
├── scripts/
│   ├── setup.sh
│   ├── deploy.sh
│   └── backup.sh
│
├── .gitignore
├── LICENSE
└── README.md
```

## Technologies

### Artificial Intelligence

* OpenCV
* Face Recognition
* Deep Learning Models
* ONNX Runtime

### Backend

* Node.js
* Express.js
* REST API

### Database

* MySQL / PostgreSQL
* SQLite (for development)

### Embedded Systems

* ESP32-CAM
* ESP32
* Servo Motor / Electronic Door Lock
* Relay Module

### Frontend

* React
* Vite

## Workflow

1. Capture image from camera.
2. Detect human face.
3. Extract facial features.
4. Compare with registered user database.
5. Verify identity.
6. Send unlock command to door controller.
7. Record access event.
8. Notify administrator if needed.

## Future Improvements

* Mobile application support
* Multi-factor authentication
* Cloud synchronization
* Visitor management
* Liveness detection against photo spoofing
* Real-time notifications
* Voice assistant integration

## License

This project is licensed under the MIT License.
