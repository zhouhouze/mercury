# V1 Human Product Review Checklist

Human review is required before any full V1 complete candidate claim.

Review metadata:

```yaml
reviewStatus: pending
reviewer:
reviewedAt:
blockingIssues: []
```

Open these reports first:

- `docs/active/project/evidence/v1_mainline_closeout/acceptance-report.html`
- `docs/active/project/evidence/v1_launcher_resize_closeout/acceptance-report.md`
- `docs/active/project/evidence/v1_external_visual_acceptance/acceptance-report.html`
- `docs/active/project/evidence/v1_real_site_complex_pages/acceptance-report.md`

Review tasks:

- [ ] On a normal webpage, launcher visual quality matches the accepted Navia direction.
- [ ] Collapse and expand feel usable and do not block page reading.
- [ ] Resize behavior feels controllable; push / overlay behavior is understandable.
- [ ] Chat page actions remain discoverable.
- [ ] Evidence Card Mindmap and Reading Map are readable.
- [ ] Source evidence makes located / fallback / blocked clear.
- [ ] B站 / 小红书 / 观察者网 behavior is acceptable for the recorded route: public/no-login, attached logged-in profile, or temporary profile with injected auth cookies.
- [ ] No report or UI claims full V1 complete before this review passes.

Known boundaries:

- Public/no-login automation and cookie-injected temporary profile validation are not user-main-profile full logged-in quality validation.
- Old V1.2 closeout report is superseded but still documented.
- Full V1 complete is not claimed by automated acceptance alone.
