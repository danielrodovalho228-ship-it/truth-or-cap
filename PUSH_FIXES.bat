@echo off
REM Truth or Cap - push de TODAS as correcoes + sistema de notificacoes
REM Cole no terminal Windows na pasta scaffold:
REM   cd "C:\Users\danie\OneDrive\Daniel\App truthorcap\truthorcap-launch-kit\truthorcap-launch-kit\scaffold"
REM   PUSH_FIXES.bat

cd /d "%~dp0"

git add supabase/migrations/0009_qa_critical_fixes.sql ^
        supabase/migrations/0010_room_capacity_trigger.sql ^
        supabase/migrations/0011_notifications.sql ^
        app/share/round/[id]/story-image/route.tsx ^
        app/share/round/[id]/page.tsx ^
        app/share/round/[id]/ShareCard.tsx ^
        app/api/room/round/vote/route.ts ^
        app/api/room/round/upload/route.ts ^
        app/api/room/round/analyze/route.ts ^
        app/api/room/round/reveal/route.ts ^
        app/admin/layout.tsx ^
        app/admin/users/UsersTable.tsx ^
        app/api/admin/users/route.ts ^
        app/auth/sign-in/page.tsx ^
        app/auth/callback/route.ts ^
        app/auth/confirm/route.ts ^
        app/auth/forgot-password/page.tsx ^
        app/auth/forgot-password/ForgotPasswordForm.tsx ^
        app/auth/reset-password/page.tsx ^
        app/auth/reset-password/ResetPasswordForm.tsx ^
        app/room/[code]/RoomClient.tsx ^
        components/auth/PasswordForm.tsx ^
        lib/admin.ts ^
        lib/auth/actions.ts ^
        lib/analysis/linguistic.ts ^
        lib/notifications/sender.ts ^
        lib/notifications/templates/index.ts ^
        lib/notifications/templates/shared.ts ^
        EMAIL_SETUP.md ^
        PUSH_FIXES.bat

git commit -m "feat: hardening de QA + forgot-password + sistema de notificacoes" -m "QA P0/P1: RLS round_votes oculto ate reveal; analyze rate-limit + audio cap 25MB; admin sem hardcoded UUID; signup sem enumeration; CSRF /api/admin/users; reveal idempotente; trigger DB enforce_room_capacity (TOCTOU); rotation prompter skip-left + sem back-to-back; open redirect // bloqueado; signin password rate-limit; OG metadata na share page; temperature:0 no Claude. Auth: forgot-password/reset-password flow completo com rate-limit + dedup. Notifications: migration 0011 (notification_preferences + push_subscriptions + notification_log com dedup), 11 templates HTML virais (rosa/violet) com CTA, sender via Resend SDK, hooks pra prefs."

git push origin main

echo.
echo ========================================
echo Push concluido. Vercel inicia o deploy.
echo
echo PROXIMOS PASSOS DEPOIS DESTE PUSH:
echo  1. Adicionar 4 DNS records no Hostinger (ver EMAIL_SETUP.md)
echo  2. Verificar dominio no Resend (resend.com/domains)
echo  3. Criar API key Resend, copiar re_...
echo  4. Vercel: adicionar RESEND_API_KEY + EMAIL_FROM env vars
echo  5. Supabase: Auth Settings - SMTP Custom (host=smtp.resend.com, user=resend, pass=re_...)
echo
echo Acompanhe deploy: https://vercel.com/daniels-projects-386afd6c/truthorcap-launch/deployments
echo ========================================
pause
