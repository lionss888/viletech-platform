# OCR path gate before human UAT

Purpose. Confirm Docling is reachable and the create-wizard recognition banner leaves pending before inviting a person to click through as a client.

Command. From vdp run make ocr-path-gate. Local QG button label is Путь распознавания.

Prerequisites. Compose stack must already be up make compose-up. The gate fails with a short message if core or fe is unreachable. Do not treat green precommit or Pilot Robot Matrix as a substitute.

What it runs. First extraction-docling-smoke against extraction health and recognize. Then Playwright only e2e/ocr-wizard-path.spec.ts upload via filechooser then assert the banner reaches done failed unavailable degraded or auth_lost within the poll timeout. It does not score field quality of Docling.

Merge ready. The OCR journey is outside the narrow PR smoke set. Claiming CI ok after adding or changing this e2e requires make ci-main not only ci-pr or ci-pr-pilot.

Human UAT. Invite manual client checks only after ocr-path-gate is green for the OCR surface.
