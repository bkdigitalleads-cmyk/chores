# Chores audit (Oct 15 2026)
## Findings
1. [MED] Today tab shows yesterday's list when the app is reopened the next day
   - Where: src/screens/Today.tsx:39-57 (today and load only change on re-render) and :92 (date line); nothing in the app listens for AppState
   - What happens: The user ticks chores off at night, and the app stays suspended in memory. Next morning they open it and still see yesterday's date, "All caught up" and yesterday's done list. None of today's chores show until they switch tabs or tick something. This is the core daily screen.
   - Fix: In Today, subscribe to AppState 'change' and call load() (or bumpData()) when the state becomes 'active'. Recompute today inside load from todayIso().
2. [MED] The printed chart puts every occurrence of a "take turns" chore under the current person
   - Where: src/chart.ts:72-77 (sections are grouped by t.memberId for every due day from dueDaysInWeek)
   - What happens: Daily dishes rotating between Sam and Alex print all 7 boxes in Sam's section. In the app, completeTask (db.ts:385-391) hands it to Alex after each check-off. The fridge chart contradicts the rotation, which is a headline Pro feature.
   - Fix: For tasks with rotate, assign the k-th due day in the week to members[(start + k) % members.length], where start is the index of t.memberId (the same order completeTask uses). The simpler option is to list rotating chores in the shared section labelled "Taking turns".
3. [MED] Assigning a chore from inside an Area opens no paywall, and the paywall then stays dead for the rest of the session
   - Where: src/screens/TaskEditor.tsx:166-170, when this TaskEditor is the one nested in RoomDetail (src/screens/Rooms.tsx:376)
   - What happens: A user whose Pro lapsed, so household members still exist, opens Areas > Kitchen > a chore and taps a person. pickMember closes only the TaskEditor. 450 ms later showPaywall() presents the root PaywallModal (App.tsx:136) while RoomDetail's pageSheet is still up, and UIKit refuses. The Fabric modal host still records itself as presented, so paywallVisible stays true. Later upgrade taps (Chart "Add a person", Print, Settings upsell, Add an area) do nothing until the app is killed. The Today-tab editor at App.tsx:135 works, because no other modal is up there.
   - Fix: Give TaskEditor an optional onRequirePro prop. RoomDetail passes one that closes the editor and the room sheet (onClose) and then calls setTimeout(showPaywall, 450). TaskEditor calls it in place of its own showPaywall.
4. [LOW] Quitting the app during the last onboarding question re-runs setup and duplicates every area and chore
   - Where: src/screens/Setup.tsx:52 writes the areas immediately; ONBOARDED_KEY is only set in finishOnboarding (App.tsx:75), after the attribution question
   - What happens: The user picks Kitchen, Bathroom and Bedroom, then swipes the app away at "Where did you hear about us". On relaunch they go through paywall and Setup again, and the database ends up with two Kitchens with duplicate chores. A free user can end up with 6 areas (Setup only counts this run's picks).
   - Fix: Persist ONBOARDED_KEY (or a separate setupDone key that skips Setup) as soon as createAreas succeeds.
5. [LOW] Undo of a check-off silently fails if the assignee was removed the same day
   - Where: src/db.ts:414-420 (restores member_id = prev_member_id, which is not a foreign key and can point at a deleted member); src/screens/Today.tsx:84-90 has no catch
   - What happens: The user completes Sam's chore, removes Sam on the Chart tab, then taps the check to undo. The UPDATE hits the tasks.member_id foreign key, the transaction rolls back, the promise rejects unhandled, and nothing changes on screen.
   - Fix: In undoCompletion, restore `member_id = (SELECT id FROM members WHERE id = ?)` (or null when the member is gone).

## Checked and fine
- purchases usage: isPro = purchased OR promo grant; restore only touches the purchased half, so it never revokes a launch-offer grant; Paywall buy/restore handling is the same as Attend
- promo.ts: JSON.parse is guarded; fetch has a timeout and abort; window check handles NaN and the end boundary. The repo's promo.json is {} (no open window), and the live file could not be checked from here
- Free-tier gating: 3 areas (Rooms.tsx:110, Setup.tsx:32); household, assignment and print behind Pro; first-chore auto "Home" area only when there are no rooms
- Rating prompt: fires once after the first completed check-off (actions.ts:18) and after the first printed chart; the asked flag is stored before the request
- db.ts: single v1 schema with no post-release column changes (git log); complete and undo run in transactions and restore the schedule exactly; a one-time chore uses the DONE_FOREVER sentinel and is excluded from lists
- Dates: local YYYY-MM-DD everywhere; daysBetween uses UTC math on date parts, so DST is safe; week start honors the mondayFirst setting
- PDF chart: HTML escaped; Sharing availability checked; errors caught with an alert
- TaskEditor on the Today tab closes before opening the paywall (works)
