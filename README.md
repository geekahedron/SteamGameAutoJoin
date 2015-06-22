# SteamGameAutoJoin

## Installation
###Tampermonkey

Visit https://raw.githubusercontent.com/geekahedron/SteamGameAutoJoin/master/autojoin.user.js

When the editor has loaded, click Install (NOT Process with Chrome).

###Greasemonkey

Navigate to https://raw.githubusercontent.com/geekahedron/SteamGameAutoJoin/master/autojoin.user.js

Right click on the page, and click Save Page As.
While Firefox is still open, open a File Manager of any sort, and navigate to the directory you saved the script.
Drag & drop the script file onto the Firefox window.
Press Install.

## Purpose
There are numerous problems with using JoinGame() and especially using setInterval scripts to call JoinGame(), mainly because JoinGame() will forcibly remove you from your current room every time it is called, whether you join a new room or not.

If you are using a setInterval script or simply spam the JoinGame command too quickly, such that you call JoinGame after you have successfully entered a room, you will leave the room and no longer be allowed to join the room you just left.

If you are in a room and trying to join another room using JoinGame, but the target room is full, too high a level, or one that you have previously quit and cannot enter, you will be forced out of your current room even though it's not even possible to enter the new one.

I have created a script that bypasses the JoinGame function and calls the ajax API directly, handling the error messages and only leaving your current room if you need to.

## Features
Displays current room number on resume button.

Adds a text entry to the game lobby where you can type in the ID of the game you wish to join, then press the Auto Join Game button and let the script do its thing (stop at any time using the Stop button, of course)!

If there is an error that will not allow you into the game,it will be displayed as normal; otherwise, all errors are handled intelligently by the script and only show up in the console log.

Option to continue trying if the room is full. Will not leave your current room until there is room in your target.

If you are already in a room, you will not be forced to leave your current room if the target room is full, too high a level, or one you have previously quit (this is the only script that does this!).

New in version 3: Loop through multiple rooms at once (comma-separated list)!

New in version 4: Loop through the rooms in your queue in separate threads instead of sequentially, for faster asynchronous searching.

## Usage
Adds a text field and two buttons to the join game (lobby) page of the Steam minigame. Type the desired room number into the box and click "AutoJoin room." 

**NEW** Type several room numbers, separated by commas (no spaces) and the script will loop through trying to join all of them at once! You can also type one room number, click the button, type another room number, click the button again, and so on, to run the script several times in parallel.

Script will continue to try joining the room and capture errors. Stops automatically when the room is full or if you cannot join for other reasons (too high level, or previously left the room). Click the stop button at any time to manually stop the script from running and enter a new room number.

Press enter to start and escape to stop.

TODO: Add autojoin buttons and room numbers on friends list
TODO: Pull in known room numbers from various sources (steamga.me, MSG15, CMP2015, YOWH, etc)
