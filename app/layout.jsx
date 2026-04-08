import './globals.css';

export const metadata = {
  title: 'TKUCLCLAB',
  description: 'TKUCLCLAB learning platform for Mandarin courses, video lessons, and AI-supported study.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body>
        {children}
      </body>
    </html>
  );
}
