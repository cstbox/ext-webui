var ConstraintModule = function ConstraintModule() {
    this.ruleContainer = {};
};

var devMetadatas = {};

var _i18n = {
    "editing_device": _("Editing device <span class='objectId'>{0}</span>"),
    "coord_devices": _("Editing devices attached to coordinator <span class='objectId'>{0}</span> - Type : <span class='coordtype'>{1}</span>"),
    "bad_hexval": _("Invalid hexadecimal value"),
    "bad_period": _("Invalid value (ex: 10s, 2m, 1h)"),
    "bad_devid": _("Invalid device id"),
    "bad_varname": _("Invalid variable name"),
    "bad_location": _("Invalid location"),
    "bad_strfmt": _("String format is incorrect."),
    "bad_propname": _("Invalid property name : {0}"),
    "bad_meta": _("Invalid metadata : {0}"),
    "no_meta": _("No device metadata available"),
    "no_driver_installed": _("Maybe no equipment driver currently installed."),
    "fld_required": _("This field is required"),
    "device": _("device"),
    "protocol": _(" (protocol : {0})"),
    "coordget_ko": _("Could not get coordinator information."),
    "coorddel": _("Delete coordinator"),
    "coorddel_ko": _("Could not delete coordinator. Reason : {0}"),
    "coorddel_ok": _("Coordinator {0} successfully deleted."),
    "prodget_ko": _("Could not get product details. Reason : {0}"),
    "devdel": _("Delete device"),
    "devdel_ko": _("Could not delete device. Reason : {0}"),
    "devdel_ok": _("Device {0} successfully deleted."),
    "devupd_ok": _("Device {0} successfully updated."),
    'devidchange': _("Change device id"),
    'idchg_ok': _("Id successfully changed"),
    'idchg_ko': _("Could not change the id."),
    "save_ko": _("Could not save changes. Reason : {0}"),
    "save_ok": _("Changes saved."),
    "devnew_ko": _("Could not create new device. <br>Reason : {0}"),
    "devnew_ok": _("New device successfully created."),
    "devget_ko": _("Could not retrieve properties for device {0}. <br>Reason : {1}"),
    "devdisc_ko": _("Device discovery failed."),
    "devdisc_timeout": _("Device discovery timeout"),
    "devdisc_ok": _("New device discovered. Fill in the missing properties and click on 'Add'."),
    "devdisc_running": _("Device discovery running..."),
    "error": _("Error"),
    "cfgload_ko": _("could not load configuration file"),
    "cfg_zipping": _("Zipping devices.xml..."),
    "cfgdl_ko": _("Unable to download files. Reason : _("),
    "cfg_clearing": _("Clearing configuration..."),
    "cfgclear_ok": _("Configuration cleared."),
    "cfgclear_ko": _("Unable to clear configuration. Reason : _("),
    "added": _("added"),
    "deleted": _("deleted"),
    "no_info": _("no info available"),
    "done": _("Action performed"),
    "actuator": _("Actuator"),
    "task_launched": _("Task launched. Look at the 'Events' tab for results."),
    "sched_now": _("Schedule now"),
    "sched_dev": _("Scheduled device"),
    "root": _("Device global parameters"),
    "control": _("Control"),
    "output": _("Output"),
    "input": _("Input"),
    "devmeta_get_ko": _("Could not retrieve metadata for device type {0}."),
    "reason": _("Reason : {0}"),
    "cannot_edit_device": _("Cannot edit device"),
    "operation_canceled": _("Operation canceled."),
    "yes": _("Yes"),
    "no": _("No"),
    "ok": _("OK"),
    "cancel": _("Cancel"),
    "nochange": _("No change done"),
    "name": _("Name"),
    "location": _("Location"),
    "address": _("Address"),
    "deltamin": _("Value change threshold"),
    "type": _("Type"),
    "descr": _("Description"),
    "varname": _("Variable name"),
    "enabled": _("Enabled"),
    "vardef": _("type : {0} - units : {1}"),
    "nounit": _("no unit")
};

function makeSvcUrl(svcName) {
    return document.location.href + '/' + svcName;
}

(function () {
    this.parse = function parse(prefix, fieldName, consStr) {
        //console.log("parse: "+fieldName+" "+consStr);
        var constraints = consStr.split(";");
        var ruleArray = this.ruleContainer[fieldName];

        if (typeof ruleArray === "undefined") {
            ruleArray = this.ruleContainer[fieldName] = [];
            ruleArray.indexCons = 0;
            ruleArray.addCons = function (cons) {
                this[this.indexCons] = cons;
                this.indexCons++;
            };
        }

        for (var i = 0; i < constraints.length; i++) {
            var tokens = constraints[i].split(":");
            if (tokens.length != 2) {
                alert("Malformed constraint: " + constraints[i]);
                continue;
            }
            var consName = tokens[0];
            if (consName === "reqdIfTrue")
                ruleArray.addCons({required: "#" + prefix + '_' + tokens[1] + ":checked"});
            else if (consName === "regex") {
                ruleArray.addCons({regex: tokens[1]});
            } else
                alert("Undefined constraint name: " + consName);
        }
    };
    this.add = function add() {
        //console.log("add");
        for (var fieldName in this.ruleContainer) {
            if (this.ruleContainer.hasOwnProperty(fieldName)) {
                var ruleArray = this.ruleContainer[fieldName];
                //console.log("add: "+fieldName+": "+ruleArray.length+" rules.");
                for (var i = 0; i < ruleArray.length; i++) {
                    //console.log("add: "+i+": "+ruleArray[i]);
                    $("#" + fieldName).rules("add", ruleArray[i]);
                }
            }
        }
        //console.log("add done.");
    };
}).call(ConstraintModule.prototype);

