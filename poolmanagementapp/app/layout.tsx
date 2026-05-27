import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pool Management App",
  description: "Manage pool facility check-ins and check-outs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
