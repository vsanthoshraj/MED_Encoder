# 🔐 Angerona v1.0.0

**Angerona** is a high-security, offline-first data protection application designed to keep your most sensitive images, files, and messages safe using enterprise-grade encryption. No cloud, no servers, no tracking—just total cryptographic privacy.

---

## 🌟 Key Features

- **🛡️ AES-256-GCM Encryption**: Powered by modern authenticated encryption that detects tampering and ensures data integrity.
- **📄 Universal File Support**: Securely vault any file type (PDF, Images, Docs, ZIP) with original filename preservation.
- **💬 Secure Chat Encoding**: Encrypt text messages into secret containers for private communication.
- **📴 100% Offline-First**: Zero internet permissions. Your data and passwords never leave your device.
- **🗝️ PBKDF2 Key Derivation**: High-iteration (100k+) password hashing to protect against brute-force attacks.
- **📂 Smart Library**: Manage your encrypted vaults and restored files directly from the intuitive dashboard.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/vsanthoshraj/Angerona.git
   cd Angerona/med-web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development mode:
   ```bash
   npm run dev
   ```

### Mobile Build (Capacitor)
To build the native Android application:
```bash
npm run build
npx cap sync android
npx cap open android
```

---

## 🏗️ Project Architecture

```
med-web/
├── src/
│   ├── lib/        # AES-256-GCM (angeronaEngine)
│   ├── theme/      # Material 3 Design
│   ├── assets/     # Static images and icons
│   └── App.tsx     # Main application UI
├── android/        # Native Android project
└── LICENSE         # CC BY-NC 4.0
```

---

## 🛡️ Security Disclaimer
**Your password is the only key.** Since Angerona is a true offline application, there are no "Forgot Password" or "Cloud Recovery" options. Losing your secret code means your data is lost forever.

---

## 📜 License
This project is licensed under the **CC BY-NC 4.0 (Creative Commons Attribution-NonCommercial)**. You are free to share and adapt the code for non-commercial purposes, but selling the source code is strictly prohibited. See the `LICENSE` file for details.

---

## 🤖 AI Disclosure
This project was developed with the assistance of advanced AI (Google DeepMind's Antigravity). The application architecture, cryptographic implementation, and UI/UX design were optimized through collaborative AI pair-programming to ensure industry-standard security and performance.

### ❤️ Built by [Santhosh Raj V](https://github.com/vsanthoshraj)
