# Chores: Cleaning Schedule (app #9) - App Store metadata (v1.0; listings and keywords updated for 1.0.3)

## Identity
- **App name (25/30):** `Chores: Cleaning Schedule`
- **Subtitle (28/30):** `Chore Chart & House Cleaning`
- Bundle id: `com.bwk.chores` · slug `chores` · owner `bkdeveloper123`
- Categories: Lifestyle (primary), Productivity (secondary)
- Age rating: 4+

Gate 1 numbers (ASOMobile, US iPhone, Sep 27 2026): chores 438 / Apple prev 39; cleaning schedule 393 / prev 37; chore chart 335 / prev 34; house cleaning 266 / prev 30; chore 106 / prev 30; chore tracker 186 / prev 25; chore app 175 / prev 24; chore list 122 / prev 20. Title carries "chores" + "cleaning schedule"; subtitle carries "chore chart" + "house cleaning".

## Keywords (no title or subtitle words; comma separated with no spaces)

**English (U.S.)** (from 1.0.3): name and subtitle unchanged (`Chores: Cleaning Schedule` / `Chore Chart & House Cleaning`).
- Keywords (98/100): `tracker,list,to,do,checklist,planner,daily,routine,family,organizer,kids,roommate,tasks,clean,adhd`

**Spanish (Mexico)** (from 1.0.3): until 1.0.2 an exact copy of the English listing, so it added nothing. Now its own English name and words for US search.
- Name (27/30): `Chore Tracker: Cleaning App`
- Subtitle (28/30): `Household Chores & Checklist`
- Keywords (91/100): `tidy,laundry,declutter,housekeeping,points,streak,weekly,home,spotless,shared,routines,list`
- `points` and `streak` replace `reward` and `allowance` (Brian, Nov 24): the app has points per chore on the chart and a streak on Today, but no rewards or allowance.

## Extra listings indexed for US search

Apple also reads these eight languages for searches in the US store. Each holds its own English name, subtitle and keyword field, and the English description. Phrases only form inside one listing.

| Listing | Name | Subtitle | Keywords |
|---|---|---|---|
| Arabic | `Chore Tracker: House Cleaning` | `Cleaning Checklist & Schedule` | `household,chores,declutter,tidy,home,organization,organizer,family,adhd,routine,laundry,daily` |
| French | `Cleaning Schedule: Chore List` | `Household Chores, Home Routine` | `tracker,checklist,planner,adhd,declutter,tidy,family,kids,organizer,laundry,weekly,daily,zone` |
| Korean | `House Cleaning App: Chores` | `Chore Chart, Tracker for Kids` | `family,organizer,household,schedule,checklist,roommate,shared,tasks,todo,list,routine,weekly,home` |
| Portuguese (Brazil) | `Cleaning Checklist: Chore App` | `House Cleaning Schedule, ADHD` | `tracker,planner,routine,declutter,tidy,household,organization,deep,clean,spring,zone,motivation` |
| Russian | `ADHD Cleaning: Chores Tracker` | `Home Routines & Tidy Schedule` | `house,chore,chart,checklist,planner,declutter,household,organizer,motivation,task,daily,list` |
| Vietnamese | `Family Chores: Chore Chart` | `Kids Chore Tracker & Schedule` | `household,organizer,cleaning,list,checklist,routine,home,tasks,roommate,shared,couple,weekly` |
| Chinese (Simplified) | `Cleaning Planner: Tidy Home` | `Declutter, Laundry & Chores` | `house,schedule,checklist,tracker,organization,organizer,household,routine,adhd,maintenance,daily` |
| Chinese (Traditional) | `Household Chores: Clean House` | `Cleaning App, Chore Checklist` | `schedule,tracker,planner,family,kids,roommate,home,organization,declutter,tidy,adhd,routine,list` |

Portuguese (Brazil) keeps `deep` and `spring` (Brian, Nov 24): the long-interval chores (oven every few months, declutter every 3 months) cover deep clean and spring cleaning jobs.

