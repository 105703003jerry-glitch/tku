import './globals.css';

export const metadata = {
  title: 'Pandoo LMS - TKCLCLAB',
  description: 'Clean, modern learning management system.',
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
