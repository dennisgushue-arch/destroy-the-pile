import "./globals.css";

export const metadata = {
  title: "Destroy the Pile",
  description: "Take a photo. Get one task at a time. Destroy the pile."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