/*
 * Definition of implicit built-in properties which devices and coordinators
 * metadata do not need to explicitly describe.
 */
var dfltProps = {
    "address": {
        "type": "int",
        "label": _i18n["address"]
    },
    "type": {
        "type": "string",
        "label": _i18n["type"]
    },
    "name": {
        "type": "string",
        "label": _i18n["name"]
    },
    "__descr__": {
        "type": "string",
        "label": _i18n["descr"]
    },
    "enabled": {
        "type": "boolean",
        "label": _i18n["enabled"]
    },
    /*
     "varname" : {
     "type": "varname",
     "label" : _i18n["varname"]
     },
     */
    "location": {
        "type": "string",
        "mandatory": true,
        "label": _i18n["location"]
    },
    "deltamin": {
        "type": "float",
        "label": _i18n["deltamin"]
    }
};


function setupCfgEditor(initData) {
    // -------------------------------------------------------------------
    // Core initializations
    // -------------------------------------------------------------------

    $(".status").status();

    $("button").button();
    $("#btnDeleteDevice").click(deleteDevice);
    $("#btnChangeDeviceId").click(changeDeviceId);

    // Multi-page management

    var pager = {
        pages: {
            "deviceEditor": {
                content: $("#device-editor")
            },
            "subNetworkEditor": {
                content: $("#subnet-editor")
            },
            "root": {
                content: $("#root-page")
            },
            "fatalError": {
                content: $("#fatal-error")
            }
        },
        currentPage: null,
        showPage: function (newPage) {
            if (this.currentPage == newPage)
                return;

            if (this.currentPage) {
                var curPage = this.pages[this.currentPage];
                if (curPage.onclose)
                    curPage.onclose();
                var curPager = this;
                curPage.content.fadeOut(function () {
                    curPager._displayPage(newPage);
                }).data("visible", false);
            } else {
                this._displayPage(newPage);
            }
        },
        _displayPage: function (page) {
            if (this.pages[page] && this.pages[page].content) {
                this.pages[page].content.fadeIn().data("visible", true);
                this.currentPage = page;
            }
        }
    };

    // Information display

    function information(message) {
        $("#message").text(message);
        $("#dlgInformation").dialog({
            autoOpen: true,
            resizable: false,
            width: 400,
            modal: true,
            dialogClass: "ui-dialog-bkgnd",
            buttons: {
                "OK": function () {
                    $(this).dialog("close");
                }
            }
        });
    }

    // Fatal error reporting

    function fatalError(message, additInfos) {
        $("#fatal-error-msg").status("error", message);
        var additInfosDisplay = $("#fatal-error-additInfos-display");
        if (additInfos != null) {
            var txt = "";
            for (var i = 0; i < additInfos.length; i++) {
                txt += '<p>' + additInfos[i] + '</p>';
            }
            $("#additInfos-text").html(txt);
            additInfosDisplay.show();
        } else {
            $("#additInfos-text").empty();
            additInfosDisplay.hide();
        }
        pager.showPage("fatalError");
    }

    // -------------------------------------------------------------------
    // First stage initializations and checking
    // -------------------------------------------------------------------

    var coord_types = initData.ctypes;

    if (coord_types.length == 0) {
        fatalError(_i18n['no_meta'], [_i18n['no_driver_installed']]);
        return;
    }

    /*
     * Network tree setting
     */

    var nwTree = $("#nwtree");
    var nw_jstree;
    var current_node = null;
    var dev_edit_status = $("#device-editor-status");
    var subnet_edit_status = $("#subnet-editor-status");

    $.ajax({
        url: makeSvcUrl('nwtree'),
        success: function(data) {
            nodes = make_jstree_nodes(data)
            setup_jstree(nodes);
        }
    });

    function setup_jstree(nodes) {
        nwTree.jstree({
            plugins: ["themes", "json_data", "contextmenu", "sort"],
            core: {
                animation: false,
                multiple: false,
                check_callback: true,
                worker: false,
                data: nodes
            },
            contextmenu: {
                items: getContextMenuItems,
                select_node: true
            }
        }).on("ready.jstree", function (e, data) {
            nw_jstree.open_all();
            nw_jstree.select_node('root');

        }).on("select_node.jstree", function (e, data) {
            current_node = data.node;
            // console.log("select_node.jstree - nwNode=" + nwNode + " - type=" + nwNode.type + " - id=" + nwNode.id);
            switch (current_node.icon) {
                case "device":
                    openDeviceEditor(current_node.id);
                    break;
                case "coord":
                    openCoordinatorEditor(current_node.id);
                    break;
                case "root":
                    $.ajax({
                        url: makeSvcUrl('nwtree'),
                        // open editor when received
                        success: openRootPage,
                        // display error message if problem
                        error: function (jqXHR, textStatus, errorThrown) {
                            var report = $.parseJSON(jqXHR.responseText);
                            fatalError(format(_i18n['devget_ko'], current_node.id,
                                report.message), report.additInfos);
                        }
                    });
                    break;
            }
        });
        nw_jstree = $.jstree.reference(nwTree);
    }

    var summary = {};

    var contextMenus = {
        "device": {
            "delete": {
                label: _i18n['devdel'],
                _class: "ui-widget",
                action: function (sel) {
                    var node = getDescriptorOfSelectedTreeNode(sel);
                    deleteDevice(node.id, node.label);
                }
            },
            "changeid": {
                label: _i18n['devidchange'],
                _class: "ui-widget",
                action: function (sel) {
                    var node = getDescriptorOfSelectedTreeNode(sel);
                    changeDeviceId(node.id, node.label);
                }
            }
        },
        "coord": {
            "delete": {
                label: _i18n['coorddel'],
                _class: "ui-widget",
                action: function (sel) {
                    var node = getDescriptorOfSelectedTreeNode(sel);
                    deleteCoordinator(node.id);
                }
            }
        },
        "root": null
    };

    function getContextMenuItems(sel) {
        var nwNode = getDescriptorOfSelectedTreeNode(sel);
        return contextMenus[nwNode.type];
    }

    function make_jstree_nodes(nwData) {
        var root = {
            id: 'root',
            text: "CSTBox",
            icon: "root",
            attr: {
                rel: "root"
            },
            children: []
        };

        var devCnt = 0;
        var coordCnt = 0;
        var coords = nwData;
        for (var coordId in coords) {
            if (!coords.hasOwnProperty(coordId)) continue;

            var coordNode = {
                id: coordId,
                text: coordId,
                icon: "coord",
                attr: {
                    rel: "coord"
                },
                children: []
            };

            devs = coords[coordId];
            for (var i in devs) {
                var devId = devs[i];
                var devNode = {
                    // make a unique id by using the "absolute path" of the device
                    id: coordId + '/' + devId,
                    text: devId,
                    icon: "device",
                    attr: {
                        rel: "device",
                    }
                };

                coordNode.children.push(devNode);
                devCnt++;
            }

            root.children.push(coordNode);
            coordCnt++;
        }

        summary.coordinatorsCount = coordCnt;
        summary.devicesCount = devCnt;

        return root;
    }

    /*
     * Forms shared stuff
     */

    $.extend($.validator.messages, {
        required: _i18n["fld_required"]
    });

    $.validator.addMethod("hexdigits", function (value, element) {
        return this.optional(element) || /^[0-9a-f]+$/i.test(value);
    }, _i18n['bad_hexval']);

    $.validator.addMethod("period", function (value, element) {
        return this.optional(element) || /^\d+[smh]?$/i.test(value);
    }, _i18n['bad_period']);

    $.validator.addMethod("deviceId",
        function (value, element) {
            return this.optional(element)
                || /^[a-z0-9][a-z0-9-_\.]*$/i.test(value);
        }, _i18n["bad_devid"]);

    $.validator.addMethod("varname",
        function (value, element) {
            return this.optional(element)
                || /^[a-zA-Z][a-zA-Z0-9_]*$/i.test(value);
        }, _i18n["bad_varname"]);

    $.validator.addMethod("location",
        function (value, element) {
            return this.optional(element)
                || /^[a-z0-9][a-z0-9-_\. ]*$/i.test(value);
        }, _i18n["bad_location"]);


    $.validator.addMethod("regex",
        function (value, element, regexp) {
            var re = new RegExp(regexp);
            var check = re.test(value);
            //console.log("check "+value+" : "+regexp+" -> "+check);
            return this.optional(element) || check;
        },
        _i18n["bad_strfmt"]
    );

    /*
     * Device editor page
     */

    function openDeviceEditor(uid) {
        $("#uid").val(uid);

        $.ajax({
            // get device properties
            url: makeSvcUrl('dev'),
            data: {
                uid: uid
            },
            // open editor when received
            dataFilter: function (data) {
                var dev = $.parseJSON(data);
                dev['uid'] = uid;
                return JSON.stringify(dev);
            },
            success: editDevice,
            // display error message if problem
            error: function (jqXHR, textStatus, errorThrown) {
                var report = $.parseJSON(jqXHR.responseText);
                fatalError(format(_i18n['devget_ko'], uid, report.message), report.additInfos);
            }
        });
    }

    function getI18nValue(value, lang) {
        if (typeof(value) != "string") {
            if (value.hasOwnProperty(lang)) {
                return value[lang];
            } else {
                return value['*'];
            }
        }
        return value;
    }

    /*
     * caches the global template of a property form item
     */
    var templates = $("#template");
    var formItem = format(templates.find("#property-item").val());
    var propListTmpl = '<input id="{0}-_props_" name="{0}-_props_" type="hidden" value="{1}"/>';
    var varDeclTmpl = format(templates.find("#variable-declaration").val());

    /*
     * Adds the form fragment for a given property to a form field set 
     * 
     * Arguments:
     * propName : name of the involved property
     * obj : the data (can be the device root or one of its end-points)
     * propSet : the definitions of the properties
     * fieldset : the target field set
     * prefix : the prefix to be used for creating the HTML elements identifiers
     * 
     * Returns:
     * the property metadata, obtained from the property definitions
     */
    function addPropertyFormItem(propName, obj, propSet, fieldSet, prefix) {
        var uiProp = null;
        if (propSet.hasOwnProperty(propName)) {
            uiProp = propSet[propName];
        } else if (dfltProps.hasOwnProperty(propName)) {
            // maybe we are dealing with a pre-defined property
            uiProp = dfltProps[propName];
        } else {
            // Houston, we have a problem
            fatalError(_i18n['cannot_edit_device'], [format(_i18n["bad_propname"], propName)]);
            return null;
        }

        var propValue = obj.hasOwnProperty(propName) ? obj[propName] : uiProp.defvalue;
        if (propValue == null) propValue = '';

        var fldName = (!uiProp.readonly) ? prefix + '-' + propName : '';
        var frmItem = "";
        var requiredRule = uiProp.readonly ? " ignore "
            : (uiProp.mandatory ? " required " : "");
        var readonlyAttr = uiProp.readonly ? "readonly" : "";
        var disabledAttr = uiProp.readonly ? "disabled" : "";

        if (uiProp.hasOwnProperty("constraints"))
            propsConstraints.parse(prefix, fldName, uiProp.constraints);

        var tmplItem = templates.find("#inp-" + uiProp.type).val();
        var labelSuffix = false;
        switch (uiProp.type) {
            case "string":
            case "int":
            case "float":
                frmItem = format(tmplItem, fldName, propValue,
                    requiredRule, readonlyAttr);
                break;
            case "period":
                frmItem = format(tmplItem, fldName, propValue,
                    requiredRule, readonlyAttr);
                // add an explanatory suffix to the label to give a visible hint
                // for expected input
                labelSuffix = "(nn[s|m|h])";
                break;
            case "hexint":
                var sHex = toHex(propValue);
                if (!sHex)
                    sHex = "0";
                frmItem = format(tmplItem, fldName, sHex, requiredRule,
                    readonlyAttr);
                // add an explanatory suffix to the label to give a visible hint
                // for expected input
                labelSuffix = "(hex)";
                break;
            case "bool":
            case "boolean":
                frmItem = format(tmplItem, fldName,
                    obj[propName] ? "checked='on'" : "",
                    disabledAttr);
                break;
            case "choice":
                var options = "";
                var fmtOption = format(templates.find("#inp-option").val());
                var constraints = uiProp.constraints.split(",");
                for (var c = 0; c < constraints.length; c++) {
                    var s = constraints[c];
                    options += fmtOption(s, propValue == s);
                }
                frmItem = format(tmplItem, fldName, options);
        }

        var label = "";
        var lb = uiProp.label;
        if (typeof(lb) == "string") {
            label = lb;
        } else {
            if (lb.hasOwnProperty(_lang_)) {
                label = lb[_lang_];
            } else {
                label = lb['*'];
            }
        }
        if (labelSuffix) {
            label += "<span class='label-suffix'>" + labelSuffix + "</span>";
        }
        fieldSet.append($(formItem(fldName, label, frmItem)));

        return uiProp;
    }

    /*
     * Appends the field set for a given end-point to the HTML document.
     * 
     * Arguments:
     * epId: end-point id
     * ep : end-point data
     * propSet : the property set definition
     * dest : the destination element in the HTML document
     * label : the section label (fixed part)
     * prefix : the prefix to be added to field names and ids
     * rules : form validation rules dictionary
     */
    function appendEndPointFieldsetToDocument(epId, ep, propSet, dest, label, prefix, rules) {
        var epFldSet = $("<fieldset class='end-point'></fieldset>");
        var fsetHeader = label + ' ' + epId;
        if (propSet.hasOwnProperty('__descr__')) {
            var descr = getI18nValue(propSet.__descr__, _lang_);
            fsetHeader += ' : ' + descr;
        }

        epFldSet.append($("<legend>" + fsetHeader + "</legend>"));
        appendFieldsetToDocument(ep,
            propSet, epFldSet,
            prefix + "-" + epId,
            rules);
        epFldSet.appendTo(dest);
    }

    /*
     * Appends the field set for a given data bundle to the HTML document.
     * 
     * Arguments:
     * data : the data object
     * propSet : the associated property set definition
     * dest : the destination element in the HTML document
     * prefix : the prefix to be added to field names and ids
     * rules : form validation rules dictionary
     */
    function appendFieldsetToDocument(data, propSet, dest, prefix, rules) {
        var seq = propSet.__seq__;
        var __props__ = [];
        var propName;

        for (var i = 0; i < seq.length; i++) {
            propName = seq[i];
            var addedProp = addPropertyFormItem(propName, data, propSet, dest, prefix);
            if (!addedProp) return;
            if (!addedProp.readonly) __props__.push(propName + ':' + addedProp.type);
        }
        // do no add the hidden field to the form yet in case we have a varname
        // property

        // add the variable declaration bloc if a variable can be attached to
        // this item (multiple ouputs devices can be enabled as a whole, but variables
        // are attached at end-point level only)
        if (propSet.hasOwnProperty('__vartype__')) {
            var propValue = data.hasOwnProperty('varname') ? data['varname'] : '';
            if (propValue == null) propValue = '';
            propName = prefix + '-varname';
            dest.append($(varDeclTmpl(
                propName,
                propValue,
                propSet.__vartype__,
                propSet.__varunits__ ?
                    propSet.__varunits__ :
                '<i>' + _i18n['nounit'] + '</i>'
            )));

            // add the validation rule for making varname mandatory when the enabled 
            // state is checked 
            if (rules) {
                rules[propName] = {
                    'required': {
                        'depends': function (element) {
                            return $('#' + prefix + '-enabled:checked').length > 0;
                        }
                    }
                }
            }

            // add the "varname" property to the list of properties edited here
            __props__.push('varname:varname');
        }

        // OK, now we have collected all properties to be handled by te editor
        dest.append(format(propListTmpl, prefix, __props__.join()));
    }

    function editDevice(dev) {
        var fieldset = null;
        var propsConstraints = new ConstraintModule();
        var devmeta = null;

        /*
         * Retrieve the metadata for the device. They are used to build the
         * edition form
         */
        try {
            devmeta = getDeviceMetadata(dev.type);
        }
        catch (err) {
            fatalError(format(_i18n['devmeta_get_ko'], dev.type), [err.message, err.additInfos]);
            return;
        }

        var validatorRules = {};

        /*
         * build device root level properties field set
         */

        try {
            var root_propSet = devmeta.pdefs.root;

            // add always present items
            $("#info_type").val(dev.type);

            var descr = getI18nValue(devmeta.__descr__, _lang_);
            $("#info_descr").val(descr);

            // add specific root properties
            fieldset = $("#fset-rootProps");
            fieldset.empty();
            appendFieldsetToDocument(dev, root_propSet, fieldset, "root", validatorRules);
        }
        catch (err) {
            fatalError(_i18n['cannot_edit_device'], [format(_i18n["bad_meta"], err.message)]);
            return;
        }

        /*
         * build end-points level properties field set
         */

        var sections = {
            'outputs': {
                'meta': devmeta.pdefs.outputs,
                'fieldset': $("#fset-oepProps"),
                'eps': dev.outputs,
                'label': _i18n['output'],
                'prefix': 'out'
            },
            'controls': {
                'meta': devmeta.pdefs.controls,
                'fieldset': $("#fset-cepProps"),
                'eps': dev.controls,
                'label': _i18n['control'],
                'prefix': 'ctl'
            }
        };

        for (var section in sections) {
            if (!sections.hasOwnProperty(section)) continue;

            var sectionInfo = sections[section];
            var label = sectionInfo.label;
            var prefix = sectionInfo.prefix;
            var epMeta = sectionInfo.meta;
            fieldset = sectionInfo.fieldset;
            fieldset.empty();

            if (epMeta) {
                var deveps = sectionInfo.eps;
                var propSet;
                var ep;
                var epId;

                if (epMeta.hasOwnProperty("__count__")) {
                    // all end-points are indentical and described by the the entry keyed by "*"
                    propSet = epMeta['*'];
                    for (epId = 1; epId <= epMeta["__count__"]; epId++) {
                        ep = deveps[epId];
                        appendEndPointFieldsetToDocument(
                            epId, ep,
                            propSet, fieldset,
                            label, prefix,
                            validatorRules);
                    }

                } else {
                    // we have an explicit detail of all the end-points, including their sequence
                    var epSeq = epMeta["__seq__"];
                    for (var i = 0; i < epSeq.length; i++) {
                        epId = epSeq[i];
                        ep = deveps[epId];
                        propSet = epMeta[epId];
                        appendEndPointFieldsetToDocument(
                            epId, ep,
                            propSet, fieldset,
                            label, prefix,
                            validatorRules);
                    }
                }

                fieldset.show();

            } else {
                fieldset.hide();
            }
        }

        /*
         * Setup action buttons
         */

        var frm = $("#frmDeviceEditor");
        frm.validate({
            // debug : true,
            ignore: ".ignore",
            rules: validatorRules,
            errorElement: "p",
            errorClass: "validate-error",
            submitHandler: function (form) {
                $.ajax({
                    url: document.location.href + '/upddev',
                    data: $(form).serialize(),
                    success: function (data) {
                        if (!data.error) {
                            information(_i18n['save_ok']);
                        } else {
                            dev_edit_status.status('error', data.error);
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        dev_edit_status.status("error",
                            format(_i18n['save_ko'], textStatus.statusText)
                        );
                    }
                });
            },
            onfocusout: false,
            onkeyup: false,
            onclick: false
        });

        propsConstraints.add();

        frm.show().data("visible", true);
        pager.showPage("deviceEditor");

        // display a status message with the device id
        dev_edit_status.status('info', format(_i18n["editing_device"], dev.uid));

    }

    function deleteDevice(event) {
        var uid = current_node.id;

        var dlg = $("#dlgConfirmDelete");
        dlg.find("span#itemId").text(uid);
        dlg.dialog({
            autoOpen: true,
            resizable: false,
            width: 400,
            modal: true,
            dialogClass: "ui-dialog-bkgnd",
            buttons: [{
                text: _i18n["yes"],
                click: function () {
                    $(this).dialog("close");
                    var cid = uid.split('/')[0];
                    $.ajax({
                        url: makeSvcUrl('deldev'),
                        data: {
                            uid: uid
                        },
                        success: function (data) {
                            // close the device editor
                            var frm = $("#frmDeviceEditor");
                            if (frm.data("visible"))
                                frm.fadeOut();
                            // update the tree
                            var parent = nw_jstree.get_parent(current_node);
                            nw_jstree.delete_node(current_node);
                            nw_jstree.select_node(parent);

                            dev_edit_status.status("info",
                                format(_i18n['devdel_ok'], uid));

                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            dev_edit_status.status(
                                "error",
                                format(_i18n['devdel_ko'], textStatus.statusText));
                        }
                    });
                }
            }, {
                text: _i18n["no"],
                click: function () {
                    $(this).dialog("close");
                }
            }]
        });
    }

    function changeDeviceId(event) {
        var uid = current_node.id;

        var dlg = $("#dlgChangeDevId");
        var fldId = dlg.find("input#newid");
        var uid_parts = uid.split('/');
        var cid = uid_parts[0];
        fldId.val(uid_parts[1]);
        dlg.dialog({
            autoOpen: true,
            resizable: false,
            width: 400,
            modal: true,
            dialogClass: "ui-dialog-bkgnd",
            buttons: [{
                text: _i18n["ok"],
                click: function () {
                    var newid = fldId.val();
                    $(this).dialog("close");
                    if (newid != uid_parts[1]) {
                        $.ajax({
                            url: makeSvcUrl('chgdevid'),
                            data: {
                                'uid': uid,
                                'newid': newid
                            },
                            success: function (data) {
                                // update the tree
                                var fqid = cid + '/' + newid;
                                nw_jstree.set_id(current_node, fqid);
                                nw_jstree.set_text(current_node, newid);

                                information(_i18n['idchg_ok']);
                                dev_edit_status.status('info', format(_i18n["editing_device"], fqid));

                            },
                            error: function (jqXHR, textStatus, errorThrown) {
                                dev_edit_status.status(
                                    "error",
                                    format(_i18n['idchg_ko'], textStatus.statusText));
                            }
                        });
                    } else {
                        information(_i18n['nochange']);
                    }
                }
            }, {
                text: _i18n["cancel"],
                click: function () {
                    $(this).dialog("close");
                }
            }]
        });
    }

    function deleteCoordinator(coordId) {
        var dlg = $("#dlgConfirmDelete");
        dlg.find("span#itemId").text(coordId);
        dlg.dialog({
            autoOpen: true,
            resizable: false,
            width: 400,
            modal: true,
            buttons: {
                "Yes": function () {
                    $(this).dialog("close");
                    $.ajax({
                        url: makeSvcUrl('delcoord'),
                        data: {
                            coordId: coordId
                        },
                        success: function (data) {
                            // empty the page and inform the user
                            nw_jstree.delete_node("a#" + coordId);
                            subnet_edit_status.status("info",
                                coordId + ' ' + _i18n['coorddel_ok']);
                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            subnet_edit_status.status(
                                "error",
                                format(_i18n['coorddel_ko'], textStatus.statusText));
                        }
                    });
                },
                "No": function () {
                    $(this).dialog("close");
                }
            }
        });
    }


    /*
     * Sub-network editor page
     */

    var supportedProducts = false;
    var coordinatorId = false;
    var coordinatorType = false;

    function openCoordinatorEditor(coordId) {
        coordinatorId = coordId;

        discoveryProgressToggle(false);
        $("#coordId").val(coordId);

        $.ajax({
            url: makeSvcUrl('coord'),
            data: {
                uid: coordId
            },
            async: false,
            success: function (data) {
                if (data) {
                    coordinatorType = data.type;
                    supportedProducts = data.products;

                    // setup discovery feature depending on driver capabilities
                    var supportsDiscovery = data.discovery != null;
                    $("#btnDiscover").toggle(supportsDiscovery);
                    if (supportsDiscovery) {
                        var discovery_props = data.discovery;
                        if (discovery_props.ttl) {
                            // add a guard to driver discovery timeout, set to 1 second at the least
                            discoveryTTL = (discovery_props.ttl + 1) * 1000;
                        }
                        var can_stop = discovery_props.hasOwnProperty("can_stop") && discovery_props["can_stop"];
                        $("#btnCancelDiscovery").toggle(can_stop);
                        $("#btnRediscoveryCancel").toggle(can_stop);
                        $("span.msg_cancel_disc").toggle(can_stop);
                    }

                    resetNewDeviceForm();

                    pager.showPage("subNetworkEditor");

                } else {
                    subnet_edit_status.status("error",
                        format(_i18n['coordget_ko'], _i18n['no_info'])
                    );
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                var report = $.parseJSON(jqXHR.responseText);
                fatalError(_i18n['coordget_ko'], [report.message, report.additInfos]);
            }
        });
    }

    function setupProductSelector(products, selected) {
        // products:
        //  associative array
        //      key: the product type (i.e. the name of the descriptor file in the meta-data tree)
        //      value: the meta-data "productname" filed value
        // NB. "productname" is supposed to be the "installer firendly" name of the product
        var productSelector = $("#newDevProduct").empty();
        var i = 1;

        // sort the products list by values, so that it will be displayed in a friendly way

        // create the inverted dictionary
        var inv_products = new Object();
        for (var t in products) {
            inv_products[products[t]] = t;
        }
        // sort its keys (which are the displayed names of the products)
        var names = [];
        for (var n in inv_products) {
            names.push(n);
        }
        names.sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });

        for (var ndx in names) {
            var p_name = names[ndx];
            var p_type = inv_products[p_name];
            productSelector.append("<option value='" + p_type + "'>" + p_name + "</option>");
            if (i == selected) {
                productSelector.children().last().attr("selected", "1");
                updateProductInfo($("#devinfo"), p_type);
                productSelect = p_type;
            }
            i++;
        }
    }

    var newDeviceFormValidator = $("#frmNewDevice").validate({
        //debug: true,
        ignore: ".ignore",
        submitHandler: function (form) {
            $.ajax({
                url: makeSvcUrl('adddev'),
                data: $(form).serialize(),
                success: function (data) {
                    if (!data.error) {
                        subnet_edit_status.hide();

                        /*
                         * switch to editing of the newly created device
                         */

                        // get it's id from the reply
                        var coord_node = nw_jstree.get_selected(true)[0];
                        var node_id = nw_jstree.create_node(
                            coord_node,
                            {
                                id: data.uid,
                                text: currentDeviceId,
                                icon: "device"
                            }
                        );
                        resetNewDeviceForm();
                        nw_jstree.deselect_all(true);
                        nw_jstree.select_node(node_id);

                    } else {
                        subnet_edit_status.status("error", data.error);
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    var report = $.parseJSON(jqXHR.responseText);
                    fatalError(format(_i18n['devnew_ko'], report.message), [report.additInfos]);
                }
            });
        },
        onfocusout: false,
        onkeyup: false,
        onclick: false,
        messages: {}
    });

    function resetNewDeviceForm() {
        setupProductSelector(supportedProducts, '1');
        $("#newDevId").val("");
        $("#newDevAddr").val("").removeAttr("readonly");
        $("#newDevLoc").val("");
        newDeviceFormValidator.resetForm();
        subnet_edit_status.status("info",
            format(_i18n["coord_devices"], coordinatorId, coordinatorType)
        );
    }

    var discoveryTTL = 0; // Initalized by openCoordinatorEditor() with info
    // returned about coordinator descovery mechanism
    // support
    var discoverySuccess = false;

    $("#btnReset").click(function () {
        currentDeviceId = "";
        currentLocation = "";
        resetNewDeviceForm();
    });

    var productSelect = "";
    var currentDeviceId = "";
    var currentLocation = "";

    $("#btnRediscoveryCancel").click(function (event) {
        // deleteDevice(dev.oid, dev.root.maintenanceID.value);
        $.ajax({
            data: {
                ajax: "discstop"
            }
        });
    });

    /*

     */

    function getDeviceMetadata(dev_type) {
        var devmeta = null;
        var error = null;

        if (dev_type in devMetadatas) {
            devmeta = devMetadatas[dev_type];

        } else {
            $.ajax({
                // get device meta
                url: makeSvcUrl('devmeta'),
                async: false,
                data: {
                    type: dev_type
                },
                // cache meta in global dictionary
                success: function (data) {
                    devmeta = data;
                    devMetadatas[dev_type] = devmeta;
                },
                // display error message if problem
                error: function (jqXHR, textStatus, errorThrown) {
                    error = $.parseJSON(jqXHR.responseText);
                }
            });
        }

        if (devmeta != null)
            return devmeta;
        else
            throw error;
    }

    function updateProductInfo(widget, p_type) {
        var devmeta = getDeviceMetadata(p_type);
        var descr = getI18nValue(devmeta.__descr__, _lang_);
        widget.html(descr);
    }

    $("#frmNewDevice #newDevProduct").change(function () {
        productSelect = this.options[this.selectedIndex].value;
        updateProductInfo($("#devinfo"), productSelect);
    });
    $("#frmNewDevice #newDevProduct").keyup(function () { // update bug in pre-HTML5
        productSelect = this.options[this.selectedIndex].value;
        updateProductInfo($("#devinfo"), productSelect);
    });

    $("#frmNewDevice #newDevId").change(function () {
        currentDeviceId = this.value;
    });

    $("#frmNewDevice #newDevLoc").change(function () {
        currentLocation = this.value;
    });

    $("#btnDiscover")
        .click(function () {
            subnet_edit_status.status("info", _i18n['devdisc_running']);

            discoverySuccess = false;

            // switch to "please wait" message while discover
            // process is running
            discoveryProgressToggle(true);
            $.ajax({
                url: makeSvcUrl("discstart"),
                data: {
                    coordId: $("#coordId").val(),
                    product: productSelect,
                    // TODO what for ?
                    //deviceId: currentDeviceId,
                    //location: currentLocation
                },
                timeout: discoveryTTL,
                success: function (result) {
                    if (result.error) {
                        subnet_edit_status.status("error", result.error);

                    } else {
                        subnet_edit_status.status("info", _i18n['devdisc_ok']);
                        $("#newDevAddr").val(result.addr);// .attr("readonly", true);
                        discoverySuccess = true;
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (textStatus === "timeout") {
                        subnet_edit_status.status(
                            "error",
                            _i18n['devdisc_timeout']);
                    } else {
                        var report = $.parseJSON(jqXHR.responseText);
                        fatalError(_i18n['devdisc_ko'], [report.message]);
                    }
                },
                complete: function (jqXHR, textStatus) {
                    // reset display to default
                    discoveryProgressToggle(false);
                    //resetNewDeviceForm();
                }
            });
        });

    function discoveryProgressToggle(visible) {
        $("#msgDiscovering").toggle(visible);
        $("#newDeviceFormContainter").toggle(!visible);

        if (!visible && discoverySuccess) {
            $("#newDevId").focus();
        }
    }

    //function rediscoveryProgressToggle(visible) {
    //    $("#msgRediscovering").toggle(visible);
    //}

    $("#btnCancelDiscovery").click(function () {
        $.ajax({
            url: makeSvcUrl('discstop'),
            data: {
                coordId: $("#coordId").val()
            }
        });
        discoveryProgressToggle(false);
        subnet_edit_status.status("info", _i18n['operation_canceled']);
    });

    /*
     * Root page
     */

    function setupCoordTypeSelector(ctypes) {
        var selector = $("#newCoordType").empty();
        for (var i = 0; i < ctypes.length; i++) {
            selector.append("<option>" + ctypes[i] + "</option>");
        }
    }

    function openRootPage(data) {
        $("#coordinators-count").text(summary.coordinatorsCount);
        $("#devices-count").text(summary.devicesCount);

        setupCoordTypeSelector(coord_types);

        $("#newcoordForm").validate(
            {
                ignore: ".ignore",
                submitHandler: function (form) {
                    $.ajax({
                        url: makeSvcUrl('newcoord'),
                        data: $(form).serialize(),
                        success: function (data) {
                            if (!data.error) {
                                var node = nw_jstree.get_container();
                                node = nw_jstree._get_children(node)[0];
                                nw_jstree.create_node(node, "inside", {
                                    data: {
                                        text: data.coordId,
                                        icon: "coord",
                                        attr: {
                                            rel: "coord",
                                            id: data.coordId
                                        }
                                    },
                                    state: "open"
                                }, function () {
                                }, true);
                                $("#summary-status").status('info', data.coordId + " " + _i18n['added']);
                            } else {
                                $("#summary-status").status('error', data.error);
                            }
                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            $("#summary-status").status(
                                "error",
                                format(_i18n['save_ko'], textStatus.statusText));
                        }
                    });
                },
                onfocusout: false,
                onkeyup: false,
                onclick: false
            });

        $("#importForm").validate({
            ignore: ".ignore",
//                  submitHandler : function(form) {
//                      $(form).ajaxSubmit();
//                  },
            onfocusout: false,
            onkeyup: false,
            onclick: false
        });


        pager.showPage("root");
    }

    $('#importForm').ajaxForm({
        url: makeSvcUrl('loadconfig') + "?p=devcfgeditor",
        beforeSubmit: function (arr, form, options) {
            return form.valid();
        },
        type: "POST",
        dataType: "json",
        clearForm: true,
        success: function (jsoResp, statusText, xhr) {
            if (jsoResp.success) {
                // redisplay the page so that all is properly refreshed
                window.location.href = document.location.href;
            } else {
                $('#cfgUploadError').html(_i18n['error'] + " : " + jsoResp.message);
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            $('#results').html(_i18n['Error'] + ' : ' + _i18n['cfgload_ko']);
        }
    });

    $("#btnExportConfig").click(
        function (event) {
            event.preventDefault();
            window.location.href = makeSvcUrl('export');
        });

    $("#btnClearConfig").click(
        function () {
            var dlg = $("#dlgConfirmClear");
            dlg.dialog({
                autoOpen: true,
                resizable: false,
                width: 400,
                modal: true,
                buttons: {
                    "Yes": function () {
                        $(this).dialog("close");
                        $.ajax({
                            url: makeSvcUrl('clear'),
                            beforeSend: function () {
                                $("#summary-status").status("info", _i18n['cfg_clearing']);
                                $("button#btnSaveConfig").hide();
                                $("button#btnLoadConfig").hide();
                                $("#loading-indicator").show();
                                document.body.style.cursor = "wait";
                            },
                            success: function (data) {
                                window.location.href = document.location.href;
                                $("#summary-status").status("info", _i18n['cfgclear_ok']);
                            },
                            error: function (jqXHR, textStatus, errorThrown) {
                                var errInfo = $.parseJSON(jqXHR.responseText);
                                $("#summary-status").status(
                                    "error",
                                    _i18n['cfgclear_ko'] + errInfo.message);
                            },
                            complete: function () {
                                $("#loading-indicator").hide();
                                $("button#btnSaveConfig").show();
                                $("button#btnLoadConfig").show();
                                document.body.style.cursor = "default";
                            }
                        });
                    },
                    "No": function () {
                        $(this).dialog("close");
                    }
                }
            });

        });

    $("#btnImportConfig").click(
        function () {
            $('#importForm').submit();
        });

    /*
     * Editor scroller dynamic adjustment
     */
    /*
     var form_scroller = $("#form-scroller");
     var div_deveditor = $("#device-editor");
     var editor_header = $("#editor-form-header");
     var editor_footer = $("#editor-form-footer");

     function resize_scroller() {
     var fixed_height = editor_header.height() + editor_footer.height() + 40;
     console.log("div_deveditor.innerHeight="+div_deveditor.innerHeight());
     console.log("fixed_height="+fixed_height);
     form_scroller.height(div_deveditor.innerHeight() - fixed_height);
     }

     $(window).resize(resize_scroller);
     */
}

$(document).ready(function () {
    // retrieve supported coordinator types and initialize the editor 
    $.ajax({
        url: document.location.href + '/ctypes',
        success: setupCfgEditor
    });
});

