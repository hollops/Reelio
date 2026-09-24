# Mini Streaming App — Backend Project Specification

## 1. Project Overview

Build a full-stack Mini Streaming App for a capstone project.

The platform allows registered users to:
- Create an account and log in.
- Upload videos.
- Browse publicly available videos.
- Watch videos.
- Track viewing progress.
- Resume videos from their last saved position.
- Manage their own uploaded videos.

The application also has an Admin role that can manage users and all video content.

This document is the source of truth for the backend implementation.

---

# 2. Final Technology Decisions

## Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- REST API
- JWT authentication

## File Storage
- Cloudinary
- Video files are stored on Cloudinary.
- MongoDB stores video metadata and Cloudinary URLs/public IDs.

## Frontend
- React
- Vite
- Axios

The frontend is not part of the initial backend implementation, but all API responses should be designed for easy React/Axios integration.

---

# 3. Final Product Rules

## Video visibility
All uploaded videos are PUBLIC.

Any authenticated user can browse and watch available videos.

## Upload permission
Every registered/authenticated user can upload videos.

## Roles
There are two roles:

- `user`
- `admin`

New users have the `user` role by default.

## Ownership
Users can edit and delete their own videos.

Admins can manage all videos.

## Viewing history
Viewing history tracks playback progress.

A user should have one watch-history record per video.

The system stores:
- Current progress in seconds
- Video duration
- Completion status
- Last watched time

## MVP scope
Do NOT add these unless explicitly requested later:
- Likes
- Comments
- Subscriptions
- Followers
- Playlists
- Recommendations
- Live streaming
- Payments
- Notifications
- Social sharing
- Advanced analytics

Keep the implementation focused on the agreed MVP.

---

# 4. Backend Architecture

Use:

MVC + Service Layer + REST API

Request flow:

Client
  ↓
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Model / Cloudinary
  ↓
Database / Cloudinary
  ↓
Service
  ↓
Controller
  ↓
Response

## Responsibilities

### Routes
Define API endpoints and connect them to middleware/controllers.

### Middleware
Handle cross-cutting request processing:
- Authentication
- Role authorization
- File upload handling
- Global error handling

### Controllers
Handle HTTP requests and responses.

Controllers should:
- Read request data.
- Call the appropriate service.
- Return the appropriate HTTP response.

Controllers should NOT contain large amounts of business logic.

### Services
Contain application/business logic.

Services handle:
- User registration/login logic
- Password hashing/comparison
- JWT generation
- Cloudinary upload/delete operations related to videos
- Video CRUD logic
- Ownership checks
- Watch-progress creation/update logic
- Admin operations

### Models
Define MongoDB/Mongoose schemas and relationships.

### Config
Configure external infrastructure:
- MongoDB
- Cloudinary

### Utils
Only contain genuinely reusable, feature-independent helper functions.

Do not put feature-specific business logic in utils.

---

# 5. Exact Backend Folder Structure

