import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Hyper Quant — Web3 Connect',
  description: 'Connect wallet for Hyper Quant Telegram Bot',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#0b0e14',
          color: '#ffffff',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}