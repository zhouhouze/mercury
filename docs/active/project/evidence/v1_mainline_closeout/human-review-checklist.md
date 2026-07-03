# V1 Human Product Review Checklist

Human review is required before any full V1 complete candidate claim.

Current decision: PASSED for V1 MVP scope.

Review metadata:

```yaml
reviewStatus: passed
reviewer: "Human product owner, confirmed in Codex session"
reviewedAt: "2026-07-03T16:54:41+08:00"
recordedBy: "Codex"
blockingIssues: []
decisionBasis:
  - "Human review confirmed the basic MVP experience is acceptable."
  - "Human confirmed the current state can be recorded as V1 complete."
  - "Automation evidence passed for V1 mainline closeout and CQ strict real-site acceptance."
allowedClaim: "V1 complete for MVP current-page companion-reading scope."
notClaimed:
  - "Final Monica-like UX complete."
  - "All complex sites high-quality complete."
  - "Video / audio / image pixel content understanding complete."
  - "V2 Memory / RAG / Web Research / PPT / Deep Research ready."
```

Open these reports first:

- `docs/active/project/evidence/v1_mainline_closeout/acceptance-report.html`
- `docs/active/project/evidence/v1_mainline_closeout/hr-cc-acceptance-2026-07-02.md`
- `docs/active/project/evidence/v1_launcher_resize_closeout/acceptance-report.md`
- `docs/active/project/evidence/v1_external_visual_acceptance/acceptance-report.html`
- `docs/active/project/evidence/v1_real_site_complex_pages/acceptance-report.md`

Review tasks:

- [x] On a normal webpage, launcher visual quality matches the accepted Navia direction.
- [x] Collapse and expand feel usable and do not block page reading.
- [x] Resize behavior feels controllable; push / overlay behavior is understandable.
- [x] Chat page actions remain discoverable.
- [x] Evidence Card Mindmap and Reading Map are readable for MVP use.
- [x] Source evidence makes located / fallback / blocked clear enough for MVP use.
- [x] B站 / 小红书 / 观察者网 behavior is acceptable for the recorded route: public/no-login, attached logged-in profile, or temporary profile with injected auth cookies.
- [x] Full V1 complete is recorded only after this human review passes, and only within the V1 MVP scope.

Known boundaries:

- Public/no-login automation and cookie-injected temporary profile validation are not user-main-profile full logged-in quality validation.
- Old V1.2 closeout report is superseded but still documented.
- Full V1 complete is not claimed by automated acceptance alone; it is recorded after this human product review passed.
- Remaining quality issues in source jumpback precision and mindmap accuracy are post-V1 hardening items, not blocking V1 MVP completion after this review.
