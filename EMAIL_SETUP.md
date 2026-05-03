# Truth or Cap — Email Setup (Resend + Supabase + DNS)

## 1. Adicionar DNS records no Hostinger (zona DNS de truthorcapapp.com)

Vai em https://hpanel.hostinger.com → Domains → truthorcapapp.com → DNS Zone → Add Record.

Adicionar **4 registros**:

### a) DKIM (TXT)

| Campo | Valor |
|---|---|
| Type | `TXT` |
| Name / Host | `resend._domainkey` |
| Value | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDSFP0tjBIfjaPOOuQe5DNwpev9/ZQmbcR5dCIgXW56AWGhxNKhwY7U3jel8mA4DLDIFkZ3pf5P4+Gy42Nb5xIcstPVgnt6TgaJ2Fn8MqeenNZloz63oKlAJ6vhyDKHtJGm4P9UjXPe5cQEaHTRaMYzLttYoltIkE/JXGi9D4/kHwIDAQAB` |
| TTL | Auto (3600) |

### b) SPF (MX) — recebe bounce reports

| Campo | Valor |
|---|---|
| Type | `MX` |
| Name / Host | `send` |
| Value | `feedback-smtp.us-east-1.amazonses.com` |
| Priority | `10` |
| TTL | 60 |

### c) SPF (TXT)

| Campo | Valor |
|---|---|
| Type | `TXT` |
| Name / Host | `send` |
| Value | `v=spf1 include:amazonses.com ~all` |
| TTL | 60 |

### d) DMARC (TXT) — opcional mas recomendado

| Campo | Valor |
|---|---|
| Type | `TXT` |
| Name / Host | `_dmarc` |
| Value | `v=DMARC1; p=none;` |
| TTL | Auto |

Hostinger pode levar de 5min a 1h pra propagar.

---

## 2. Verificar no Resend

Depois de adicionar:
1. Volta em https://resend.com/domains
2. Clica em `truthorcapapp.com`
3. Clica em **"Verify DNS Records"** — todos devem ficar verdes (Verified)

---

## 3. Criar API Key no Resend

1. https://resend.com/api-keys → "Create API key"
2. Name: `truthorcap-prod`
3. Permission: **"Sending access"** (não Full Access — princípio do menor privilégio)
4. Domain: `truthorcapapp.com`
5. Copia a key `re_...`

---

## 4. Configurar SMTP customizado no Supabase

1. https://supabase.com/dashboard/project/mldaoedudfdzmldbnqhi/auth/templates
2. Aba **"SMTP Settings"** → toggle **"Enable Custom SMTP"** ON
3. Preencher:
   - Sender email: `noreply@truthorcapapp.com`
   - Sender name: `Truth or Cap`
   - Host: `smtp.resend.com`
   - Port: `465` (SSL)
   - Username: `resend`
   - Password: a API key `re_...` que você copiou
4. **Save**

Manda o **Test email** pra `dtrodovalho40@gmail.com` pra confirmar.

---

## 5. Adicionar env vars no Vercel

Em https://vercel.com/daniels-projects-386afd6c/truthorcap-launch/settings/environment-variables — adicionar:

```
RESEND_API_KEY=re_...                                # mesma key acima
EMAIL_FROM="Truth or Cap <noreply@truthorcapapp.com>"
```

---

## 6. Limites e custos do Resend (free tier)

- **100 emails/dia, 3.000/mês** grátis
- Quando passar disso → upgrade pra `Pro` ($20/mês = 50k emails)
- Bounce rate >5% bloqueia conta — limpar lista regularmente

---

## 7. Templates customizados

Os HTMLs dos emails (Magic Link, Confirm Signup, Reset Password, Change Email) ficam em `lib/notifications/templates/` neste repo. Pra usar no Supabase, copiar o HTML pra:

https://supabase.com/dashboard/project/mldaoedudfdzmldbnqhi/auth/templates

Aba "Email Templates" → escolher cada template (Magic Link / Confirm signup / Reset Password / Change Email) → colar HTML → Save.

---

## 8. Notificações in-app + push

Nada disso é gerenciado pelo Supabase — vai via Resend direto pelo nosso código (`lib/notifications/sender.ts`) ou Web Push API (`/api/push/subscribe`). Veja `lib/notifications/README.md`.