```text
backend/
│
├── src/
│   │
│   ├── config/
│   │   ├── db.js
│   │   └── cloudinary.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Video.js
│   │   └── WatchHistory.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── videoController.js
│   │   ├── historyController.js
│   │   └── adminController.js
│   │
│   ├── services/
│   │   ├── authService.js
│   │   ├── videoService.js
│   │   ├── historyService.js
│   │   └── adminService.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── videoRoutes.js
│   │   ├── historyRoutes.js
│   │   └── adminRoutes.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   ├── uploadMiddleware.js
│   │   └── errorMiddleware.js
│   │
│   ├── utils/
│   │   └── response.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Do not create additional folders unless there is a clear implementation need.

---

# 6. Database Models

There are three core collections:

1. Users
2. Videos
3. WatchHistory

---

## 6.1 User Model

File:

```text
src/models/User.js
```

Fields:

```text
name
email
password
role
createdAt
updatedAt
```

Suggested types:

```text
name       String
email      String
password   String
role       String
createdAt  Date
updatedAt  Date
```

Rules:
- `name` is required.
- `email` is required and unique.
- Email should be normalized appropriately.
- `password` is required and must be stored hashed.
- `role` is required.
- Allowed roles: `user`, `admin`.
- Default role: `user`.

Never return the password hash in normal API responses.

---

# 7. Video Model

File:

```text
src/models/Video.js
```

Fields:

```text
title
description
videoUrl
publicId
thumbnailUrl
duration
uploadedBy
createdAt
updatedAt
```

Suggested types:

```text
title         String
description   String
videoUrl      String
publicId      String
thumbnailUrl  String
duration      Number
uploadedBy    ObjectId -> User
createdAt     Date
updatedAt     Date
```

Rules:
- `title` is required.
- `description` can be optional depending on frontend requirements.
- `videoUrl` is the Cloudinary secure URL.
- `publicId` is the Cloudinary public ID needed for deletion.
- `thumbnailUrl` is the thumbnail URL.
- `duration` is the video duration in seconds.
- `uploadedBy` references the User who uploaded the video.
- All videos are public.

Do not store the actual video binary inside MongoDB.

---

# 8. WatchHistory Model

File:

```text
src/models/WatchHistory.js
```

Fields:

```text
user
video
progress
duration
completed
lastWatchedAt
createdAt
updatedAt
```

Suggested types:

```text
user           ObjectId -> User
video          ObjectId -> Video
progress       Number
duration       Number
completed      Boolean
lastWatchedAt  Date
createdAt      Date
updatedAt      Date
```

Rules:
- `user` is required.
- `video` is required.
- `progress` is measured in seconds.
- `duration` is measured in seconds.
- `completed` defaults to false.
- `lastWatchedAt` updates whenever progress is saved.
- A user should have only ONE history record for a particular video.

Create a compound unique index:

```text
user + video
```

This prevents duplicate watch-history records for the same user/video pair.

---

# 9. Database Relationships

```text
User
 ├── uploads many Videos
 └── has many WatchHistory records

Video
 ├── belongs to one User through uploadedBy
 └── has many WatchHistory records

WatchHistory
 ├── belongs to one User
 └── belongs to one Video
```

Relationship summary:

```text
User 1 ──────── * Video
User 1 ──────── * WatchHistory
Video 1 ─────── * WatchHistory
```

---

# 10. Authentication API

Base URL:

```text
/api/auth
```

## Register

```http
POST /api/auth/register
```

Request:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

Expected workflow:

```text
Validate input
  ↓
Check whether email already exists
  ↓
Hash password
  ↓
Create User
  ↓
Save to MongoDB
  ↓
Return safe user information
```

Do not allow a normal registration request to arbitrarily create an admin account.

Admin accounts should be created/assigned through a controlled mechanism.

---

## Login

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Workflow:

```text
Find user
  ↓
Compare password
  ↓
Generate JWT
  ↓
Return token + safe user information
```

Example response shape:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "..."
  }
}
```

The exact response wrapper can be standardized in `utils/response.js`.

---

## Get Current User

```http
GET /api/auth/me
```

Requires:

```text
Authorization: Bearer <token>
```

Returns the authenticated user's safe information.

---

# 11. Authentication Middleware

File:

```text
src/middleware/authMiddleware.js
```

Responsibilities:
- Read the Authorization header.
- Extract the Bearer token.
- Verify the JWT.
- Identify the user.
- Attach authenticated user information to the request.
- Reject invalid/missing tokens.

Protected routes must use this middleware.

---

# 12. Role Middleware

File:

```text
src/middleware/roleMiddleware.js
```

Responsibilities:
- Check the authenticated user's role.
- Allow only authorized roles.

Admin-only routes should use:

```text
authMiddleware
      ↓
roleMiddleware
      ↓
controller
```

Normal users should receive HTTP 403 when trying to access admin-only operations.

---

# 13. Video API

Base URL:

```text
/api/videos
```

---

## Upload Video

