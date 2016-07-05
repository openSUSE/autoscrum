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
var WaterlineText = "~~~~Waterline~~~~";

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
    LogInAppearance();
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
 * Initialization
 */
var SetLists = function() {
    LogInAppearance();
    // Get the ID for the list in which we'll prio
    Trello.get("boards/" + MainBoard + "/lists", function(lists) {
        $.each(lists, function(ix, list) {
            if (list.name == MainList) {
                MainListID = list.id
                SetPriority();
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
    // Cleaning the list before appending stuff
    $("#maintable").empty();
    Trello.get("lists/" + ID + "/cards", function(cards) {
        // Displaying the cards
        $.each(cards, function(ix, card) {
            if(CardCount != null && ix >= CardCount) { return false; }
            $("<a>")
                .attr({href: card.url, target: "trello", cid: card.id, cname: card.name, title: card.name})
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
    if ((! hoverItem) && $("#maintable li").length != 0) {
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
    // First check if the list does exist
    if (MainListID == 1) {
        if (!alert("This board does not have a " + MainList + " list")) {
            window.location.reload();
        }
    }
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
                { name: WaterlineText, idList: MainListID })
        .done(function(card) { _callback(card); });
};

var MoveWaterline = function() {
    Trello.put("cards/" + WaterlineId + "/pos",
               { value: ((CardPositions[Waterline+1]+CardPositions[Waterline])/2) },
               function() {});
}

// Only show estimated cards in the final list
var RemoveNotEstimated = function(_callback) {
    $(".finishedtable li:nth-of-type(n+" + CardCount + ")").toggleClass("hidden", true);
    _callback();
};

var CreateDropDowns = function() {
    for (i = 0; i < CardCount; i++) {
        $("#waterline").append(
            $("<li>", {}).append(
                $("<a>")
                    .attr({value: i, href: "#"})
                    .text("P" + (parseInt(i)+1))
            )
        );
        $("#seabed").append(
            $("<li>", {}).append(
                $("<a>")
                    .attr({value: i, href: "#"})
                    .text("P" + (parseInt(i)+1))
            )
        );
    }
};

var ShowFinalList = function() {
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

    FinalAppearance();

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
    alert("Cards have been moved to the " + TargetList);
    window.open("http://www.trello.com/b/" + MainBoard, "_blank");
    window.focus();
};

/*
 * Functions to change page appearance
 */

var LogInAppearance = function() {
    var isLoggedIn = Trello.authorized();
    // Change appearance when logged in
    $(".loggedin").toggleClass("hidden", !isLoggedIn);
    $(".loggedout").toggleClass("hidden", isLoggedIn);
    $(".cardLists").toggleClass("hidden", !isLoggedIn);
    $(".sorttables").toggleClass("hidden", !isLoggedIn);
    $(".prioritise").toggleClass("hidden", !isLoggedIn);
    $(".finished").toggleClass("hidden", !isLoggedIn);
};

var FinalAppearance = function() {
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
        alert("Estimation has begun. Prioritization is not possible right now.");
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

// Dropdown menus
$(document).on("click", "#waterline li a", function(){
    $("#Wval").text(GetCardNameFromListItem($("#main" + $(this).val())));
    $(".card").each(function(ix) {
        $(this).removeClass("WLineHighlight");
    });
    $("#main" + $(this).val() + " div a").addClass("WLineHighlight");
    Waterline = $(this).val();
    MoveWaterline();
});

$(document).on("click", "#seabed li a", function(){
    $("#Sval").text(GetCardNameFromListItem($("#main" + $(this).val())));
    $(".card").each(function(ix) {
        $(this).removeClass("SBedHighlight");
    });
    $("#main" + $(this).val() + " div a").addClass("SBedHighlight");
    Seabed = GetCardIdFromListItem($("#main" + $(this).val()));
});

// Tooltips
$(function() {
    $(document).tooltip({
        show: false,
        hide: false,
        tooltipClass: "as-tooltip-styling"
    });
});
