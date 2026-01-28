# MED Encoder - Technical Documentation

## 📑 Overview
**MED Encoder** is a high-security, offline-first application designed for secure image archiving. It allows users to convert sensitive images into branded PDF files that can only be viewed by authorized users who possess the correct "Secret Text".

The project consists of a modern **Web Interface** (React + Vite) and a **Native Android Application** (Capacitor).

---

## 🛠️ Technology Stack

### 💻 Frontend (Web & Mobile UI)
- **Framework:** React 18 with TypeScript.
- **Styling:** Material UI (MUI) for a premium, responsive design system.
- **Animations:** Framer Motion for smooth transitions and interactive feedback.
- **Icons:** Lucide React for consistent and intuitive iconography.

### 📱 Mobile Native Bridge
- **Capacitor 8.0:** Used to wrap the web application into a native Android project.
- **Capacitor Plugins:**
  - `@capacitor/camera`: For capturing high-quality images directly in-memory.
  - `@capacitor/filesystem`: For saving encoded PDFs to the device's "Documents" folder.
  - `@capacitor/share`: For instant sharing of secure files via native apps (WhatsApp, Email, etc.).
  - `@capacitor/device`: For device-specific optimizations.

### 📄 Document Engine
- **pdf-lib:** A powerful library used to generate and manipulate PDF documents entirely on the client side without any server interaction.

---

## 🔐 Security Features

1. **Zero Cloud Interaction:** All encoding and decoding happen locally on the device (Browser or App). No data is ever uploaded to a server.
2. **In-Memory Capture:** Images captured via the app camera are processed in RAM. They are **never** saved to the phone's gallery/DCIM folder, preventing leakage to cloud sync (Google Photos/iCloud).
3. **Ghost Metadata:** The actual secret data is hidden inside a legitimate, branded PDF. Regular PDF viewers will see the "Locked" notice, but the sensitive data remains invisible.
4. **Memory-Only Decoding:** Decoded images exist only as temporary Base64 strings in the application's state. Once the user clicks "Done", the image is purged from memory.
5. **Hardware Security (Android):** The app is configured with `FLAG_SECURE` capability (optional toggle) and `user-select: none` to prevent unintended data capture.

---

## ⚙️ How It Works (The Algorithm)

### 1. Encoding Process (Locking)
When a user encodes an image:
- **Phase A (Standardization):** The image is converted into a **Base64** string.
- **Phase B (PDF Generation):** A standard PDF is created with branding, status marks ("ENCODED & READ-ONLY"), and instructions for decoding.
- **Phase C (Payload Injection):** The system generates a metadata payload:
  ```text
  [[MED_DATA_START]]<Base64_Image_Data>[[MED_SECRET_HASH]]<User_Secret_Text>[[MED_DATA_END]]
  ```
- **Phase D (Buffer Merging):** This text payload is converted to bytes and appended directly to the end of the PDF's binary buffer. The file is finalized with a `%%EOF` marker.

### 2. Decoding Process (Unlocking)
When a user uploads a PDF for decoding:
- **Phase A (Buffer Analysis):** The system reads the PDF as a raw string.
- **Phase B (Marker Detection):** It scans for the unique `[[MED_DATA_START]]` and `[[MED_DATA_END]]` signatures.
- **Phase C (Validation):** It extracts the stored secret and compares it bit-by-bit with the secret provided by the user.
- **Phase D (Extraction):** If matched, the original Base64 image is extracted and rendered in a "Full View" modal.

---

## 📂 File Structure

- `/src/lib/medEngine.ts`: The core logic for PDF creation, payload injection, and signature verification.
- `/src/App.tsx`: Main application controller, handles state management, camera, and sharing.
- `/android`: Native Android project files, including Gradle configurations for mobile builds.
- `/dist`: Optimized production build for deployment.

---

## 🚀 Future Roadmap
- **AES-256 Encryption:** Adding a true encryption layer to the appended payload for military-grade security.
- **Multi-Image Support:** Capability to archive multiple images into a single secure PDF "container".
- **Biometric Unlock:** Fingerprint/FaceID integration for mobile users.

---
**Developed with focus on Privacy & Security.**
