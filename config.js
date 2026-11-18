/* ==========================================================================
   LEARNING ENGLISH BY TBAO2902 — CẤU HÌNH DỊCH VỤ ĐÁM MÂY (config.js)
   --------------------------------------------------------------------------
   👉 ĐÂY LÀ FILE DUY NHẤT BẠN CẦN DÁN KEY VÀO.
   - Firebase web config & Supabase anon key là loại khóa "công khai" theo thiết kế
     (được bảo vệ bằng Security Rules / Row Level Security), nên có thể đưa lên GitHub.
   - ⚠️ TUYỆT ĐỐI KHÔNG dán Gemini API Key vào file này nếu đưa lên GitHub công khai.
     Gemini key được cất trong Supabase Edge Function (xem HUONG_DAN_TRIEN_KHAI.md),
     web chỉ gọi qua `gemini.proxyUrl`.
   - Để trống giá trị nào thì tính năng đó tự chuyển sang chế độ Offline (LocalStorage).
   ========================================================================== */
window.APP_CONFIG = {
  // 1. Đã sửa từ "const firebaseConfig =" thành thuộc tính "firebase:" và đổi ";" thành ","
  firebase: {
    apiKey: "AIzaSyBwsJ7mMKjkZJfzPn3HcKTklmSKvzC5pMo",
    authDomain: "english-tbao2902.firebaseapp.com",
    projectId: "english-tbao2902",
    storageBucket: "english-tbao2902.firebasestorage.app",
    messagingSenderId: "400208329498",
    appId: "1:400208329498:web:7437765f93f19f8cb84aa3",
    measurementId: "G-R5CFKXDNT7"
  },

  // 2. Đã bỏ đuôi "/rest/v1/" thừa ở cuối URL
  supabase: {
    url: 'https://ndlzhcjeapcmunvdnxdh.supabase.co',
    anonKey: 'sb_publishable_KRjJbas-Etp4dOJZvMaiMw_hAv6KeuV'
  },
  gemini: {
    proxyUrl: 'https://ndlzhcjeapcmunvdnxdh.supabase.co/functions/v1/rapid-endpoint',          // VD: 'https://abcdxyz.supabase.co/functions/v1/gemini-proxy'
    model: 'gemini-2.5-flash'
  }
};

/* Chỉ khi chạy trên máy cá nhân (localhost) mới nạp thêm config.local.js
   — file này bị .gitignore chặn, dùng để thử Gemini key trực tiếp mà không lộ lên GitHub. */
if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  document.write('<script src="config.local.js" onerror="void 0"><\/script>');
}
