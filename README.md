# Final-Project
Web Programming Final Project

# Local Development
1. Install dependencies: `npm install`.
2. Create a `.env` file in the project root and add your Mongo connection string:
   ```
   MONGODB_URI=mongodb+srv://convo_db_user:POkT9iC7EiEE1rcw@cluster0.bpzjy1i.mongodb.net/retryWrites=true&w=majority&appName=Cluster0
   ```
   (The same variable must be configured in Netlify’s environment settings before deploying.)
3. Start the unified frontend + API dev server: `npm run dev`.  
   Netlify Dev will serve the Vite app and proxy the serverless API at `http://localhost:8888/.netlify/functions/api/*`.
4. Visit `http://localhost:8888` in your browser for the full experience. Press `Ctrl+C` to stop.

# Build
- `npm run build` – generate the production bundle in `dist/`.
- `npm run preview` – preview the built app locally.

# Final Report

## Backend API Documentation

> All endpoints are served through Netlify Functions.
> **Base path (dev & prod):** `/.netlify/functions/api`
> So `GET /ping` is actually requested as `GET /.netlify/functions/api/ping`.

Unless otherwise noted, all endpoints return JSON.

---

### Health

#### `GET /ping`

Simple health check.

* **Response:** `200 OK` with body `"pong"`.

---

## Authentication & Users

### Register & Login

#### `POST /register`

Create a new user.

* **Body (JSON)**

```json
{
  "username": "tester1",
  "email": "test@example.com",
  "password": "secret",
  "firstName": "Test",
  "lastName": "Person"
}
```

* **Responses**

  * `200 OK` – `{ message, user }`
  * `400` – missing fields or duplicate `username` / `email`
  * `500` – DB error

#### `POST /login`

Log in with username + password.

* **Body**

```json
{
  "username": "tester1",
  "password": "secret"
}
```

* **Responses**

  * `200 OK` – `{ message, user }`
  * `400` – missing username or password
  * `401` – invalid credentials

> NOTE: Authentication is username/password only; there is no session/JWT layer in this file.

---

### User Profile

#### `GET /users/:username`

Fetch a public-ish view of a user.

* **Params:** `:username` – required
* **Response (`200`)**

