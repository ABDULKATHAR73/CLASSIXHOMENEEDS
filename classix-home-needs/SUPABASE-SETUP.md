# Supabase connect செய்வது (data ஒருபோதும் அழியாமல் இருக்க)

இதை connect செய்தால் உங்கள் products, photos, settings, reviews, visitor stats, admin login எல்லாமே
Supabase-ல் தானாக சேமிக்கப்படும். Render free plan restart/deploy ஆனாலும் server தொடங்கும்போது
எல்லாம் தானாக திரும்ப வரும். (Connect செய்யாவிட்டால் website முன்பு போலவே வேலை செய்யும்.)

## படிகள் (10 நிமிடம்)

1. https://supabase.com → **Start your project** → GitHub அல்லது Google மூலம் sign up.
2. **New project**
   - Name: `classix-home-needs`
   - Database Password: ஏதாவது ஒரு password (எழுதி வைத்துக்கொள்ளுங்கள்)
   - Region: **South Asia (Mumbai)**
   - Plan: **Free** → Create. (2 நிமிடம் ஆகும்)
3. **Project URL:** Project Settings → **Data API** (அல்லது API) → `https://xxxxxxxx.supabase.co` என்பதை copy செய்யுங்கள்.
4. **Secret key:** Project Settings → **API Keys** → **Legacy anon, service_role API keys** tab →
   **service_role** (இது `eyJ...` என்று தொடங்கும், *secret*) → Copy.
   (அந்த tab இல்லையென்றால் `sb_secret_...` என்ற **secret key**-ஐப் பயன்படுத்துங்கள்.)
   ⚠️ இந்த key-ஐ யாரிடமும் பகிராதீர்கள்; website code-ல் எழுதாதீர்கள்.
5. **Render** → உங்கள் service → **Environment** → Add:
   - `SUPABASE_URL` = படி 3-ல் copy செய்த URL
   - `SUPABASE_SERVICE_KEY` = படி 4-ல் copy செய்த key
   (`SUPABASE_BUCKET` தேவையில்லை; `classix-data` என்ற private bucket தானாக உருவாகும்.)
6. **Save, rebuild & deploy**.
7. சரிபார்க்க: Admin → **Backup & Security** → மேலே **"✅ Connected to Supabase"** என்று வரும்.
   Render Logs-ல் `Cloud storage : Supabase ON` என்று வரும்.

## எப்படி வேலை செய்கிறது
* ஒவ்வொரு மாற்றமும் சில வினாடிகளில் Supabase-க்குப் போகும்; photos உட்பட எல்லாம் 20 வினாடிக்குள் சேமிக்கப்படும்.
* Server தொடங்கும்போது Supabase-ல் உள்ளது புதியது என்றால் அதை எடுத்து வரும். தொடங்கும்போது Supabase
  தொடர்பு கிடைக்காவிட்டால், இருக்கும் data-வை overwrite செய்யாமல் மீண்டும் முயலும்.
* Admin-ல் நீக்கிய photos Supabase-லிருந்தும் நீக்கப்படும்.

## தெரிந்துகொள்ள வேண்டியவை
* Supabase free: 1 GB storage, ஒரு file அதிகபட்சம் 50 MB (உங்கள் upload வரம்பு 12 MB, எனவே போதும்).
* Free project **ஒரு வாரம் எந்தச் செயல்பாடும் இல்லையென்றால் pause** ஆகலாம். Server ஒவ்வொரு 6 மணிக்கும்
  ஒரு சிறு அழைப்பு அனுப்பி இதைத் தடுக்கும். Pause ஆனால் supabase.com dashboard-ல் **Restore project** அழுத்துங்கள்; data அழியாது.
* இது கூடுதல் பாதுகாப்பு; அதனுடன் Admin → Backup & Security-ல் எப்போதாவது **full ZIP backup** எடுத்து வைப்பது நல்லது.

# English summary
Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (service_role / secret key) on your host. A private bucket
`classix-data` is created automatically. All data (content, admin login, reviews, stats, uploads, content versions)
is mirrored to it within seconds and restored automatically on every start, so a wiped disk loses nothing.
