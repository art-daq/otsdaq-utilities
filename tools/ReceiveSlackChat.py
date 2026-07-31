#!/usr/bin/env python3
# ____________________________________________________________
#
# Long-running daemon that continuously polls a Slack channel for new messages
# and appends them to an output file for the OTS ChatSupervisor to consume.
#
# The output file uses a simple line-based protocol:
#   MSG\t<display_name>\t<message_text>
#
# The ChatSupervisor reads and truncates the file on each poll cycle.
# A lock file (.lock) is used to coordinate access.
#
#  ReceiveSlackChat.py --help
#
# ____________________________________________________________
#
# For example:
#     ./ReceiveSlackChat.py --output /tmp/slack_messages.txt --interval 5
#         -- polls every 5 seconds, appends messages to the output file


import fcntl
import os
import re
import sys
import time


def _install_parent_death_signal():
    """Ask the kernel to SIGTERM us when our parent (ChatSupervisor/xdaq) exits.

    Prevents orphaned daemons from piling up when the gateway is killed and
    relaunched by the ots script. Linux-only; silently no-ops elsewhere.
    """
    try:
        import ctypes

        libc = ctypes.CDLL("libc.so.6", use_errno=True)
        PR_SET_PDEATHSIG = 1
        libc.prctl(PR_SET_PDEATHSIG, 15)  # 15 == SIGTERM
    except Exception:
        return
    # Handle the race where the parent already died between fork() and prctl():
    # in that case getppid() will be 1 (init/systemd).
    if os.getppid() == 1:
        raise SystemExit(0)


_install_parent_death_signal()


# Slack SDK/config are only required when actually running the daemon.
# Allow `--help` to work even if slack_sdk or SLACK_* env vars are not set.
WebClient = None
SlackApiError = Exception

if "--help" not in sys.argv and "-h" not in sys.argv:
    try:
        from slack_sdk import WebClient
        from slack_sdk.errors import SlackApiError
    except ImportError as e:
        raise ImportError(
            "Install slack_sdk with 'pip install slack_sdk' to use this script."
        ) from e

    SLACK_BOT_TOKEN = os.environ.get("SLACK_BOT_TOKEN")
    SLACK_CHANNEL_ID = os.environ.get("SLACK_CHANNEL_ID")
    if not SLACK_BOT_TOKEN or not SLACK_CHANNEL_ID:
        raise RuntimeError(
            "Environment variables SLACK_BOT_TOKEN and SLACK_CHANNEL_ID must be set."
        )
else:
    SLACK_BOT_TOKEN = None
    SLACK_CHANNEL_ID = None

# Slack errors that will never recover without operator/config action.
# Keep polling on them is pure noise, so we exit instead.
FATAL_SLACK_ERRORS = frozenset(
    {
        "missing_scope",
        "invalid_auth",
        "not_authed",
        "token_revoked",
        "token_expired",
        "account_inactive",
        "channel_not_found",
        "not_in_channel",
        "is_archived",
    }
)


class FatalSlackError(RuntimeError):
    pass


def _format_slack_error(e):
    err = e.response.get("error", "unknown")
    needed = e.response.get("needed")
    provided = e.response.get("provided")
    extra = ""
    if needed:
        extra = f" (needed scope: {needed}"
        if provided:
            extra += f", provided: {provided}"
        extra += ")"
    return f"{err}{extra}"


def get_display_name(client, user_id, cache):
    if user_id in cache:
        return cache[user_id]
    try:
        info = client.users_info(user=user_id)
        profile = info["user"]["profile"]
        name = (
            profile.get("display_name")
            or profile.get("real_name")
            or info["user"].get("name", user_id)
        )
    except SlackApiError as e:
        if e.response.get("error") in FATAL_SLACK_ERRORS:
            raise FatalSlackError(f"users_info failed: {_format_slack_error(e)}") from e
        name = user_id
    cache[user_id] = name
    return name


