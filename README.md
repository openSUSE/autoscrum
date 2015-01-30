# AutoScrum

`AutoScrum` is a webtool designed to automate repetetive tasks involved in
Scrum meetings, like setting card priorities, adding story points and moving
the cards from the backlog.
To try `AutoScrum` right now grab your [Trello API key](https://trello.com/1/appKey/generate)
and visit our [github pages](http://opensuse.github.io/autoscrum) (Might not
contain the latest code).

## Contents

   * [Setup](#setup)
   * [Usage](#usage)

## Setup

  To setup `AutoScrum` simply put the files in the `lib/` directory into your
  `localhost` directory.

  > Note:
  > `AutoScrum` will not work properly if it is not accessed via a web server.

## Usage

### Preparation

  1. Add your [Trello API key](https://trello.com/1/appKey/generate) to
    `autoscrum.config.json`.

  2. Make sure that the Trello board you are intending to use has a list named
     'Backlog', which contains your cards.

### Usage

  Access `AutoScrum` via your web browser. Now connect to Trello and choose
  your working board.
  This loads the estimation view in which you have access to the top 7 not
  estimated cards in your backlog list. Note that everytime the cards are
  fetched they are automatically prioritised. You can sort cards either via
  drag-and-drop or hovering over them and pressing the corresponding number.

  Once estimation is finished you can switch to the final view. Here you can
  set waterline and seabed for your cards. Clicking 'Save to board' transfers
  all cards above the seabed to a new list on your board called 'Sprint
  Backlog' and inserts a waterline card at the specified position.