```http
POST /api/videos
```

Authentication:

```text
Required
```

Permission:

```text
Any authenticated user
```

Content type:

```text
multipart/form-data
```

Expected fields:

```text
title
description
video
thumbnail
```

Thumbnail can be handled according to the final frontend implementation. If thumbnails are generated automatically later, adjust the request accordingly.

Workflow:

```text
Request
  ↓
Authentication
  ↓
File validation
  ↓
Video service
  ↓
Upload video to Cloudinary
  ↓
Upload/process thumbnail if provided
  ↓
Receive Cloudinary URLs/public IDs
  ↓
Create Video document
  ↓
Save metadata to MongoDB
  ↓
Return video information
```

---

# 14. Get All Public Videos

```http
GET /api/videos
```

Authentication:

```text
Required
```

Returns public videos.

The response should contain enough information for a frontend video-card/list UI.

Potential response data:

```json
{
  "id": "...",
  "title": "Introduction to Node.js",
  "description": "...",
  "thumbnailUrl": "...",
  "videoUrl": "...",
  "duration": 600,
  "uploadedBy": {
    "id": "...",
    "name": "John Doe"
  },
  "createdAt": "..."
}
```

Avoid returning unnecessary sensitive user information.

---

# 15. Get One Video

```http
GET /api/videos/:id
```

Authentication:

```text
Required
```

Returns the selected public video and its metadata.

---

# 16. Get My Videos

```http
GET /api/videos/my-videos
```

Authentication:

```text
Required
```

Returns videos uploaded by the authenticated user.

---

# 17. Update Video

```http
PUT /api/videos/:id
```

Authentication:

```text
Required
```

Permissions:
- Video owner can update their own video.
- Admin can update any video.

Initially, update only metadata unless there is a clear need to replace the actual video file.

Possible fields:

```text
title
description
thumbnail
```

If replacing the actual video later:
- Upload the new video.
- Delete the old Cloudinary asset.
- Update MongoDB metadata.

---

# 18. Delete Video

```http
DELETE /api/videos/:id
```

Authentication:

```text
Required
```

Permissions:
- Owner can delete their own video.
- Admin can delete any video.

Deletion workflow:

```text
Find video
  ↓
Check ownership/admin role
  ↓
Delete Cloudinary asset
  ↓
Delete MongoDB video document
  ↓
Handle related watch-history records appropriately
  ↓
Return success
```

Do not leave orphaned Cloudinary files when deleting videos.

---

# 19. Watch History API

Base URL:

```text
/api/history
```

---

## Save/Update Progress

```http
POST /api/history
```

Authentication:

```text
Required
```

Request:

```json
{
  "videoId": "...",
  "progress": 240,
  "duration": 600
}
```

The backend determines the authenticated user from the JWT.

Do NOT trust a client-supplied user ID.

Workflow:

```text
Authenticate user
  ↓
Validate video
  ↓
Find history using user + video
  ↓
If it exists → update it
If it does not exist → create it
  ↓
Update progress
  ↓
Update duration
  ↓
Update lastWatchedAt
  ↓
Set completed when appropriate
```

---

# 20. Get User Watch History

```http
GET /api/history
```

Authentication:

```text
Required
```

Returns only the authenticated user's history.

Do not allow a user to request another user's history by passing a user ID.

---

# 21. Get Progress for One Video

```http
GET /api/history/:videoId
```

Authentication:

```text
Required
```

Returns the authenticated user's progress for that video.

Example:

```json
{
  "videoId": "...",
  "progress": 240,
  "duration": 600,
  "completed": false,
  "lastWatchedAt": "..."
}
```

If no history exists, return a clear response indicating that the video has not been watched before.

---

# 22. Delete History

```http
DELETE /api/history/:videoId
```

Authentication:

```text
Required
```

Deletes the authenticated user's history for that video.

---

# 23. Progress Tracking Rules

The frontend video player will track playback time.

Do NOT send a request every millisecond.

