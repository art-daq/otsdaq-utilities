#!/usr/bin/env bash
#
# This script sets up Slack environment variables for OTS chat integration.
# Run with: source ./ots_setup_slack.sh

echo "========================================"
echo "  OTS Slack Setup Script"
echo "========================================"
echo ""

# Check if SLACK_BOT_TOKEN is already exported
if [ -z "$SLACK_BOT_TOKEN" ]; then
    echo "SLACK_BOT_TOKEN not set. Please enter your Slack Bot Token:"
    echo "(Format: xoxb-...)"
    read -p ">> " SLACK_BOT_TOKEN

    if [ -z "$SLACK_BOT_TOKEN" ]; then
        echo "No SLACK_BOT_TOKEN provided. Slack integration will be disabled."
        return 0 2>/dev/null || exit 0
    fi

    export SLACK_BOT_TOKEN
    export OTS_EN_SLACK=1
    echo "SLACK_BOT_TOKEN has been set."
else
    echo "SLACK_BOT_TOKEN is already set (using existing value)."
    export OTS_EN_SLACK=1
fi

echo ""

# Set default values for channel if not already set
if [ -z "$SLACK_CHANNEL" ]; then
    export SLACK_CHANNEL="#ots-chat"
    echo "SLACK_CHANNEL set to default: #ots-chat"
fi

if [ -z "$SLACK_CHANNEL_ID" ]; then
    export SLACK_CHANNEL_ID="C0AFQNNNSV7"
    echo "SLACK_CHANNEL_ID set to default: C0AFQNNNSV7"
fi

echo ""
echo "========================================"
echo "  Slack Configuration Complete"
echo "========================================"
echo ""
echo "Configuration Summary:"
echo "----------------------"
echo "  Bot Token:   ${SLACK_BOT_TOKEN:0:10}...${SLACK_BOT_TOKEN: -5}"
echo "  Channel:      $SLACK_CHANNEL"
echo "  Channel ID:   $SLACK_CHANNEL_ID"
echo "  Slack Enable: $OTS_EN_SLACK"
echo ""
echo "Environment variables have been set successfully!"
echo "You can now use the OTS chat functionality with Slack integration."
echo ""
