var _i18n = {
    "search": _("Show events containing"),
    "info" : _("_TOTAL_ event(s)"),
    "infoFiltered" : _(" (of _MAX_)"),
    "loading": _("Getting data for selected date"),
    "loaded": _("Data loaded"),
    "formatting": _("Formatting... {0}% done."),
    "dayNamesMin": _("Su Mo Tu We Th Fr Sa"),
    "monthNamesShort": _("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec")
}

$(document).ready(function(){
    var currentDay = null ;
    
    var statusDisplay = $("#status").status();
    $(document).ajaxComplete(function(){
        modal_wait_hide();
        document.body.style.cursor = "default";
    });
    
    $("button").button();
    var command_buttons = $("#commands");

    var events_panel = $("#events-display");

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
        events_panel.fadeOut();
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
                command_buttons.hide();
                statusDisplay.hide();
                modal_wait_show(_i18n['loading'] + "...");
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
                var fmt = _i18n["formatting"];
                (function() {
                    if (start < nbRows) {
                        dtEvents.fnAddData(events.slice(start, start + chunckSize));
                        dtEvents.fnPageChange( 'last' );
                        var pctComplete = start / nbRows * 100;
                        modal_wait_show(format(fmt, pctComplete.toFixed()) + "...");
                        start += chunckSize;
                        setTimeout(arguments.callee, 0);
                    } else {
                        events_panel.fadeIn();
                        dtEvents.fnDraw();
                        //statusDisplay.status("info", _i18n['loaded']);
                        command_buttons.show();
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
        dayNamesMin: _i18n['dayNamesMin'].split(" "),
        monthNamesShort: _i18n['monthNamesShort'].split(" "),
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
    
    var evtScrollArea_bottom_margin = 340;
    function get_evttbl_height() {
        return window.innerHeight - evtScrollArea_bottom_margin ;
    }

    var dtEvents = $("#events").dataTable({
        info : true,
        filter : true,
        paging : false,
        scrollY: get_evttbl_height() + "px",
        dom: "lfiprt",
        autoWidth: false,
        sort: false,
        columns: [
                {sWidth: "12em"},
                {sWidth: "10em"},
                null,
                {sClass: "align-right"},
                null
        ],
        language : {
            "search" : _i18n['search'],
            "info" : _i18n['info'],
            "infoFiltered" : _i18n['infoFiltered']
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

