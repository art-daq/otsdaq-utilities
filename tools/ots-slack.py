#!/usr/bin/env python
#____________________________________________________________
# 
# Utility script to post messages to a Slack channel via the Slack Web API.
# Reads SLACK_CHANNEL and SLACK_BOT_TOKEN from the environment, validates input,
# and sends a provided message using slack_sdk, raising clear errors for missing
# configuration or API failures.
#
#  ots_slack.py --help
#
#____________________________________________________________
#

#//For example:
#//		./ots_slack.py --message "Hello, Slack!" --user "admin"
#//			-- sends the message "Hello, Slack!" to the configured Slack channel


import os
import sys
import argparse
import base64
from time import sleep
from urllib.parse import unquote
import logging

try:
    import requests
except ImportError:
    raise ImportError("Install requests with 'pip install requests' to use this script.")

try:
    from slack_sdk import WebClient
    from slack_sdk.errors import SlackApiError
except ImportError:
    raise ImportError("Install slack_sdk with 'pip install slack_sdk' to use this script.")


# read $USER_DATA
USER_DATA = os.environ.get("USER_DATA")
if not USER_DATA:
    raise RuntimeError("Set USER_DATA environment variable to the current user's data directory.")
# append /OutputData
USER_DATA = os.path.join(USER_DATA, "OutputData")
if not os.path.exists(USER_DATA):
    raise RuntimeError(f"USER_DATA directory does not exist: {USER_DATA}")

# Configure logging to console and to USER_DATA/OutputData/ots-slack.log
try:
    _user_data_env = os.environ.get("USER_DATA")
    _root_logger = logging.getLogger()
    if not _root_logger.handlers:
        _root_logger.setLevel(logging.INFO)
        _formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        _stream_handler = logging.StreamHandler()
        _stream_handler.setFormatter(_formatter)
        _root_logger.addHandler(_stream_handler)

        if _user_data_env:
            _log_dir = os.path.join(_user_data_env, "OutputData")
            if os.path.isdir(_log_dir):
                _file_handler = logging.FileHandler(os.path.join(_log_dir, "ots-slack.log"))
                _file_handler.setFormatter(_formatter)
                _root_logger.addHandler(_file_handler)
                
                _root_logger.info(f"Logging initialized. Logs will be written to console and {os.path.join(_log_dir, 'ots-slack.log')}")
            else:
                _root_logger.warning(f"USER_DATA environment variable is set to '{_user_data_env}', but it is not a valid directory. Logs will only be written to console.")
        else:
            _root_logger.warning("USER_DATA environment variable is not set. Logs will only be written to console.")
except Exception as e:
    print(f"Failed to initialize logging: {e}")
    _root_logger = logging.getLogger()  # Fallback to root logger without file handler


# Environment variables for Slack configuration, defined in setup_slack.sh
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


def uploadImage(client: WebClient, image_path: str) -> str:
    """Upload an image to Slack and return the file ID."""
    # get upload URL
    file_size = os.path.getsize(image_path)
    _root_logger.info(f"Getting upload URL for image {image_path} with size {file_size} bytes...")

    response = client.files_getUploadURLExternal(
        filename=image_path,
        length=file_size,
    )
    _root_logger.info(f"Received upload URL response: {response}")
    if not response["ok"]:
        raise RuntimeError(f"Failed to get upload URL: {response['error']}")
    upload_url = response["upload_url"]
    file_id = response["file_id"]
    
    # upload binary to Slack storage
    with open(image_path, "rb") as f:
        response = requests.post(
            upload_url,
            headers={"Content-Type": "image/png"},
            data=f,
        )
        response.raise_for_status()

    # complete upload and share in channel
    try:
        client.files_completeUploadExternal(
            files=[{
                "id": file_id,
                "title": "Uploaded via ChatSupervisor",
            }],
            channel_id=SLACK_CHANNEL_ID,
        )
    except SlackApiError as e:
        raise RuntimeError(f"Failed to complete image upload: {e.response['error']}") from e
    
    _root_logger.info(f"Completed image upload and shared in channel {SLACK_CHANNEL}")


def sendToSlack(user: str, message: str, image_path: str = None) -> None:
    """Send a message to a Slack channel using the Slack API."""

    message = f"*{user}*: {message}"
    message = cleanMessage(message)
    _root_logger.info(f"Sending message to Slack channel {SLACK_CHANNEL} from user {user}")

    client = connectToClient()

    if message:
        try:
            client.chat_postMessage(channel=SLACK_CHANNEL, text=message)
        except SlackApiError as e:
            raise RuntimeError(f"Slack API error: {e.response['error']}") from e

    if image_path:
        _root_logger.info(f"Uploading image to Slack: {image_path}")
        try:
            uploadImage(client, image_path)
        except Exception as e:
            _root_logger.error(f"Failed to upload image to Slack: {e}")


def main() -> None:
    message = None
    user = None
    image = None
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        arg = args[i]
        if arg in ("--help", "-h"):
            print("Usage: ots-slack.py --message <message> --user <user>")
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
        if arg == "--image" and i + 1 < len(args):
            image = unquote(args[i + 1])
            i += 2
            continue
        i += 1

    _root_logger.info(f"Parsed arguments - message: {message}, user: {user}, image: {image[:50] + '...' if image else None}")
    
    if "--help" in sys.argv or "-h" in sys.argv:
        print("Usage: ots-slack.py --message <message> --user <user> --image <image>")
        raise SystemExit(0)

    if not user and (not message or not image):
        raise SystemExit("Error: No message or user provided. Usage: ots-slack.py --message <message> --user <user> --image <image>")
    
    # parse image from text if it exists, and include in message
    # For example, if message contains [IMAGE]data:image/png;base64,... then we can extract the image data and include it in the message
    # This is a simple example and may need to be adapted based on how images are formatted in the message
    if image:
        _root_logger.info("Message contains image data, processing...")
        parts = image.split("[IMAGE]")
        text_part = parts[0].strip()
        image_part = parts[1].strip()
        if image_part.startswith("data:image/png;base64,"):
            _root_logger.info("Image data is base64-encoded PNG, saving to file...")
            image_data = image_part[len("data:image/png;base64,"):]
            image_path = os.path.join(USER_DATA, "image.png")
            _root_logger.info(f"Saving image to {image_path}...")
            try:
                with open(image_path, "wb") as f:
                    f.write(base64.b64decode(image_data))
                image = f"{text_part}\n[IMAGE: {image_path}]"
            except Exception as e:
                _root_logger.error(f"Failed to save image: {e}")

    sendToSlack(user, message, image_path if image else None)

if __name__ == "__main__":
    main()