_MENTION_RE = re.compile(r"<@([A-Z0-9]+)(?:\|[^>]*)?>")
_CHANNEL_RE = re.compile(r"<#[A-Z0-9]+\|?([^>]*)>")
_LINK_RE = re.compile(r"<((?:https?|mailto):[^>|]*)(?:\|([^>]*))?>")
_SPECIAL_RE = re.compile(r"<!([^>|]+)(?:\|([^>]*))?>")


def normalize_slack_text(client, text, user_cache):
    """Convert Slack message markup to plain text.

    Slack sends mentions/links as e.g. <@U123>, <#C123|general>,
    <https://x.y|label>, <!here>, and HTML-escapes &, <, >.
    """
    text = _MENTION_RE.sub(
        lambda m: "@" + get_display_name(client, m.group(1), user_cache), text
    )
    text = _CHANNEL_RE.sub(lambda m: "#" + (m.group(1) or "channel"), text)
    text = _LINK_RE.sub(lambda m: m.group(2) or m.group(1), text)
    text = _SPECIAL_RE.sub(lambda m: "@" + (m.group(2) or m.group(1)), text)
    return text.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")


def poll_once(client, last_ts, user_cache):
    """Fetch new messages from Slack since last_ts.

    Returns (lines, new_last_ts, ok). ok is False if the poll failed due to a
    transient error; rate limits are handled internally by sleeping and then
    returning ok=True so the caller doesn't count it as a failure.
    """
    kwargs = {"channel": SLACK_CHANNEL_ID, "limit": 50}
    if last_ts and last_ts != "0":
        kwargs["oldest"] = last_ts

    try:
        response = client.conversations_history(**kwargs)
    except SlackApiError as e:
        err = e.response.get("error", "")
        if err in FATAL_SLACK_ERRORS:
            raise FatalSlackError(
                f"conversations_history failed: {_format_slack_error(e)}"
            ) from e
        if err == "ratelimited":
            retry_after = int(e.response.headers.get("Retry-After", "30"))
            print(
                f"Slack rate limit hit; sleeping {retry_after}s",
                file=sys.stderr,
                flush=True,
            )
            time.sleep(retry_after)
            return [], last_ts, True
        print(
            f"Error polling Slack: {_format_slack_error(e)}",
            file=sys.stderr,
            flush=True,
        )
        return [], last_ts, False

    messages = response.get("messages", [])
    messages.reverse()

    if messages and os.environ.get("OTS_SLACK_DEBUG") == "1":
        print(
            f"[poll] since={last_ts} channel={SLACK_CHANNEL_ID} "
            f"got {len(messages)} raw message(s)",
            flush=True,
        )

    lines = []
    newest_ts = last_ts
    skipped_bot = 0
    skipped_no_user = 0

    for msg in messages:
        ts = msg.get("ts", "0")

        if ts == last_ts:
            continue

        if msg.get("subtype") == "bot_message" or msg.get("bot_id"):
            skipped_bot += 1
            if ts > newest_ts:
                newest_ts = ts
            continue

        user_id = msg.get("user", "")
        if not user_id:
            skipped_no_user += 1
            if ts > newest_ts:
                newest_ts = ts
            continue

        display_name = get_display_name(client, user_id, user_cache)
        display_name = display_name.replace("\t", " ").replace("\n", " ")
        text = msg.get("text", "")
        text = normalize_slack_text(client, text, user_cache)
        text = text.replace("\\", "\\\\").replace("\t", " ").replace("\n", "\\n")

        if os.environ.get("OTS_SLACK_DEBUG") == "1":
            print(f"[poll] user={display_name} ts={ts} text={text!r}", flush=True)

        lines.append(f"MSG\t{display_name}\t{text}")

        if ts > newest_ts:
            newest_ts = ts

    if messages and os.environ.get("OTS_SLACK_DEBUG") == "1":
        print(
            f"[poll] kept={len(lines)} skipped_bot={skipped_bot} "
            f"skipped_no_user={skipped_no_user} new_last_ts={newest_ts}",
            flush=True,
        )

    return lines, newest_ts, True


