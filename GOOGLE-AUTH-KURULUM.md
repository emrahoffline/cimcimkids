# Google Giriş Kurulumu (Admin)

## Production (canlı site)

Site zaten Google OAuth ile çalışacak şekilde ayarlı.

**Redirect URI (zorunlu):**
```
https://www.cimcimkids.com/api/auth/callback/google
https://cimcimkids.com/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

**JavaScript origins:**
```
https://www.cimcimkids.com
https://cimcimkids.com
http://localhost:3000
```

Google Cloud proje: **AryaBamboo**  
Client: OAuth Web application (`375867941888-…`)

Uygulama yayın durumu **Testing** iken yalnızca **Test users** listesindeki e-postalar Google ile giriş yapabilir. Admin allowlist ile aynı tutulmalı:
- emrhgtr@gmail.com
- info@cimcimkids.com
- efruzebendes@hotmail.com
- efruzebendes90@gmail.com

Admin giriş: https://www.cimcimkids.com/admin/login

## Yerel geliştirme

`.env.local` içinde `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` dolu olmalı (production ile aynı client kullanılabilir).

```bash
npm run dev
```

Tarayıcıda `localhost:3000` kullanın (`127.0.0.1` değil).

## Not

Google ayar değişiklikleri 5 dakika–birkaç saat içinde etkili olabilir.
