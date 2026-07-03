# AryaBamboo E-Commerce

El yapımı bamboo ürünler için modern, çift dilli (TR/EN) e-ticaret sitesi.

## Özellikler

- Anasayfa, Hakkımızda, Ürünler, İletişim
- E-ticaret: sepet, ürün detay, ödeme (demo)
- TR / EN dil desteği
- Google & Apple ile giriş (NextAuth)
- Kargo takibi, SSS, iptal/iade
- Footer: Gizlilik, KVKK, Mesafeli Satış

## Kurulum

```bash
cd ~/Desktop/bamboo
npm install
cp .env.example .env.local
# .env.local dosyasını düzenleyin
npm run dev
```

Site: [http://localhost:3000](http://localhost:3000) (varsayılan dil: Türkçe `/tr`)

## OAuth Ayarları

1. **Google**: [Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 → Redirect URI: `http://localhost:3000/api/auth/callback/google`
2. **Apple**: [Apple Developer](https://developer.apple.com/) → Sign in with Apple
3. `NEXTAUTH_SECRET` için: `openssl rand -base64 32`

## Kargo Takibi (Demo)

- Sipariş no: `AB-12345`
- E-posta: `demo@email.com`

## Sorun Giderme

`vendor-chunks` veya `611.js` gibi runtime hataları bozuk `.next` önbelleğinden kaynaklanır. **Build ile dev karıştırmayın.**

```bash
# Geliştirme (otomatik temizlik + Turbopack)
npm run dev

# Canlı önizleme (önce build gerekir)
npm run build
npm run start
```

Hata devam ederse:

```bash
lsof -ti:3000 | xargs kill -9
rm -rf .next node_modules/.cache
npm run dev
```

## Üretim

```bash
npm run build
npm start
```

Gerçek ödeme için Stripe veya iyzico entegrasyonu eklenebilir.
