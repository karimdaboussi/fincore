# FinCore interface direction

## Reference and intent

Adapt the supplied FinCore reference into a usable banking application: deep navy, champagne gold, crisp borders, softly lit panels, a gold brand mark, and a geometric balance motif. DM Sans remains self-hosted; Phosphor remains the icon family; Radix handles modal semantics and keyboard behavior. No new dependencies are required.

## Palette

- Canvas: #070f22
- Primary navy: #071126
- Panel: #101a31
- Raised surface: #162139
- Text: #edf1fa
- Secondary text: #9aa7c1
- Accent: #e4bf7b
- Accent highlight: #ffe0a1
- Border: #29344d

Gold identifies navigation, primary actions, selected controls, and emphasis. Muted green indicates approved/completed/active states; amber indicates pending states; cool blue indicates frozen accounts; rose indicates rejected/closed/error states. Status words and indicators carry meaning independently of color.

`src/theme.css` owns the reference-inspired identity. `src/styles.css` retains the underlying component structure and responsive foundations. `public/gold-weave.svg` is decorative code-generated artwork; its lines have no informational meaning.

## UX mapped to the actual project

- One USD customer account: account overview, balance, status, and account number.
- Customers: send transfers, withdraw, review/filter/export transaction history, and update their name.
- Administrators: review applications, manage account states, add deposits, and review system statistics and transactions.
- Daily outgoing limit: $5,000, resetting at midnight UTC. Displaying the limit does not claim to show the remaining daily allowance.
- Deposits: administrator-only; up to $10,000 per request.
- Customer monetary actions require approval and an active account.
- Every financial action uses the existing review/confirmation/idempotency flow.
- The eye control hides the main overview balance only; it is labeled accordingly.
- Mobile: persistent bottom tabs for frequent tasks, a full navigation drawer, and readable compact transaction rows.
- Demo: clearly labeled sample data with mutations disabled.

The reference's AED currency, multiple account types, cards, beneficiaries, bill payments, investments, wealth products, priority tiers, and performance returns are outside the implemented API. They are not presented as available features. The current interface stays in English; the reference's bilingual layout does not imply complete Arabic localization.

## Interaction and accessibility

Keep visible keyboard focus, labeled inputs, readable errors, status text, and accessible modal titles/descriptions. Review details before a money-moving confirmation. Maintain idempotency keys for uncertain retries. Never introduce decorative buttons without behavior. Restrict effects to short opacity/transform transitions and respect reduced-motion preferences. Mobile navigation must not create duplicate focusable controls while the drawer is open.

## Verification

Production build and seven existing logic tests passed. Eight Chromium browser tests cover the existing flows plus the balance privacy toggle and mobile bottom tabs. Production preview was inspected on desktop and at 360, 390, 768, and 1024 pixels without document-level horizontal overflow. No real customer operations are performed by these checks.
