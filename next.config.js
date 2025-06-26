/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // GitHub Pagesのリポジトリ名を設定（必要に応じて変更）
  basePath: '/grove-player-next',
  assetPrefix: '/grove-player-next/',
}

module.exports = nextConfig
