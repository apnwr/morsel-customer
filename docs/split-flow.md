# Split Flow

Visual flowcharts for the bill splitting system.

---

## 1. Main Split Flow

```
                          +------------------+
                          |    Page Load     |
                          +--------+---------+
                                   |
                                   v
                     +---------------------------+
                     | localStorage hydrates     |
                     | SplitContext (morsel_split)|
                     +-------------+-------------+
                                   |
                                   v
                     +---------------------------+
                     | ParticipantsList mounts   |
                     | SessionContext /session   |
                     | REST poll (every 10s)     |
                     | syncs participants ->     |
                     | SplitContext              |
                     | (NOT Firebase — TODO       |
                     |  to switch later)         |
                     +-------------+-------------+
                                   |
                                   v
                     +---------------------------+
                     | Bill API fetched          |
                     | GET /session/{id}/bill    |
                     | billTotal = taxes +       |
                     | charges + items - discount|
                     +-------------+-------------+
                                   |
                                   v
                     +---------------------------+
                     | calculateSplit(billTotal) |
                     | runs per current mode     |
                     +-------------+-------------+
                                   |
                    +--------------+--------------+
                    |                             |
                    v                             v
          +-----------------+          +-------------------+
          | even/all/self/  |          | items mode        |
          | custom mode     |          | NO-OP             |
          | recalculates    |          | preserves shares  |
          | shares          |          | from picker       |
          +--------+--------+          +---------+---------+
                    |                             |
                    +-------------+---------------+
                                  |
                                  v
                     +---------------------------+
                     | UI renders:               |
                     | ParticipantsList card     |
                     | with avatars + amounts    |
                     +---------------------------+
```

---

## 2. Modal Open + Mode Selection

```
                     +---------------------------+
                     | User taps                 |
                     | ParticipantsList card     |
                     +-------------+-------------+
                                   |
                                   v
                     +---------------------------+
                     | SplitSettingsModal opens  |
                     | localMode = split.mode    |
                     | localShares = split.shares|
                     +-------------+-------------+
                                   |
                                   v
                     +---------------------------+
                     | User selects a mode       |
                     +-------------+-------------+
                                   |
              +----------+---------+----------+----------+
              |          |         |          |          |
              v          v         v          v          v
         +--------+ +--------+ +------+ +--------+ +-------+
         | even   | | all    | | self | | custom | | items |
         +---+----+ +---+----+ +--+---+ +---+----+ +---+---+
             |          |         |          |          |
             v          v         v          v          v
         +--------+ +--------+ +------+ +--------+ +-------+
         |useEffect| |useEffect| |useEff| | SKIP  | | SKIP  |
         |recalc  | |recalc  | |recalc| |user   | |open   |
         |local   | |local   | |local | |edits  | |Picker |
         |shares  | |shares  | |shares| |inputs | |Sheet  |
         +---+----+ +---+----+ +--+---+ +---+----+ +---+---+
             |          |         |          |          |
             +----+-----+---------+----------+     (see flow 3)
                  |                          |
                  v                          v
         +------------------+    +---------------------+
         | localShares      |    | localShares         |
         | updated by       |    | updated by          |
         | useEffect        |    | user input / picker |
         +--------+---------+    +----------+----------+
                  |                          |
                  +-----------+--------------+
                              |
                              v
                  +---------------------------+
                  | User clicks [Save]        |
                  +---------------------------+
                              |
                     (see flow 4)
```

---

## 3. Itemized Picker Flow

