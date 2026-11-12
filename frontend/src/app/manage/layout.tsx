import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý mã QR động",
  description: "Trang quản lý nội dung mã QR động riêng tư trên VidQR Studio.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ManageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
