# No Knees FC

WhatsApp-first website for the 5-a-side group. Paste the live URL in the chat. Lads tap their name, vote, see who’s in, drop out, and mark paid.

## Share

Drop the Vercel URL in WhatsApp. It works on iPhone and Android (Safari, Chrome, or WhatsApp's in-app browser). Identity is **tap your name**. WhatsApp's browser often forgets cookies, so there is no login.

Organiser PIN (Oli tab): `0710`  
Change it in Oli → Settings after unlock. Paste bank details there too; they are not in git.

## Local

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to the Neon connection string.
2. `npm install`
3. `npm run dev`

First request creates tables and seeds the current squad plus 1 Sep / 15 Sep / late-September poll.
