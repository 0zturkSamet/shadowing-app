# YouTube Download Configuration Guide

This guide explains how to configure YouTube audio downloads for the Whisper transcription service to bypass YouTube's bot detection and avoid "Broken Pipe" errors.

## Problem

YouTube may block automated downloads with errors like:
- `[Errno 32] Broken pipe`
- `Sign in to confirm you're not a bot`
- Connection reset errors

This is caused by YouTube's bot detection mechanisms blocking yt-dlp downloads.

## Solutions

The Whisper service now implements multiple fallback strategies:
1. Multiple player clients (iOS, Android, TV, Web)
2. Retry logic with exponential backoff
3. Cookie-based authentication
4. Enhanced bot detection bypass

### Quick Setup (Recommended)

The easiest and most reliable method is to use browser cookies:

**Method 1: Use Browser Cookies Directly**

Set the `YOUTUBE_COOKIE_BROWSER` environment variable to automatically extract cookies from your browser:

```bash
# For Chrome (recommended)
export YOUTUBE_COOKIE_BROWSER=chrome

# For Firefox
export YOUTUBE_COOKIE_BROWSER=firefox

# For Edge
export YOUTUBE_COOKIE_BROWSER=edge

# For Safari
export YOUTUBE_COOKIE_BROWSER=safari
```

Add this to your `.env` file:
```env
YOUTUBE_COOKIE_BROWSER=chrome
```

**Requirements:**
- You must be signed in to YouTube in the specified browser
- The browser must be installed on the server running the application
- yt-dlp will automatically extract and use fresh cookies

**Method 2: Export Cookies to File**

If you can't use browser cookie extraction (e.g., headless server), export cookies manually:

1. **Install a Cookie Export Browser Extension**
   - Chrome/Edge: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
   - Firefox: [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)

2. **Export YouTube Cookies**
   - Sign in to YouTube in your browser
   - Navigate to https://www.youtube.com
   - Click the cookie extension icon
   - Export cookies to a file (save as `youtube_cookies.txt`)

3. **Configure the Application**

   Place the cookie file somewhere accessible and set the environment variable:

   ```bash
   export YOUTUBE_COOKIE_FILE=/path/to/youtube_cookies.txt
   ```

   Or in your `.env` file:
   ```env
   YOUTUBE_COOKIE_FILE=/path/to/youtube_cookies.txt
   ```

## How It Works

The enhanced download function implements a robust fallback strategy:

### 1. Multiple Player Clients
Tries different YouTube player clients in order:
- iOS + Android (most reliable)
- Android + TV
- iOS only
- Web + Android

### 2. Retry Logic
Each download strategy includes:
- 3 retry attempts per strategy
- Exponential backoff (2s, 4s, 8s delays)
- Automatic detection of broken pipe errors

### 3. Cookie Authentication
Priority order:
1. Browser cookies (`YOUTUBE_COOKIE_BROWSER`)
2. Cookie file (`YOUTUBE_COOKIE_FILE`)
3. No cookies (less reliable)

### 4. Enhanced Headers
- iOS user agent for better compatibility
- Proper HTTP headers to avoid detection
- 30-second socket timeout
- Automatic retry on connection errors

## Troubleshooting

### Error: "Broken Pipe" or "Errno 32"

**Solution:** Configure cookies using one of the methods above.

```bash
# Quick fix
export YOUTUBE_COOKIE_BROWSER=chrome
```

### Error: "Sign in to confirm you're not a bot"

**Solution:** You need to authenticate with cookies.

1. Sign in to YouTube in your browser
2. Set `YOUTUBE_COOKIE_BROWSER=chrome` (or your browser)
3. Restart the application

### Error: "Could not load cookies from browser"

**Possible causes:**
- Browser not installed on the server
- Browser not running or accessible
- Permissions issue

**Solutions:**
1. Use cookie file method instead:
   ```bash
   export YOUTUBE_COOKIE_FILE=/path/to/cookies.txt
   ```
2. Verify browser is installed:
   ```bash
   which google-chrome  # For Chrome
   which firefox        # For Firefox
   ```

### Cookies Keep Expiring

YouTube cookies typically last 1-6 months. When they expire:

**For browser cookies:**
- Simply sign in to YouTube again in your browser
- No need to update configuration

**For cookie files:**
- Export fresh cookies using the browser extension
- Replace the old cookie file
- No need to restart the application

## Docker/Container Deployment

When running in Docker or containers:

**Option 1: Mount Cookie File**
```dockerfile
# In docker-compose.yml
volumes:
  - ./youtube_cookies.txt:/app/youtube_cookies.txt:ro

environment:
  - YOUTUBE_COOKIE_FILE=/app/youtube_cookies.txt
```

**Option 2: Use Secrets**
```dockerfile
# In docker-compose.yml
secrets:
  - youtube_cookies

environment:
  - YOUTUBE_COOKIE_FILE=/run/secrets/youtube_cookies
```

**Note:** Browser cookie extraction may not work in headless containers. Use the cookie file method instead.

## Security Considerations

**Cookie File Security:**
- Cookie files contain authentication tokens
- Store securely with restricted permissions:
  ```bash
  chmod 600 youtube_cookies.txt
  ```
- Don't commit cookie files to version control
- Add to `.gitignore`:
  ```
  youtube_cookies.txt
  *.cookies
  ```

**Environment Variables:**
- Use `.env` files (not committed to git)
- Or use secure secret management (AWS Secrets Manager, etc.)

## Testing Your Configuration

Test that downloads work correctly:

```bash
# Set your cookie configuration
export YOUTUBE_COOKIE_BROWSER=chrome

# Start the backend
cd backend
python -m uvicorn app.main:app --reload

# Try transcribing a video through the API
curl -X POST "http://localhost:8000/api/videos/transcribe" \
  -H "Content-Type: application/json" \
  -d '{"youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

Check the logs for:
- `Using cookies from chrome browser` ✅
- `Successfully downloaded audio using iOS + Android clients` ✅

## Advanced Configuration

### Custom Player Client Order

The service tries clients in this order:
1. iOS + Android
2. Android + TV
3. iOS only
4. Web + Android

To modify the order, edit `backend/app/services/whisper_service.py` and adjust the `download_strategies` list.

### Timeout Settings

Default timeout is 30 seconds. To adjust:

```python
# In whisper_service.py
'socket_timeout': 60,  # Increase for slow connections
```

### Retry Attempts

Default is 3 retries per strategy. To adjust:

```python
# In whisper_service.py
max_retries = 5  # Increase retry attempts
```

## Getting Help

If you continue to experience issues:

1. Check the application logs for detailed error messages
2. Verify your cookies are fresh (sign in to YouTube)
3. Try a different browser for cookie extraction
4. Ensure yt-dlp is updated: `pip install -U yt-dlp`

## References

- [yt-dlp documentation](https://github.com/yt-dlp/yt-dlp)
- [yt-dlp cookie authentication](https://github.com/yt-dlp/yt-dlp#authentication-with-cookies)
- [Get cookies.txt LOCALLY extension](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
