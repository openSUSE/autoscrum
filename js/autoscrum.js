/*
 * AutoScrum.js
 *
*/

/*
 * Global Variables
*/

// Should be configurable
var MainList = "Backlog";
var MainListID = "1";
var TargetList = "Sprint Backlog";
var TargetListID = "1";
var AvgVelocity = 25;

var CardPositions = [];
var CardCount = null;
var CardsSorted = false;

var hoverId = null;
var hoverItem = null;

var Waterline = null;
var WaterlineId = "1";
var Seabed = null;
var Velocity = 0;
var VelocityCard = null;

/*
 * Authorization
*/
var logout = function() {
    Trello.deauthorize();
    LogInAppearence();
};

var Authorized = function() {
    Trello.members.get("me", function(member) {
        $("#fullName").text(member.fullName);
        $.each(member.idBoards, function(ix, board) {
            Trello.get("boards/" + board + "/name", function(boardName) {
                $("<input type='button'>")
                    .attr({value: $(boardName).attr("_value"), bid: board})
                    .addClass("boardSelect")
                    .addClass("btn")
                    .addClass("btn-default")
                    .appendTo(".BoardPopup");
            });
        });
    });
    BoardPopUpOpen();
};

/*
 * Initalization
 */
var SetLists = function() {
    LogInAppearence();
    // Get the ID for the list in which we'll prio
    Trello.get("boards/" + MainBoard + "/lists", function(lists) {
        $.each(lists, function(ix, list) {
            if (list.name == MainList) {
                MainListID = list.id
            }
            if (list.name == TargetList) {
                TargetListID = list.id;
            }});
    });
    EnableSortable();
};

var CreateTargetList = function() {
    Trello.post("lists",
                { name: TargetList, idBoard: MainBoard, pos: "bottom" },
                function() {
                    Trello.get("boards/" + MainBoard + "/lists", function(lists) {
                        $.each(lists, function(ix, list) {
                            if (list.name == TargetList) {
                                TargetListID = list.id;
                            }
                        });
                    });
                });
};

var BoardPopUpOpen = function() {
    $(".BoardPopup").fadeIn("normal");
};

var BoardPopUpClose = function(_callback) {
    $(".BoardPopup").fadeOut("normal");
    $(".BoardPopup").empty();
    _callback();
};

/*
 * Functions for estimation phase
 */

/*
 * Functions to get cards
 */
var GetCardNameFromListItem = function(item) {
    return item.children().children().attr("cname");
};

var GetCardIdFromListItem = function(item) {
    return item.children().children().attr("cid");
};

var GetCardsInList = function(ID) {
    // First check if the list does exist
    if (MainListID == 1) {
        if (!alert("This board does not have a " + MainList + " list")) {
            window.location.reload();
        }
    }
    // Cleaning the list before appending stuff
    $("#maintable").empty();
    Trello.get("lists/" + ID + "/cards", function(cards) {
        // Displaying the cards
        $.each(cards, function(ix, card) {
            if(CardCount != null && ix >= CardCount) { return false; }
            $("<a>")
                .attr({href: card.url, target: "trello", cid: card.id, cname: card.name, cpos: ix+1, title: card.name})
                .addClass("card")
                .text(card.name)
                .appendTo("#mainput" + ix);
            // Positions are needed to insert the waterline
            CardPositions.push(card.pos);
        });
    });
};

/*
 * Estimation functions
 */
var EnableSortable = function() {
    $(".connectedSortable")
        .sortable({
            connectWith: ".connectedSortable",
            start: function(event, ui) {
                $(ui.item).attr("OldIndex", ui.item.index());
            },
            receive: function(event, ui) {
                // Save parent id so we know which list we are in
                var parent = $(ui.item).parent();
                // Remove move class in case we already moved somewhere before
                if ($(ui.item).is('[class*="moved"]')) {
                    $(ui.item).removeClass(function() {
                        return $(ui.item).attr("class").split(' ').pop();
                    });
                } else {
                    TrackVelocity(GetCardNameFromListItem(ui.item), $(parent).attr("id").replace(/[^0-9]/g, ""));
                    CardCount += 1;
                }
                if ($(parent).attr("id") != "maintable") {
                    $(ui.item).addClass("moved" + $(parent).attr("id"));
                    UpdateCardEstimation(GetCardIdFromListItem(ui.item),
                                         GetCardNameFromListItem(ui.item),
                                         $(parent).attr("id"));
                }
            }
        }).disableSelection();
};

$(function() {
    $(".connectedSortable > li")
        .live("hover", function() {
            hoverItem = $(this)
        });
});