def append_to_file(output_path, lines):
    """Append message lines to the output file with file locking."""
    lock_path = output_path + ".lock"
    with open(lock_path, "w") as lock_fd:
        fcntl.flock(lock_fd, fcntl.LOCK_EX)
        with open(output_path, "a") as f:
            for line in lines:
                f.write(line + "\n")
        fcntl.flock(lock_fd, fcntl.LOCK_UN)


def _load_last_ts(state_path, lookback_seconds):
    """Read persisted last_ts from state file; fall back to now - lookback."""
    try:
        with open(state_path, "r") as f:
            val = f.read().strip()
        if val:
            print(f"[startup] resuming from persisted last_ts={val}", flush=True)
            return val
    except FileNotFoundError:
        # Expected on first run (or before state is created); fall back below.
        pass
    except Exception as e:
        print(
            f"[startup] failed reading {state_path}: {e}", file=sys.stderr, flush=True
        )
    ts = f"{time.time() - lookback_seconds:.6f}"
    print(
        f"[startup] no state file; looking back {lookback_seconds}s (last_ts={ts})",
        flush=True,
    )
    return ts


def _save_last_ts(state_path, last_ts):
    try:
        tmp = state_path + ".tmp"
        with open(tmp, "w") as f:
            f.write(str(last_ts))
        os.replace(tmp, state_path)
    except Exception as e:
        print(f"[state] failed writing {state_path}: {e}", file=sys.stderr, flush=True)


def run_daemon(output_path, interval):
    """Main loop: poll Slack, write new messages to file, repeat."""
    client = WebClient(token=SLACK_BOT_TOKEN)

    # Verify connection
    try:
        client.auth_test()
    except SlackApiError as e:
        print(f"Failed to connect to Slack: {e.response['error']}", file=sys.stderr)
        raise SystemExit(1)

    print(
        f"ReceiveSlackChat daemon started (interval={interval}s, output={output_path})",
        flush=True,
    )

    # Persist last_ts so restarts don't miss messages sent while OTS was down.
    # First run (or missing state file): look back 5 minutes for recent context.
    state_path = output_path + ".last_ts"
    last_ts = _load_last_ts(state_path, lookback_seconds=300)
    user_cache = {}
    consecutive_failures = 0
    MAX_CONSECUTIVE_FAILURES = 10

    while True:
        try:
            lines, new_last_ts, ok = poll_once(client, last_ts, user_cache)
        except FatalSlackError as e:
            print(
                f"Fatal Slack error, stopping daemon: {e}",
                file=sys.stderr,
                flush=True,
            )
            raise SystemExit(1)
        if ok:
            consecutive_failures = 0
            if new_last_ts != last_ts:
                last_ts = new_last_ts
                _save_last_ts(state_path, last_ts)
        else:
            consecutive_failures += 1
            if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                print(
                    f"Slack polling failed {consecutive_failures} times in a row; "
                    "stopping daemon.",
                    file=sys.stderr,
                    flush=True,
                )
                raise SystemExit(1)
        if lines:
            append_to_file(output_path, lines)
            if os.environ.get("OTS_SLACK_DEBUG") == "1":
                print(f"Wrote {len(lines)} message(s) to {output_path}", flush=True)
        time.sleep(interval)


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print("Usage: ReceiveSlackChat.py --output <file> [--interval <seconds>]")
        print("  --output    Path to the message output file (required)")
        print("  --interval  Poll interval in seconds (default: 30)")
        raise SystemExit(0)

    output_path = None
    interval = 30
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--output" and i + 1 < len(args):
            output_path = args[i + 1]
            i += 2
            continue
        if args[i] == "--interval" and i + 1 < len(args):
            interval = int(args[i + 1])
            i += 2
            continue
        i += 1

    if not output_path:
        print("Error: --output is required", file=sys.stderr)
        raise SystemExit(1)

    run_daemon(output_path, interval)


if __name__ == "__main__":
    main()
