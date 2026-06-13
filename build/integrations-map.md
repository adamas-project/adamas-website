# ADAMAS — Lead Integrations Map (Website ↔ Monday)

How a lead becomes a row in `1_Sales_Pipeline`, from both entry paths, with source
attribution. Two flows, both landing in the same board with a distinguishing **Source**.

```
  WEBSITE FORM ─► Netlify Forms ─► Zapier ─► Monday 1_Sales_Pipeline   (Source = Website Form)
  BOOK A CALL  ─► Google Calendar booking ─► Zapier ─► same board       (Source = Direct Booking)
                  └► (also) Plausible event "Book 30-min Call" {page}  = website attribution
```

---

## Flow 1 — Website form → pipeline

The two pipeline forms now each send these hidden fields (added to the HTML):
`source = "Website Form"`, `lead_type = "Clarity Audit"|"Contact"`, `language = "en"|"de"`,
plus `form-name` (`clarity-audit` / `contact`).

### Field mapping (Netlify field → Monday column)

| Netlify form field        | Monday column (1_Sales_Pipeline) | Notes |
|---------------------------|----------------------------------|-------|
| `name`                    | **Item Name** + **Client Name**  | the row title |
| `company`                 | **Company**                      | (pre-existing column) |
| `email`                   | **Email**                        | ⚠ confirm this column exists — see audit note |
| `country_code` + `phone`  | **Phone**                        | concatenate with a space; ⚠ confirm column |
| `source` = "Website Form" | **Source** (status)              | exact label match → maps directly |
| `role` (audit only)       | **Notes**                        | prepend "Role: " |
| `company_website` (audit) | **Notes**                        | append |
| `situation` (audit)       | **Notes**                        | append "Situation: …" |
| `message` (contact only)  | **Notes**                        | the body |
| `lead_type`               | (Zapier filter / routing)        | distinguishes audit vs contact |
| `language`                | (Zapier routing)                 | EN vs DE nurture |
| — set by you later —      | Client Number, Contract Value, Clarity Audit Date, Client Board | filled during the engagement |

### Zapier Zap 1 (UPDATE your existing Netlify→Monday zap, don't make a new one)
- **Trigger:** Netlify → *New Form Submission*. (If your current zap only listens to one
  form, add a second trigger/zap for the `contact` form, or filter by `form-name`.)
- **Action:** Monday.com → *Create Item* in board `1_Sales_Pipeline` (id `5098153102`).
  - Map every row in the table above.
  - **Source** column: set to the incoming `source` value (`Website Form`).
  - Put the new lead in your "New / Inbox" group (whatever your intake group is).
- The only *required* change to your live zap is adding the **Source** mapping — everything
  else it likely already does. Adding columns to the board did not change existing mappings.

---

## Flow 2 — Google Calendar booking → pipeline (the "Direct Booking" path)

When someone uses **Book a 30-minute call** (the `calendar.app.google` link), Google
Appointment Schedule creates an event on your calendar with the booker as a guest. Turn
that event into a pipeline lead:

### Zapier Zap 2 (NEW)
- **Trigger:** Google Calendar → *New Event* (or *New Event Matching Search*) on the
  calendar that receives bookings. If you have a noisy calendar, use *Matching Search*
  with the appointment type name (e.g. "Clarity Audit") so only bookings trigger.
- **Action:** Monday.com → *Create Item* in `1_Sales_Pipeline`.
  - **Item Name** ← event guest name (or `Event > Summary`)
  - **Email** ← event guest email
  - **Source** ← static **"Direct Booking"**
  - **Clarity Audit Date** ← `Event > Start` (date)
  - **Notes** ← `Event > Description` (Google puts the booking form answers here)
- **Test with one real booking** — Appointment Schedule events vary in where they put the
  guest's name/email (guest list vs description). Map against a live sample, then turn on.

### Dedupe note
If a person both fills the form *and* books a call, you'll get two rows. Either:
- add a Zapier **Find Item** (search by email) step before Create, and update instead of
  create; or
- accept two rows and merge in Monday (the Source column makes the pair obvious).

---

## Flow 3 — Knowing a booking came "through the website"

Two signals, used together (Google's flow can't pass a single shared ID end-to-end, so
this is correlation, not a hard join):

1. **Plausible** now fires `Book 30-min Call` with a `page` property on every booking-link
   click. In Plausible → **Goals**, add a custom event goal `Book 30-min Call`; the
   breakdown by `page` tells you how many bookings the **website** drove, and from which
   page (homepage vs /contact). This is your "through the website" number.
2. **Monday** `Direct Booking` items (from Zap 2) are the bookings that converted.

A `Direct Booking` row whose timestamp lines up with a website `Book 30-min Call` event is
website-driven. Since the calendar link lives primarily on the site, `Direct Booking`
volume ≈ website-driven bookings in practice.

> Want a hard per-lead join later? Replace the bare Google link with a one-page redirect on
> your own domain that stamps a tracking param before forwarding to Google. Not needed yet;
> noted for when volume justifies it.

---

## ⚠ Verify against the audit (one open item)

The setup script added `Client Name`, `Company` (existed), `Source` (existed), `Contract
Value`, `Clarity Audit Date`, `Client Board`, `Notes`, `Client Number` — but it did **not**
add **Email** or **Phone** columns, on the assumption your live board already has them
(leads have been flowing). Run `audit-monday.sh` and confirm `1_Sales_Pipeline` has an
Email and a Phone column. If not, add them (Email = `email` type, Phone = `phone` type) and
map them in Zap 1. This is the only thing between the current zap and a complete match.
