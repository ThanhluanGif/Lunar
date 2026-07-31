# Auto-Patch Safety Design

## Mục tiêu

Auto-Patch chỉ được phép chuyển một finding từ đề xuất sang “đã vá” khi patch có nguồn gốc rõ ràng, đích file an toàn, không conflict, vượt validation và rescan xác nhận finding mục tiêu giảm. Code do AI sinh ra hoặc trường legacy `patchCode`/`patchedCode` không phải bằng chứng validation.

## Hợp đồng dữ liệu

Khi chưa có patch an toàn, API/scanner phải trả đầy đủ:

```json
{
  "available": false,
  "patchValidated": false,
  "before": null,
  "after": null,
  "unifiedDiff": null,
  "reasonUnavailable": "Generated remediation has not passed validation and rescan.",
  "lifecycleStatus": "triaged"
}
```

Patch có thể Apply phải có tất cả điều kiện:

- `available === true` và `patchValidated === true`.
- `before` và `after` là toàn bộ nội dung file, khác nhau.
- `unifiedDiff` có header chính xác `--- a/<path>` và `+++ b/<path>`, có hunk hợp lệ.
- `lifecycleStatus === "proposed"`.
- `filePath` là relative repository path chuẩn hóa.
- CWE authorization/IDOR còn cần `policyEvidence` mô tả ownership/capability đã được phê duyệt.

Mọi output AI/native hiện tại được normalize về unavailable vì repository chưa có backend patch validator tạo metadata trên. Việc này cố ý fail closed; remediation text vẫn hiển thị nhưng không thể Apply.

## State machine

```text
detected -> triaged -> proposed -> applied -> verified
                         |            |
                         |            +-> rollback -> proposed
                         +-> unavailable/triaged
```

- `detected`: scanner có evidence nhưng chưa xác minh policy/exploitability.
- `triaged`: analyst đã phân loại; patch có thể vẫn unavailable.
- `proposed`: diff và metadata đã qua validator, chưa sửa target.
- `applied`: thay đổi tạm thời đã được áp dụng vào working copy, chưa được gọi “đã vá”.
- `verified`: validation và rescan thành công. Counter “Đã vá” chỉ đếm trạng thái này.

Không có transition trực tiếp từ `detected`/`triaged` sang `applied` hoặc `verified`.

## Pipeline áp dụng patch

1. **Resolve target**: nhận `repositoryRoot` từ server configuration, không từ request. Chuẩn hóa separator; từ chối absolute path, drive path, NUL, backslash mơ hồ, segment rỗng, `.` và `..`.
2. **Containment**: `candidate = resolve(repositoryRoot, filePath)`; yêu cầu `candidate` nằm dưới `repositoryRoot + separator` sau canonicalization.
3. **Symlink defense**: dùng `lstat` cho từng path segment, từ chối symlink; sau khi mở file, so sánh `realpath` của root và target để chặn TOCTOU/symlink escape. Không follow link khi backup/write.
4. **Conflict detection**: nội dung hiện tại phải khớp `before` và hash scan snapshot; GitHub flow còn phải khớp blob SHA. Mismatch trả 409 và yêu cầu rescan.
5. **Backup**: tạo backup trong thư mục QA/private không web-accessible bằng exclusive create, permission tối thiểu; ghi metadata patch/finding/hash. Không ghi secret vào tên file/log.
6. **Apply atomically**: ghi file tạm cùng filesystem, fsync nếu cần, rename atomic. Không dùng shell command hoặc command string.
7. **Validation**: parse/compile theo language allowlist, chạy test đã chọn với executable cố định, `shell:false`, argument array, timeout/output/env bounds và user non-root.
8. **Rescan**: chạy cùng scanner/ruleset và so sánh finding mục tiêu trước/sau. Không chỉ kiểm tra build exit code.
9. **Verify**: chỉ ghi `verified` khi target finding giảm/biến mất và validation pass. Finding khác phát sinh làm patch fail hoặc yêu cầu review tùy policy.
10. **Rollback**: bất kỳ lỗi write, parse, test hoặc rescan nào đều restore backup atomically; lifecycle quay về `proposed`, giữ reason và audit event.

## Implementation hiện có

- `src/services/autoPatchPolicy.js` thực hiện fail-closed contract, repository path validation, virtual-file symlink guard, exact-content conflict check, in-memory backup, rollback và deterministic rescan.
- `src/components/VulnerabilityPatcher.jsx` và `src/components/CodeRepairWorkbench.jsx` ẩn AFTER/unified diff khi unavailable, disable Apply, không dùng placeholder JavaScript cho YAML/code, và chỉ hiển thị “Đã vá” khi verified.
- `src/App.jsx` không còn xóa finding ngay sau click. Nó chỉ cập nhật project khi `applyValidatedPatchToProject` trả `verified`.
- `server/routes/aiRoutes.js` loại patch AI/native khỏi Apply contract; `patchCode` được trả `null` và có `reasonUnavailable`.
- `server/routes/githubRoutes.js` có owner/tier check, path validation, expected blob SHA và exact original-content conflict check trước khi tạo branch/PR. PR không đồng nghĩa patch verified/merged.

Browser chỉ thao tác virtual project files nên không thể chứng minh filesystem `realpath`/permission. Persistent local-repository writer chưa tồn tại và không được mô phỏng bằng UI. Khi bổ sung writer phía server/desktop, bắt buộc triển khai đủ pipeline filesystem ở trên trước khi trả `available:true`.

## Authorization/IDOR policy

“Vá tất cả” gọi `canAutoPatchInBulk`. CWE-285, CWE-639 và CWE-862 bị loại khỏi bulk Apply nếu thiếu `policyEvidence` tối thiểu. Một snippet thêm `verifyToken` không đủ vì có thể phá public webhook/login hoặc vẫn bỏ sót ownership/tenant boundary.

## YAML

Generator GitHub Actions tại `src/services/githubBotService.js` sinh YAML thuần. Auto-Patch không chèn `//` vào YAML; nếu không có patch, UI hiển thị reason ngoài code panel.

## Test bắt buộc

- unavailable shape, legacy patch rejection và invalid unified diff;
- traversal, absolute path, Windows path và symlink rejection;
- conflict khi file thay đổi;
- backup và rollback khi rescan không giảm finding;
- verified transition khi rescan thành công;
- authorization/IDOR bulk block thiếu policy evidence;
- UI không chứa `// Chưa có patch code`.

Các contract trên được chạy bởi `scripts/auto-patch-regression.mjs` và nằm trong `npm run qa:security`/`npm run qa:sast`.