The frontend should periodically send progress, for example every 10–15 seconds, and also save progress when:
- The video is paused.
- The user leaves the video.
- The video ends.

Example:

```text
Video duration = 600 seconds
Current time = 245 seconds

POST /api/history

{
  "videoId": "...",
  "progress": 245,
  "duration": 600
}
```

When the user returns:

```text
GET /api/history/:videoId
```

The frontend uses the returned progress to resume playback.

---

# 24. Completion Logic

The backend should determine completion safely.

A video should be marked completed when playback reaches the end or when the submitted progress is effectively at the end of the video.

Do not depend only on a client-provided `completed` value.

The backend can use a small tolerance based on duration, for example:

```text
progress >= duration - tolerance
```

The exact tolerance can be finalized during implementation.

---

# 25. Admin API

Base URL:

```text
/api/admin
```

All admin routes require:

```text
authMiddleware
+
roleMiddleware
```

---

## Get All Users

```http
GET /api/admin/users
```

Admin only.

Returns user information without password hashes.

---

## Get All Videos

```http
GET /api/admin/videos
```

Admin only.

Returns all uploaded videos.

---

## Delete Any Video

```http
DELETE /api/admin/videos/:id
```

Admin only.

Workflow:

```text
Find video
  ↓
Delete Cloudinary asset
  ↓
Delete MongoDB video
  ↓
Clean related watch history
  ↓
Return success
```

---

# 26. Admin Role Assignment

Normal registration must always create:

```text
role = user
```

Do not allow:

```json
{
  "role": "admin"
}
```

to create an admin through the public registration endpoint.

For development, an admin can be created using a controlled seed/script or by manually assigning the role in the database.

Later, an authenticated admin-management endpoint can be added if the project requires it.

---

# 27. Cloudinary Configuration

File:

```text
src/config/cloudinary.js
```

Environment variables:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Never hardcode Cloudinary credentials.

Cloudinary should store:
- Video files
- Thumbnail files where applicable

MongoDB stores:
- Cloudinary secure URL
- Cloudinary public ID
- Metadata

---

# 28. Environment Variables

`.env`

```env
PORT=5000
MONGO_URI=
JWT_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`.env.example`

```env
PORT=
MONGO_URI=
JWT_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Never commit `.env`.

---

# 29. Upload Middleware

File:

```text
src/middleware/uploadMiddleware.js
```

Responsibilities:
- Receive multipart/form-data files.
- Validate file presence.
- Validate supported file types.
- Apply reasonable upload limits.
- Prepare files for the video service.

The exact implementation can use Multer.

Do not place Cloudinary business logic inside this middleware.

---

# 30. Error Middleware

File:

```text
src/middleware/errorMiddleware.js
```

Handle consistent errors:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
```

Avoid exposing internal stack traces or sensitive implementation details in production responses.

---

# 31. Utility Functions

Folder:

```text
src/utils/
```

Start with only:

```text
response.js
```

Purpose:

Provide reusable response helpers if needed.

Do NOT place:
- Video logic
- Authentication logic
- Cloudinary logic
- Database queries

inside utils.

Those belong in services/models/config.

Additional utilities should only be added when there is a real repeated helper.

---

# 32. Service Responsibilities

## authService.js

Responsible for:
- Register user
- Hash passwords
- Check existing users
- Verify login credentials
- Generate JWT
- Retrieve authenticated user information

## videoService.js

Responsible for:
- Upload video to Cloudinary
- Save video metadata
- Get public videos
- Get video by ID
- Get user's videos
- Update video
- Delete video
- Delete Cloudinary assets
- Check video ownership

## historyService.js

Responsible for:
- Create watch history
- Update progress
- Retrieve user's history
- Retrieve progress for a video
- Mark completion
- Delete history

## adminService.js

Responsible for:
- Get all users
- Get all videos
- Delete any video
- Other admin-only content/user operations added later

---

# 33. Controller Responsibilities

Controllers should remain relatively thin.

Example:

```text
videoController.uploadVideo()
```

should roughly:

```text
Read request
  ↓
