/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Отключаем попытки Webpack собрать серверные Node.js модули для браузера
    config.resolve.fallback = { fs: false, net: false, tls: false };
    
    // Добавляем проблемные пакеты Coinbase SDK в исключения
    config.externals.push(
      'pino-pretty',
      'lokijs',
      'encoding',
      '@x402/evm/upto/client',
      '@x402/evm/exact/client',
      '@x402/core/client',
      '@x402/svm/exact/client',
      '@x402/evm'
    );
    return config;
  },
};

export default nextConfig;
