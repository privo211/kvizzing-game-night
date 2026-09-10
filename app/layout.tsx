import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KVizzing — Game Night",
  description: "Clue-rich quizzes, unlikely connections, and great company. An independent fan-made quiz night.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
