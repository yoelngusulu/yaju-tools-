# YAJU Waitlist — deployment checklist

The homepage form now posts to /api/waitlist and stores unique, lowercase emails in Supabase. No Formspree endpoint is needed.

## Required actions

1. In the correct Supabase project, open **SQL Editor** and execute `supabase/migrations/202610120900_yaju_waitlist.sql`.
2. In Vercel > YAJU project > Settings > Environment Variables, verify `NEXT_PUBLIC_SUPABASE_URL` and **server-only** `SUPABASE_SECRET_KEY` are set for the target environment. NEVER prefix the secret with NEXT_PUBLIC_.
3. Deploy the code after applying the migration.
4. Submit one real email on https://yaju-tools.vercel.app and check the `public.waitlist_subscribers` table in Supabase. Submitting the same address again must not create another row.
5. Test invalid emails, temporary API failure, a mobile viewport, and the browser Network response from /api/waitlist.

The existing UI collects agreement through submitting the form. Update the Privacy Policy to describe product-update email collection before production launch. Provide a working unsubscribe mechanism before emailing your waitlist.

**Limitations:** This implementation does not send welcome or confirmation emails and does not verify mailbox ownership. Basic bot honeypot protection is included; production traffic should also have IP-based rate limiting/WAF protections. Do not state that production is working until the Supabase migration, Vercel configuration, and a live signup have been verified.
