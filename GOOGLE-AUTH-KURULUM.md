# Google Giriş Kurulumu

## 1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → proje seçin veya oluşturun
2. **APIs & Services** → **Credentials**
3. **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. **Authorized redirect URIs** ekleyin:

```
http://localhost:3000/api/auth/callback/google
```

6. **Client ID** ve **Client Secret** kopyalayın

## 2. .env.local Dosyası

`~/Desktop/bamboo/.env.local` dosyasını açın ve doldurun:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=ci7vnQ6jX1mB3ywzvlTpMmFlNDQH2h2OUc06ywM1oFE=

GOOGLE_CLIENT_ID=buraya-client-id-yapistirin
GOOGLE_CLIENT_SECRET=buraya-client-secret-yapistirin
```

## 3. Sunucuyu Yeniden Başlatın

```bash
cd ~/Desktop/bamboo
npm run dev
```

## 4. Test

- Hesabım: http://localhost:3000/tr/account
- Admin: http://localhost:3000/admin/login

**Önemli:** Tarayıcıda `localhost:3000` kullanın (`127.0.0.1` değil), Google Console'daki redirect URI ile aynı olmalı.

## OAuth consent screen

İlk kez kullanıyorsanız **OAuth consent screen** bölümünde test kullanıcısı olarak kendi Gmail adresinizi ekleyin.
