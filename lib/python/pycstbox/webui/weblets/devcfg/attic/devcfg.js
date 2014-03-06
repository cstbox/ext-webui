var ConstraintModule = function ConstraintModule() {
    this.ruleContainer = {};
};

var devMetadatas = {};

var _msgs = {
	"editing_device" : "Editing device <span class='objectId'>{0}</span>",
	"coord_devices" : "Editing devices attached to coordinator <span class='objectId'>{0}</span> - Protocol : <span class='protocol'>{1}</span>",
	"bad_hexval" : "Invalid hexadecimal value",
	"bad_devid" : "Invalid device id",
	"bad_location" : "Invalid location",
	"bad_strfmt" : "String format is incorrect.",
	"bad_propname" : "Invalid property name : {0}",
	"bad_meta" : "Invalid metadata : {0}",
	"fld_required" : "This field is required",
	"device" : "device",
	"protocol" : " (protocol : {0})",
	"coordget_ko" : "Could not get coordinator information. Reason : {0}",
	"coorddel" : "Delete coordinator",
	"coorddel_ko" : "Could not delete coordinator. Reason : {0}",
	"coorddel_ok" : "Coordinator {0} successfully deleted.",
	"prodget_ko" : "Could not get product details. Reason : {0}",
	"devdel" : "Delete device",
	"devdel_ko" : "Could not delete device. Reason : {0}",
	"devdel_ok" : "Device {0} successfully deleted.",
	"devupd_ok" : "Device {0} successfully updated.",
	"save_ko" : "Could not save changes. Reason : {0}",
	"save_ok" : "Changes saved.",
	"devnew_ko" : "Could not create new device. <br>Reason : {0}",
	"devnew_ok" : "New device successfully created.",
	"devget_ko" : "Could not retrieve properties for device {0}. <br>Reason : {1}",
	"devdisc_ko" : "Device discovery failed. <br>Reason : {0}",
	"devdisc_timeout" : "Device discovery timeout",
	"devdisc_ok" : "New device discovered. Fill in the missing properties and click on 'Add'.",
	"devdisc_running" : "Device discovery running...",
	"error" : "Error",
	"cfgload_ko" : "could not load configuration file",
	"cfg_zipping" : "Zipping devices.xml...",
	"cfgdl_ko" : "Unable to download files. Reason : ",
	"cfg_clearing" : "Clearing configuration...",
	"cfgclear_ok" : "Configuration cleared.",
	"cfgclear_ko" : "Unable to clear configuration. Reason : ",
	"added" : "added",
	"deleted" : "deleted",
	"no_info" : "no info available",
	"done" : "Action performed",
	"actuator" : "Actuator",
	"task_launched" : "Task launched. Look at the 'Events' tab for results.",
	"sched_now" : "Schedule now",
	"sched_dev" : "Scheduled device",
	"root" : "Device global parameters",
	"control" : "Control",
	"output" : "Output",
	"input" : "Input",
	"devmeta_get_ko" : "Could not retrieve metadata for device type {0}.",
	"reason" : "Reason : {0}",
	"cannot_edit_device" : "Cannot edit device"
}
function _i18n(msgid) {
	return _(_msgs[msgid]);
}

(function() {
    this.parse = function parse(prefix,fieldName,consStr) {
        console.log("parse: "+fieldName+" "+consStr);
        var constraints = consStr.split(";");
        var ruleArray = this.ruleContainer[fieldName];

        if(typeof ruleArray === "undefined") {
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
                alert("Malformed constraint: "+constraints[i]);
                continue;
            }
            var consName = tokens[0];
            if (consName === "reqdIfTrue")
                ruleArray.addCons({required: "#" + prefix + '_' + tokens[1] + ":checked"});
            else if (consName === "regex") {
                ruleArray.addCons({regex: tokens[1]});
            } else 
                alert("Undefined constraint name: "+consName);
        }
    }
    this.add = function add() {
        console.log("add");
        for (var fieldName in this.ruleContainer) {
            var ruleArray = this.ruleContainer[fieldName];
            console.log("add: "+fieldName+": "+ruleArray.length+" rules.");
            for(var i=0; i<ruleArray.length; i++) {
                console.log("add: "+i+": "+ruleArray[i]);
                $("#" + fieldName).rules("add", ruleArray[i]);
            }
        }
        console.log("add done.");
    }
}).call(ConstraintModule.prototype)

var dfltProps = {
	"address" : {
		"type" : "int",
		"label" : {
			//TODO check if this could not be internationalized via _i18n()
			"*" : "Addresse",
			"en" : "Address"
		}
	},
	"type" : {
		"type" : "string",
		"label" : {
			"*": "Type",
			"en": "Type"
		}
	},
	"name" : {
		"type" : "string",
		"label" : {
			"*": "Nom",
			"en": "Name"
		}
	},
	"description" : {
		"type" : "string",
		"label" : {
			"*": "Description",
			"en": "Description"
		}
	},
	"enabled" : {
		"type": "boolean",
		"label": {
			"*": "Activé",
			"en": "Enabled"
		}
	},
	"location" : {
		"type": "string",
		"label": {
			"*": "Emplacement",
			"en": "Location"
		}
	}
};


