// Package formpayment implements the VDP form-payment status machine and role/action matrix.
//
// The fixed transition tables and TargetStatus mapping live in code (methodology).
// ProcessPolicySnapshot overlays root-editable role participation (enabled, mandatory,
// capabilities, priority) without relocating status edges.
//
// Payment-method guards (advance, post_payment + POSTPAY_RATE_ON_PP, PAY_FROM_EXPORT)
// and refund §4 funds-held invariants apply before a transition commits.
// Provider projections omit client PII and agency-contract document refs.
package formpayment
