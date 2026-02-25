#!/usr/bin/env python
#____________________________________________________________
# 
# Utility script to post messages to a Slack channel via the Slack Web API.
# Reads SLACK_CHANNEL and SLACK_BOT_TOKEN from the environment, validates input,
# and sends a provided message using slack_sdk, raising clear errors for missing
# configuration or API failures.
#
#  sendSlackChat.py --help
#
#____________________________________________________________
#

#//For example:
#//		./sendSlackChat.py --message "Hello, Slack!" --user "admin"
#//			-- sends the message "Hello, Slack!" to the configured Slack channel


import os
import sys
import base64
from time import sleep
from urllib.parse import unquote

# import non standard libraries
try:
    import requests
except ImportError:
    raise ImportError("Install requests with 'pip install requests' to use this script.")

try:
    from slack_sdk import WebClient
    from slack_sdk.errors import SlackApiError
except ImportError:
    raise ImportError("Install slack_sdk with 'pip install slack_sdk' to use this script.")


# Environment variables for Slack configuration, defined in ots_setup_slack.sh
USER_DATA = os.environ.get("USER_DATA")
if not USER_DATA:
    raise RuntimeError("Set USER_DATA environment variable to the current user's data directory.")

SLACK_CHANNEL = os.environ.get("SLACK_CHANNEL")
SLACK_BOT_TOKEN = os.environ.get("SLACK_BOT_TOKEN")
SLACK_CHANNEL_ID = os.environ.get("SLACK_CHANNEL_ID")
if not SLACK_BOT_TOKEN or not SLACK_CHANNEL or not SLACK_CHANNEL_ID:
    raise RuntimeError(f"Environment variables SLACK_BOT_TOKEN {SLACK_BOT_TOKEN}, SLACK_CHANNEL {SLACK_CHANNEL}, and SLACK_CHANNEL_ID {SLACK_CHANNEL_ID} must be set.")


def connectToClient() -> WebClient:
    """Create and return a Slack WebClient using the bot token."""
    number_of_tries = 3
    for attempt in range(1, number_of_tries + 1):
        try:
            client = WebClient(token=SLACK_BOT_TOKEN)
            # Test the connection by calling auth.test
            client.auth_test()
            return client
        except SlackApiError as e:
            _root_logger.error(f"Attempt {attempt} of {number_of_tries} failed: {e.response['error']}")
            sleep(2)  # Wait before retrying
            if attempt == number_of_tries:
                raise RuntimeError("Failed to connect to Slack API after multiple attempts.") from e
    return WebClient(token=SLACK_BOT_TOKEN)


def cleanMessage(message: str) -> str:
    """Sanitize the message to prevent issues with Slack formatting."""
    # Basic sanitization: escape &, <, > characters
    message = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    #replace all %20 with space
    message = message.replace("%20", " ")
    # replace all %0A%0D with newlines
    message = message.replace("%0A%0D", "\n")
    return message  # Remove leading/trailing whitespace


def sendToSlack(user: str, message: str) -> None:
    """Send a message to a Slack channel using the Slack API."""

    message = f"*{user}*: {message}"
    message = cleanMessage(message)
    print(f"Sending message to Slack channel {SLACK_CHANNEL} from user {user}")

    client = connectToClient()

    if message:
        try:
            client.chat_postMessage(channel=SLACK_CHANNEL, text=message)
        except SlackApiError as e:
            raise RuntimeError(f"Slack API error: {e.response['error']}") from e


def main() -> None:
    if "--help" in sys.argv or "-h" in sys.argv:
        print("Usage: sendSlackChat.py --message <message> --user <user>")
        raise SystemExit(0)
    
    args = sys.argv[1:]
    i = 0
    message = None
    user = None
    while i < len(args):
        arg = args[i]
        if arg in ("--help", "-h"):
            print("Usage: sendSlackChat.py --message <message> --user <user>")
            raise SystemExit(0)
        if arg == "--message" and i + 1 < len(args):
            if args[i + 1].startswith('"'):
                collected = []
                j = i + 1
                while j < len(args):
                    collected.append(args[j])
                    if args[j].endswith('"') and len(args[j]) > 1:
                        break
                    j += 1
                joined = " ".join(collected)
                message = unquote(joined.strip('"'))
                i = j + 1
                continue
            message = unquote(args[i + 1])
            i += 2
            continue
        if arg == "--user" and i + 1 < len(args):
            user = unquote(args[i + 1])
            i += 2
            continue
        i += 1

    print(f"Parsed arguments - message: {message}, user: {user}")

    if not user and not message:
        raise SystemExit("Error: No message or user provided. Usage: sendSlackChat.py --message <message> --user <user>")

    sendToSlack(user, message)

if __name__ == "__main__":
    main()
