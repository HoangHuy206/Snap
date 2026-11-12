# VidQR Studio Mobile (Android APK & iOS IPA)

Thư mục này đóng gói web **https://vidqr-studio.vercel.app** thành ứng dụng Android (`.apk`) và iOS (`.ipa`) bằng **Capacitor 8** và build tự động trên **GitHub Actions** (không cần cài Xcode hay Android Studio trên máy Windows).

- **Intro animation riêng cho App:** Cả bản Android ([MainActivity.java](native/android/MainActivity.java)) và iOS ([SceneDelegate.swift](native/ios/SceneDelegate.swift)) đều chạy hiệu ứng Intro quét tia QR + logo **VidQR Studio** (~2 giây) khi mới mở app trong lúc nền web đang tải sẵn phía sau — hoàn toàn **không hiển thị trên trình duyệt web thường**.

## Cách build file `.ipa` và `.apk` trên GitHub

1. Push code lên GitHub (`Sync Changes / Push` trong VS Code).
2. Mở repo trên GitHub → chọn tab **Actions** → chọn workflow **Build Mobile Apps (APK & IPA)**.
3. Bấm **Run workflow** → chọn `both` (hoặc `ios` / `android`) → bấm **Run workflow**.
4. Chờ vài phút chạy xong, cuộn xuống mục **Artifacts** để tải về:
   - **`VidQR-Studio-iOS-IPA`** → giải nén được `VidQR-Studio-unsigned.ipa`
   - **`VidQR-Studio-Android-APK`** → giải nén được `VidQR-Studio.apk`

> *(Tùy chọn)* Khi bạn tạo & push git tag dạng `v1.0.0`, workflow cũng tự động chạy build cả 2 nền tảng.

## Cách cài lên điện thoại

- **Android (`.apk`):** Gửi file `VidQR-Studio.apk` vào máy Android và mở lên cài đặt bình thường (cho phép cài ứng dụng từ nguồn không xác định nếu Android hỏi).
- **iPhone / iPad (`.ipa` chưa ký):**
  - Cài bằng **Sideloadly**, **AltStore**, **SideStore** (dùng Apple ID miễn phí, cần làm mới mỗi 7 ngày) hoặc **TrollStore** (nếu máy có hỗ trợ).
  - Nếu sau này có tài khoản **Apple Developer (\$99/năm)**, có thể ký lại file `.ipa` này bằng chứng chỉ Distribution để đưa lên TestFlight hoặc App Store.