```
                     +---------------------------+
                     | User taps "Pay for items" |
                     +-------------+-------------+
                                   |
                         +---------+---------+
                         | setLocalMode      |
                         | ('items')         |
                         | setShowPicker     |
                         | (true)            |
                         +---------+---------+
                                   |
                                   v
                     +---------------------------+
                     | ItemizedPickerSheet opens |
                     +-------------+-------------+
                                   |
                                   v
                     +---------------------------+
                     | Fetch session detail:     |
                     |   getSessionById()        |
                     | (ItemizedPickerSheet      |
                     |  :81-85)                  |
                     |                           |
                     | Bill is NOT fetched here  |
                     | — read from the shared    |
                     | useSessionBill() cache    |
                     +-------------+-------------+
                                   |
                                   v
                     +---------------------------+
                     | Flatten all orders into   |
                     | single item list          |
                     | (name, qty, unitPrice,    |
                     |  orderedBy)               |
                     +-------------+-------------+
                                   |
                                   v
                     +---------------------------+
                     | User selects items:       |
                     |                           |
                     | [x] Burger    x1  $12.00  |
                     | [ ] Fries     x1   $5.00  |
                     | [x] Drink    x1   $4.00  |
                     | [L] Pizza (claimed by Raj)|
                     +-------------+-------------+
                                   |
                                   v
                     +---------------------------+
                     | Pro-rata tax calculation:  |
                     |                           |
                     | proportion =              |
                     |   yourSubtotal /          |
                     |   sessionSubtotal         |
                     |                           |
                     | yourTax =                 |
                     |   totalTax * proportion   |
                     |                           |
                     | yourCharges =             |
                     |   totalCharges *          |
                     |   proportion              |
                     |                           |
                     | yourDiscount =            |
                     |   totalDiscount *         |
                     |   proportion              |
                     |                           |
                     | yourTotal =               |
                     |   subtotal + tax +        |
                     |   charges - discount      |
                     +-------------+-------------+
                                   |
                                   v
                     +---------------------------+
                     | Footer shows:             |
                     |                           |
                     | Items            $16.00   |
                     | Tax              +$0.80   |
                     | Charges          +$1.60   |
                     | Discount         -$0.00   |
                     | ───────────────────────── |
                     | Your total       $18.40   |
                     | $11.60 remaining          |
                     +-------------+-------------+
                                   |
                                   v
                     +---------------------------+
                     | User clicks               |
                     | [Confirm Selection]        |
                     +-------------+-------------+
                                   |
                    +--------------+--------------+
                    |              |              |
                    v              v              v
          +---------------+ +------------+ +-----------+
          | setItemized   | | updateShare| | onConfirm |
          | Selection     | | (userId,   | | (shares)  |
          | (userId,      | |  $18.40)   | | passes to |
          | [itemKeys])   | | updateShare| | modal     |
          |               | | (other,    | |           |
          | persisted to  | |  $11.60)   | |           |
          | localStorage  | |            | |           |
          +---------------+ +------------+ +-----+-----+
                                                 |
                                                 v
                                   +---------------------------+
                                   | Modal receives shares:    |
                                   | setLocalShares({          |
                                   |   userId: "18.40",        |
                                   |   other:  "11.60"         |
                                   | })                        |
                                   |                           |
                                   | useEffect SKIPPED         |
                                   | (items mode excluded)     |
                                   | localShares PRESERVED     |
                                   +---------------------------+
```

---

## 4. Save + Server Sync Flow

```
                     +---------------------------+
                     | User clicks [Save]        |
                     +-------------+-------------+
                                   |
                    +---------+----+----+---------+
                    |         |         |         |
                    v         v         v         v
              +---------+ +-------+ +-------+ +--------+
              |setSplit | |update | |setSplit| | sync   |
              |Mode     | |Share  | |ForTotal| | ToSrvr |
              |(local   | |(each  | |(eff   | |(async) |
              | Mode)   | | p.)   | | Total)| |        |
              +---------+ +-------+ +-------+ +---+----+
                                                   |
                                                   v
                                   +---------------------------+
                                   | syncSplitToServer(        |
                                   |   sessionId,              |
                                   |   localMode,              |
                                   |   sharesSnapshot,         |
                                   |   participants            |
                                   | )                         |
                                   +-------------+-------------+
                                                 |
                              +------------------+------------------+
                              |                  |                  |
                              v                  v                  v
                    +------------------+  +------------+  +------------------------+
                    | even             |  | self       |  | items                  |
                    | { type:"equal",  |  | { type:    |  | { type:"itemized",     |
                    |   numberOfSplits,|  | "partici-  |  |   numberOfSplits,      |
                    |   amounts }      |  |  pant",    |  |   amounts,             |
                    +------------------+  |  numberOf- |  |   itemIds:[{itemId,    |
                              |           |  Splits,   |  |     orderId,quantity}],|
                    +------------------+  |  amounts } |  |   sessionUserId }      |
                    | all / custom     |  +------------+  +------------------------+
                    | { type:"custom", |        |                  |
                    |   numberOfSplits,|        |                  |
                    |   amounts }      |        |                  |
                    +------------------+        |                  |
                              |                 |                  |
                              +--------+--------+---------+--------+
                                       |
              (ALL modes send numberOfSplits + amounts; itemized
               additionally sends itemIds[] + sessionUserId)
                                       |
                                       v
                         +---------------------------+
                         | await POST                |
                         | /ordering-session/        |
                         | session/{id}/split        |
                         | (syncSplitToServer AWAITS  |
                         |  and RETHROWS on failure)  |
                         +-------------+-------------+
                                       |
                              +--------+--------+
                              |                 |
                              v                 v
                     +-----------------+  +-----------------------+
                     | Success:        |  | Failure (rethrown):   |
                     | setServerSplits |  | SplitSettingsModal    |
                     | + refreshSession|  | catches, shows        |
                     | Data()          |  | "Couldn't save split  |
                     |                 |  | — check your          |
                     |                 |  | connection and try    |
                     |                 |  | again." Modal STAYS   |
                     |                 |  | OPEN for retry.       |
                     +-----------------+  +-----------------------+
```

