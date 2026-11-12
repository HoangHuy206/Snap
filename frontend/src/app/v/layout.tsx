import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xem nội dung QR",
  description: "Trang xem và tải tệp được chia sẻ qua mã QR riêng tư từ VidQR Studio.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ViewQrLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
