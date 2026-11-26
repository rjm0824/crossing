# Overdue notice: emergency numbers (DRAFT, not checked)

**Status:** draft for RJ or his attorney to check (design decision D6 in
`docs/designs/live-family.md`). **Nothing here is shown in the app** until a
person has called or confirmed each number with the agency itself. Found by
web search on Nov 26, 2026; the sources disagree, so treat every number below
as unconfirmed.

Planning aid, not for navigation. The family page cannot call for help.

## What the overdue notice would add (draft wording)

> RJ has not arrived by the overdue time, 2:10 PM EST. [last position …]
> This page cannot call for help. **If you are worried, call the US Coast
> Guard on [number], or 911.** If the boat was in Bahamian waters, the
> Bahamas emergency number is [number].

Followers are on land, so the notice gives phone numbers only (VHF channel 16
is for people on boats and is not useful to them).

## Candidates

### United States (Florida side of the crossing)

| Number | Who | Source | Confidence |
| --- | --- | --- | --- |
| **911** | Local emergency services, any US phone | General | High. Always works; they relay to the Coast Guard. |
| (305) 415-6800 | US Coast Guard Southeast District (formerly District 7) Command Center, Miami: "maritime emergency use only" | [uscg.mil unit page](https://www.uscg.mil/home/Unit-Display/Article/1561446/southeast-district-formerly-d7/) (about 16 months old) | Medium. Official page, but the district was renamed and the page may be out of date. |
| (800) 874-7561 | Southeast District Command Center, 24-hour emergency line | [uscg.mil/d7](http://www.uscg.mil/d7/) | Medium. Official, but differs from the line above. |
| (833) 642-7271 | Coast Guard Sector Miami 24-hour Command Center | [Atlantic Area: Sector Miami](https://www.atlanticarea.uscg.mil/Our-Organization/Southeast-District/Units/Sector-Miami/) | Medium. Official; Sector Miami covers the Palm Beach approach. |

### The Bahamas (Abaco side of the crossing)

| Number | Who | Source | Confidence |
| --- | --- | --- | --- |
| **919** or **911** | Bahamas police, fire and ambulance | [Expat Focus](https://www.expatfocus.com/bahamas/guide/bahamas-emergencies), [Trek Medics](https://trekmedics.org/database/bahamas/) | Medium-high. Works from a Bahamian phone; a US follower cannot dial it from the US. |
| (242) 325-8864 | BASRA (Bahamas Air Sea Rescue Association), Nassau headquarters; office hours 9 to 5, emergencies after hours | [SAR Contacts](https://sarcontacts.info/contacts/bahamas-air-sea-rescue-association-basra/), [Bahamas Local](https://www.bahamaslocal.com/showlisting/15708/Bahamas_Air_Sea_Rescue_Association_BASRA.html) | Medium. The most consistent number across sources, but not an official government page. |
| (242) 362-2494 or (242) 362-1818 | Royal Bahamas Defence Force (one guide calls it the primary search and rescue organisation now) | [BoatTEST](https://boattest.com/article/always-prepare-when-cruising-bahamas), [IOM](https://migrantinfo.iom.int/en/node/6406) | Low. Sources disagree on which is the operations line. |

## Recommendation (for RJ to decide)

*   **For a follower in the US, the simplest correct advice is likely "call the
    US Coast Guard on [one checked number], or 911".** The US Coast Guard
    coordinates with the Bahamas for a Florida–Bahamas crossing.
*   **Check one Coast Guard number by calling it** (a non-emergency call
    asking "is this the right number for a family member to report an overdue
    boat crossing from the Bahamas to Palm Beach?"). Use the one they confirm.
*   Leave the Bahamian numbers off the family page unless the attorney advises
    otherwise: followers are in the US, and 919 cannot be dialled from there.
*   Separately, the float plan text RJ sends can name the boat, the route and
    the overdue time; those are what the Coast Guard asks for.

## Before it goes in the app

1.  RJ or the attorney confirms the number(s) and the wording.
2.  A pull request adds them to the overdue notice on the family page and to
    the "Send link to family" message, with `privacy.html` unchanged (no new
    data is collected).
3.  Re-check the numbers once a year (the district was renamed in 2025).
