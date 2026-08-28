# BlaneFC

WhatsApp-first site for the 5-a-side group. Paste the live link in the chat. No app store. No login. Tap your name.

**Live link:** https://blanefc.c-rogs.workers.dev

Works on iPhone and Android (Safari, Chrome, or WhatsApp’s in-app browser). WhatsApp often wipes cookies, so identity lives in that phone’s local storage only. Each person taps their own name on their own phone.

If an old home-screen shortcut still says the old shortcut or No Knees, delete it and add **BlaneFC** again from the browser menu. Hard-refresh the tab if the title looks stale.

---

## How to use it (everyone)

1. Open the link.
2. Tap **your name**. Search works for names and UK numbers (`07123…` or `+44…`). Phones sit at the bottom of the list.
3. If you are not on the list, tap **I’m new here** and type your name.
4. Use the bar at the bottom:

| Tab | What it is |
| --- | --- |
| **Home** | Next locked game. You’re in / waitlist / out. Pay if you owe. Drop out if you can’t make it. |
| **Vote** | Open polls only. Tap every night you can actually play. Tap again to undo. |
| **Squad** | Who is in, waitlist, and out for upcoming locked games. |
| **Admin** | Organiser tools. Needs the PIN. |

### Locked game (Home)

- **You're in.** Show up. If you have not paid, send the amount on the card, then tap **I've paid**.
- **Waitlist #1** and there is an open spot: only you can tap **Take the open spot**. Nobody else jumps the queue.
- **Waitlist #2+.** You wait. The name of whoever is first is on the card.
- **Not on the list.** **I'll take a spot** if there is space and nobody is waiting. Otherwise **Join waitlist**.
- **Can't make it.** Confirm drop. If someone is waiting, they get your spot. If nobody is waiting, you still owe unless someone takes it later.
- Later locked games (e.g. the week after) sit under **Also locked in** with the same drop / join / pay actions.

### Voting

- Only **open** polls appear on Vote. Locked dates do not.
- First 12 votes on the winning date are in if it is booked as 5-a-side. After that, waitlist.
- The organiser locks a date when the pitch is booked. Voting then closes.

### Pay

Bank details show on Home when you are **in** and **unpaid**. Copy them, pay the organiser, then **I’ve paid**. The organiser can also tick paid in Admin.

---

## How to run a week (organiser)

Unlock **Admin** with PIN `0000` (change it in Settings).

1. **New poll.** Title + dates + notes (5s / 7s). **Put poll up**.
2. Paste **New poll** from the WhatsApp pack into the group, plus the site link.
3. When you have booked the pitch: **Book 5s** or **Book 7s** on that date. That builds the squad from vote order.
4. Paste **Date locked**. Chase unpaid with **Chase unpaid**.
5. Tick **paid** as money lands. **Drop** someone if they are out. **Add guest** to put a ringer on that game.
6. Optional pitch number, then Save.
7. Match day: paste **Match day**.

Waitlist on a locked game is first-come. An open spot goes to waitlist #1, not a random lad, unless you add a guest as organiser.

**Settings.** Club name (the name on the site), payee, sort code, account, venue, maps, kickoff, default £, new PIN.

**Hide** on the squad list removes a name from the picker. The organiser cannot be hidden.

Lock Admin when you are done so the PIN is needed again on that phone.

---

## Local and deploy

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL`.
2. `npm install` then `npm run dev`.
3. Publish: `npm run deploy` (Cloudflare Workers via OpenNext). Keep `DATABASE_URL` as a Wrangler secret, not in git.

The Worker URL is `blanefc.c-rogs.workers.dev`. Neon holds the club data.
