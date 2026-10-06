# Reelio

A mini streaming platform for uploading, managing, and watching videos.

## Password Reset Setup

Password reset email uses Gmail SMTP. Enable 2-Step Verification on the Gmail account, create a Google App Password, and set these values in `.env`:

```env
GMAIL_USER=your-gmail-address@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
RESET_PASSWORD_URL=http://localhost:5173/reset-password
```

`RESET_PASSWORD_URL` should point to a frontend page that reads the `token` query parameter and submits it with the new password to the reset endpoint. The reset token expires after 15 minutes and can only be used once.

## Password Reset API

1. `POST /api/auth/forgot-password` with `{ "email": "person@example.com" }` sends the reset link. The response is intentionally the same whether or not that email is registered.
2. The reset page takes the `token` from the link and calls `POST /api/auth/reset-password` with `{ "token": "...", "password": "NewPass1!" }`.

Passwords must be at least 8 characters and contain an uppercase letter, a number, and a special character. This rule applies to account creation and password resets.

## Watch Later API

All Watch Later endpoints require an `Authorization: Bearer <token>` header.

- `POST /api/watch-later` with `{ "videoId": "<video-id>" }` saves a video for the signed-in user. Saving the same video again does not create a duplicate.
- `GET /api/watch-later` lists that user's saved videos, newest first.
- `DELETE /api/watch-later/:videoId` removes a video from that user's list.

## Public Video Catalog

`GET /api/videos` is public and returns catalog details and thumbnails for all videos. Playback details at `GET /api/videos/:id` and other features still require authentication.

## Swagger UI and Render

Run the backend locally with `npm run dev`, then open `http://localhost:5000/api-docs`. The OpenAPI document is also available at `http://localhost:5000/api-docs.json`. Swagger UI supports the Bearer JWT security scheme for trying protected endpoints.

To deploy, push this backend branch to GitHub and create a Render Blueprint from the repository using `render.yaml`. Set the prompted environment variables in Render. Use a hosted MongoDB connection string for `MONGO_URI`, allow the Render service to connect in the database network-access settings, and set `RESET_PASSWORD_URL` to the deployed frontend's reset-password page. Render uses `/health` to verify the service and supplies `PORT` automatically.

After deployment, Swagger UI is available at `https://<your-render-service>.onrender.com/api-docs`.
