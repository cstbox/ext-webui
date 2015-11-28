var _i18n = {
    'gparms_label' : _('Global parameters'),
    'gparms_descr' : _('Settings of CSTBox global parameters'),
    'logbrw_label' : _('Log browser'),
    'logbrw_descr' : _('Browse the logs of the CSTBox middleware components'),
    'svcctl_label' : _('Services control'),
    'svcctl_descr' : _('Access to services status and control actions'),
    'command_success': _("Command successfully executed."),
    'command_failed': _("Command failed. (error type : {0} - message : {1})"),
    'bad_system_id': _("Invalid system id"),
    'loading_log': _("Loading log"),
    'running': _("running"),
    'stopped': _("stopped"),
    'restarting': _("Restarting"),
    'reconnecting': _("Reconnecting to the box"),
    'starting': _("Starting service"),
    'stopping': _("Stopping service"),
}

function makeSvcUrl(svcName) {
    var root = document.location.href;
    root = /\/$/.test(root) ? root : root + '/';
    return root + svcName ;
}

function ToolDescriptor(label, descr, icon) {
    this.label = label;
    this.descr = descr;
    this.icon = icon;
}

var tools_list = {
    'global-parms': new ToolDescriptor(
        _i18n['gparms_label'],
        _i18n['gparms_descr'],
        'tools.png'
    ),
    'log-browser': new ToolDescriptor(
        _i18n['logbrw_label'],
        _i18n['logbrw_descr'],
        'log-file.png'
    ),
    'services': new ToolDescriptor(
        _i18n['svcctl_label'],
        _i18n['svcctl_descr'],
        'services.png'
    )
};