$(document).keypress(function(e) {
    if(e.which == 98) {
        var targettable = "#maintable";
    } else {
        var targettable = "#sorttable" + String.fromCharCode(e.which);
    }
    // Move the first element in the Prio List when not hovering
    if (! hoverItem) {
        hoverItem = $(".maintable li:first")
    }

    hoverId = hoverItem.attr("id");
    $(targettable).append($("#" + hoverId));
    // Remove move class in case we already moved somewhere before
    if ($("#" + hoverId).is('[class*="moved"]')) {
        $("#" + hoverId).removeClass(function() {
            return $("#" + hoverId).attr("class").split(' ').pop();
        });
    } else {
        TrackVelocity(GetCardNameFromListItem(hoverItem), String.fromCharCode(e.which));
        CardCount += 1;
    }
    $("#" + hoverId).addClass("moved" + $(targettable).attr("id"));
    UpdateCardEstimation(GetCardIdFromListItem(hoverItem),
                         GetCardNameFromListItem(hoverItem),
                         $(hoverItem).parent().attr("id"));

    hoverId = null;
    hoverItem = null;
});

var TrackVelocity = function(card, estimate) {
    Velocity += parseInt(estimate);
    if (AvgVelocity <= Velocity) {
        VelocityCard = card;
        // This is a temporary solution, but the velocity should never be this high anyway
        AvgVelocity = 9999;
    }
};

var UpdateCardEstimation = function(cId, cName, value) {
    CardsSorted = true;
    value = value.replace(/[^0-9]/g, "");
    // Check if there's already an estimation
    if (cName.match(/\([0-9]{0,2}\)/)) {
        name = cName.replace(/\([0-9]{0,1}\)/, "(" + value + ")");
    } else {
        name = "(" + value + ") " + cName;
    }
    Trello.put("cards/" + cId + "/name",
               { value: name },
               function() {});
};

/*
 * Prioritization functions
*/
var SetUpMainList = function(length) {
    if (CardCount != null) {
        length = CardCount;
    }
    for(i = 0; i < length; i++) {
        $("<li>")
            .attr({id: "main" + i})
            .addClass("ui-state-default")
            .addClass("col-md-2")
            .addClass("ui-sortable-handle")
            .appendTo("#maintable");
    }
    for(r = 0; r < length; r++) {
        $("<div>")
            .attr({id: "mainput" + r})
            .appendTo("#main" + r);
    }
};

var SetPriority = function() {
    Trello.get("lists/" + MainListID + "/cards", function(cards) {
        SetUpMainList(cards.length);
        $.each(cards, function(ix, card) {
            if(CardCount != null && ix >= CardCount) { return false; }
            count = ix+1
            // Check if there's already a priority
            if (card.name.match(/P[0-9]{1,4}:/)) {
                if (count < 10 ) {
                    name = card.name.replace(/P[0-9]{1,4}/, "P0" + count);
                } else {
                    name = card.name.replace(/P[0-9]{1,4}/, "P" + count);
                }
            } else {
                if (count < 10) {
                    name = "P0" + count + ": " + card.name;
                } else {
                    name = "P" + count + ": " + card.name;
                }
            }
            Trello.put("cards/" + card.id + "/name",
                       { value: name },
                       function() {});
        });
    });
    GetCardsInList(MainListID);
};

/*
 * Final list functions
 */

/*
 * Waterline
*/
var CreateWaterline = function(_callback) {
    Trello.post("cards",
                { name: "~~~~Waterline~~~~", idList: MainListID })
        .done(function(card) { _callback(card); });
};

var MoveWaterline = function() {
    Trello.put("cards/" + WaterlineId + "/pos",
               { value: ((CardPositions[Waterline]+CardPositions[Waterline-1])/2) },
               function() {});
}

// Only show estimated cards in the final list
var RemoveNotEstimated = function(_callback) {
    $(".finishedtable li:nth-of-type(n+" + CardCount + ")").toggleClass("hidden", true);
    $(".wlinesbed li:nth-of-type(n+" + CardCount + ")").toggleClass("hidden", true);
    _callback();
};

var CreateDropDowns = function() {
    $(".card").each(function(ix) {
        // This is a workaround, fix it properly
        if ($(this).attr("cname").match(/P[0-9]{1,4}/g)) {
            $("#waterline").append(
                $("<li>", {}).append(
                    $("<a>")
                        .attr({value: $(this).attr("cpos"), href: "#"})
                         // Showing only the priority in the dropdown to avoid cluttering it
                        .text($(this).attr("cname").match(/P[0-9]{1,4}/g)[0])
                ));
            $("#waterline li").sort(function(a, b){return ($(b).text()) < ($(a).text()) ? 1 : -1;}).appendTo("#waterline");

            $("#seabed").append(
                $("<li>", {}).append(
                    $("<a>")
                        .attr({value: $(this).attr("cid"), href: "#"})
                        // Showing only the priority in the dropdown to avoid cluttering it
                        .text($(this).attr("cname").match(/P[0-9]{1,4}/g)[0])
                ));
            $("#seabed li").sort(function(a, b){return ($(b).text()) < ($(a).text()) ? 1 : -1;}).appendTo("#seabed");
        }});
};

