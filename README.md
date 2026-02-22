# 🛒 Shopify Cart Tracker App

Μια ολοκληρωμένη εφαρμογή Shopify για παρακολούθηση καλαθιών, ανάλυση εγκαταλελειμμένων καλαθιών και αυτόματη αποστολή emails ανάκτησης.

---

## ✨ Χαρακτηριστικά

| Χαρακτηριστικό | Περιγραφή |
|---|---|
| 🔴 **Live Cart Tracking** | Βλέπεις σε πραγματικό χρόνο ποιοι πελάτες έχουν ανοιχτό καλάθι |
| ⚠️ **Abandoned Cart Detection** | Αυτόματος εντοπισμός εγκαταλελειμμένων καλαθιών |
| 📧 **Email Recovery** | Αυτόματα emails ανάκτησης μέσω SMTP |
| 📊 **Analytics Dashboard** | Στατιστικά, χαμένα έσοδα, ποσοστό ανάκτησης |
| 🔗 **Shopify Webhooks** | Realtime ενημερώσεις μέσω carts/create, carts/update, orders/create |

---

## 🚀 Εγκατάσταση

### Βήμα 1: Προαπαιτούμενα

```bash
node --version  # Χρειάζεσαι Node.js v18+
npm --version
```

Επίσης χρειάζεσαι:
- [Shopify Partners](https://partners.shopify.com) λογαριασμό
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli) εγκατεστημένο

```bash
npm install -g @shopify/cli @shopify/theme
```

---

### Βήμα 2: Κλωνοποίηση & Εγκατάσταση

```bash
cd shopify-cart-tracker
npm install
```

---

### Βήμα 3: Δημιουργία App στο Shopify Partners

1. Πήγαινε στο [partners.shopify.com](https://partners.shopify.com)
2. **Apps** → **Create App** → **Create app manually**
3. Δώσε όνομα: `Cart Tracker`
4. Αντέγραψε το **API Key** και το **API Secret**

---

### Βήμα 4: Ρύθμιση .env

```bash
cp .env.example .env
```

Άνοιξε το `.env` και συμπλήρωσε:

```
SHOPIFY_API_KEY=abc123...      # Από Shopify Partners
SHOPIFY_API_SECRET=def456...   # Από Shopify Partners
SHOPIFY_APP_URL=https://...    # Η URL σου (βλ. Βήμα 5)
DATABASE_URL=file:./dev.db     # SQLite για τώρα
```

---

### Βήμα 5: Εκκίνηση σε Development

```bash
# Δημιουργία database
npx prisma migrate dev --name init

# Εκκίνηση dev server
npm run dev
```

Το Shopify CLI θα δημιουργήσει αυτόματα ένα tunnel (π.χ. μέσω Cloudflare) και θα σου δώσει μια public URL.

Αντέγραψε αυτή την URL στο `.env` ως `SHOPIFY_APP_URL`.

---

### Βήμα 6: Εγκατάσταση στο Test Store

```bash
# Σύνδεση με το Shopify app
shopify app config link

# Install στο development store
shopify app deploy
```

Ή πήγαινε στο Shopify Partners → Your App → **Test on development store**.

---

## 📬 Ρύθμιση Email (Προαιρετικό)

Μπες στο dashboard → **Ρυθμίσεις** και συμπλήρωσε:

### Gmail
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
Username: your@gmail.com
Password: [App Password - ΟΧΙ τον κανονικό κωδικό σου]
```

> Για να πάρεις App Password: Google Account → Security → 2-Step Verification → App passwords

### SendGrid (Συνιστάται για Production)
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
Username: apikey
Password: [SendGrid API Key]
```

---

## 🏗️ Αρχιτεκτονική

```
shopify-cart-tracker/
├── app/
│   ├── routes/
│   │   ├── app._index.jsx          ← Dashboard κύρια σελίδα
│   │   ├── app.settings.jsx        ← Ρυθμίσεις
│   │   ├── webhooks.jsx            ← Shopify webhook handler
│   │   ├── api.carts.jsx           ← REST API για carts
│   │   └── api.process-abandoned.jsx ← Manual trigger
│   ├── lib/
│   │   ├── cart.server.js          ← Business logic
│   │   └── email.server.js         ← Email service
│   ├── shopify.server.js           ← Shopify Auth config
│   └── db.server.js                ← Prisma client
├── prisma/
│   └── schema.prisma               ← Database schema
├── shopify.app.toml                ← App config
└── .env.example
```

---

## 🔗 Webhooks που χρησιμοποιεί

| Webhook | Πότε πυροδοτείται |
|---|---|
| `carts/create` | Νέο καλάθι |
| `carts/update` | Αλλαγή καλαθιού |
| `checkouts/create` | Έναρξη checkout |
| `checkouts/update` | Αλλαγή checkout (+ email πελάτη) |
| `orders/create` | Αγορά = καλάθι converted |

---

## 🚢 Production Deployment (Fly.io)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy
fly launch
fly secrets set SHOPIFY_API_KEY=... SHOPIFY_API_SECRET=... DATABASE_URL=...
fly deploy
```

---

## 📋 Επόμενα Βήματα / Βελτιώσεις

- [ ] Cron job για αυτόματη επεξεργασία εγκαταλ. καλαθιών (π.χ. κάθε ώρα)
- [ ] Γράφημα trend με Recharts
- [ ] Discount code στα recovery emails
- [ ] Slack/Telegram notifications
- [ ] A/B testing email templates
- [ ] PostgreSQL για production scalability