function setupCfgEditor(initData) {
	
	var coord_types = initData.ctypes;

	$(".status").status();

	/**
	 * Helper function returning the descriptor of a selected tree node.
	 * <p>
	 * Handles the various selection scenarios, and return an homogeneous reply.
	 */
	function getDescriptorOfSelectedTreeNode(selectedItem) {
		/*
		 * Get the node type, as stored in the "rel" attribute of the
		 * corresponding <a> element in the tree.
		 * 
		 * The problem here is that depending on the way the new selection has
		 * been done (user's clic, automatic selection after a node close,
		 * programatic modification,...) the object we get in args is different.
		 * It can be : - a string equals to the id of the target element when
		 * selection is made by id (eg: initially_select configuration option) -
		 * a single (or array of) jQuery objects when an item is clicked In this
		 * case, the object can be : + the <a> element when an item is selected
		 * with the mouse + the parent <li> element when selection changed by
		 * code of because it is closed while a child is selected
		 */
		switch (typeof (selectedItem)) {
		case "string":
			selectedItem = $(selectedItem)[0];
		case "object":
			if (selectedItem.length) {
				selectedItem = selectedItem[0];
			}
			if (selectedItem.tagName) {
				switch (selectedItem.tagName) {
				case "LI":
					selectedItem = $(selectedItem).find("a")[0];
				case "A":
					break;
				}
			}
		}

		return {
			id : selectedItem.id,
			type : selectedItem.rel,
			label : selectedItem.text
		};
	}

	/*
	 * Network tree setting
	 */

	var selectedNodeIdAfterRefresh = null;

	$("#nwtree").jstree({
		plugins : ["themes", "json_data", "ui", "contextmenu"],
		json_data : {
			ajax : {
                url : document.location.href + '/nwtree',
				data : {
					sorted : "1"
				},
				success : setupNetworkTree
			}
		},
		core : {
			animation : 500
		},
		ui : {
			select_limit : 1,
			select_prev_on_delete : false,
			initially_select : [ "root" ]
		// select the node with id="root" at
		// the beginning
		},
		contextmenu : {
			items : getContextMenuItems,
			select_node : true
		}
	}).bind("loaded.jstree", function(e, data) {
		// customize the root node by removing its "tree" icons
		var rootNode = data.inst._get_next(this, true);
		rootNode.children("ins").remove();

	}).bind("refresh.jstree", function(e, data) {
		// remove the root tree line
		var rootNode = $(this).find("a#root").prev("ins");
		rootNode.remove();

		// select the requested node if any
		if (selectedNodeIdAfterRefresh) {
			/*
			 * we need to use the timeout mechanism, since this must be executed
			 * after the refresh process is over, because it clears the
			 * selection on completion
			 */
			setTimeout(function() {
				var newDevNode = $("a#" + selectedNodeIdAfterRefresh);
				nw_jstree.select_node(newDevNode);
				selectedNodeIdAfterRefresh = null;
			}, 100);
		}

	}).bind(
			"select_node.jstree",
			function(e, data) {
				var nwNode = getDescriptorOfSelectedTreeNode(data.args[0]);
				// console.log("select_node.jstree - nwNode=" + nwNode);
				switch (nwNode.type) {
				case "device":
					openDeviceEditor(nwNode.id);
					break;
				case "coord":
					openCoordinatorEditor(nwNode.id);
					break;
				case "root":
					$.ajax({
						url : document.location.href + '/nwtree',
						// open editor when received
						success : openRootPage,
						// display error message if problem
						error : function(jqXHR, textStatus, errorThrown) {
							var report = $.parseJSON(jqXHR.responseText);
							fatalError($.format(_i18n('devget_ko'), nwNode.id,
									report.message), report.additInfos);
						}
					});
					break;
				}

			}).bind(
			"before.jstree",
			function(e, data) {
				// prevent closing the root node
				// (cannot happen if root node tree icon is removed (see
				// above), but
				// in case...
				if (data.func === "close_node"
						&& data.args[0].find(">a").attr("rel") === "root") {
					e.stopImmediatePropagation();
					return false;
				}

			});
	var nw_jstree = $.jstree._reference($("#nwtree"));

	var summary = {};

	var contextMenus = {
		"device" : {
			"delete" : {
				label : _i18n('devdel'),
				_class : "ui-widget",
				action : function(sel) {
					var node = getDescriptorOfSelectedTreeNode(sel);
					deleteDevice(node.id, node.label);
				}
			}
		},
		"coord" : {
			"delete" : {
				label : _i18n('coorddel'),
				_class : "ui-widget",
				action : function(sel) {
					var node = getDescriptorOfSelectedTreeNode(sel);
					deleteCoordinator(node.id);
				}
			}
		},
		"root" : null
	};

	function getContextMenuItems(sel) {
		var nwNode = getDescriptorOfSelectedTreeNode(sel);
		return contextMenus[nwNode.type];
	}

	function setupNetworkTree(nwData) {
		var root = {
			data : {
				title : "CSTBox",
				icon : "root",
				attr : {
					rel : "root",
					id : "root"
				}
			},
			state : "open",
			children : []
		};

		var devCnt = 0;
		var coordCnt = 0; 
//		var coords = nwData.tree;
		var coords = nwData;
		for (var coordId in coords) {
			if (!coords.hasOwnProperty(coordId)) continue;
			
			var coordNode = {
				data : {
					title : coordId,
					icon : "coord",
					attr : {
						rel : "coord",
						id : coordId
					}
				},
				state : "open",
				children : []
			};

			devs = coords[coordId];
			for ( var i in devs) {
				var devId = devs[i];
				var devNode = {
					data : {
						title : devId,
						icon : "device",
						attr : {
							rel : "device",
							// make a unique id by using the "absolute path" of the device
							id : coordId + '/' + devId
						}
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
		required: _i18n("fld_required")
	});
	
	$.validator.addMethod("hexdigits", function(value, element) {
		return this.optional(element) || /^[0-9a-f]+$/i.test(value);
	}, _i18n('bad_hexval'));

	$.validator.addMethod("deviceId",
			function(value, element) {
				return this.optional(element)
						|| /^[a-z0-9][a-z0-9-_\.]*$/i.test(value);
			}, _i18n("bad_devid"));

    $.validator.addMethod("location",
		function(value, element) {
			return this.optional(element)
					|| /^[a-z0-9][a-z0-9-_\. ]*$/i.test(value);
		}, _i18n("bad_location"));


    $.validator.addMethod("regex",
            function(value, element, regexp) {
                var re = new RegExp(regexp);
                var check = re.test(value);
                console.log("check "+value+" : "+regexp+" -> "+check);
                return this.optional(element) || check;
            },
            _i18n("bad_strfmt")
    );


	$("button").button();

	/*
	 * Multi-page management
	 */

	var pager = {
		pages : {
			"deviceEditor" : {
				content : $("#device-editor")
			},
			"subNetworkEditor" : {
				content : $("#subnet-editor")
			},
			"root" : {
				content : $("#root-page")
			},
			"fatalError" : {
				content : $("#fatal-error")
			}
		},
		currentPage : null,
		showPage : function(newPage) {
			if (this.currentPage == newPage)
				return;

			if (this.currentPage) {
				var curPage = this.pages[this.currentPage];
				if (curPage.onclose)
					curPage.onclose();
				var curPager = this;
				curPage.content.fadeOut(function() {
					curPager._displayPage(newPage);
				}).data("visible", false);
			} else {
				this._displayPage(newPage);
			}
		},
		_displayPage: function(page) {
			if (this.pages[page] && this.pages[page].content) {
				this.pages[page].content.fadeIn().data("visible", true);
				this.currentPage = page;
			}			
		}
	};

	/*
	 * Device editor page
	 */

	function openDeviceEditor(uid) {
		$("#frmDeviceEditor #uid").val(uid);
		
		$.ajax({
			// get device properties
			url: document.location.href + '/dev',
			data : {
				uid : uid
			},
			// open editor when received
			dataFilter : function(data) {
				var dev = $.parseJSON(data);
				dev['uid'] = uid;
				var res = JSON.stringify(dev);
				return res;
			},
			success : editDevice,
			// display error message if problem
			error : function(jqXHR, textStatus, errorThrown) {
				var report = $.parseJSON(jqXHR.responseText);
				fatalError($.format(_i18n('devget_ko'), uid, report.message), report.additInfos);
			}
		});
	}
	
	function editDevice(dev) {
		var uiProps = null;
		var fieldset = null;

		var templates = $("#template");
		var formItem = $.format(templates.find("#property-item").val());
        var propsConstraints = new ConstraintModule();
        
        var devmeta = null ;
        var abortcall = false;
        
        if (dev.type in devMetadatas) {
        	devmeta = devMetadatas[dev.type];
        } else {
        	$.ajax({
    			// get device meta
    			url: document.location.href + '/devmeta',
    			async : false,
    			data : {
    				type : dev.type
    			},
    			// cache meta in global dictionary
    			success : function(data){
    				devmeta = data;
    				devMetadatas[dev.type] = devmeta;
    			},
    			// display error message if problem
    			error : function(jqXHR, textStatus, errorThrown) {
    				abortcall = true;
    				var report = $.parseJSON(jqXHR.responseText);
    				fatalError($.format(_i18n('devmeta_get_ko'), dev.type), [report.message, report.additInfos]);
    			}
        	});
        }
        if (abortcall) return ;
        
		function addPropertyFormItem(propName, obj, uiProps, fieldSet, prefix) {
			var uiProp = null;
			if (uiProps.hasOwnProperty(propName)) {
				uiProp = uiProps[propName];
			} else if (dfltProps.hasOwnProperty(propName)) {
				// maybe we are dealing with a pre-defined property
				uiProp = dfltProps[propName];
			} else {
				// Houston, we have a problem
				fatalError(_i18n('cannot_edit_device'), [$.format(_i18n("bad_propname"), propName)]);
				return false;
			}
			
			var propValue = obj.hasOwnProperty(propName) ? obj[propName] : uiProp.default;			
			
			var fldName = prefix + '_' + propName;
			var frmItem = "";
			var requiredRule = uiProp.readonly ? " ignore "
					: (uiProp.mandatory ? " required " : "");
			var readonlyAttr = uiProp.readonly ? "readonly" : "";
			var disabledAttr = uiProp.readonly ? "disabled" : "";

			if (uiProp.constraints)
				propsConstraints.parse(prefix,fldName,uiProp.constraints);

			var tmplItem = templates.find("#inp-" + uiProp.type).val();
			var labelSuffix = false;
			switch (uiProp.type) {
			case "string":
				frmItem = $.format(tmplItem, fldName, propValue,
						requiredRule, readonlyAttr);
				break;
			case "int":
				frmItem = $.format(tmplItem, fldName, propValue,
						requiredRule, readonlyAttr);
				break;
			case "hexint":
				var sHex = toHex(propValue);
				if (!sHex)
					sHex = "0";
				frmItem = $.format(tmplItem, fldName, sHex, requiredRule,
						readonlyAttr);
				// add an explanatory suffix to the label to give a visible hint
				// for expected input
				labelSuffix = "(hex)";
				break;
			case "float":
				frmItem = $.format(tmplItem, fldName, propValue,
						requiredRule, readonlyAttr);
				break;
			case "bool":
			case "boolean":
				frmItem = $.format(tmplItem, fldName,
						obj[propName] ? "checked='on'" : "",
						disabledAttr);
				break;
			case "choice":
				var options = "";
				var fmtOption = $.format(templates.find("#inp-option").val());
				var constraints = uiProp.constraints.split(",");
				for ( var c = 0; c < constraints.length; c++) {
					var s = constraints[c];
					options += fmtOption(s, propValue == s);
				}
				frmItem = $.format(tmplItem, fldName, options);
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
			
			return true;
		}

		/*
		 * build device root level properties field set
		 */

		try {
			uiProps = devmeta.pdefs.root;
		} 
		catch(err) {
			fatalError(_i18n('cannot_edit_device'), [$.format(_i18n("bad_meta"), err.message)]);
			return;
		}

		// add constant stuff
		$("#info_type").val(dev.type);

		var descr = devmeta.description;
		if (typeof(descr) != "string") {
			if (descr.hasOwnProperty(_lang_)) {
				descr = descr[_lang_];
			} else {
				descr = descr['*'];
			}
		}
		$("#info_descr").val(descr);

		fieldset = $("#fset-rootProps");
		fieldset.empty();
		
		var seq = uiProps.__seq__;
		
		for ( var i = 0; i < seq.length; i++) {
			var propName = seq[i];
			if (!addPropertyFormItem(propName, dev, uiProps, fieldset, "root"))
				return;
		}

		/*
		 * build output end-points level properties field set
		 */

		var oeps = devmeta.pdefs.outputs;
		fieldset = $("#fset-oepProps");
		fieldset.empty();
		if (oeps) {
			if (oeps.__count__) {
				// all outputs are indentical and described by the the entry keyed by "*"
				uiProps = oeps['*'];
				var seq = uiProps.__seq__;
				for (var epId = 1; epId <= oeps.__count__; epId++) {
					var ep = dev.outputs[epId];
					var oepFldSet = $("<fieldset class='end-point'></fieldset>");
					oepFldSet.append($("<legend>" + _i18n('output') + ' ' + epId + "</legend>"));
					for ( var j = 0; j < seq.length; j++) {
						var propName = seq[j];
						if (!addPropertyFormItem(propName, ep, uiProps, oepFldSet, "out_" + epId))
							return;
					}

					oepFldSet.appendTo(fieldset);
				}
			} else {
				// we have an explicit detail of all the end-points, including their sequence
				var epSeq = oeps.__seq__;
				for ( var i = 0; i < epSeq.length; i++) {
					var epId = epSeq[i];
					var ep = dev.outputs[epId];
					uiProps = oeps[oepId];

					var oepFldSet = $("<fieldset class='end-point'></fieldset>");
					oepFldSet.append($("<legend>" + _i18n('output') + ' ' + epId + "</legend>"));
					var seq = uiProps._seq_;
					for ( var j = 0; j < seq.length; j++) {
						var propName = seq[j];
						if (!addPropertyFormItem(propName, ep, uiProps, oepFldSet, "out_" + epId))
							return;
					}

					oepFldSet.appendTo(fieldset);
				}
			}

			fieldset.show();

		} else {
			fieldset.hide();
		}
		
		// reworked
		
//		$("#fset-oepProps").configArea({
//			entries: dev.out
//		});

		/*
		 * build control end-points level properties field set (added by Daniel
		 * 15/06/2011)
		 */

		fieldset = $("#fset-cepProps");
		fieldset.empty();

		var jsoCtlEndPoints = devmeta.pdefs.controls;
		if (jsoCtlEndPoints) {
			var jsaCEPSeq = jsoCtlEndPoints.__seq__;
			for ( var i = 0; i < jsaCEPSeq.length; i++) {
				var endPointLocalId = jsaCEPSeq[i];
				
				jsoUIP = jsoCtlEndPoints[endPointLocalId];
				var epId = jsoUIP.localId.value;

				var cepFldSet = $("<fieldset class='end-point'></fieldset>");
				cepFldSet.append($("<legend>" + _i18n('control') + ' ' + epId + "</legend>"));

				var jsaSeq = jsoUIP._seq_;
				for ( var j = 0; j < jsaSeq.length; j++) {
					var uiPropName = jsaSeq[j];
					
					// TODO fix call
					if (!addPropertyFormItem(jsoUIP[uiPropName], cepFldSet, "ctl_" + epId))
						return;
				}

				cepFldSet.appendTo(fieldset);
			}

			fieldset.show();
		} else {
			fieldset.hide();
		}

		// schedule button
		
		fieldset = $("#fset-schedule");
		fieldset.empty();
		var jsoScheduleButton = dev.schedule;
		if (jsoScheduleButton) {
			
			var cepFldSet = $("<fieldset class='end-point'></fieldset>");
			cepFldSet.append($("<legend>" + _i18n('sched_dev') + "</legend>"));
			
			cepFldSet.append("<center><button id='task-schedule' type='button'>" + _i18n('sched_now') + "</button></center>");

			cepFldSet.appendTo(fieldset);
			
			var taskScheduleBtn = $("#task-schedule"); 
			taskScheduleBtn.unbind('click');
			taskScheduleBtn.click(function(event) {
				$.ajax({
					data : {
						ajax: "schedule",
						oid: dev.oid
					},
					success : function(data) {
						$("#device-editor-status").status('info', _i18n('task_launched'));
					},
					error : function(jqXHR, textStatus, errorThrown) {
						$("#device-editor-status")
								.status("error", $.format(_i18n('save_ko'), textStatus.statusText));
					}
				});
			});
			
			fieldset.show();
		} else {
			fieldset.hide();
		}
		
		// action button
		
		fieldset = $("#fset-action");
		fieldset.empty();
		var jsoActionButton = devmeta.action;
		if (jsoActionButton && jsoActionButton.length > 0) {
			
			var cepFldSet = $("<fieldset class='end-point'></fieldset>");
			cepFldSet.append($("<legend>" + _i18n('actuator') + "</legend>"));

			var pcontent = "";
			for(var index in jsoActionButton) {
				var jsoScheduleButton = jsoActionButton[index]; 
				var varType = jsoScheduleButton.varType;
				var jsaActionsSeqParams = jsoScheduleButton.argTypes;
				var widgets = "";
				for(var j in jsaActionsSeqParams) {
					var type = jsaActionsSeqParams[j].type;
					var name = jsaActionsSeqParams[j].name;
					var id = "id='param_"+index+"_"+j+"'";
					if (type == "Boolean") {
						widgets += name+"=<input "+id+" type='checkbox'/>";
					} else {						
						widgets += name+"=<input "+id+" type='text' style='width:80px' value='0'/>";
					}
				}				
				pcontent += "<tr><td valign='middle' align='center'><button id='action_"+index+"' type='button'>"+varType+"</button></td><td valign='middle' align='left'>"+widgets+"</td></tr>";
			}
			console.log(pcontent);
			cepFldSet.append("<center><table>"+pcontent+"</table></center>");
			
			cepFldSet.appendTo(fieldset);

			function addActionBtn(varType, target, index, nbArgs, args) {
				var taskActionBtn = $("#action_"+index);
				taskActionBtn.unbind('click');
				taskActionBtn.click(function(event) {
					var args2 = ""+args;
					for(var j=0; j<nbArgs ; j++) {
						var type = $("#param_"+index+"_"+j).attr("type");
						var v;
						if(type=="checkbox") {
							v = $("#param_"+index+"_"+j).attr("checked");
						} else {
							v = $("#param_"+index+"_"+j).val();
						}
						var t = "param_"+index+"_"+j;
						args2=args2.replace(t,v);
					}
					$.ajax({
						data : {
							ajax: "action",
							varType: varType,
							target: target,
							args: args2
						},
						success : function(data) {
							$("#device-editor-status").status('info', _i18n('done'));
						},
						error : function(jqXHR, textStatus, errorThrown) {
							$("#device-editor-status")
									.status("error",
											$.format(_i18n('save_ko'), textStatus.statusText));
						}
					});
				});
			}
			
			for(var index in jsoActionButton) {
				var jsoScheduleButton = jsoActionButton[index]; 
				var varType = jsoScheduleButton.varType;
				var target = jsoScheduleButton.target;
				var jsaActionsSeqParams = jsoScheduleButton.argTypes;
				var args = "";
				for(var j in jsaActionsSeqParams) {
					var name = jsaActionsSeqParams[j].name;
					var type = jsaActionsSeqParams[j].type;
					args += name+":"+type+"=param_"+index+"_"+j;
				}
				addActionBtn(varType, target, index, jsaActionsSeqParams.length, args);
			}
				
			fieldset.show();
		} else {
			fieldset.hide();
		}
		
		
		/*
		 * Setup action buttons
		 */

		var frm = $("#frmDeviceEditor");

		var deleteBtn = frm.find("button#btnDelete");
		deleteBtn.unbind('click');
		deleteBtn.click(function(event) {
			deleteDevice(dev.oid, dev.root.maintenanceID.value);
		});

		var updateBtn = frm.find("button#btnRediscover");
		updateBtn.unbind('click');
		updateBtn.click(function(event) {
			updateAddress(dev.oid, dev.root.maintenanceID.value);
		});

		frm.validate({
			// debug : true,
			ignore : ".ignore",
			submitHandler : function(form) {
				$.ajax({
					data : $(form).serialize() + "&ajax=savedev",
					success : function(data) {
						if (!data.error) {
							nw_jstree.rename_node("a#" + data.oid,
									data.newname);
							$("#device-editor-status").status('info', _i18n('save_ok'));
						} else {
							$("#device-editor-status").status('error', data.error);
						}
					},
					error : function(jqXHR, textStatus, errorThrown) {
						$("#device-editor-status")
								.status(
										"error",
										$.format(_i18n('save_ko'), textStatus.statusText));
					}
				});
			},
			onfocusout : false,
			onkeyup : false,
			onclick : false
		});

//		for ( var fldName in additRules) {
//			var rule = additRules[fldName];
//			$("#" + fldName).rules("add", rule);
//		}
//                performAddRulesOnFields(additRules);
        propsConstraints.add();

		// console.log("display editor page") ;

		frm.show().data("visible", true);
		pager.showPage("deviceEditor");

		// display a status message with the device id
		var uid = dev.uid;
		$("#device-editor-status").status('info',
				$.format(_i18n("editing_device"), uid));
		
//		$(window).trigger('resize');
	}

	function updateAddress(oid, maintId) {
		$("#subnet-editor-status").status("info", _i18n('devdisc_running'));

		discoverySuccess = false;

		// switch to "please wait" message while discover process is running
		rediscoveryProgressToggle(true);

		$.ajax({
			data : {
				ajax : "updatedev",
				oid : oid
			},
			success : function(result) {
				if (result.error) {
					$("#device-editor-status").status("error", result.error);
				} else {
					$("#device-editor-status").status("info",
							$.format(_i18n('devupd_ok'), maintId));

					var sHex = new Number(result.addr).toString(16);
					if (sHex.length % 2) {
						sHex = '0' + sHex;
					}
					$("#root_address").val(sHex);

					discoverySuccess = true;
				}
			},
			error : function(jqXHR, textStatus, errorThrown) {
				if (textStatus === "timeout") {
					$("#device-editor-status").status("error", _i18n('devdisc_timeout'));
				} else {
					var report = $.parseJSON(jqXHR.responseText);
					fatalError($.format(_i18n('devdisc_ko'), report.message), [report.additInfos]);
				}
			},
			complete : function(jqXHR, textStatus) {
				// reset display to default
				rediscoveryProgressToggle(false);
			}
		});
	}

	function deleteDevice(uid, maintId) {
		var dlg = $("#dlgConfirmDelete");
		dlg.find("span#itemId").text(maintId);
		dlg.dialog({
			autoOpen : true,
			resizable : false,
			width : 400,
			modal : true,
			buttons : {
				"Yes" : function() {
					$(this).dialog("close");
					$.ajax({
						data : {
							ajax : "deldev",
							uid : uid
						},
						success : function(data) {
							// empty the page and inform the user
							$("#device-editor-status").status("info",
									$.format(_i18n('devdel_ok'), maintId));
							var frm = $("#frmDeviceEditor");
							if (frm.data("visible"))
								frm.fadeOut();

							// remove the node from the tree
							nw_jstree.delete_node("a#" + oid);
						},
						error : function(jqXHR, textStatus, errorThrown) {
							$("#device-editor-status").status(
									"error",
									$.format(_i18n('devdel_ko'), textStatus.statusText));
						}
					});
				},
				"No" : function() {
					$(this).dialog("close");
				}
			}
		});
	}

	function deleteCoordinator(coordId) {
		var dlg = $("#dlgConfirmDelete");
		dlg.find("span#itemId").text(coordId);
		dlg.dialog({
			autoOpen : true,
			resizable : false,
			width : 400,
			modal : true,
			buttons : {
				"Yes" : function() {
					$(this).dialog("close");
					$.ajax({
						data : {
							ajax : "delcoord",
							coordId : coordId
						},
						success : function(data) {
							// empty the page and inform the user
							nw_jstree.delete_node("a#" + coordId);
							$("#subnet-editor-status").status("info",
									coordId + ' ' + _i18n('coorddel_ok'));
						},
						error : function(jqXHR, textStatus, errorThrown) {
							$("#subnet-editor-status").status(
									"error",
									$.format(_i18n('coorddel_ko'), textStatus.statusText));
						}
					});
				},
				"No" : function() {
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
		$("#frmNewDevice #coordId").val(coordId);

		$.ajax({
			url: document.location.href + '/coord',
			data : {
				uid : coordId
			},
			async : false,
			success : function(data) {
				if (data) {
					coordinatorType = data.type;
					supportedProducts = data.products;

					// setup discovery feature depending on driver capabilities
					$("#btnDiscover").toggle(data.discovery);
					if (data.discovery.ttl)
						// add a guard to driver dicovery timeout
						discoveryTTL = data.discovery.ttl + 1000;

					resetNewDeviceForm();

					pager.showPage("subNetworkEditor");

				} else {
					$("#subnet-editor-status").status("error", $.format(_i18n('coordget_ko'), _i18n('no_info')));
				}
			},
			error : function(jqXHR, textStatus, errorThrown) {
				var report = $.parseJSON(jqXHR.responseText);
				fatalError($.format(_i18n('coordget_ko'), report.message), [report.additInfos]);
			}
		});
	}

	function setupProductSelector(products, selected) {
		var productSelector = $("#newDevProduct").empty();
		var i = 1;
		for (var p_type in products) {
			p_name = products[p_type];
			productSelector.append("<option value='" + p_type + "'>" + p_name + "</option>");
			if (i == selected) {
				productSelector.children().last().attr("selected", "1");
				updateProductInfo($("#devinfo"), p_type);
			}
			i++;
		}
	}

	var newDeviceFormValidator = $("#frmNewDevice").validate(
			{
				ignore : ".ignore",
				submitHandler : function(form) {
					$.ajax({
						url : document.location.href + '/adddev',
						data : $(form).serialize(),
						success : function(data) {
							if (!data.error) {
								$("#subnet-editor-status").hide();

								/*
								 * switch to editing of the newly created device
								 */

								// get it's id from the reply
								var uid = data.uid;

								selectedNodeIdAfterRefresh = uid;
								nw_jstree.refresh(-1);

							} else {
								$("#subnet-editor-status").status("error", data.error);
							}
						},
						error : function(jqXHR, textStatus, errorThrown) {
							var report = $.parseJSON(jqXHR.responseText);
							fatalError($.format(_i18n('devnew_ko'), report.message), [report.additInfos]);
						}
					});
				},
				wrapper : "p class='label-error'",
				onfocusout : false,
				onkeyup : false,
				onclick : false,
				messages:{
					
				}
			});

	function resetNewDeviceForm() {
		setupProductSelector(supportedProducts, '1');
		$("#newDevId").val("");
		$("#newDevAddr").val("").removeAttr("readonly");
		$("#newDevLoc").val("");
//TODO unlock this		
//		newDeviceFormValidator.resetForm();
		$("#subnet-editor-status").status("info", $.format(_i18n("coord_devices"), coordinatorId));
	}

	var discoveryTTL = 0; // Initalized by openCoordinatorEditor() with info
	// returned about coordinator descovery mechanism
	// support
	var discoverySuccess = false;

	$("#btnReset").click(function() {
		currentDeviceId = "";
		currentLocation = "";
		resetNewDeviceForm();
	});

	var productSelect = "";
	var currentDeviceId = "";
	var currentLocation = "";

	$("#btnRediscoveryCancel").click(function(event) {
		// deleteDevice(dev.oid, dev.root.maintenanceID.value);
		$.ajax({
			data : {
				ajax : "discstop"
			}
		});
	});

	function updateProductInfo(object, p_type) {
		var prodinfo = "-";
		$.ajax({
			url : document.location.href + '/prdinfo',
			data : {
				p_type : p_type,
//				coordType: coordinatorType
//				coordId : $("#frmNewDevice #coordId").val()
			},
			success : function(data) {
				prodinfo = data.description;
				object.html(prodinfo);
				var supportsDiscovery = $.inArray('discovery', data.supports) > -1;
				$("#btnDiscover").toggle(supportsDiscovery);
			},
			error : function(jqXHR, textStatus, errorThrown) {
				$("#device-editor-status").status("error",
						$.format(_i18n('prodget_ko'), jqXHR.status));
			}
		});
		return prodinfo;
	}

	$("#frmNewDevice #newDevProduct").change(function() {
		productSelect = this.options[this.selectedIndex].value;
		updateProductInfo($("#devinfo"), productSelect);
	});
	$("#frmNewDevice #newDevProduct").keyup(function() { // update bug in pre-HTML5
		productSelect = this.options[this.selectedIndex].value;
		updateProductInfo($("#devinfo"), productSelect);
	});

	$("#frmNewDevice #newDevId").change(function() {
		currentDeviceId = this.value;
	});

	$("#frmNewDevice #newDevLoc").change(function() {
		currentLocation = this.value;
	});

	$("#btnDiscover")
			.click(function() {
					resetNewDeviceForm();
					$("#subnet-editor-status").status("info", _i18n('devdisc_running'));

					discoverySuccess = false;

					// switch to "please wait" message while discover
					// process is running
					discoveryProgressToggle(true);
					$.ajax({
						data : {
							ajax : "discstart",
							coordId : $("#frmNewDevice #coordId").val(),
							product : productSelect,
							deviceId : currentDeviceId,
							location : currentLocation
						},
						timeout : discoveryTTL,
						success : function(result) {
							if (result.error) {
								$("#frmNewDevice #newDevId").val(result.deviceId);
								$("#frmNewDevice #newDevLoc").val(result.location);
								$("#subnet-editor-status").status("error", result.error);

							} else {
								$("#subnet-editor-status").status("info", _i18n('devdisc_ko'));

								newDeviceFormValidator.resetForm();
								setupProductSelector(
										result.products,
										result.selected);

								var sHex = new Number(result.addr).toString(16);
								if (sHex.length % 2) {
									sHex = '0' + sHex;
								}
								$("#newDevAddr").val(sHex);// .attr("readonly",
								// true);

								$("#frmNewDevice #newDevId").val(result.deviceId);
								$("#frmNewDevice #newDevLoc").val(result.location);

								discoverySuccess = true;
							}
						},
						error : function(jqXHR, textStatus,
								errorThrown) {
							if (textStatus === "timeout") {
								$("#subnet-editor-status").status(
										"error",
										_i18n('devdisc_timeout'));
							} else {
								var report = $
										.parseJSON(jqXHR.responseText);
								fatalError($.format(_i18n('devdisc_ko'), report.message), [report.additInfos]);
							}
						},
						complete : function(jqXHR, textStatus) {
							// reset display to default
							discoveryProgressToggle(false);
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

	function rediscoveryProgressToggle(visible) {
		$("#msgRediscovering").toggle(visible);
	}

	$("#btnCancelDiscovery").click(function() {
		$.ajax({
			data : {
				ajax : "discstop"
			}
		});
	});

	/*
	 * Root page
	 */

	function setupCoordTypeSelector(ctypes) {
		var selector = $("#newCoordType").empty();
		for ( var i = 0; i < ctypes.length; i++) {
			selector.append("<option>" + ctypes[i] + "</option>");
		}
	}

	function openRootPage(data) {
		$("#coordinators-count").text(summary.coordinatorsCount);
		$("#devices-count").text(summary.devicesCount);
		
		//TODO should be a coordinator type selector rather than a protocol, 
		// the list being built from metat-data and not configuration data
		setupCoordTypeSelector(coord_types);

		$("#newcoordForm").validate(
				{
					ignore : ".ignore",
					submitHandler : function(form) {
						$.ajax({
							data : $(form).serialize() + "&ajax=newcoord",
							success : function(data) {
								if (!data.error) {
									var node = nw_jstree.get_container();
									node = nw_jstree._get_children(node)[0];
									nw_jstree.create_node(node, "inside", {
										data : {
											title : data.coordId,
											icon : "coord",
											attr : {
												rel : "coord",
												id : data.coordId
											}
										},
										state : "open"
									}, function() {
									}, true);
									$("#summary-status").status('info', data.coordId + " " + _i18n('added'));
								} else {
									$("#summary-status").status('error', data.error);
								}
							},
							error : function(jqXHR, textStatus, errorThrown) {
								$("#summary-status").status(
										"error",
										$.format(_i18n('save_ko'), textStatus.statusText));
							}
						});
					},
					onfocusout : false,
					onkeyup : false,
					onclick : false
				});
		
		$("#importForm").validate({
					ignore : ".ignore",
//					submitHandler : function(form) {
//						$(form).ajaxSubmit();
//					},
					onfocusout : false,
					onkeyup : false,
					onclick : false
				});


		pager.showPage("root");
	}

	$('#importForm').ajaxForm({
		url : "?p=devcfgeditor&ajax=loadconfig",
		beforeSubmit : function(arr, form, options) {
			return form.valid();
		},
		type : "POST",
		dataType : "json",
		clearForm: true,
		success : function(jsoResp, statusText, xhr) {
			if (jsoResp.success) {
				// redisplay the page so that all is properly refreshed
				window.location.href = document.location.href;
			} else {
				$('#cfgUploadError').html(_i18n('error') + " : " + jsoResp.message);
			}
		},
		error : function(jqXHR, textStatus, errorThrown) {
			$('#results').html(_i18n('Error') + ' : ' + _i18n('cfgload_ko'));
		}
	});

	$("#btnSaveConfig").click(
			function() {
				$.ajax({
					data : {
						ajax : "getDevicesZIPPath"
					},
					accepts : "application/json",
					beforeSend : function() {
						$("#summary-status").status("info", _i18n('cfg_zipping'));
						$("button#btnSaveConfig").hide();
						$("button#btnLoadConfig").hide();
						$("#loading-indicator").show();
						document.body.style.cursor = "wait";
					},
					success : function(data) {
						window.location.href = document.location.href
								+ "&ajax=getDevicesZIPContent&path="
								+ data.result;
						$("#summary-status").hide();
					},
					error : function(jqXHR, textStatus, errorThrown) {
						var errInfo = $.parseJSON(jqXHR.responseText);
						$("#summary-status").status("error", _i18n('cfgdl_ko') + errInfo.message);
					},
					complete : function() {
						$("#loading-indicator").hide();
						$("button#btnSaveConfig").show();
						$("button#btnLoadConfig").show();
						document.body.style.cursor = "default";
					}
				});

			});
	$("#btnClearConfig").click(
			function() {
				var dlg = $("#dlgConfirmClear");
				dlg.dialog({
					autoOpen : true,
					resizable : false,
					width : 400,
					modal : true,
					buttons : {
						"Yes" : function() {
							$(this).dialog("close");
							$.ajax({
								data : {
									ajax : "clearConfig"
								},
								accepts : "application/json",
								beforeSend : function() {
									$("#summary-status").status("info", _i18n('cfg_clearing'));
									$("button#btnSaveConfig").hide();
									$("button#btnLoadConfig").hide();
									$("#loading-indicator").show();
									document.body.style.cursor = "wait";
								},
								success : function(data) {
									window.location.href = document.location.href;
									$("#summary-status").status("info", _i18n('cfgclear_ok'));
								},
								error : function(jqXHR, textStatus, errorThrown) {
									var errInfo = $.parseJSON(jqXHR.responseText);
									$("#summary-status").status(
											"error",
											_i18n('cfgclear_ko') + errInfo.message);
								},
								complete : function() {
									$("#loading-indicator").hide();
									$("button#btnSaveConfig").show();
									$("button#btnLoadConfig").show();
									document.body.style.cursor = "default";
								}
							});
						},
						"No" : function() {
							$(this).dialog("close");
						}
					}
				});

			});

	$("#btnImportConfig").click(
			function(){
				$('#importForm').submit();
			});

	/*
	 * Fatal error page
	 */

	function fatalError(message, additInfos) {
		$("#fatal-error-msg").status("error", message);
		var additInfosDisplay = $("#fatal-error-additInfos-display");
		if (additInfos) {
			var txt = "";
			for (i = 0 ; i < additInfos.length; i++) {
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

	/*
	 * Editor scroller dynamic adjustment
	 */

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
}

$(document).ready(function(){
	$.ajax({
        url : document.location.href + '/ctypes',
		success : setupCfgEditor
	});
});