```json
{
  "user": {
    "_id": "...",
    "username": "tester1",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "Person",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

(Password and notifications are intentionally omitted.)

---

#### `PATCH /users/:username`

Update a user’s profile (used by the profile page).

* **Params:** `:username` – current username
* **Body**

```json
{
  "firstName": "NewFirst",
  "lastName": "NewLast",
  "email": "new@example.com",
  "username": "newUsername",   // new username
  "password": "optionalNewPw"  // optional: only updated if non-blank
}
```

* **Behavior**

  * All of `firstName`, `lastName`, `email`, and new `username` are required and must be non-blank strings.
  * If `username` is changed, backend enforces uniqueness.
* **Responses**

  * `200` – `{ message: "Profile updated", user: <sanitized user> }`
  * `400` – missing fields or username already taken
  * `404` – user not found

---

#### `PUT /update`

Legacy/simple endpoint for changing **only** first and last name.

* **Body**

```json
{
  "username": "tester1",
  "firstName": "NewFirst",
  "lastName": "NewLast"
}
```

* **Responses**

  * `200` – `{ message: "Name change successful", user }`
  * `400` – missing first/last name

#### `PUT /update/bio`

Update a short bio for a user.

* **Body**

```json
{
  "username": "tester1",
  "bio": "This is my bio."
}
```

* **Responses**

  * `200` – `{ message: "Bio updated successfully", user }`
  * `404` – user not found

---

## Notifications (Inbox)

Notifications are stored on the `User` document under `notifications`.

#### `GET /notifications?username=<username>`

Fetch a user’s notifications, newest first.

* **Query params**

  * `username` – required
* **Responses**

  * `200` – `{ notifications: [...] }`
  * `400` – missing username
  * `404` – user not found

Each notification looks like:

```json
{
  "_id": "...",
  "type": "addedToMeeting",
  "message": "You have been added to meeting \"tester4\" as member by mhmehler.",
  "meetingCode": "EF29JZ",
  "meetingTitle": "tester4",
  "role": "member",
  "addedBy": "mhmehler",
  "createdAt": "...",
  "read": false
}
```

#### `POST /notifications/mark-read`

Mark one or all notifications as read.

* **Body options**

Mark a single notification:

```json
{
  "username": "tester1",
  "notificationId": "64...."
}
```

Mark all as read:

```json
{
  "username": "tester1",
  "all": true
}
```

* **Responses**

  * `200` – `{ notifications: [...] }` (updated, sorted newest first)
  * `400` – missing username, or neither `notificationId` nor `all` provided
  * `404` – user or notification not found

---

## Meeting APIs

> Meetings are the central objects that contain participants, motions, messages, and summary.

### Create / List / Fetch

#### `POST /meetings`

Create a new meeting.

* **Body**

```json
{
  "title": "Team Sync",
  "username": "creatorUsername",
  "displayName": "Creator Name"   // optional, default = username
}
```

* **Behavior**

  * Generates a 6-character `code` (e.g. `EF29JZ`), retries a few times if collision.
  * Creates meeting with:

    * `open: true`
    * `creator: username`
    * `participants: [{ username, role: "owner", displayName }]`
* **Response `201`**

```json
{
  "message": "Meeting created",
  "meeting": { ...full meeting doc... }
}
```

---

#### `GET /meetings?username=<username>&view=<my|recent>`

Fetch meetings for a user.

* **Query params**

  * `username` – required
  * `view` – optional; `"my"` (default) or `"recent"`

* **Behavior**

  * Both views only consider meetings where the user appears in `participants`.
  * **`view=my`**: returns meetings the user participates in, sorted by `createdAt` descending.

    * (Front-end uses this as “My Meetings”; owner filtering happens in UI.)
  * **`view=recent`**: returns up to 10 most recently updated meetings, sorted by `updatedAt` descending, and adds an `owner` field (using `creator` or first owner/chair).

* **Response**

```json
{
  "meetings": [
    {
      "_id": "...",
      "title": "tester5",
      "code": "9A6HVY",
      "creator": "michaelmehler",
      "participants": [...],
      "createdAt": "...",
      "updatedAt": "...",
      "owner": "michaelmehler"   // only in view=recent
    }
  ]
}
```

---

#### `GET /meetings/:code`

Fetch a single meeting by its join code.

* **Params:** `:code` – meeting code (case-insensitive)
* **Response**

  * `200` – `{ meeting }`
  * `404` – not found

---

### Joining & Managing Participants

#### `POST /meetings/join`

Generic join endpoint used by the UI.

* **Body**

```json
{
  "code": "EF29JZ",
  "username": "tester1",
  "displayName": "Test Person"   // optional
}
```

* **Behavior**

  * Adds/updates the user in `participants` with role `member` by default.
  * If meeting is adjourned, returns `400` with message `"Meeting has been adjourned. No further changes are allowed."`
* **Response**

```json
{
  "meeting": { ... },
  "role": "member",
  "displayName": "Test Person"
}
```

---

#### `POST /meetings/:code/join`

Variant of join that uses the URL param instead of body for `code`.

* **Params:** `:code`
* **Body**

```json
{
  "username": "tester1",
  "displayName": "Test Person"   // optional
}
```

* **Response**

```json
{
  "message": "Joined meeting",
  "meeting": { ... },
  "role": "member",
  "displayName": "Test Person"
}
```

---

#### `POST /meetings/:code/add-participant`

Owner or chair can **add** an existing user to a meeting as `member` or `observer`.

* **Params:** `:code` – meeting code
* **Body**

```json
{
  "currentUsername": "ownerOrChair",  // the actor
  "username": "targetUser",           // the user to add
  "role": "member"                    // "member" or "observer"
}
```

* **Behavior**

  * Validates:

    * Meeting exists and not adjourned.
    * `currentUsername` has role `owner` or `chair`.
    * Target user exists and is not already a participant.
  * Adds a participant object with `joinedAt: new Date()`.
  * Appends a notification to the target user:

    > *You have been added to meeting "Meeting Title" as member by currentUsername.*

* **Responses**

  * `200` – `{ meeting }` (updated)
  * `400` – bad input / already participant / invalid role
  * `403` – actor not owner/chair
  * `404` – meeting or user not found

---

#### `PATCH /meetings/:meetingId/participants/:participantUsername/role`

Owner changes a participant’s role.

* **Params**

  * `:meetingId` – Mongo `_id` of meeting
  * `:participantUsername` – username to change
* **Body**

```json
{
  "username": "ownerUsername",    // actor
  "newRole": "chair"              // one of: "owner", "chair", "member", "observer"
}
```

* **Rules**

  * Only `owner` can change roles.
  * Owner cannot change their **own** role away from `owner`.
* **Responses**

  * `200` – `{ meeting }`
  * `400` – invalid role or missing fields
  * `403` – non-owner trying to change roles
  * `404` – meeting or participant not found

> This route is also used to implement the rule “owner starts as chair, but once another chair is assigned, owner loses chair powers.”

---

### Meeting Summary & Export

#### `PUT /meetings/:code/summary`

Update the high-level meeting summary text.

* **Params:** `:code` – meeting code
* **Body**

```json
{
  "username": "chairOrOwner",
  "meetingSummary": "Meeting productive and over"
}
```

* **Permissions:** only `owner` or `chair`.
* **Responses**

  * `200` – `{ meeting }` (with updated `meetingSummary`)
  * `403` – user not owner/chair
  * `404` – meeting not found

---

#### `GET /meetings/:code/export`

Download **plain-text minutes** for a meeting.

* **Params:** `:code`
* **Response**

  * `200` – `text/plain` attachment

    * Filename: `<sanitized-title>-minutes.txt`
    * Contains:

      * Meeting meta: title, code, created time, status (adjourned/active)
      * Participant list with roles
      * Overall summary
      * Motions and decisions (including sub-motions like revise/postpone/overturn)
      * Discussion and replies
  * `404` – meeting not found

> There is a separate endpoint in your codebase (not shown here) to export **PDF** minutes; this TXT export is the core definition of meeting minutes.

---

### Chat / Messages

#### `POST /meetings/:code/messages`

Add a chat message or motion-linked message to a meeting.

* **Params:** `:code`
* **Body**

```json
{
  "username": "tester1",
  "text": "does chat work",
  "motionId": "<optional motion id>"
}
```

* **Responses**

  * `200` – `{ message }` (the newly stored message)
  * `400` – missing username or text
  * `404` – meeting not found

---

## Motions & Voting

### Create Motion

#### `POST /meetings/:code/motions`

Create any kind of motion (standard, procedural, special, or sub-motion).

* **Params:** `:code` – meeting code
* **Body (flexible)** – backend accepts multiple field names for backwards compatibility. Typical usage:

```json
{
  "username": "tester1",
  "motionTitle": "Idea 1",             // or "title"
  "motionDescription": "bruh",         // or "description"
  "motionText": "Idea 1",              // or "text"
  "motionType": "standard",            // or "procedure"/"procedural"
  "motionCategory": "standard",        // "standard" | "procedural" | "submotion" | "special"
  "specialMotionType": "adjourn",      // for special motions ("adjourn", "closeDebate")
  "votingMode": "named",               // "named" or "anonymous"
  "subType": "none",                   // "none" | "overturn" | "revise" | "postpone"
  "parentMotionId": "<id>",            // for revise/postpone
  "postponeUntil": "Next week"         // optional for postpone sub-motion
}
```

* **Rules / Behavior**

  * Must include `username` and a non-empty title/text.
  * User must be a participant and not an `observer` (roles allowed: `owner`, `chair`, `member`).
  * Special motions (`motionCategory="special"`) **cannot** also be sub-motions.
  * Default `requiredPercentage`:

    * Standard motions: 50
    * Procedural motions: 66
    * Special motions: from `SPECIAL_MOTION_RULES` (e.g., adjourn = 50%, closeDebate ≈ 66.67%).
  * Sub-motions:

    * `revise` / `postpone` require a valid `parentMotionId`.
    * Cannot revise/postpone a motion that is already postponed.

* **Response**

```json
{
  "motion": { ...full motion object... }
}
```

---

### Vote on Motion

#### `POST /meetings/:code/motions/:motionId/vote`

Cast a vote on a motion.

* **Params**

  * `:code` – meeting code
  * `:motionId` – id of the motion inside `meeting.motions`
* **Body**

```json
{
  "username": "tester1",
  "vote": "up"   // "up" or "down"
}
```

* **Behavior**

  * For **special** motions that don’t require a vote (chair-decided ones), this returns `400`.
  * If motion status is `closed` or outcome is `postponed`, voting is rejected.
  * For `votingMode = "anonymous"`:

    * User may vote only once; username stored in `anonymousVotedUsers`.
    * Increments `votes.up` or `votes.down`.
  * For `votingMode = "named"`:

    * Uses `voterMap` to track per-user vote and adjusts counts if the user changes their vote.

* **Responses**

  * `200` – `{ motion }` (updated)
  * `400` – invalid vote / already voted / closed / postponed
  * `404` – meeting or motion not found

---

### Overturn Motion (special endpoint)

#### `POST /meetings/:meetingId/motions/overturn`

Convenience endpoint to **raise an overturn sub-motion** against a previously passed motion.

* **Params:** `:meetingId` – meeting `_id`
* **Body**

```json
{
  "username": "tester1",
  "targetMotionId": "<existingPassedMotionId>",
  "title": "Overturn: Idea 1",
  "description": "Motion to overturn the previous decision on 'Idea 1'.",
  "motionType": "procedure",    // optional; default "procedure"
  "votingMode": "named"         // optional; default matches target motion
}
```

* **Rules**

  * Target motion must exist, be `closed`, and have `outcome === "passed"`.
  * Target motion must use named voting.
  * Only users who previously voted **in favor** on the target motion may raise the overturn.
  * A decision cannot be overturned more than once.

* **Response**

```json
{
  "meeting": { ...updated meeting... },
  "motion": { ...new overturn motion... }
}
```

---

### Close / Reopen Voting

#### `POST` or `PATCH /meetings/:code/motions/:motionId/close`

Close voting on a motion and compute its outcome.

* **Params:** `:code`, `:motionId`
* **Body**

```json
{
  "username": "chairOrOwner",   // closer
  "decisionSummary": "all done",
  "prosSummary": "",
  "consSummary": ""
}
```

* **Permissions**

  * Only:

    * current `chair`, or
    * `owner` **when no other chair is assigned**.

* **Behavior**

  * Computes `% yes` based on `votes.up / (up+down)`.
  * Compares with `requiredPercentage` to set `outcome` as `passed` or `failed`.
  * Writes a detailed system message into `meeting.messages`.
  * Handles special logic for:

    * **Adjourn** special motion: if passed, marks meeting `adjourned` and `open=false`.
    * **Revise** sub-motions: updates parent motion, pushes revision history, adds system message.
    * **Postpone** sub-motions: marks parent motion as `postponed` and logs reason.
    * **Overturn** sub-motions: marks target motion as overturned and logs.

* **Responses**

  * `200` – `{ message: "Motion voting closed", meeting, motion }`
  * `400` / `403` / `404` for invalid permissions, motion status, or not found

#### `POST` or `PATCH /meetings/:code/motions/:motionId/open`

Reopen voting on a motion.

* **Params:** `:code`, `:motionId`
* **Body**

```json
{
  "username": "ownerOrChair"
}
```

* **Permissions:** `owner` or `chair`.
* **Behavior:** sets `status="open"`, `outcome="pending"`, clears `closedAt`.
* **Response:** `{ motion }`.

---

### Replies & Discussion on Motions

#### `POST /meetings/:meetingId/motions/:motionId/replies`

Add a reply to a motion with a pro/con/neutral stance.

* **Params:** `:meetingId`, `:motionId`
* **Body**

```json
{
  "username": "tester1",
  "displayName": "Test Person",
  "text": "I like these new rules",
  "stance": "pro"   // "pro" | "con" | "neutral"
}
```

* **Behavior**

  * Requires non-empty text.
  * Motion must have `allowDiscussion !== false`.
* **Response:** `{ motion }` (including updated `replies` array).

---

### Chair Decisions on Points of Order

#### `POST /meetings/:meetingId/motions/:motionId/chair-decision`

Record a chair/owner ruling on a **point of order** special motion.

* **Params:** `:meetingId`, `:motionId`
* **Body**

```json
{
  "username": "chairOrOwner",
  "decision": "sustained"   // "sustained" or "denied"
}
```

* **Rules**

  * User must be `owner` or `chair`.
  * Motion must be a special motion with `specialMotionType === "pointOfOrder"`.
  * Can only decide once (if `chairDecision` already set, returns error).

* **Behavior**

  * Sets `chairDecision`, `status = "closed"`, and `outcome` (`passed` if sustained, `failed` if denied).
  * Adds a system message noting the ruling.

* **Response:** `{ meeting }`.

