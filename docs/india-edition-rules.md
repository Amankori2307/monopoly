# Monopoly India Edition Rules Capture

Last updated: August 29, 2026

## Source precedence

1. User product requirements
2. Uploaded Monopoly India Edition booklet and board images
3. Official Monopoly internet sources for gaps

## Locked digital adaptations

- Rent is auto-collected when owed.
- Building and trading are exposed during safe UI windows instead of interrupt-anytime actions.
- Speed Die is intentionally deferred.

## India Edition board mapping

- GO: collect `₹200`
- Income Tax: pay `₹200`
- Super Tax: pay `₹100`
- Jail release payment: `₹50`
- Auction opening bid: `₹10`

The symbol itself is `ThemeConfig.currencySymbol` (`₹` for this edition), not a literal in the copy — see `DEFAULT_CURRENCY_SYMBOL` and `formatMoney`.

- Free Parking: no jackpot
- Buy/decline applies to streets, railway stations, and utilities
- 40 board spaces
- 28 title deeds
- 4 railway stations
- 2 utilities
- 3 Chance
- 3 Community Chest

## Space order

1. GO
2. Guwahati
3. Community Chest
4. Bhubaneshwar
5. Income Tax
6. Chennai Central Railway Station
7. Panaji (Goa)
8. Chance
9. Agra
10. Vadodara
11. Jail / Just Visiting
12. Ludhiana
13. Electric Company
14. Patna
15. Bhopal
16. Howrah Railway Station
17. Indore
18. Community Chest
19. Nagpur
20. Kochi
21. Free Parking
22. Lucknow
23. Chance
24. Chandigarh
25. Jaipur
26. New Delhi Railway Station
27. Ahmedabad
28. Water Works
29. Hyderabad
30. Pune
31. Go To Jail
32. Kolkata
33. Chennai
34. Community Chest
35. Bengaluru
36. Chhatrapati Shivaji Terminus
37. Chance
38. Delhi
39. Super Tax
40. Mumbai

## Current implementation status

- Implemented:
  - Setup flow for 2-8 players
  - Unique game id creation
  - Save/resume/delete through localStorage
  - India Edition board and classic-equivalent economics mapping
  - Two-dice turn flow
  - Passing GO
  - Taxes
  - Go To Jail
  - Chance and Community Chest deck data
  - Buy or decline unowned asset
  - Mandatory auction flow
  - Railway and utility rent
  - Jail choices and release attempts
  - Unit, integration, and Playwright smoke coverage
- Scaffolded next:
  - Mortgages
  - Building houses and hotels
  - Trades
  - Asset liquidation
  - Bankruptcy resolution
  - Speed Die
