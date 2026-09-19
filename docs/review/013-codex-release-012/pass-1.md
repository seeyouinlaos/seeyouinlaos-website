# Codex Adversarial Review

Target: branch diff against main
Verdict: needs-attention

Do not ship: one [high] remains. Switching to Riverside duplicates accommodation charges; removing the stale stay releases the current booking. The 68 targeted tests passed but missed this transition.

Findings:
- [high] [high] Switching wedding hotels leaves the previous priced selection behind (assets/journey.js:25-26)
  Reproduced using the shipped browser modules and in-memory Rooms engine: select wedstay/heritage A, then riverside/superior-window A. The engine correctly holds only Riverside, but the bag retains Souphattra USD 145 plus Riverside USD 60, totaling USD 205. ST.write() removes only P.ids(win), which excludes alternative hotels. Readiness then reports room:wedstay for the stale Souphattra line. Removing that stale line calls leave('wedstay'), releasing the valid Riverside booking and leaving its bag line unheld. Adding Riverside to the segment does not enforce one priced selection per stage.
  Recommendation: After a successful hold, atomically replace all alternative hotel lines belonging to that stage. Ensure removing a stale line cannot release a different current hold. Add integration coverage for switching both directions among all three wedding stays, checking bag total, readiness, and engine occupancy.

Next steps:
- Fix stage-wide bag replacement and stale-line removal, then rerun the three-hotel transition tests before release.