var ShowFinalList = function() {
    // This needs to happen somewhere else as this position causes 2 bugs
    // 1. DropDown includes all priorities not just from estimated cards (minor)
    // 2. If the list contains an unprioritised card dropdown creation fails (workaround in CreateDropDowns)
    CardsSorted = false;
    CreateDropDowns();
    RemoveNotEstimated(function() {
        SetPriority();
    });

    if (TargetListID == 1) {
        CreateTargetList();
    }

    if (VelocityCard != null) {
        $("#avgVel").text("Average velocity reached with " + VelocityCard);
    } else {
        $("#avgVel").text("Total story points are below average velocity");
    }

    $("#totP").text("Story points: " + Velocity);

    FinalAppearence();

    CreateWaterline(function(card) {
        WaterlineId = card.id;
    });
};

var MoveFinishedCards = function() {
    Trello.get("lists/" + MainListID + "/cards", function(cards) {
        $.each(cards, function(ix, card) {
            Trello.put("cards/" +  card.id + "/idList",
                       { value: TargetListID },
                       function() {
                           console.log("Moving card: " + card.name);
                       });
            // Only move cards until we reach the seabed
            if (card.id == Seabed) { return false; }
        });
    });
    alert("Cards have been moved to the Sprint Backlog");
    window.open("http://www.trello.com/b/" + MainBoard, "_blank");
    window.focus();
};

/*
 * Functions to change page appearence
 */

var LogInAppearence = function() {
    var isLoggedIn = Trello.authorized();
    // Change appearence when logged in
    $(".loggedin").toggleClass("hidden", !isLoggedIn);
    $(".loggedout").toggleClass("hidden", isLoggedIn);
    $(".cardLists").toggleClass("hidden", !isLoggedIn);
    $(".sorttables").toggleClass("hidden", !isLoggedIn);
    $(".prioritise").toggleClass("hidden", !isLoggedIn);
    $(".finished").toggleClass("hidden", !isLoggedIn);
};

var FinalAppearence = function() {
    $(".sorttables").toggleClass("hidden", true);
    $(".finished").toggleClass("hidden", true);
    $(".finishedRefine").toggleClass("hidden", false);
    $(".row").addClass("fill");
    $(".mainList").addClass("fill");
    $("#maintable").removeClass("maintable");
    $("#maintable").addClass("finishedtable");
}

/*
 * Button click events
 */

// Connection button events
// This should check if there is an expired token
// expiration: never is a workaround
$(document).on("click", ".connectLink", function(){
    Trello.authorize({
        type: "popup",
        name: "AutoScrum",
        persist: "false",
        scope: {read: true, write: true},
        expiration:  "never",
        success: Authorized,
        error: logout
    })
});

$(document).on("click", ".disconnect", logout);

// PopUp after connection
$(document).on("click", ".boardSelect", function() {
    console.log("Main Board is " + $(this).attr("bid"));
    MainBoard = $(this).attr("bid");
    $(".toBoard").prop("href", "http://www.trello.com/b/" + $(this).attr("bid"));
    do {
        AvgVelocity = prompt("Please enter the average velocity for this board", 25);
    } while(isNaN(AvgVelocity) || AvgVelocity < 0);
    BoardPopUpClose(function () {
        SetLists();
    });
});

// Button events for the estimation phase
$(document).on("click", ".prioNow", function() {
    if (CardsSorted == true) {
        alert("Estimation has begun. Priorization is not possible right now.");
    } else {
        SetPriority();
    }
});

$(document).on("click", ".done", function() {
    // Check if any cards where estimated at all
    if (CardsSorted == true) {
        ShowFinalList();
    } else {
        alert("No cards have been estimated yet!");
    }
});

// Button events for the final phase
$(document).on("click", ".doneFinal", function() {
    if (Waterline == null || Seabed == null) {
        alert("Waterline or Seabed is not set!");
    } else {
        MoveFinishedCards();
    }
});

// Dropdown menues
$(document).on("click", "#waterline li a", function(){
    $("#Wval").text($(this).text());
    console.log($(this).text() + " with " + $(this).val())
    Waterline = $(this).val();
    MoveWaterline();
});

$(document).on("click", "#seabed li a", function(){
    $("#Sval").text($(this).text());
    console.log($(this).text() + " with " + $(this).val())
    Seabed = $(this).val();
});

// Tooltips
$(function() {
    $(document).tooltip({
        show: false,
        hide: false,
        tooltipClass: "as-tooltip-styling"
    });
});
