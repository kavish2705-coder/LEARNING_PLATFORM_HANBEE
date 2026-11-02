# Pending Tasks

Deferred work, tracked here instead of being built now, with the reason each
item is deferred so it isn't re-litigated later.

## Independent-student landing form — Phase B (needs a domain + paid email)

Phase A (in progress) closes the loop manually: landing form -> a real lead
row -> staff reviews on the Independent Students page -> staff creates the
real invite (already built) -> staff shares the signup link over WhatsApp by
hand. That's deliberately the right scope for now: free tier, no domain yet,
small number of students.

Once Hostinger + a real domain are set up, come back and do:

- **Automatic email on lead approval.** Right now staff taps a WhatsApp
  share button after approving a lead. Once a paid email provider exists,
  fire a transactional email with the real signup link automatically when
  staff approves the lead, instead of the manual WhatsApp tap. The lead
  table, the staff review step, and the real invite RPC do not need to
  change for this -- only the "how the link reaches the student" step gets
  automated.
- **Optionally, WhatsApp Business API** for the same step, if automated
  WhatsApp sending becomes worth the cost at that point -- not needed while
  the manual tap is fast enough for the current student count.
- **Point Supabase Auth's site URL / redirect URLs at the real subdomain**
  instead of `localhost`. Needed for auth email links (password reset,
  confirmation) to work correctly once the app has a real public URL.
- **Revisit whether any other staging-only assumptions break** once a real
  domain exists -- e.g. anything hardcoding `localhost:3001` in generated
  links (the independent-student invite link, the school student invite
  link) needs to resolve from `window.location.origin` already, which it
  does -- confirm this still holds after the domain change rather than
  assuming it.

## Other items flagged earlier this session, not yet actioned

- School staff role: audited and found no bugs (see session work), but was
  only spot-checked (overview, student invite, team formation UI) -- not a
  full lifecycle walkthrough the way independent students got.
- `chat/page.tsx` and `NotificationBell.tsx` were modified outside this
  session's own commits (seen in `736b3c5` on `Arun`) and have not been
  independently reviewed.