$(document).ready(function(){
    $(".status").status();
    $("button").button();
    $("[lang]").localize_html(_lang_);

    // cache some frequently used objects

    var tool_page_container = $("#tool-page-container");

    // -----------------------------------------------------------
    // Tool pages management
    // -----------------------------------------------------------
    
    var current_tool = "default";

    var tools_selector = $("ul#tools-list");
    var tools_summary = $("dl#tools-summary");
    var selector_tmpl = 
        '<li id="{0}" class="weblet-icon tool-btn">' +
        '<p><a href="javascript:void(0);">' +
        '<img src="' + document.location.href + '/res/images/{2}"/></a></p>' +
        '<p id="label">{1}</p>' +
        '</li>';
    var summary_tmpl = '<dt>{0}</dt><dd>{1}</dd>';

    tools_selector.empty();
    tools_summary.empty();

    for (tool_id in tools_list) {
        var tool = tools_list[tool_id];
        tools_selector.append(
                format(selector_tmpl, tool_id, tool.label, tool.icon)
        );
        tools_summary.append(
                format(summary_tmpl, tool.label, tool.descr)
        );
    }

    $("ul#tools-list li").click(function(event){
        var tool_id = $(this).attr('id');
        if (tool_id != current_tool) {
            hide_current_tool();
            show_tool(tool_id);
        };
    });
	
    var onToolShow = {
        'global-parms': function(){
            $.ajax({
                url: makeSvcUrl('gparms/get'),
                success: function(data){
                    $("#system_id").val(data.system_id);
                }
            });
        },
        'log-browser' : function(){
            $.ajax({
                url: makeSvcUrl('log/ls'),
                success: function(data){
                    log_list = data.logs;
                    log_disp_autoresize();
                }
            });
        },
        'services' : function(){
            refresh_services_status();
        }
    };

    function tool_page(tool_id) {
        return $("div#page-" + tool_id);
    }

    function hide_tool(tool_id) {
        var page = tool_page(tool_id);
        page.find('.status').hide();
        page.hide();
    }

    function hide_current_tool() {
        if (current_tool)
            hide_tool(current_tool);
    }

    function show_tool(tool_id) {
        tool_page(tool_id).show();
        current_tool = tool_id;
        
        if (onToolShow.hasOwnProperty(tool_id)) {
            var handler = onToolShow[tool_id];
            handler();
        }
    }


    // -----------------------------------------------------------
    // System parameters editor page
    // -----------------------------------------------------------

    $.validator.addMethod("system_id",
            function(value, element) {
                return this.optional(element)
                        || /^[a-zA-Z][a-zA-Z0-9_]*$/i.test(value);
            }, _i18n["bad_system_id"]);

    $('#gparms').validate({
        submitHandler: function(form) {
            $.ajax({
                url: makeSvcUrl('gparms/set'),
                data : $(form).serialize(),
                success : function(data) {
                    $("#gparms-status").text(_i18n['command_success'])
                        .removeClass("ui-state-error").show();
                },
                error : function(jqXHR, textStatus, errorThrown) {
                    var response = $.parseJSON(jqXHR.response);
                    $("#gparms-status").text(format(
                            _i18n['command_failed'], 
                            response.errtype, 
                            response.message))
                        .addClass("ui-state-error")
                        .show();
                }
            });
        },
        onfocusout : false,
        onkeyup : false,
        onclick : false,
    });
    
    // -----------------------------------------------------------
    // Logs display page
    // -----------------------------------------------------------
    
    var current_log;
    var log_disp = $("div#log-display");
    var log_select = $('select#log-select');

    log_select.selectedIndex = 0;
    log_select.change(function(event){
        var log_name = $(this).val() ; 
        if (log_name != '-' && log_name != current_log) {
            display_log(log_name);
            current_log = log_name;
        };
    });

    function display_log(log_name) {
        $.ajax({
            url: makeSvcUrl('log/get'),
            data : {'log_name': log_name},
            beforeSend: function() {
                modal_wait_show(_i18n['loading_log'] + '...');
            },
            success : function(data) {
                var disp = $("div#log-display");
                disp.empty();
                disp.html(data.lines);
            },
            error : function(jqXHR, textStatus, errorThrown) {
                var response = $.parseJSON(jqXHR.response);
                $("#log-status").text(format(
                        _i18n['command_failed'], 
                        response.errtype, 
                        response.message))
                    .addClass("ui-state-error")
                    .show();
            },
            complete : function() {
                modal_wait_hide();
            }
        });
    }

    function log_disp_autoresize() {
        var h = tool_page_container.height() - log_disp.position().top - 20 ; 
        $('div#log-display').css('height', h + 'px');
    }

    $("button#btnExportLogs").click(function(event) {
        event.preventDefault();
        window.location.href = makeSvcUrl('log/export');
    });


    $(window).resize(function() {
        log_disp_autoresize();
        console.log('autoresize');
    });

    // -----------------------------------------------------------
    // Services control
    // -----------------------------------------------------------
    
    function refresh_services_status() {
        $.ajax({
            url: makeSvcUrl('svc/ls'),
            success: function(data){
                var svc_found = false;
                var tbody = $('table#services-list tbody');
                tbody.empty();
                var fmt = 
                    '<tr><td class="svc-name">{0} ({1})</td><td class="svc-status">' +
                    '<a id="{0}-action" href="javascript:void(0);" class="{3}">{2}</a></td></tr>';
                var svc_list = data.svc_list;
                for (var svc_name in svc_list) {
                    var info = svc_list[svc_name];
                    var is_core = info[1];
                    if (is_core) continue;

                    var descr = info[0];
                    var action = '';
                    var status_class = '';
                    var status = '';
                    var running = info[2];

                    if (running) {
                        status = _i18n['running'];
                        action = 'stop';
                        status_class = 'svc-running';
                    } else {
                        status = _i18n['stopped'];
                        action = 'start';
                        status_class = 'svc-stopped';
                    }
                    var html = format(fmt,
                        svc_name,
                        descr,
                        status,
                        status_class
                        );
                    tbody.append(html);
                    $('#' + svc_name + '-action').click(action, start_stop_service);

                    svc_found = true;
                }
                if (svc_found) {
                    $('table#services-list tfoot').hide();
                }
            }
        });
    }

    function start_stop_service(evt) {
        var svc = $(this).attr('id').split('-')[0];
        var action = evt.data;
        var msg = (action == 'start') ? 'starting' : 'stopping';
        console.log(action + ' ' + svc);
        $.ajax({
            url: makeSvcUrl('svc/' + action),
            data : {'svc' : svc},
            beforeSend: function() {
                modal_wait_show(_i18n[msg] + '...');
            },
            success : function(data) {
                refresh_services_status();
            },
            error : function(jqXHR, textStatus, errorThrown) {
                var response = $.parseJSON(jqXHR.response);
                $("#svcctl-status").text(format(
                        _i18n['command_failed'], 
                        response.errtype, 
                        response.message))
                    .addClass("ui-state-error")
                    .show();
            },
            complete : function() {
                modal_wait_hide();
            }
        });
    }

    function restart(which_level){
        var wait_delay = {
            'applayer' : 3000,
            'cstbox' : 10000,
            'system' : 60000
        };
        $.ajax({
            url: makeSvcUrl('svc/restart'),
            data: {'level' : which_level},
            beforeSend: function() {
                // note that we don't need to remove this afterwards, since
                // we are going the redisplay the desktop
                modal_wait_show(_i18n['restarting'] + '...');
            },
            success: function(data) {
                // displays the "desktop" after a pause long enough for restart
                // Note that depending on the browser, this does not work every
                // time, and sometimes a manual refresh is needed.
                setTimeout(function() {
                    modal_wait_show(_i18n['reconnecting'] + '...');
                    var loc = document.location;
                    window.location.assign(loc.origin + '/admin');
                }, wait_delay[which_level]);
            },
            error : function(jqXHR, textStatus, errorThrown) {
                var response = $.parseJSON(jqXHR.response);
                modal_wait_hide();
                $("#restart-status").text(format(
                        _i18n['command_failed'], 
                        response.errtype, 
                        response.message))
                    .addClass("ui-state-error")
                    .show();
            }
        });
    }

    $("button#btnAppRestart").click(function(event){
        restart('applayer');
    });

    $("button#btnCSTBoxRestart").click(function(event){
        restart('cstbox');
    });

    $("button#btnSystemRestart").click(function(event){
        restart('system');
    });

});
