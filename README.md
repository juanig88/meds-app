# Meds App

A simple app to track daily medication doses for pets (or people). Add patients, prescribe medications with times per day, and mark doses as given or omitted in a calendar. Built with Next.js and Supabase.

I created this app because my cat **Nilo** was sick and I needed a clear way to keep track of his medicines—when to give each pill and which doses were already given or skipped.

---

## How to run

1. **Clone and install**

   ```bash
   git clone https://github.com/your-username/meds-app.git
   cd meds-app
   npm install
   ```

2. **Configure Supabase**

   - Copy `.env.local.example` to `.env.local`.
   - Add your Supabase project URL and anon key (from [Supabase](https://supabase.com) → Project Settings → API).
   - Run the database migrations in the Supabase SQL Editor (see `supabase/migrations/`). Full setup (including Google login) is in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

3. **Start the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign in with Google, then add patients and medications.

**Production:** `npm run build` then `npm start`.

---

## How to use

- **Patients** — Add a patient (e.g. your pet). You can add a short description (e.g. breed, nickname).
- **Medications** — For each patient, add medications with name, start date, and how many times per day (e.g. every 12h = 2). You can set an end date when treatment finishes.
- **Calendar** — Select a patient to see their dose calendar. Click a day cell to cycle: *empty → given (✓) → omitted (–)*. One more click on *omitted* removes the dose so the counter updates.
- **Counters** — “Given this month” shows how many doses were given (and omitted) per medication.
- **Export** — Use the user menu (avatar) to export all data as CSV.
- **Theme & language** — Switch between light/dark and Spanish/English from the same menu.

---

## Tech

- [Next.js](https://nextjs.org) (App Router), [Supabase](https://supabase.com) (auth + Postgres), [Tailwind CSS](https://tailwindcss.com).
