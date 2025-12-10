# Bounteous Air - Synthetic Data Pack for AI Demo

**Purpose:** Realistic airline policies and operational data to demonstrate "Experience Orchestration" and complex AI reasoning.

---

## Document 1: Disruption & Compensation Policy (The "Rules")

### Section 5: Flight Cancellations & Delays

**5.1 Rebooking Priority**
In the event of a cancellation, passengers are rebooked based on the following priority tier:
1.  **Tier 1:** Platinum & Gold Elite members, and passengers requiring special assistance (including those traveling with infants/children).
2.  **Tier 2:** Silver members and Premium Economy passengers.
3.  **Tier 3:** Standard Economy passengers.

**5.2 Class of Service Upgrades**
If a passenger's original cabin class is full on the next available flight:
*   **Platinum Members:** Authorized for **complimentary upgrade** to the next class of service (e.g., Economy → Business) to secure a seat.
*   **All Other Passengers:** Must be booked on the next flight with availability in their original class, or offered a downgrade with compensation.

**5.3 Compensation & Care (EU/UK Departures)**
For delays exceeding certain thresholds, Bounteous Air provides:
*   **Delay > 2 Hours:** Complimentary refreshments and communication.
*   **Delay > 4 Hours:** A meal voucher valued at **£25 per person** (£50 for Platinum/Gold).
*   **Overnight Delay:** Hotel accommodation and transport.

---

## Document 2: Live Flight Schedule (The "Options")

**Route:** London Heathrow (LHR) → New York (JFK)
**Date:** Today

| Flight | Departs | Arrives | Status | Economy | Business | First |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BA123** | 10:00 AM | 1:00 PM | **CANCELLED** | - | - | - |
| **BA125** | 2:00 PM | 5:00 PM | On Time | **FULL** | 2 Seats | 4 Seats |
| **BA127** | 4:00 PM | 7:00 PM | On Time | **FULL** | 5 Seats | Full |
| **BA129** | 6:00 PM | 9:00 PM | On Time | 45 Seats | 12 Seats | 8 Seats |
| **BA131** | 8:00 PM | 11:00 PM | On Time | 120 Seats | 20 Seats | 10 Seats |

---

## Document 3: Passenger Profile (The "Context")

**Passenger Name:** Sarah Jenkins
**Frequent Flyer ID:** BA-99887766
**Status:** **Platinum Elite**
**Current Itinerary:** Flight BA123 (LHR → JFK) in **Economy Class**
**Companions:** Traveling with child (Age 4) - Ticket ID: BA-99887767
**Wallet Balance:** 50,000 Miles
**Preferences:** Aisle Seat, Vegetarian Meal

---

## Document 4: Partner Airline Agreement (The "Complexity")

**4.1 Interline Rebooking**
Bounteous Air has interline agreements with **Virgin Atlantic** and **Delta Airlines**.
*   **Rule:** We can rebook passengers on partner airlines ONLY if no Bounteous Air flight is available within **6 hours** of the original departure.
*   **Exception:** Platinum members may request a partner rebook if it saves more than **2 hours** of delay compared to the best Bounteous Air option.

---

## Demo Scenario Logic (For the AI)

**The Problem:**
Sarah's flight (BA123, 10:00 AM) is cancelled. She needs to get to JFK.

**The Reasoning Chain:**
1.  **Identify Priority:** Sarah is Platinum AND traveling with a child. She is **Tier 1 priority**.
2.  **Check Options:**
    *   **BA125 (2:00 PM):** Economy is FULL. Business has 2 seats.
    *   **BA127 (4:00 PM):** Economy is FULL. Business has 5 seats.
    *   **BA129 (6:00 PM):** Economy has space.
3.  **Apply Policy (The "Magic"):**
    *   Standard logic would book her on BA129 (6:00 PM) because Economy is open.
    *   **Platinum Logic:** Policy 5.2 allows free upgrade if Economy is full.
    *   **Result:** AI can offer BA125 (2:00 PM) or BA127 (4:00 PM) in **Business Class** for free.
4.  **Compensation:** Delay is > 4 hours (10 AM to 2 PM+). Policy 5.3 grants **£50 meal voucher** (Platinum rate).

**The "Hero" Response:**
"Sarah, I'm sorry your 10 AM flight was cancelled. Since you're a Platinum member traveling with a child, I've prioritized you.

The next flights at 2 PM and 4 PM are full in Economy, but **I have upgraded you and your child to Business Class on the 2 PM flight (BA125) at no extra cost.**

I've also added a **£50 meal voucher** to your account for lunch while you wait. Shall I send the new boarding passes?"