Lengths checked (name and subtitle at most 30 characters, keywords at most 100 bytes, no spaces, no word repeated inside a field or taken from that listing's name or subtitle). Name / subtitle / keywords: Arabic 29/29/93, French 29/30/93, Korean 26/29/97, Portuguese (Brazil) 29/29/95, Russian 29/29/92, Vietnamese 26/29/92, Chinese (Simplified) 27/27/96, Chinese (Traditional) 29/29/96.

## Description

Chores is a house cleaning schedule and family chore chart that tells you only what's due today.

Pick your rooms, pets, yard and car, then tick the chores you actually do from a list of the usual ones: counters daily, dog walks morning and evening, bathrooms weekly, the lawn weekly, the car wash monthly, the oven every few months. Add your own in a tap. First due dates are spread out, so day one feels like a normal day. Tick a chore off and it reschedules itself.

ONLY WHAT'S DUE
• Today shows what's due and what needs catching up, with how long it should take
• Coming up shows the next seven days. Did something early? Tick it there
• Undo any check-off with one tap

EVERYTHING YOU LOOK AFTER, ON ITS OWN RHYTHM
• Starter chores for the kitchen, bathroom, bedroom, living room, laundry, kids' room, home office, garage, plants, dog, cat, yard, and car
• Just once, daily, every few days, weekly, every two weeks, monthly, every 3 or 6 months, yearly, or any number of days
• Each area shows what's due today and what's overdue, at a glance

SHARE THE CHORES FAIRLY
• Add partners, kids, or roommates, each with their own color
• Assign chores, or turn on Take turns so a chore passes to the next person each time it's done
• Points for every chore and a weekly chart of who did what

PRINTABLE CHORE CHART
• One tap makes a weekly PDF for the fridge: each person's chores with a box for every day they're due

PRIVATE BY DESIGN
• Everything stays on your iPhone. No account, no cloud, no tracking

Free covers up to 3 rooms or areas. Pro unlocks the whole house, pets, yard and car, your whole household, taking turns, and the printable chart. Pro is a Weekly subscription ($4.99/week after 3 days free), a Yearly subscription ($29.99/year after 7 days free), or a one-time Lifetime purchase ($59.99). Subscriptions renew automatically until cancelled in your Apple ID settings.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://bkdigitalleads-cmyk.github.io/chores/privacy.html

## Promotional text (<=170)
Only what's due today, room by room. Share chores with your household, take turns automatically, and print a chore chart for the fridge. Offline, no account.

## What's New (1.0)
First release.

## What's New (1.0.1)
Small fixes and support for launch offers.

## What's New (1.0.3), every listing
Small fixes and improvements.

## Launch offers (1.0.1+)
The app reads `promo.json` from the Chores site on launch. Put a window in it and Pro unlocks (for good, on that iPhone) for anyone who opens the app inside the window:
`{"proFree": {"start": "2026-10-09T04:00:00Z", "end": "2026-10-11T04:00:00Z", "label": "Launch week"}}`
`{}` means no offer. Editing promo.json alone does not trigger an EAS build. First launch waits up to 3 s for the file so the onboarding paywall is skipped; later launches check in the background and show a one-time note.

## Pricing (RevenueCat: entitlement `pro`, offering `default`) - same structure as Attendance Tracker, needs Brian's OK
- `chores_pro_weekly` - auto-renewing, **$4.99/week**, 3 days free - $rc_weekly
- `chores_pro_yearly` - auto-renewing, **$29.99/year**, 7 days free - $rc_annual (primary from 1.0.3: the paywall leads with Yearly)
- `chores_pro_lifetime` - non-consumable, **$59.99** - $rc_lifetime

## App Review notes
Chores is an offline cleaning schedule and chore chart. No account or login. Free includes 3 rooms; Pro (weekly or yearly auto-renewing subscription, or lifetime purchase) unlocks unlimited rooms, household members, rotating chores and the printable chart. The paywall shows on first launch and can be closed with the X at the top right. Terms of Use (EULA) and Privacy Policy links are at the bottom of the paywall, always visible, and in Settings under Purchases & support. Restore purchases is on the paywall and in Settings.

## Screenshot plan (1284x2778, iPhone 6.5")
1. Today list with a few chores ticked: "Only what's due today"
2. Areas with what's due today: "Every room on its own schedule"
3. Chart with two or three people and points: "Share chores. Take turns."
4. Printed chore chart PDF: "Print a chore chart for the fridge"
5. Setup room grid: "Set up your home in one tap"
