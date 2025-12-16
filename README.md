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

## Link to website 
- https://convomeeting.netlify.app/ 

## Demo Video
- [Convo Demo Video](https://www.youtube.com/watch?v=L_6vDUoP5XA)

## Walk Through of Features
<img width="1511" height="848" alt="Screenshot 2025-12-16 at 3 31 08 PM" src="https://github.com/user-attachments/assets/1d8e76a3-e996-414f-8ae4-0b47c17f7ecc" />

The main screen with site name and register and login buttons at the center. Notifications, profile, and sign out buttons on the top right of the screen.

<img width="1511" height="848" alt="Screenshot 2025-12-16 at 3 32 14 PM" src="https://github.com/user-attachments/assets/747f7963-ef67-45e0-85fb-fd78ae1f6e97" />

Profile screen that allows users to change name, username, and password.

<img width="1511" height="848" alt="Screenshot 2025-12-16 at 3 43 19 PM" src="https://github.com/user-attachments/assets/b63de64b-2cd5-49ad-94f2-897315177330" />

Page where users can create new meetings or join meetings created by others.

<img width="1511" height="848" alt="Screenshot 2025-12-16 at 3 44 33 PM" src="https://github.com/user-attachments/assets/6aaf772e-3c7a-400e-97f6-fb2d0a44fde0" />

Toggling "Recent Meetings" in the top left allows users to access meetings they have created in the past.

<img width="1511" height="848" alt="Screenshot 2025-12-16 at 3 51 14 PM" src="https://github.com/user-attachments/assets/17e4c700-a71b-490b-8026-7a44571eff9b" />

Actual meeting page where users can add other members into the meeting. In addition, users can click the red "Raise Motion" button to propose an action during the meeting.

<img width="1511" height="848" alt="Screenshot 2025-12-16 at 3 54 14 PM" src="https://github.com/user-attachments/assets/60ca5a42-6345-44bb-935d-e0f5dd7bacf5" />

After clicking the "Raise Motion" button the user is allowed to choose different settings they want their motion to allow.

<img width="458" height="521" alt="Screenshot 2025-12-16 at 3 56 09 PM" src="https://github.com/user-attachments/assets/9e9b45c8-ab9a-4973-807a-3d5c30542f3c" />

The motion that is proposed will appear in the chat box and the members in the meeting will be allowed to vote for or against the proposition. These users will also be allowed to type responses to the motions and in the meeting chat in general. The owner can also revise the motion, close the motion, or postpone the motion.

<img width="498" height="482" alt="Screenshot 2025-12-16 at 4 04 20 PM" src="https://github.com/user-attachments/assets/1b2dce0b-19ee-4545-a3c5-4b0a88ad1c77" />

This special type of motion allows the user to adjourn the meeting or close the debate. 

<img width="446" height="681" alt="Screenshot 2025-12-16 at 4 05 13 PM" src="https://github.com/user-attachments/assets/97efe190-4d5f-4f22-b109-4b7f55981a11" />

If the special motion passes, the meeting will close automatically.

<img width="1512" height="858" alt="Screenshot 2025-12-16 at 4 06 18 PM" src="https://github.com/user-attachments/assets/838a89a9-e43d-44b4-b9a5-54a8c2857440" />

This is what the page looks like when a meeting is ended. In the overall meeting bubble, users can download a summary of the meeting in a pdf file, which will summarize all the things that were covered during the meeting.

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

## Database Structure

The backend uses **MongoDB** with **Mongoose**. Conceptually there are two top-level “tables” (collections): `users` and `meetings`. Other concepts such as participants, motions, messages, and notifications are stored as embedded subdocuments inside these collections.

### `users` collection

Each document represents a registered user.

| Field           | Type           | Description                                              |
| --------------- | -------------- | -------------------------------------------------------- |
| `_id`           | ObjectId       | Primary key generated by MongoDB.                        |
| `username`      | String         | Unique username, used as the main identifier in the app. |
| `email`         | String         | Unique email address.                                    |
| `password`      | String         | Hashed password.                                         |
| `firstName`     | String         | User’s first name.                                       |
| `lastName`      | String         | User’s last name.                                        |
| `bio`           | String         | Optional short bio shown on profile.                     |
| `notifications` | [Notification] | Embedded notifications (see below).                      |
| `createdAt`     | Date           | Timestamp when the user was created.                     |
| `updatedAt`     | Date           | Timestamp of the last update.                            |
| `__v`           | Number         | Mongoose version key.                                    |

**Notification subdocument (`users.notifications[]`)**

| Field          | Type     | Description                                                               |
| -------------- | -------- | ------------------------------------------------------------------------- |
| `_id`          | ObjectId | Subdocument id.                                                           |
| `type`         | String   | Notification type (e.g. `addedToMeeting`).                                |
| `message`      | String   | Human-readable message shown in the inbox.                                |
| `meetingCode`  | String   | Code of the related meeting.                                              |
| `meetingTitle` | String   | Title of the related meeting.                                             |
| `role`         | String   | Role the user was given in that meeting (`member`, `observer`, etc.).     |
| `addedBy`      | String   | Username of the user who triggered the notification (e.g. meeting owner). |
| `createdAt`    | Date     | When the notification was created.                                        |
| `read`         | Boolean  | Whether the notification has been read.                                   |

---

### `meetings` collection

Each document represents a meeting/committee.

| Field            | Type          | Description                                        |
| ---------------- | ------------- | -------------------------------------------------- |
| `_id`            | ObjectId      | Primary key.                                       |
| `title`          | String        | Meeting title.                                     |
| `code`           | String        | Unique 6-character join code (e.g. `EF29JZ`).      |
| `open`           | Boolean       | Whether the meeting is currently open.             |
| `adjourned`      | Boolean       | Whether the meeting has been adjourned.            |
| `adjournedAt`    | Date          | When the meeting was adjourned (if applicable).    |
| `creator`        | String        | Username of the meeting owner.                     |
| `visibility`     | String        | Visibility flag (e.g. `private`).                  |
| `participants`   | [Participant] | Embedded list of users in the meeting (see below). |
| `meetingSummary` | String        | High-level summary written by chair/owner.         |
| `motions`        | [Motion]      | Embedded list of motions raised in this meeting.   |
| `messages`       | [Message]     | Embedded chat + system messages.                   |
| `createdAt`      | Date          | Creation timestamp.                                |
| `updatedAt`      | Date          | Last update timestamp.                             |
| `__v`            | Number        | Mongoose version key.                              |

**Participant subdocument (`meetings.participants[]`)**

| Field         | Type   | Description                                           |
| ------------- | ------ | ----------------------------------------------------- |
| `username`    | String | Username of the participant (FK to `users.username`). |
| `role`        | String | `owner`, `chair`, `member`, or `observer`.            |
| `displayName` | String | Name displayed in the UI.                             |
| `joinedAt`    | Date   | When the user joined/was added to the meeting.        |

**Motion subdocument (`meetings.motions[]`)**

Each motion (and its sub-motions) is stored inside the meeting.

| Field                  | Type            | Description                                                              |          |
| ---------------------- | --------------- | ------------------------------------------------------------------------ | -------- |
| `_id`                  | ObjectId        | Subdocument id.                                                          |          |
| `proposer`             | String          | Username of the user who raised the motion.                              |          |
| `title`                | String          | Motion title.                                                            |          |
| `description`          | String          | Optional description/body text.                                          |          |
| `text`                 | String          | Legacy text field; mirrors title/description.                            |          |
| `type`                 | String          | `standard` or `procedure`.                                               |          |
| `motionCategory`       | String          | `standard`, `procedural`, `submotion`, or `special`.                     |          |
| `specialMotionType`    | String / null   | For special motions (e.g. `adjourn`, `closeDebate`, `pointOfOrder`).     |          |
| `requiredPercentage`   | Number          | Percentage required to pass (e.g. `50`, `66`, `66.67`).                  |          |
| `votes`                | Object          | `{ up: Number, down: Number }`.                                          |          |
| `voterMap`             | Map / Object    | For named votes: maps `username → "up"                                   | "down"`. |
| `votingMode`           | String          | `"named"` or `"anonymous"`.                                              |          |
| `anonymousVotedUsers`  | [String]        | Usernames that have already voted in anonymous mode.                     |          |
| `allowDiscussion`      | Boolean         | Whether replies/discussion are allowed.                                  |          |
| `chairDecision`        | String / null   | For points of order: `sustained` or `denied`.                            |          |
| `status`               | String          | `"open"` or `"closed"`.                                                  |          |
| `outcome`              | String          | `"pending"`, `"passed"`, `"failed"`, `"postponed"`, `"overturned"`, etc. |          |
| `closedAt`             | Date            | When voting was closed.                                                  |          |
| `decisionSummary`      | String          | Chair’s summary of the decision.                                         |          |
| `prosSummary`          | String          | Optional summary of pros.                                                |          |
| `consSummary`          | String          | Optional summary of cons.                                                |          |
| `isOverturn`           | Boolean         | Flag for overturn sub-motions.                                           |          |
| `targetMotionId`       | ObjectId / null | Motion this overturn/postpone/revise targets.                            |          |
| `overturnedByMotionId` | ObjectId/null   | Motion that overturned this one (if any).                                |          |
| `overturned`           | Boolean         | Whether this decision has been overturned.                               |          |
| `originalOutcome`      | String          | Stored outcome before it was overturned.                                 |          |
| `subType`              | String          | `"none"`, `"overturn"`, `"revise"`, or `"postpone"`.                     |          |
| `subMotionType`        | String          | Same as `subType` (normalized).                                          |          |
| `parentMotionId`       | ObjectId / null | Parent motion for sub-motions.                                           |          |
| `postponeUntil`        | String          | Optional postpone reason/target (e.g. date or condition).                |          |
| `wasRevised`           | Boolean         | Whether this motion has been revised by another motion.                  |          |
| `revisedByMotionId`    | ObjectId / null | Motion that revised this one.                                            |          |
| `replies`              | [Reply]         | Discussion replies with pro/con/neutral stance.                          |          |
| `revisionHistory`      | [Revision]      | History of title/description changes.                                    |          |
| `createdAt`            | Date            | Creation timestamp.                                                      |          |
| `updatedAt`            | Date            | Last update timestamp.                                                   |          |

**Reply subdocument (`motion.replies[]`)**

| Field               | Type     | Description                       |
| ------------------- | -------- | --------------------------------- |
| `_id`               | ObjectId | Subdocument id.                   |
| `authorUsername`    | String   | Username of the replier.          |
| `authorDisplayName` | String   | Display name of the replier.      |
| `stance`            | String   | `"pro"`, `"con"`, or `"neutral"`. |
| `text`              | String   | Reply text.                       |
| `createdAt`         | Date     | When the reply was created.       |

**Revision subdocument (`motion.revisionHistory[]`)**

| Field            | Type     | Description                         |
| ---------------- | -------- | ----------------------------------- |
| `_id`            | ObjectId | Subdocument id.                     |
| `at`             | Date     | When the revision happened.         |
| `byMotionId`     | ObjectId | Motion that performed the revision. |
| `oldTitle`       | String   | Previous title.                     |
| `oldDescription` | String   | Previous description.               |
| `newTitle`       | String   | New title.                          |
| `newDescription` | String   | New description.                    |

**Message subdocument (`meetings.messages[]`)**

| Field       | Type     | Description                                                          |
| ----------- | -------- | -------------------------------------------------------------------- |
| `_id`       | ObjectId | Subdocument id.                                                      |
| `author`    | String   | `"System"` or a username.                                            |
| `text`      | String   | Chat message or system log (e.g. motion passed/failed, adjournment). |
| `motionId`  | ObjectId | Optional reference to the related motion inside `meeting.motions`.   |
| `createdAt` | Date     | When the message was created.                                        |
| `updatedAt` | Date     | Last update timestamp (usually same as createdAt).                   |

---

### Relationships Between Collections

Although MongoDB is document-based, the app follows clear logical relationships:

* **User ↔ Meeting (participants)**

  * `meetings.participants[].username` references `users.username`.
  * Each meeting has many participants; each user can participate in many meetings.
  * Conceptually this is a **many-to-many** relationship implemented via an embedded participants array.

* **User ↔ Meeting (ownership / roles)**

  * `meetings.creator` stores the username of the meeting owner.
  * The owner is also included in `participants` with role `"owner"` (and initially also acts as chair until another chair is assigned).

* **User ↔ Motions / Messages**

  * Motion fields such as `proposer`, and reply fields like `authorUsername`, as well as `messages.author`, all reference `users.username`.
  * These are **logical foreign keys**; the data is embedded in the meeting document for fast retrieval.

* **User ↔ Notifications ↔ Meeting**

  * `users.notifications[].meetingCode` and `meetingTitle` point back to a meeting (`meetings.code` / `title`).
  * `notifications.addedBy` stores the username of the actor who added the user to a meeting.

* **Motion ↔ Sub-motions / Overturns**

  * Sub-motions link to their parent or target motion within the same meeting via `parentMotionId` and/or `targetMotionId`.
  * Overturn motions update `overturned`, `originalOutcome`, and `overturnedByMotionId` on the targeted motion.

This structure keeps each meeting’s full history (participants, motions, votes, and discussion) self-contained in a single document, while users and cross-meeting features (like notifications and inbox) live in the separate `users` collection.
