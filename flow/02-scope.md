# Stage 02 — Scope (go/no-go)

## Impact and grade rubric

| Impact | Meaning |
|---|---|
| H | moves the core promise: users can enter and trust the result |
| M | improves retention or operator efficiency |
| L | nice-to-have |

| Grade | Meaning |
|---|---|
| A | deterministic CRUD/script work |
| B | third-party auth via existing library, file processing, bounded LLM calls, human approval |
| C | custom auth, autonomous agents, payments, realtime or heavy concurrency |

## Gate — check ALL before `/flow next`
- [x] Every feature below has an IMPACT (H/M/L with the business reason) AND a grade (A/B/C)
- [x] No L-impact feature above grade A survives in v1
- [x] The suggested-features section was actually considered (each suggestion has an in/out decision)
- [x] fit(grades, budget) holds — every C in scope is justified
- [x] If the product IS a C feature: it is FIRST in build order, and sibling Cs are cut
- [x] The cut list is written
- [x] GO / KILL decision is written below
- [x] No FILL placeholders remain in this file

## Time budget

Một ngày làm việc, tối đa 8 giờ kỹ thuật cộng một lần operator trực tiếp cấp quyền GitHub cho tài
khoản test. Tối đa 3 AI review calls để không vượt quota mặc định; không mua dịch vụ mới.

## Feature in v1

- **Core trust verification gate** — impact **H** vì GitHub login là cửa vào và scan accuracy là
  lời hứa cốt lõi; grade **B** vì dùng OAuth hiện hữu với human consent, một corpus 40 mẫu, xử lý
  file/report và đúng 3 LLM calls có giới hạn. Đây không phải custom auth hay autonomous pipeline;
  v1 chỉ đo và xuất verdict, không tự sửa production.

Hai lane là thành phần của cùng một release gate và cùng tạo một `CoreTrustBaselineReport`:

1. OAuth live: start → callback/session → `/auth/me` → GitHub status/repositories → logout/401.
2. Scan baseline: 40 labeled cases cho deterministic lane và 3 lần AI review trên cùng corpus.

## Suggested features considered

- **Tự sửa OAuth sau khi test fail** — impact H, grade C nếu thay đổi auth/security; **OUT** vì chưa
  có failure checkpoint để scope đúng và auth change cần card security riêng.
- **Tự thêm scanner rules/prompt tuning** — impact H, grade B; **OUT** vì làm trước baseline sẽ che
  mất false-negative hiện tại và trộn measurement với treatment.
- **So sánh tự động với CodeQL/Semgrep/Snyk** — impact M, grade B; **OUT** vì license/setup và
  normalization khác nhau; benchmark v1 chỉ đo Lunar theo ground truth.

## Cut list

- Không đổi GitHub client/secret, callback, scopes, cookie/session policy hoặc account-linking logic.
- Không sửa scanner rules, AI prompt/model/provider, severity, score hay patch generation.
- Không dùng tài khoản GitHub cá nhân chính; không in token, cookie, OAuth state/code, email, repo
  riêng tư hoặc source benchmark vào report.
- Không kiểm private/org/SSO repositories ở v1; dùng dedicated test account và một public repo.
- Không đưa live OAuth/AI benchmark vào PR CI vì cần người consent, production network và quota.
- Không tuyên bố “đã sửa” khi baseline report là `FAIL` hoặc `BLOCKED`.

## Decision

**GO** — measurement-first gate grade B nằm trong 8 giờ và là điều kiện cần để chia card sửa OAuth
và scanner sau này. Security exposure không được chấp nhận hay bỏ qua: operator phải trực tiếp cấp
quyền, báo cáo phải redact, và C-001 không thay đổi auth.