Call videoService
  ↓
Return response
```

It should NOT contain all Cloudinary upload logic, database logic, ownership logic, etc.

---

# 34. Route Structure

## authRoutes.js

```http
POST /register
POST /login
GET /me
```

## videoRoutes.js

```http
POST   /
GET    /
GET    /my-videos
GET    /:id
PUT    /:id
DELETE /:id
```

Be careful with route order so `/my-videos` is registered before `/:id`.

## historyRoutes.js

```http
POST   /
GET    /
GET    /:videoId
DELETE /:videoId
```

## adminRoutes.js

```http
GET    /users
GET    /videos
DELETE /videos/:id
```

---

# 35. API Mounting

In `app.js`, mount routes under:

```text
/api/auth
/api/videos
/api/history
/api/admin
```

Final API examples:

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

POST   /api/videos
GET    /api/videos
GET    /api/videos/my-videos
GET    /api/videos/:id
PUT    /api/videos/:id
DELETE /api/videos/:id

POST   /api/history
GET    /api/history
GET    /api/history/:videoId
DELETE /api/history/:videoId

GET    /api/admin/users
GET    /api/admin/videos
DELETE /api/admin/videos/:id
```

---

# 36. Security Requirements

Implement the following:

- Hash passwords with bcrypt.
- Never return password hashes.
- Use JWT for authentication.
- Store secrets in `.env`.
- Never commit `.env`.
- Validate request data.
- Check resource ownership before user updates/deletes.
- Use role middleware for admin endpoints.
- Never trust a client-provided user ID for authenticated operations.
- Validate uploaded file types.
- Apply upload size limits.
- Handle Cloudinary failures.
- Handle MongoDB errors.
- Do not expose sensitive server errors to clients.

---

# 37. Backend Implementation Order

Build in this exact order:

### Phase 1 — Setup

1. Initialize Node project.
2. Install dependencies.
3. Create `.gitignore`.
4. Create `.env` and `.env.example`.
5. Create folder structure.
6. Configure Express.
7. Configure MongoDB.
8. Start server.

### Phase 2 — Authentication

9. Create User model.
10. Create authService.
11. Create authController.
12. Create authRoutes.
13. Implement register.
14. Implement login.
15. Implement JWT.
16. Implement authMiddleware.
17. Implement `/api/auth/me`.

### Phase 3 — Roles

18. Implement roleMiddleware.
19. Establish user/admin permissions.
20. Create controlled method for development admin creation.

### Phase 4 — Videos

21. Create Video model.
22. Configure Cloudinary.
23. Configure upload middleware.
24. Create videoService.
25. Create videoController.
26. Create videoRoutes.
27. Implement video upload.
28. Implement get all videos.
29. Implement get one video.
30. Implement get my videos.
31. Implement update video.
32. Implement delete video.

### Phase 5 — Watch Progress

33. Create WatchHistory model.
34. Add unique user + video index.
35. Create historyService.
36. Create historyController.
37. Create historyRoutes.
38. Implement save/update progress.
39. Implement get history.
40. Implement get video progress.
41. Implement delete history.
42. Implement completion logic.

### Phase 6 — Admin

43. Create adminService.
44. Create adminController.
45. Create adminRoutes.
46. Implement get all users.
47. Implement get all videos.
48. Implement admin video deletion.

### Phase 7 — Error Handling

49. Create global error middleware.
50. Standardize API responses.
51. Handle MongoDB errors.
52. Handle Cloudinary errors.
53. Handle authentication errors.
54. Handle authorization errors.
55. Handle validation errors.

### Phase 8 — Testing

56. Test register.
57. Test login.
58. Test protected routes.
59. Test upload.
60. Test video retrieval.
61. Test ownership.
62. Test video deletion.
63. Test watch progress.
64. Test resume functionality.
65. Test admin permissions.
66. Test unauthorized access.

### Phase 9 — Frontend Integration

