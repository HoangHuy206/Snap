import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QR Hoạt Ảnh 3D (Link) — Magic Tree",
  description:
    "Biến đường dẫn URL thành cây hoa 3D tương tác nhiều mùa (Xuân Đào, Hạ Xanh, Thu Vàng, Tết Mai) và chạm để mở mã QR quét ngay tại VidQR Studio.",
  alternates: {
    canonical: "/magic",
  },
};

export default function MagicTreeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
