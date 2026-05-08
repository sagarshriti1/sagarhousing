## Plan

In `src/pages/PropertyDetail.tsx`, after a successful inquiry send, clear the form fields by resetting `inquiry` state to `{ name: "", email: "", phone: "", message: "" }`.

This is added inside `handleInquirySubmit` right after `setInquirySent(true)` (in both the success branch and the fallback branch), so the four inputs (Name, Email, Phone, Message) all empty out once "Message Sent!" appears.

Existing button reset behavior is preserved: typing in Name or Message after sending re-enables the button (already handled by `updateInquiry`).
