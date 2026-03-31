# Apple MCP Server — Complete Wiki

Detailed reference for all 31 tools and 303 actions.

## Table of Contents

- [apple_volume](#apple-volume) (7 actions)
- [apple_brightness](#apple-brightness) (2 actions)
- [apple_clipboard](#apple-clipboard) (3 actions)
- [apple_apps](#apple-apps) (7 actions)
- [apple_sysinfo](#apple-sysinfo) (19 actions)
- [apple_music](#apple-music) (26 actions)
- [apple_spotify](#apple-spotify) (17 actions)
- [apple_safari](#apple-safari) (17 actions)
- [apple_chrome](#apple-chrome) (14 actions)
- [apple_mail](#apple-mail) (10 actions)
- [apple_calendar](#apple-calendar) (8 actions)
- [apple_reminders](#apple-reminders) (10 actions)
- [apple_notes](#apple-notes) (9 actions)
- [apple_finder](#apple-finder) (20 actions)
- [apple_windows](#apple-windows) (14 actions)
- [apple_system](#apple-system) (30 actions)
- [apple_screenshot](#apple-screenshot) (5 actions)
- [apple_notification](#apple-notification) (1 actions)
- [apple_keyboard](#apple-keyboard) (8 actions)
- [apple_tts](#apple-tts) (3 actions)
- [apple_twitter](#apple-twitter) (11 actions)
- [apple_facetime](#apple-facetime) (2 actions)
- [apple_maps](#apple-maps) (2 actions)
- [apple_contacts](#apple-contacts) (9 actions)
- [apple_photos](#apple-photos) (10 actions)
- [apple_messages](#apple-messages) (5 actions)
- [apple_podcasts](#apple-podcasts) (7 actions)
- [apple_books](#apple-books) (5 actions)
- [apple_iwork](#apple-iwork) (11 actions)
- [apple_preview](#apple-preview) (4 actions)
- [apple_textedit](#apple-textedit) (7 actions)

---

## apple_volume

Control macOS system volume. Actions: get, set, up, down, mute, unmute, info.

**Parameters** (in addition to `action`):

- `level` (number, min: 0, max: 100): Volume level 0-100

| Action | Description |
|--------|-------------|
| `get` | Get current volume level (0-100) |
| `set` | Set volume to a specific level |
| `up` | Increase volume by 10% |
| `down` | Decrease volume by 10% |
| `mute` | Mute system audio |
| `unmute` | Unmute system audio |
| `info` | Get detailed audio info (volume, muted, input/output) |

---

## apple_brightness

Control macOS display brightness. Actions: up, down.

| Action | Description |
|--------|-------------|
| `up` | Increase brightness by one step |
| `down` | Decrease brightness by one step |

---

## apple_clipboard

Read and write the macOS clipboard. Actions: get, set, clear.

**Parameters** (in addition to `action`):

- `text` (string): Text to copy to clipboard

| Action | Description |
|--------|-------------|
| `get` | Get current clipboard content as text |
| `set` | Set clipboard content |
| `clear` | Clear the clipboard |

---

## apple_apps

Manage macOS applications. Actions: open, quit, force_quit, is_running, list_running, hide, activate.

**Parameters** (in addition to `action`):

- `name` (string): Application name (e.g. Safari, Finder, Slack)

| Action | Description |
|--------|-------------|
| `open` | Open/launch an application |
| `quit` | Quit an application gracefully |
| `force_quit` | Force quit an unresponsive application |
| `is_running` | Check if an application is currently running |
| `list_running` | List all currently running applications |
| `hide` | Hide an application |
| `activate` | Bring an application to the front without launching a new window |

---

## apple_sysinfo

Read macOS system information. Actions: battery, disk, uptime, ip, macos_version, cpu, memory, top_processes, hostname, resolution, summary, bluetooth_devices, audio_devices, printers, displays, usb_devices, network_interfaces, serial_number, model.

| Action | Description |
|--------|-------------|
| `battery` | Get battery level and charging status |
| `disk` | Get disk space usage |
| `uptime` | Get system uptime |
| `ip` | Get all IP addresses (local, public, tailscale) |
| `macos_version` | Get macOS version and build |
| `cpu` | Get CPU info and current usage |
| `memory` | Get RAM usage |
| `top_processes` | Get top 5 CPU-consuming processes |
| `hostname` | Get computer name and hostname |
| `resolution` | Get screen resolution |
| `summary` | Get a complete system summary (battery, disk, CPU, RAM, uptime) |
| `bluetooth_devices` | List paired/connected Bluetooth devices |
| `audio_devices` | List audio input and output devices |
| `printers` | List configured printers |
| `displays` | List connected displays with resolution info |
| `usb_devices` | List connected USB devices |
| `network_interfaces` | List network interfaces and their IP addresses |
| `serial_number` | Get the Mac serial number |
| `model` | Get the Mac model identifier and name |

---

## apple_music

Control Apple Music. Actions: play, pause, stop, next, prev, restart, now_playing, shuffle_on, shuffle_off, repeat_off, repeat_one, repeat_all, play_playlist, list_playlists, set_volume, love, dislike, search, play_song, queue_next, add_to_playlist, remove_from_playlist, create_playlist, delete_playlist, get_lyrics, radio.

**Parameters** (in addition to `action`):

- `name` (string): Playlist name
- `level` (number, min: 0, max: 100): Volume level 0-100
- `query` (string): Search query (song or artist name)
- `playlist_name` (string): Target playlist name
- `track_name` (string): Track name to remove

| Action | Description |
|--------|-------------|
| `play` | Start playback |
| `pause` | Pause playback |
| `stop` | Stop playback |
| `next` | Skip to next track |
| `prev` | Go to previous track |
| `restart` | Restart current track from the beginning |
| `now_playing` | Get info about the currently playing track |
| `shuffle_on` | Enable shuffle mode |
| `shuffle_off` | Disable shuffle mode |
| `repeat_off` | Disable repeat |
| `repeat_one` | Repeat current track |
| `repeat_all` | Repeat all tracks |
| `play_playlist` | Play a specific playlist by name |
| `list_playlists` | List all playlists |
| `set_volume` | Set Music app volume (independent of system volume) |
| `love` | Mark the current track as loved |
| `dislike` | Mark the current track as disliked |
| `search` | Search Music library by song or artist name (returns up to 20 results) |
| `play_song` | Play a specific song by name |
| `queue_next` | Add a song to play next. Note: Music has limited queue support via AppleScript, so this will start playing the track immediately. |
| `add_to_playlist` | Add the currently playing track to a playlist |
| `remove_from_playlist` | Remove a track from a playlist by name |
| `create_playlist` | Create a new empty playlist |
| `delete_playlist` | Delete a playlist by name |
| `get_lyrics` | Get lyrics of the currently playing track (if available) |
| `radio` | Open Apple Music radio. Note: AppleScript has limited support for radio stations |

---

## apple_spotify

Control Spotify. Actions: play, pause, next, prev, now_playing, set_volume, shuffle, playpause, play_playlist, list_playlists, like, repeat_off, repeat_on, search, play_track, current_album, current_artist.

**Parameters** (in addition to `action`):

- `level` (number, min: 0, max: 100): Volume level 0-100
- `name` (string): Playlist name to search for
- `query` (string): Search query
- `uri` (string): Spotify track URI (e.g. "spotify:track:4iV5W9uYEdYUVa79Axb7Rh")

| Action | Description |
|--------|-------------|
| `play` | Start Spotify playback |
| `pause` | Pause Spotify playback |
| `next` | Skip to next track on Spotify |
| `prev` | Go to previous track on Spotify |
| `now_playing` | Get info about the currently playing Spotify track |
| `set_volume` | Set Spotify volume |
| `shuffle` | Toggle shuffle mode on Spotify |
| `playpause` | Toggle play/pause on Spotify |
| `play_playlist` | Search for a playlist by name in Spotify (opens Spotify search) |
| `list_playlists` | Open your Spotify playlists collection (AppleScript cannot list playlists directly) |
| `like` | Like/save the current track (note: limited support via AppleScript) |
| `repeat_off` | Set Spotify repeat mode to off |
| `repeat_on` | Set Spotify repeat mode to on |
| `search` | Search Spotify for a query (opens Spotify search) |
| `play_track` | Play a specific Spotify track by URI |
| `current_album` | Get the album name of the currently playing Spotify track |
| `current_artist` | Get the artist of the currently playing Spotify track |

---

## apple_safari

Control Safari browser. Actions: open_url, current_url, current_title, list_tabs, close_tab, new_tab, reload, page_text, reading_list, js_execute, back, forward, bookmarks, history_recent, private_window, close_window, tab_count.

**Parameters** (in addition to `action`):

- `url` (string): URL to open
- `code` (string): JavaScript code to execute

| Action | Description |
|--------|-------------|
| `open_url` | Open a URL in Safari |
| `current_url` | Get URL of the current Safari tab |
| `current_title` | Get title of the current Safari tab |
| `list_tabs` | List all open Safari tabs across all windows |
| `close_tab` | Close the current Safari tab |
| `new_tab` | Open a new Safari tab, optionally with a URL |
| `reload` | Reload the current Safari page |
| `page_text` | Get visible text of current Safari page (first 2000 chars). Requires 'Allow JavaScript from Apple Events' in Safari > Develop. |
| `reading_list` | Add a URL to Safari Reading List |
| `js_execute` | Execute JavaScript in the current Safari tab. Requires 'Allow JavaScript from Apple Events' in Safari > Develop. |
| `back` | Go back in browser history |
| `forward` | Go forward in browser history |
| `bookmarks` | List top-level Safari bookmarks (reads from Bookmarks.plist) |
| `history_recent` | Get recent Safari history entries (up to 15) |
| `private_window` | Open a new private browsing window in Safari |
| `close_window` | Close the front Safari window |
| `tab_count` | Count total open tabs across all Safari windows |

---

## apple_chrome

Control Google Chrome browser. Actions: open_url, current_url, current_title, list_tabs, close_tab, reload, js_execute, back, forward, new_window, new_incognito, close_window, tab_count, new_tab.

**Parameters** (in addition to `action`):

- `url` (string): URL to open
- `code` (string): JavaScript code to execute

| Action | Description |
|--------|-------------|
| `open_url` | Open a URL in Google Chrome |
| `current_url` | Get URL of the active Chrome tab |
| `current_title` | Get title of the active Chrome tab |
| `list_tabs` | List all open Chrome tabs across all windows |
| `close_tab` | Close the active Chrome tab |
| `reload` | Reload the active Chrome tab |
| `js_execute` | Execute JavaScript in the active Chrome tab |
| `back` | Go back in browser history |
| `forward` | Go forward in browser history |
| `new_window` | Open a new Chrome window |
| `new_incognito` | Open a new incognito window in Chrome |
| `close_window` | Close the front Chrome window |
| `tab_count` | Count total open tabs across all Chrome windows |
| `new_tab` | Open a new tab in Chrome, optionally with a URL |

---

## apple_mail

Control Apple Mail. Actions: unread_count, check, unread_list, send, mark_all_read, read_body, search, draft, mailboxes, move_to_trash.

**Parameters** (in addition to `action`):

- `to` (string): Recipient email address
- `subject` (string): Email subject
- `body` (string): Email body text
- `query` (string): Search keyword
- `mailbox` (string): Mailbox to search (default: "inbox")

| Action | Description |
|--------|-------------|
| `unread_count` | Get the number of unread emails in inbox |
| `check` | Check for new mail |
| `unread_list` | List up to 10 unread emails (sender and subject) |
| `send` | Send an email |
| `mark_all_read` | Mark all inbox messages as read |
| `read_body` | Read the body of a specific email by subject |
| `search` | Search emails by keyword in subject or sender |
| `draft` | Create a draft email (visible but not sent) |
| `mailboxes` | List all mailboxes |
| `move_to_trash` | Move an email to trash by subject |

---

## apple_calendar

Control Apple Calendar. Actions: list, today, tomorrow, create_event, delete_event, week, date_events, modify_event.

**Parameters** (in addition to `action`):

- `title` (string): Event title
- `cal_name` (string): Calendar name (default: Calendar)
- `hour` (string): Start hour (0-23, default: 9)
- `duration` (string): Duration in hours (default: 1)
- `date` (string): Date in YYYY-MM-DD format

| Action | Description |
|--------|-------------|
| `list` | List all calendar names |
| `today` | List today's events across all calendars |
| `tomorrow` | List tomorrow's events across all calendars |
| `create_event` | Create a new calendar event for today |
| `delete_event` | Delete an event by title |
| `week` | List events for the next 7 days across all calendars |
| `date_events` | List events for a specific date |
| `modify_event` | Modify an event's start time |

---

## apple_reminders

Control Apple Reminders. Actions: list_lists, list, add, complete, delete, set_due, set_priority, add_note, overdue, create_list.

**Parameters** (in addition to `action`):

- `list_name` (string): List name (omit for default list)
- `text` (string): Reminder text
- `due_date` (string): Due date in YYYY-MM-DD format
- `priority` (number, min: 0, max: 9): Priority (0 = none, 1-9)
- `note_text` (string): Note text to add
- `name` (string): Name for the new list

| Action | Description |
|--------|-------------|
| `list_lists` | List all reminder lists |
| `list` | List incomplete reminders (from a specific list or default list) |
| `add` | Add a new reminder |
| `complete` | Mark a reminder as completed (matched by name) |
| `delete` | Delete a reminder by name |
| `set_due` | Set a due date on a reminder |
| `set_priority` | Set priority on a reminder (0 = none, 1-9) |
| `add_note` | Add a note/body to a reminder |
| `overdue` | List overdue reminders |
| `create_list` | Create a new reminder list |

---

## apple_notes

Control Apple Notes. Actions: list, create, read, search, delete, folders, move, append, count.

**Parameters** (in addition to `action`):

- `title` (string): Note title
- `body` (string): Note body text
- `query` (string): Search query
- `folder` (string): Destination folder name
- `text` (string): Text to append

| Action | Description |
|--------|-------------|
| `list` | List recent notes (up to 20) |
| `create` | Create a new note in iCloud |
| `read` | Read the content of a note by title (partial match) |
| `search` | Search notes by title or content |
| `delete` | Delete a note by title |
| `folders` | List all note folders |
| `move` | Move a note to a folder |
| `append` | Append text to an existing note |
| `count` | Count total notes |

---

## apple_finder

Manage Finder: files, folders, trash, wallpaper, disks, tags. Actions: open_folder, reveal, desktop_files, empty_trash, trash_count, eject_disk, eject_all, set_wallpaper, create_folder, file_info, rename, move, copy, delete, create_alias, get_selection, tags, set_tag, list_folder, disk_info.

**Parameters** (in addition to `action`):

- `path` (string): Path to the folder to open
- `name` (string): Name of the disk to eject
- `location` (string): Location (default: desktop)
- `new_name` (string): New name for the file
- `destination` (string): Destination folder path
- `tag` (string): Tag name to set

| Action | Description |
|--------|-------------|
| `open_folder` | Open a folder in Finder |
| `reveal` | Reveal a file in Finder |
| `desktop_files` | List files on the desktop |
| `empty_trash` | Empty the Trash |
| `trash_count` | Count items in the Trash |
| `eject_disk` | Eject a specific disk |
| `eject_all` | Eject all mounted disks |
| `set_wallpaper` | Set the desktop wallpaper |
| `create_folder` | Create a new folder |
| `file_info` | Get info about a file (size, type, modification date) |
| `rename` | Rename a file or folder |
| `move` | Move a file or folder to a new location |
| `copy` | Copy a file or folder to a new location |
| `delete` | Move a file or folder to the Trash |
| `create_alias` | Create a Finder alias (symlink-like shortcut) |
| `get_selection` | Get the currently selected files in Finder |
| `tags` | Get Finder tags of a file |
| `set_tag` | Set a Finder tag on a file |
| `list_folder` | List contents of a folder (up to 30 entries) |
| `disk_info` | Get info about mounted volumes and disks |

---

## apple_windows

Manage macOS windows: move, resize, minimize, fullscreen. Actions: frontmost_app, minimize, minimize_all, maximize, left_half, right_half, fullscreen, close, hide_app, hide_others, center, resize, list_windows, switch_to.

**Parameters** (in addition to `action`):

- `name` (string): Application name to hide
- `width` (number): Desired window width in pixels
- `height` (number): Desired window height in pixels

| Action | Description |
|--------|-------------|
| `frontmost_app` | Get the name of the frontmost application |
| `minimize` | Minimize the front window of the frontmost app |
| `minimize_all` | Minimize all windows of all applications |
| `maximize` | Maximize the front window to fill the screen |
| `left_half` | Move front window to the left half of the screen |
| `right_half` | Move front window to the right half of the screen |
| `fullscreen` | Toggle fullscreen for the front window |
| `close` | Close the front window of the frontmost app |
| `hide_app` | Hide a specific application |
| `hide_others` | Hide all applications except the frontmost |
| `center` | Center the front window on screen |
| `resize` | Resize the front window to a specific width and height |
| `list_windows` | List all windows of the frontmost application |
| `switch_to` | Bring a specific application to the front |

---

## apple_system

System controls: sleep, restart, shutdown, lock, dark mode, DND, caffeinate, wifi, bluetooth, shortcuts, prefs, audio, screen saver, AirDrop, login items, Time Machine, audio devices. Actions: sleep, sleep_display, restart, shutdown, logout, lock, dark_mode, dnd_on, dnd_off, caffeinate, decaffeinate, wifi_status, wifi_on, wifi_off, wifi_network, bluetooth_on, bluetooth_off, run_shortcut, list_shortcuts, open_prefs, display_settings, sound_settings, network_settings, airdrop, screen_saver, login_items, eject_all_disks, time_machine, audio_output, audio_input.

**Parameters** (in addition to `action`):

- `minutes` (number): Minutes to stay awake (default 60)
- `name` (string): Name of the Shortcut to run
- `pane` (string): Pane name: wifi, bluetooth, sound, display, keyboard, trackpad, battery, security, notifications, general

| Action | Description |
|--------|-------------|
| `sleep` | Put the Mac to sleep |
| `sleep_display` | Turn off the display (sleep display only) |
| `restart` | Restart the Mac |
| `shutdown` | Shut down the Mac |
| `logout` | Log out the current user |
| `lock` | Lock the screen |
| `dark_mode` | Toggle dark mode on/off |
| `dnd_on` | Enable Do Not Disturb |
| `dnd_off` | Disable Do Not Disturb |
| `caffeinate` | Prevent Mac from sleeping for N minutes (default 60) |
| `decaffeinate` | Stop caffeinate (allow sleep again) |
| `wifi_status` | Get Wi-Fi power status |
| `wifi_on` | Turn Wi-Fi on |
| `wifi_off` | Turn Wi-Fi off |
| `wifi_network` | Get the current Wi-Fi network name |
| `bluetooth_on` | Turn Bluetooth on |
| `bluetooth_off` | Turn Bluetooth off |
| `run_shortcut` | Run a macOS Shortcut by name |
| `list_shortcuts` | List all available macOS Shortcuts |
| `open_prefs` | Open System Preferences (optionally a specific pane) |
| `display_settings` | Open Display preferences (Night Shift, resolution, etc.) |
| `sound_settings` | Open Sound preferences (output/input devices, volume) |
| `network_settings` | Open Network preferences |
| `airdrop` | Open AirDrop window |
| `screen_saver` | Start the screen saver |
| `login_items` | List login items (apps that start at login) |
| `eject_all_disks` | Force-unmount all external disks |
| `time_machine` | Get Time Machine backup status |
| `audio_output` | Get the current default audio output device |
| `audio_input` | Get the current default audio input device |

---

## apple_screenshot

Take screenshots on macOS. Actions: full, clipboard, timed, area, window.

**Parameters** (in addition to `action`):

- `path` (string): Save path (default: ~/Desktop/screenshot.png)
- `seconds` (number): Delay in seconds (default 5)

| Action | Description |
|--------|-------------|
| `full` | Take a full screenshot and save to file |
| `clipboard` | Take a screenshot and copy to clipboard |
| `timed` | Take a screenshot after a delay |
| `area` | Take a screenshot of a selected area (interactive — user draws rectangle) |
| `window` | Take a screenshot of the frontmost window |

---

## apple_notification

Send macOS notifications. Actions: send.

**Parameters** (in addition to `action`):

- `title` (string): Notification title
- `message` (string): Notification body text
- `sound` (string): Sound name (default: "default")

| Action | Description |
|--------|-------------|
| `send` | Send a notification |

---

## apple_keyboard

Simulate keyboard input. Actions: type_text, press_key, copy, paste, undo, redo, save, select_all.

**Parameters** (in addition to `action`):

- `text` (string): Text to type
- `combo` (string): Key combo like cmd+c, cmd+shift+z, return, escape

| Action | Description |
|--------|-------------|
| `type_text` | Type text via simulated keystrokes |
| `press_key` | Press a key combination (e.g. "cmd+c", "cmd+shift+z", "return", "escape") |
| `copy` | Copy (Cmd+C) |
| `paste` | Paste (Cmd+V) |
| `undo` | Undo (Cmd+Z) |
| `redo` | Redo (Cmd+Shift+Z) |
| `save` | Save (Cmd+S) |
| `select_all` | Select All (Cmd+A) |

---

## apple_tts

Text-to-speech on macOS. Actions: say, list_voices, stop.

**Parameters** (in addition to `action`):

- `text` (string): Text to speak
- `voice` (string): Voice name (default: "Thomas")
- `rate` (number): Speech rate in words per minute (default: 200)

| Action | Description |
|--------|-------------|
| `say` | Speak text aloud using macOS TTS |
| `list_voices` | List available TTS voices |
| `stop` | Stop any ongoing speech |

---

## apple_twitter

Control X/Twitter via Safari. Actions: post, draft, save, list_drafts, post_draft, reply, like, retweet, feed, notifications, dm_check.

**Parameters** (in addition to `action`):

- `text` (string): Tweet text (max 280 chars)
- `auto_send` (boolean): Auto-click Post button (default true)
- `num` (number): Draft number to post
- `tweet_url` (string): URL of the tweet to reply to (or tweet ID)

| Action | Description |
|--------|-------------|
| `post` | Post a tweet on X/Twitter via Safari (requires Safari logged into X with JS from Apple Events enabled) |
| `draft` | Create a tweet and save it as an X native draft (opens compose, types, closes, saves) |
| `save` | Save the current tweet being composed in Safari to a local drafts file |
| `list_drafts` | List locally saved tweet drafts |
| `post_draft` | Post a saved draft by number |
| `reply` | Open a reply to a specific tweet |
| `like` | Like the current tweet visible in Safari |
| `retweet` | Retweet/repost the current tweet visible in Safari |
| `feed` | Get the latest tweets from the X timeline |
| `notifications` | Check X notification count |
| `dm_check` | Check X DM count |

---

## apple_facetime

Make FaceTime calls. Actions: call (video), audio.

**Parameters** (in addition to `action`):

- `contact` (string): Phone number, email, or contact name

| Action | Description |
|--------|-------------|
| `call` | Start a FaceTime video call |
| `audio` | Start a FaceTime audio call |

---

## apple_maps

Open Apple Maps with a search query or directions. Actions: open, directions.

**Parameters** (in addition to `action`):

- `query` (string): Place name, address, or search query
- `from` (string): Starting location
- `to` (string): Destination location

| Action | Description |
|--------|-------------|
| `open` | Search for a place or get directions |
| `directions` | Get directions between two places in Apple Maps |

---

## apple_contacts

Control Apple Contacts. Actions: search, get, list, create, groups, group_members, delete, update_phone, update_email.

**Parameters** (in addition to `action`):

- `query` (string): Name to search for
- `name` (string): Contact name
- `first_name` (string): First name
- `last_name` (string): Last name
- `phone` (string): Phone number
- `email` (string): Email address

| Action | Description |
|--------|-------------|
| `search` | Search contacts by name |
| `get` | Get full details of a contact by name |
| `list` | List all contacts (first 30) |
| `create` | Create a new contact |
| `groups` | List all contact groups |
| `group_members` | List members of a contact group |
| `delete` | Delete a contact by name |
| `update_phone` | Update the phone number of a contact |
| `update_email` | Update the email address of a contact |

---

## apple_photos

Control Apple Photos. Actions: albums, recent, search, favorites, album_contents, export, count, create_album, add_to_album, import.

**Parameters** (in addition to `action`):

- `query` (string): Search keyword
- `name` (string): Album name
- `filename` (string): Photo filename to export
- `path` (string): POSIX path to the photo file
- `album` (string): Album name to add the photo to

| Action | Description |
|--------|-------------|
| `albums` | List all photo albums |
| `recent` | Get info about 10 most recent photos |
| `search` | Search photos by keyword in name or description |
| `favorites` | List favorited photos (up to 20) |
| `album_contents` | List photos in a specific album (up to 20) |
| `export` | Export a photo to the Desktop by filename |
| `count` | Get total number of photos in library |
| `create_album` | Create a new photo album |
| `add_to_album` | Import a photo file into a specific album |
| `import` | Import a photo file into the Photos library |

---

## apple_messages

Control Apple Messages / iMessage. Actions: recent, send, unread, conversation, search.

**Parameters** (in addition to `action`):

- `to` (string): Phone number or email of recipient
- `text` (string): Message text to send
- `contact` (string): Phone number or email (chat_identifier)
- `limit` (number): Number of messages to retrieve (default 10)
- `query` (string): Keyword to search for in messages

| Action | Description |
|--------|-------------|
| `recent` | Get the 10 most recent conversations |
| `send` | Send an iMessage to a contact |
| `unread` | Count unread messages |
| `conversation` | Read messages from a specific contact |
| `search` | Search messages by keyword |

---

## apple_podcasts

Control Apple Podcasts. Actions: now_playing, play, pause, next, shows, episodes, search.

**Parameters** (in addition to `action`):

- `name` (string): Show name
- `query` (string): Search query

| Action | Description |
|--------|-------------|
| `now_playing` | Get info about the currently playing podcast episode |
| `play` | Start or resume podcast playback |
| `pause` | Pause podcast playback |
| `next` | Skip to the next episode |
| `shows` | List subscribed podcast shows |
| `episodes` | List recent episodes of a subscribed show |
| `search` | Search for podcasts (opens Podcasts app search) |

---

## apple_books

Control Apple Books. Actions: library, reading_now, collections, search, open. Note: Books has limited AppleScript support — some actions may return partial results.

**Parameters** (in addition to `action`):

- `query` (string): Search query

| Action | Description |
|--------|-------------|
| `library` | List books in library (first 20) |
| `reading_now` | Get currently reading book |
| `collections` | List collections/shelves |
| `search` | Search books by opening Books app search |
| `open` | Open Books app |

---

## apple_iwork

Control Pages, Numbers, and Keynote. Actions: pages_create, pages_open, pages_export_pdf, numbers_create, numbers_open, numbers_export_pdf, keynote_create, keynote_open, keynote_export_pdf, keynote_start_slideshow, keynote_stop_slideshow.

**Parameters** (in addition to `action`):

- `path` (string): POSIX path to the file

| Action | Description |
|--------|-------------|
| `pages_create` | Create a new Pages document |
| `pages_open` | Open a file in Pages |
| `pages_export_pdf` | Export the front Pages document to PDF |
| `numbers_create` | Create a new Numbers spreadsheet |
| `numbers_open` | Open a file in Numbers |
| `numbers_export_pdf` | Export the front Numbers document to PDF |
| `keynote_create` | Create a new Keynote presentation |
| `keynote_open` | Open a file in Keynote |
| `keynote_export_pdf` | Export the front Keynote presentation to PDF |
| `keynote_start_slideshow` | Start slideshow of the current Keynote presentation |
| `keynote_stop_slideshow` | Stop the current Keynote slideshow |

---

## apple_preview

Control Preview app. Actions: open, list_open, close, close_all. Note: Preview has limited AppleScript support.

**Parameters** (in addition to `action`):

- `path` (string): POSIX path to the file to open

| Action | Description |
|--------|-------------|
| `open` | Open a file in Preview |
| `list_open` | List currently open documents in Preview |
| `close` | Close the front document in Preview |
| `close_all` | Close all documents in Preview |

---

## apple_textedit

Control TextEdit. Actions: create, open, get_text, set_text, save, close, list_open.

**Parameters** (in addition to `action`):

- `text` (string): Initial text content for the document
- `path` (string): POSIX path to the file

| Action | Description |
|--------|-------------|
| `create` | Create a new TextEdit document with optional text |
| `open` | Open a file in TextEdit |
| `get_text` | Get text of the front TextEdit document |
| `set_text` | Set text of the front TextEdit document |
| `save` | Save the front TextEdit document |
| `close` | Close the front TextEdit document |
| `list_open` | List open TextEdit documents |

---

## MCP Resources

Read-only data Claude can attach to its context without a tool call.

| URI | Description |
|-----|-------------|
| `apple://now-playing` | Current track from Apple Music or Spotify |
| `apple://system-info` | Battery, disk, uptime, CPU load, RAM |
| `apple://open-tabs/safari` | All open Safari tabs (title + URL) |
| `apple://open-tabs/chrome` | All open Chrome tabs (title + URL) |

---

## Security Reference

### Destructive actions (flagged with warning)

| Tool | Actions |
|------|---------|
| `apple_finder` | `empty_trash`, `delete`, `eject_all` |
| `apple_system` | `shutdown`, `restart`, `logout`, `sleep`, `eject_all_disks` |
| `apple_mail` | `send`, `mark_all_read`, `move_to_trash` |
| `apple_twitter` | `post`, `post_draft`, `reply`, `like`, `retweet` |
| `apple_contacts` | `delete` |
| `apple_notes` | `delete` |
| `apple_reminders` | `delete` |
| `apple_music` | `delete_playlist`, `remove_from_playlist` |
| `apple_apps` | `force_quit` |

### Blocked paths

File operations reject paths under: `/System`, `/usr`, `/bin`, `/sbin`, `/private/var`, `/Library/LaunchDaemons`, `/Library/LaunchAgents`

### Concurrency-protected actions

Safari and Chrome tab operations are serialized with `withLock()` to prevent race conditions:

- **Safari**: `js_execute`, `back`, `forward`, `page_text`, `close_tab`, `reload`
- **Chrome**: `js_execute`, `back`, `forward`, `close_tab`, `reload`