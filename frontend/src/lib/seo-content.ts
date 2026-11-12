export interface HowToStepItem {
  step: number;
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const VIDQR_HOWTO_STEPS: HowToStepItem[] = [
  {
    step: 1,
    title: "Tải video / tệp tin lên hoặc dán liên kết MXH",
    description:
      "Chọn video (MP4, MOV, WebM), PDF, ảnh HD hoặc file ZIP tối đa 200 MB để tạo QR Động; hoặc chuyển sang tab Tải Video & Ảnh MXH và nhấn nút Dán 1 chạm.",
  },
  {
    step: 2,
    title: "Tùy biến giao diện QR hoặc chọn luồng tải sạch",
    description:
      "Phối màu Gradient, gắn logo giữa tâm, chọn khung viền chủ đề kèm nhãn tiếng Việt cho mã QR; hoặc chọn video/audio gốc không dính watermark để tải xuống.",
  },
  {
    step: 3,
    title: "Xuất ảnh PNG HD / SVG hoặc cập nhật nội dung sau này",
    description:
      "Tải về mã QR sắc nét để in ấn và lưu lại link quản lý bí mật nếu muốn đổi video, ảnh hay tài liệu bên trong mà không cần in lại mã QR mới.",
  },
];

export const VIDQR_FAQ_ITEMS: FaqItem[] = [
  {
    question: "VidQR là gì và có miễn phí hoàn toàn không?",
    answer:
      "VidQR Studio là công cụ web miễn phí 100%, không cần đăng ký tài khoản, giúp bạn biến video hoặc mọi tệp tin thành mã QR động có khung thiết kế đẹp, đồng thời tải video và ảnh mạng xã hội không dính logo nền tảng.",
  },
  {
    question: "Mã QR Động (Dynamic QR) trên VidQR hoạt động như thế nào?",
    answer:
      "Khi tạo QR từ video, ảnh hoặc PDF, VidQR cấp cho bạn một đường dẫn quản lý riêng. Bất cứ lúc nào bạn cần thay thế video mới hoặc chỉnh sửa tiêu đề/ghi chú, mã QR đã in ra trước đó vẫn giữ nguyên và tự động trỏ tới nội dung mới.",
  },
  {
    question: "VidQR hỗ trợ tải video không logo từ những nền tảng nào?",
    answer:
      "Công cụ hỗ trợ phân tích và tải media từ TikTok, Douyin, YouTube, YouTube Shorts, Instagram Reels, Facebook và X (Twitter), ưu tiên luồng gốc sạch watermark nền tảng mà không đóng thêm logo trung gian.",
  },
  {
    question: "Có thể xuất mã QR ra định dạng nào và giới hạn tệp tối đa bao nhiêu?",
    answer:
      "Bạn có thể xuất mã QR ở định dạng PNG độ phân giải cao (phù hợp chia sẻ online) hoặc Vector SVG sắc nét ở mọi kích thước in ấn. Tệp tải lên tạo QR hỗ trợ mặc định tối đa 200 MB mỗi tệp.",
  },
  {
    question: "Tài liệu riêng tư và đường dẫn xem QR có bị Google lập chỉ mục không?",
    answer:
      "Không. Tất cả trang xem tệp (/v/) và trang quản lý mã bí mật (/manage/) đều được gắn chỉ thị noindex, nofollow và chặn thu thập trong robots.txt để bảo vệ quyền riêng tư của người dùng.",
  },
];
