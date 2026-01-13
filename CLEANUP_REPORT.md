# Production Cleanup Report

## FILES TO DELETE (SAFE - Test/Debug Only)

### Test Scripts (Root Level) - 13 files
These are one-off test scripts created during development:
1. test-subscription-features.ts
2. test-subscription-creation.ts
3. test-subscription-api.ts
4. test-signup.ts
5. test-signup-with-sub.ts
6. test-signup-flow.ts
7. test-login.ts
8. test-login-api.ts
9. test-cte-query.ts
10. check-users.ts
11. check-plans-table.ts
12. check-subscription.ts
13. check-table-structure.ts
14. check-usage-table.ts
15. check-latest-signup.ts
16. check-plan-names.ts

### Data Setup Scripts (Root Level) - 6 files
One-off scripts for data manipulation:
1. create-subscription.ts
2. create-test-user.ts
3. update-test-user.ts
4. add-subscription-to-user.ts
5. fetch-user-info.ts
6. verify-signup-subscription.ts

### Old Migration Scripts - 3 files
Superseded by run-migration.ts:
1. run-migration.js (old JS version)
2. run-migration-004.ts (old version)
3. run-migration-004-clean.ts (old version)

### Implementation Documentation - 8 files
Development guides, not needed in production:
1. SUBSCRIPTION-SYSTEM-COMPLETE.md
2. SUBSCRIPTION-SYSTEM-ARCHITECTURE.md
3. SUBSCRIPTION-QUICK-REFERENCE.md
4. SUBSCRIPTION-PHASED-ROLLOUT.md
5. SUBSCRIPTION-IMPLEMENTATION-GUIDE.md
6. PHASE-1-IMPLEMENTATION.md
7. PHASE-2-IMPLEMENTATION.md
8. PHASE-3-IMPLEMENTATION.md
9. PHASE-4-IMPLEMENTATION.md
10. PHASE-5-IMPLEMENTATION.md
11. PHASE-5-QUICK-START.md
12. PHASE-1-2-TEST-RESULTS.md
13. PHASE-5-TEST-RESULTS.md
14. PHASE-5-TESTING-GUIDE.md
15. PHASE2_IMPLEMENTATION_COMPLETE.md
16. CHECKOUT-DEBUG-GUIDE.md
17. PAYMENT-VERIFICATION-GUIDE.md
18. SECURITY_AUDIT_FIXES_COMPLETE.md
19. STRIPE-TYPESCRIPT-FIXES.md
20. STRIPE-INDIA-PAYMENT-STRATEGY.md
21. RAZORPAY-PRIMARY-SETUP.md
22. API-KEYS-SETUP-GUIDE.md
23. FORGOT_PASSWORD_SETUP.md
24. QUICK-KEYS-REFERENCE.md
25. PROJECT-DESCRIPTION.md

### Temporary Files - 1 file
1. CLEANUP_ANALYSIS.md (this analysis file)

## TOTAL FILES TO DELETE: 54 files
## Estimated Size Reduction: ~500KB

## FILES TO KEEP (Critical/Used)

### Server Core
- server/index.ts ✓
- server/db.ts ✓
- server/routes.ts ✓
- server/routes/* (all) ✓
- server/services/* (all) ✓
- server/middleware/* (all) ✓
- server/utils/* (all) ✓
- server/config/* (all) ✓

### Client
- client/src/** (all) ✓

### Shared
- shared/schema.ts ✓
- shared/subscription-schema.ts ✓

### Config & Build
- package.json ✓
- tsconfig.json ✓
- vite.config.ts ✓
- vite-plugin-meta-images.ts ✓
- script/build.ts ✓
- components.json ✓
- postcss.config.js ✓
- jest.config.js ✓

### Database
- server/migrations/* (all) ✓
- run-migration.ts ✓
- drizzle.config.ts ✓

### Python Scripts (AI Generation)
- gemini_image_generate.py ✓
- gemini_room_detect.py ✓
- gemini_shopping_list.py ✓

### Deployment
- vercel.json ✓
- render.yaml ✓
- build.sh ✓
- runtime.txt ✓
- requirements.txt ✓

### Environment
- .env.production.example ✓
- .env.vercel.example ✓

### Other
- .eslintrc.json ✓
- .eslintignore ✓
- .stylelintrc.json ✓
- .yamllint ✓
- .gitignore ✓
- .replit ✓

## SAFETY VERIFICATION

✓ No production routes deleted
✓ No authentication logic deleted
✓ No billing/subscription logic deleted
✓ No database migrations deleted
✓ No API endpoints deleted
✓ No image generation logic deleted
✓ No frontend components deleted
✓ No build configuration deleted
✓ No environment config deleted

## DELETION STRATEGY

Delete in this order (dependencies):
1. Test/Debug scripts (no dependencies)
2. Data setup scripts (no dependencies)
3. Old migration scripts (superseded)
4. Documentation files (no code dependencies)
5. Temporary analysis files

All deletions are safe - these files are not imported anywhere in the codebase.
