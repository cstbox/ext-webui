
$(document).ready(function(){
    var currentDay = null ;
    
    var statusDisplay = $("#status")
        .status()
        .ajaxComplete(function(){
            $("#loading-indicator").hide();
            document.body.style.cursor = "default";
        });
    
    $("button").button();

    $.ajaxSetup({
        url: document.location.href 
    });     
    
    var lastEventedDate = null;
    
    function getMonthEventsMap(year, month) {
        var result = [] ;
        $.ajax({
            url: document.location.href + "/days",
            data: {
                m: month,
                y: year
            },
            accepts: "application/json",
            dataType: "json",
            async: false,
            success: function(data){
                for (var i = 0 ; i < data.days.length; i++) {
                    var d = new Date();
                    d.setTime(Date.parse(data.days[i]));
                    result[d] = true;
                    lastEventedDate = data[i];
                }
            }
        });
        return result ;
    }
    
    var now = new Date() ;
    var curMonth = now.getMonth() + 1 ;
    var curYear = now.getFullYear() ;
    
    var hasEvents = getMonthEventsMap(curYear, curMonth) ;
    
    function selectDate(dateText, inst){
        currentDay = dateText;
        $("#events-display").fadeOut();
        dtEvents.fnClearTable(false);
        $.ajax({
            url: document.location.href + "/events",
            data: {
                d: dateText
            },
            accepts: "application/json",
            dataType: "json",
            // callbacks
            beforeSend: function(){
                statusDisplay.status("info", "Getting data for selected date...");
                $("#commands").hide();
                $("#loading-indicator").show();
                document.body.style.cursor = "wait";
                return true;
            },
            success: function(data){
                var events = data.events;
                /*
                 * split loading of the data into chunks to avoid UI freeze
                 */
                var chunckSize = 250 ;
                var nbRows = events.length;
                var start = 0 ;
                (function() {
                    dtEvents.fnAddData(events.slice(start, start + chunckSize));
                    dtEvents.fnPageChange( 'last' );
                    if (start < nbRows) {
                        var pctComplete = start / nbRows * 100;
                        statusDisplay.status("info", "Building display. " + pctComplete.toFixed() + "% done...");
                        start += chunckSize;
                        setTimeout(arguments.callee, 0);
                    } else {
                        $("#events-display").fadeIn();
                        dtEvents.fnDraw();
                        //$("#events-display").show();
                        statusDisplay.status("info", "Data loaded.");
                        $("#loading-indicator").fadeOut();
                        $("#commands").show();
                        document.body.style.cursor = "default";                         
                    }
                })();
                
            },
            error: function(jqXHR, textStatus, errorThrown){
                statusDisplay.status("error", "Unable to get data. Reason : " + jqXHR.statusText);
            }
        })
    }
    
    $("#datepicker").datepicker({
        changeMonth: true,
        changeYear: true,
        dateFormat: "yy/mm/dd",
        firstDay: 1,
//          showOtherMonths: true,
//          selectOtherMonths: true,
        // callbacks
        onChangeMonthYear: function(year, month) {
            hasEvents = getMonthEventsMap(year, month) ;
        },
        beforeShowDay: function(date){
//              console.log("day of month=" + date.getDate());
            // change the style to give a hint about records availability for this day
            var hasEvt = hasEvents[date] != undefined ;
            return [
                hasEvt,                             // is day selectable ?
                hasEvt ? "" : "ui-state-disabled"   // CSS class name 
                ];
        },
        onSelect: selectDate 
    });
    
    var evtScrollArea_bottom_margin = 290;
    function get_evttbl_height() {
        return window.innerHeight - evtScrollArea_bottom_margin ;
    }

    var dtEvents = $("#events").dataTable({
        bInfo : true,
        bFilter : true,
        //bLengthChange : false,
        //bDeferRender: true,
        bPaginate : false, //true,
        //sPaginationType: "full_numbers",
        //iDisplayLength: 20,
        sScrollY: get_evttbl_height() + "px",
        bSort : false,
        sDom: "lfiprt",
        bAutoWidth: false,
        aoColumns: [
                {sWidth: "12em"},
                {sWidth: "10em"},
                null,
                {sClass: "align-right"},
                null
        ],
        oLanguage : {
            "sSearch" : "Filter",
            "sInfo" : "_TOTAL_ events",
            "sInfoFiltered" : " (of _MAX_)"
        }
    });
    
    $("button#cmdExport").click(function(){
        if (currentDay)
            window.location.href = "http://" + window.location.hostname + ":8888/export?f=csv&d=" + currentDay;
    });

    // events table scroller auto-resize
    var eventsScroller = $("table#events").parent();
    eventsScroller.height(get_evttbl_height());

    $(window).resize(function(){
        eventsScroller.height(get_evttbl_height());
    });
    
    if (lastEventedDate) {
        selectDate(lastEventedDate, null);
    }
    
});

