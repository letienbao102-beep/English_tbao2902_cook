# Kiến Trúc Hệ Thống (architecture.md) — Learning English by tbao2902
```text
focus-studio/ (Learning English by tbao2902)
├── index.html          # Khung xương giao diện chính (Liquid Glass Shell, Sidebar, Auth, Labs)
├── style.css           # Hệ thống biến màu (Xanh lá cây & Nâu) và hiệu ứng Liquid Glass hiện đại
├── app.js              # Điểm khởi chạy, kết nối các module (State, Storage, Firebase/Supabase, Gemini AI, UI)
├── timer.js            # Logic bộ đếm thời gian học từng cấp (A1-C2), vòng tròn tiến độ SVG & 5 Huy hiệu
└── tasks.js            # Giáo trình IELTS A1-C2, 12.000 từ vựng & Flashcard, Bài tập, Nghe, Nói, Phòng Lab Đề Thi
```
## Chi Tiết Các Thành Phần
1. **`index.html` (Khung xương giao diện chính)**:
   - Thanh điều hướng trên cùng (Topbar) và **Thanh bên bật ra (Pop-out Liquid Glass Sidebar)** chứa:
     - Đăng nhập / Đăng ký tài khoản (kèm hiệu ứng sóng mật khẩu & nút ẩn/hiện).
     - Trang chủ (Tổng quan lộ trình, Nhiệm vụ học tập, Bộ đếm thời gian & Huy hiệu).
     - 6 Cấp bậc học tập chuẩn Cambridge & CEFR: **A1, A2, B1, B2, C1, C2**.
     - 4 Phòng học chuyên sâu + Sổ tay Từ vựng:
       1. Phòng Lab Test Trình Độ Quốc Tế
       2. Phòng Luyện Nghe IELTS
       3. Phòng Luyện Nói AI & Sửa Phát Âm IPA
       4. Phòng Làm Bài Tập Theo Trình Độ
       5. Khu Vực Luyện Từ Vựng (Ngân hàng 12.000 từ + Flashcard sắc màu + Kiểm tra ghi nhớ)
     - Cài đặt tài khoản, cấu hình Firebase / Supabase / Gemini API, chuyển nền Tối/Sáng và chế độ Máy yếu/Máy mạnh.
2. **`style.css` (Hệ thống thiết kế Liquid Glass)**:
   - Phối màu chủ đạo **Xanh lá cây (`#10b981`, `#059669`, `#34d399`) + Nâu (`#8b5a2b`, `#a47148`, `#d4a373`)**.
   - Hiệu ứng kính mờ đa tầng, chuyển động bật ra mềm mại, thẻ Flashcard lật 3D và tối ưu Responsive cho Điện thoại & Laptop.
3. **`timer.js` (Bộ đếm thời gian & Huy hiệu chăm chỉ)**:
   - Đếm thời gian học thực tế cho từng học phần **A1, A2, B1, B2, C1, C2** với vòng tròn tiến độ SVG.
   - Cơ chế tích lũy chuỗi học **15 – 20 phút mỗi ngày = +1 Điểm Chăm Chỉ**.
   - Hệ thống mở khóa 5 Huy hiệu:
     - `3 điểm`: **Chăm chỉ** 🌱
     - `10 điểm`: **Chú ong chăm chỉ** 🐝
     - `30 điểm`: **Supper chăm chỉ** 🔥
     - `100 điểm`: **Ác quỷ** 😈
     - `200 điểm`: **Bé cưng của English** 👑
4. **`tasks.js` (Kho tri thức IELTS Quốc Tế A1–C2 & Ngân hàng 12.000 từ)**:
   - Tích hợp trọn vẹn giáo trình 6 cấp độ (A1 Foundation → C2 Mastery): Bảng quy đổi đầu ra, Công thức ngữ pháp cốt lõi, Từ vựng học thuật, Chiến thuật 4 kỹ năng và Lộ trình tuần.
   - Bộ máy sinh & tra cứu **12.000 từ vựng chuẩn quốc tế** kèm Flashcard và bài kiểm tra ghi nhớ.
   - Hệ thống bài tập đa dạng, bài nghe chuẩn quốc tế, bài luyện nói và đề thi thử 4 kỹ năng.
5. **`app.js` (Điểm khởi chạy & Điều phối AI / Cloud)**:
   - Quản lý trạng thái ứng dụng, xác thực tài khoản, kết nối Firebase / Supabase và tích hợp AI Agent (Gemini API + Local Pedagogical AI Fallback).
