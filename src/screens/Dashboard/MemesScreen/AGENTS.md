# Memes

- Memes come from the backend; load demo data with `pnpm seed:memes` in `WatZappa/packages/dev-env` after building it.
- Deck mode hides the footer and compose FAB. Size both visible cards from the measured viewport and safe area, not fixed device dimensions.
- Tapping either card opens the overlay without advancing the deck. Keep the position on dismissal; disable keyboard and wheel navigation while the overlay is open.
