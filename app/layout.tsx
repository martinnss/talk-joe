import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Talk Joe - Translate everything",
  description: "Translate a conversation between two people with differents languages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        
      >
        <div className="flex justify-center items-center min-h-screen w-screen">
          <div className="w-full max-w-3xl">
          {children}
          </div>
        </div>
      </body>
    </html>
  );
}
