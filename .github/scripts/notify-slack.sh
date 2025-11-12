#!/bin/bash
# Send deployment notifications to Slack
# Optional: Configure SLACK_WEBHOOK_URL to enable notifications

set -euo pipefail

# Parse arguments
usage() {
  echo "Usage: $0 <status> <environment> <message>"
  echo ""
  echo "Arguments:"
  echo "  status        Deployment status (success, failure, started)"
  echo "  environment   Target environment (dev, prod)"
  echo "  message       Notification message"
  echo ""
  echo "Environment Variables:"
  echo "  SLACK_WEBHOOK_URL   Slack incoming webhook URL (required)"
  echo "  GITHUB_REPOSITORY   Repository name (optional, auto-detected)"
  echo "  GITHUB_RUN_ID       GitHub Actions run ID (optional)"
  echo "  GITHUB_ACTOR        GitHub user who triggered deployment (optional)"
  echo ""
  echo "Example:"
  echo "  $0 success dev 'Deployment completed successfully'"
  exit 1
}

if [ $# -ne 3 ]; then
  usage
fi

STATUS="$1"
ENVIRONMENT="$2"
MESSAGE="$3"

# Check if Slack webhook is configured
if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
  echo "SLACK_WEBHOOK_URL not configured, skipping notification"
  exit 0
fi

# Determine color based on status
case "$STATUS" in
  success)
    COLOR="good"
    EMOJI=":white_check_mark:"
    ;;
  failure)
    COLOR="danger"
    EMOJI=":x:"
    ;;
  started)
    COLOR="#439FE0"
    EMOJI=":rocket:"
    ;;
  *)
    COLOR="warning"
    EMOJI=":warning:"
    ;;
esac

# Build message payload
REPO_NAME="${GITHUB_REPOSITORY:-unknown/repo}"
RUN_ID="${GITHUB_RUN_ID:-}"
ACTOR="${GITHUB_ACTOR:-Unknown}"
COMMIT_SHA="${GITHUB_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Create GitHub Actions run URL if available
if [ -n "$RUN_ID" ]; then
  RUN_URL="https://github.com/${REPO_NAME}/actions/runs/${RUN_ID}"
  RUN_LINK="<${RUN_URL}|View Run>"
else
  RUN_LINK="N/A"
fi

# Create Slack message payload
PAYLOAD=$(cat <<EOF
{
  "attachments": [
    {
      "color": "$COLOR",
      "title": "$EMOJI Deployment $STATUS",
      "fields": [
        {
          "title": "Environment",
          "value": "$ENVIRONMENT",
          "short": true
        },
        {
          "title": "Status",
          "value": "$STATUS",
          "short": true
        },
        {
          "title": "Repository",
          "value": "$REPO_NAME",
          "short": true
        },
        {
          "title": "Commit",
          "value": "$COMMIT_SHA",
          "short": true
        },
        {
          "title": "Triggered By",
          "value": "$ACTOR",
          "short": true
        },
        {
          "title": "Run",
          "value": "$RUN_LINK",
          "short": true
        },
        {
          "title": "Message",
          "value": "$MESSAGE",
          "short": false
        }
      ],
      "footer": "Demand Letter Generator",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

# Send notification to Slack
echo "Sending Slack notification..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$SLACK_WEBHOOK_URL")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "Slack notification sent successfully"
  exit 0
else
  echo "Failed to send Slack notification (HTTP $HTTP_STATUS)"
  exit 1
fi