---

## 5. Persistence Layer

```
     +--------------------+          +--------------------+
     |    localStorage    |          |      Server        |
     +--------------------+          +--------------------+
     |                    |          |                    |
     | morsel_split       |          | POST /session/     |
     | {                  |          |   {id}/split       |
     |   mode: "items",   |  sync   |                    |
     |   participants: [],|--------->| Stores split +     |
     |   shares: {},      |         | paid status per    |
     |   isValid: true,   |         | participant        |
     |   splitForTotal: n |         |                    |
     | }                  |         | Used by business   |
     |                    |         | dashboard to       |
     | morsel_itemized_   |         | mark splits as     |
     | selections         |         | paid via PUT       |
     | {                  |         | .../split/{idx}/pay|
     |   participantId:   |         |                    |
     |     [key1, key2]   |         |                    |
     | }                  |         |                    |
     +--------------------+         +--------------------+
             |                               |
             v                               v
     +--------------------+         +--------------------+
     | Instant hydration  |         | Business dashboard |
     | on page load /     |         | can see split +    |
     | refresh            |         | collect payments   |
     +--------------------+         +--------------------+
```

---

## 6. Ownership Rules

```
     +-------------------+------------------------------------------+
     | Component         | What it owns                             |
     +-------------------+------------------------------------------+
     |                   |                                          |
     | ParticipantsList  | Calls calculateSplit() on re-render      |
     |                   | Syncs participants from SessionContext   |
     |                   | /session REST poll into SplitContext     |
     |                   | (NOT Firebase — TODO to switch later)    |
     |                   | Opens SplitSettingsModal                 |
     |                   |                                          |
     | SplitContext      | calculateSplit():                        |
     | .calculateSplit() |   even/all/self/custom -> recalculates   |
     |                   |   items -> NO-OP (returns prev.shares)   |
     |                   |                                          |
     | SplitSettings     | useEffect recalculates localShares:      |
     | Modal useEffect   |   even/all/self -> recalculates          |
     |                   |   custom/items -> SKIPPED                 |
     |                   |                                          |
     | SplitSettings     | Commits localMode + localShares to       |
     | Modal handleSave  | context. Fires syncSplitToServer with    |
     |                   | explicit values (no stale closures).     |
     |                   |                                          |
     | ItemizedPicker    | SOLE OWNER of shares in items mode.      |
     | Sheet             | Sets shares via updateShare() +          |
     |                   | passes them to modal via onConfirm().    |
     |                   | Fetches session detail + bill.           |
     |                   | Calculates pro-rata tax/charges.         |
     |                   |                                          |
     +-------------------+------------------------------------------+
```

---

## 7. Item States in Picker

```
     +------------------+----------+--------------+
     | State            | Visual   | Interaction  |
     +------------------+----------+--------------+
     |                  |          |              |
     | available        |  [ ]     | Tappable     |
     | (no one claimed) | white bg | checkbox     |
     |                  |          |              |
     | selected         |  [x]     | Tappable     |
     | (you picked it)  | gray bg  | to deselect  |
     |                  | black cb |              |
     |                  |          |              |
     | claimed          |  [L]     | Disabled     |
     | (other picked)   | gray bg  | shows name   |
     |                  | lock icon| of claimer   |
     |                  | 60% opac |              |
     |                  |          |              |
     | qty > 1          | [-] 2/3  | Stepper      |
     | (partial select) | [+]      | inc/dec      |
     |                  |          |              |
     +------------------+----------+--------------+
```
