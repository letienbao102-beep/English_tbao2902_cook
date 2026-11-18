# Quy Tắc Dự Án (AGENTS.md) — Learning English by tbao2902
## 1. Tech Stack Cố Định
- **Core**: HTML5, CSS3 thuần (Custom Properties, Flexbox/Grid), Vanilla JavaScript (ES6+).
- **Giao diện**: Phong cách **Liquid Glass** hiện đại:
  - Phối màu chủ đạo: **Xanh lá cây (Emerald / Forest Sage)** kết hợp **Nâu trầm ấm (Espresso / Warm Walnut / Bronze)**.
  - Nền Mesh Gradient đa lớp, hiệu ứng kính mờ `backdrop-filter: blur()`, viền phản quang mảnh (`specular border`), chuyển động đàn hồi mềm mại (`cubic-bezier(0.22, 1, 0.36, 1)`).
  - Tối ưu hóa đa thiết bị: Tương thích hoàn hảo trên cả **Điện thoại (Mobile)** và **Laptop/PC (Desktop)**.
  - Hỗ trợ chuyển đổi **Nền Tối (Dark Mode) / Nền Sáng (Light Mode)** và **Chế độ Máy Yếu (Eco Mode) / Máy Mạnh (Ultra Liquid Glass)**.
- **Lưu trữ & Dịch vụ Đám mây**:
  - `LocalStorage` (hoạt động tức thì, bọc trong lớp dịch vụ `StorageService` độc lập).
  - Tích hợp sẵn adapter kết nối **Supabase** (lưu trữ dữ liệu học tập, từ vựng, lịch sử đề thi) và **Firebase** (quản lý tài khoản, xác thực người dùng).
  - Tích hợp **Gemini AI Agent** (qua Gemini API Key kết hợp Local IELTS AI Engine dự phòng) để tạo đề thi, tạo bài nghe, tạo từ vựng ngẫu nhiên, hội thoại luyện nói và chấm điểm 4 kỹ năng chuẩn quốc tế.
## 2. Quy Chuẩn Kiến Trúc & Mã Nguồn
- **Giới hạn dung lượng**: **Không file nào vượt quá 1000 dòng code.**
- **Phân tách trách nhiệm (Separation of Concerns)**:
  1. **State (`AppState`)**: Quản lý trạng thái người dùng, cấp độ hiện tại (`A1`–`C2`), giao diện (`theme`, `perfMode`), bộ đếm thời gian và tiến độ học tập.
  2. **Storage (`StorageService` / Cloud Sync)**: Độc lập hoàn toàn với DOM, chịu trách nhiệm đọc/ghi `LocalStorage`, đồng bộ Supabase và xác thực Firebase.
  3. **DOM / UI (`UIController`)**: Render giao diện Liquid Glass, điều khiển thanh bên (Sidebar) bật ra mềm mại, xử lý hiệu ứng tương tác.
- **Xử lý lỗi (Error Handling)**:
  - Mọi thao tác đọc/ghi dữ liệu, gọi API AI hoặc truy cập thiết bị âm thanh đều phải bọc trong khối `try-catch` và in log rõ ràng qua `[tbao2902-Log]`.
## 3. Chính Sách Bảo Vệ Người Dùng
- Cam kết bảo mật tuyệt đối: Thông tin tài khoản, mật khẩu và dữ liệu học tập của người dùng được mã hóa cục bộ và chỉ đồng bộ lên Firebase/Supabase cá nhân của người dùng, **tuyệt đối không tiết lộ cho bên thứ 3**.