67. Connect React with Axios.
68. Connect authentication.
69. Connect video listing.
70. Connect video player.
71. Connect upload.
72. Connect video management.
73. Connect watch progress.
74. Connect admin dashboard.

---

# 38. Expected User Flow

## Normal User

```text
Register
   ↓
Login
   ↓
Receive JWT
   ↓
Browse public videos
   ↓
Open video
   ↓
Watch
   ↓
Progress saved
   ↓
Leave video
   ↓
Return later
   ↓
Retrieve saved progress
   ↓
Resume video
```

## Upload Flow

```text
Authenticated User
   ↓
Select video
   ↓
POST /api/videos
   ↓
Multer
   ↓
Cloudinary
   ↓
Cloudinary URL + public ID
   ↓
MongoDB Video document
   ↓
Return created video
```

## Admin Flow

```text
Admin Login
   ↓
JWT
   ↓
Admin middleware
   ↓
Admin dashboard
   ↓
Manage users/content
```

---

# 39. API Testing

Use Postman during backend development.

Recommended testing sequence:

```text
1. Register
2. Login
3. Copy JWT
4. Test /api/auth/me
5. Upload video
6. Get videos
7. Get single video
8. Update own video
9. Delete own video
10. Save watch progress
11. Get watch history
12. Get specific video progress
13. Test resume data
14. Test admin routes
15. Test unauthorized requests
```

Do not move to frontend integration until these core APIs work correctly.

---

# 40. README Requirements

The backend README should eventually contain:

- Project description
- Tech stack
- Features
- Folder structure
- Environment variables
- Installation instructions
- Running the server
- API endpoints
- Authentication instructions
- Cloudinary setup
- Database setup
- Testing instructions
- Team contribution information

---

# 41. Important Development Rules for VS Code/Copilot

When implementing this specification:

1. Do not invent additional features.
2. Do not change the agreed database architecture without explaining why.
3. Do not put business logic directly into routes.
4. Keep controllers thin.
5. Keep business logic in services.
6. Keep database schemas in models.
7. Keep Cloudinary configuration in config.
8. Keep reusable generic helpers in utils.
9. Do not hardcode secrets.
10. Do not store video files directly in MongoDB.
11. Use authenticated user information from JWT rather than trusting user IDs sent by clients.
12. Enforce ownership checks.
13. Enforce admin authorization.
14. Use clear HTTP status codes.
15. Keep API responses consistent.
16. Do not add unnecessary architecture or abstractions.
17. Explain major implementation decisions before making significant structural changes.
18. Keep the implementation beginner-readable because this is a capstone project.

---

# 42. Definition of Done

The backend is considered ready for frontend integration when:

- [ ] Server starts successfully.
- [ ] MongoDB connects successfully.
- [ ] Cloudinary connects successfully.
- [ ] User registration works.
- [ ] Login works.
- [ ] JWT authentication works.
- [ ] `/api/auth/me` works.
- [ ] User role works.
- [ ] Admin role works.
- [ ] Users can upload videos.
- [ ] Videos are stored in Cloudinary.
- [ ] Video metadata is stored in MongoDB.
- [ ] Users can browse public videos.
- [ ] Users can view a single video.
- [ ] Users can manage their own videos.
- [ ] Admins can manage all videos.
- [ ] Watch progress is saved.
- [ ] Watch progress is updated.
- [ ] Users can retrieve their history.
- [ ] Users can resume videos.
- [ ] Completed videos are tracked.
- [ ] Errors are handled consistently.
- [ ] APIs have been tested with Postman.
- [ ] No secrets are committed to GitHub.

---

# 43. Final Project Identity

Project name:

## Viora

Repository:

```text
viora
```

Backend:

```text
viora/backend
```

Frontend:

```text
viora/frontend
```

Project description:

> Viora is a full-stack mini streaming platform where users can upload and watch public videos, track viewing progress, resume videos, and manage their own content, while administrators can manage platform users and video content.
