/*
 * Copyright (c) 2013 CSTB
 * 
 * This file is part of CSTBox.
 *
 * CSTBox is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * CSTBox is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with CSTBox.  If not, see <http://www.gnu.org/licenses/>.
 */

function cstbox_ajax_empty(a) {
	return {};
}

function cstbox_ajax_do_nothing(a) {
}

/**
 * Timeout of 30 seconds for requests.
 */
var cstbox_ajax_timeout = 30000;

/**
 * _error(status) -> function(typeOfError, txt, err) -> Display error details
 * inside a status bar.
 * 
 * @param status
 *            Status bar object.
 */
function cstbox_ajax_error(status) {
	return function(typeOfError, txt, err) {
		var r = $.parseJSON(typeOfError.responseText);
		status.text(
				$.format(_("Communication error: {0}. Reason: {1}."),
						r.errtype, r.message)).addClass("ui-state-error")
				.show();
	};
};

/**
 * _success(msg,fct,status) -> function(reply) -> Execute a callback fct and
 * maybe display a message msg in status bar.
 * 
 * @param success_msg
 *            (optional) Message to display.
 * @param success_fct
 *            Function to execute.
 * @param status
 *            Status bar object.
 */
function cstbox_ajax_success(success_msg, success_fct, status) {
	return function(reply) {
		success_fct(reply);
		if (typeof(success_msg) != 'undefined')
			status.text(_(success_msg)).removeClass("ui-state-error")
					.show();
	};
}

/**
 * Compute full URL and remove parameters.
 * 
 * @param url
 *            Postfix of a URL.
 * @returns Full URL without parameters.
 */
function cstbox_ajax_makeurl(url) {
	return document.location.href.split('?')[0] + '/' + url;
};	

/**
 * Execute an AJAX query.
 * 
 * @param self
 *            Object from which the request is launched.
 * @param ajax_params(object)
 *            Parameterized arguments to AJAX.
 * @param ajax_url
 *            URL of AJAX.
 * @param success_msg
 *            Message to display in success.
 * @param success_fct
 *            Function to execute when success.
 * @param status_id
 *            ID of the status bar.
 */
function cstbox_ajax_do(self, ajax_params, ajax_url, success_msg,
		success_fct, status_id) {
	var status = $("#" + status_id);
	$.ajax({
		url : cstbox_ajax_makeurl(ajax_url),
		data : ajax_params(self),
		timeout : cstbox_ajax_timeout,
		success : cstbox_ajax_success(success_msg, success_fct, status),
		error : cstbox_ajax_error(status)
	});
};

function cstbox_ajax_clickConfirm(ajax_params, ajax_url, success_msg,
		success_fct, message, status_id, dialog_id) {
	return function() {
		$("#" + dialog_id + " p#msg").text(message);
		var b = [
					{
						text : _("Yes"),
						click : function() {
							$(this)
									.dialog(
											"close");
							cstbox_ajax_do(
									$(this),
									ajax_params,
									ajax_url,
									success_msg,
									success_fct,
									status_id);
						}
					},
					{
						text : _("No"),
						click : function() {
							$(this)
									.dialog(
											"close");
						}
					} ];
		$("#" + dialog_id)
				.dialog(
						{
							autoOpen : true,
							resizable : false,
							width : 400,
							modal : true,
							dialogClass : "ui-dialog-bkgnd",
											buttons : b
										});
	};
}

(function($) {

	/**
	 * .clickConfirmAjax(ajax_params, ajax_url, success_msg, title, status_id,
	 * dialog_id)
	 * 
	 * Confirm operation before an AJAX query.
	 * 
	 * @param ajax_params(object)
	 *            Parameterized arguments of AJAX query (ex: {id:'ok'}).
	 * @param ajax_url
	 *            Postfix URL of AJAX query (ex: fm/clear).
	 * @param success_msg
	 *            Message to display when success.
	 * @param success_fct(data)
	 *            Function to call when success.
	 * @param message
	 *            Main message displayed by the dialog box.
	 * @param status_id
	 *            ID of the DIV for status display (see render_status() in
	 *            Python).
	 * @param dialog_id
	 *            ID of the DIV for dialog display (see render_dialog() in
	 *            Python).
	 * @returns jQuery object, so that method calls can be chained.
	 * @see .status()
	 */
	$.fn.clickConfirmAjax = function(ajax_params, ajax_url, success_msg,
			success_fct, message, status_id, dialog_id) {
		return $(this)
				.click(
						cstbox_ajax_clickConfirm(ajax_params, ajax_url, success_msg,
								success_fct, message, status_id, dialog_id) );
	};

	/**
	 * .clickAjax(ajax_params, ajax_url, success_msg, title, status_id,
	 * dialog_id)
	 * 
	 * Do an AJAX query.
	 * 
	 * @param ajax_params(object)
	 *            Parameterized arguments of AJAX query (ex: function(a) {
	 *            return {id:'ok'}; }).
	 * @param ajax_url
	 *            Postfix URL of AJAX query (ex: fm/clear).
	 * @param success_msg
	 *            [optional] Message to display when success (maybe
	 *            `undefined`).
	 * @param success_fct(data)
	 *            Function to call when success.
	 * @param status_id
	 *            ID of the DIV for status display (see render_status() in
	 *            Python).
	 * @returns jQuery object, so that method calls can be chained.
	 * @see .status()
	 */
	$.fn.clickAjax = function(ajax_params, ajax_url, success_msg, success_fct,
			status_id) {
		return $(this).click(
				function() {
					cstbox_ajax_do($(this), ajax_params, ajax_url, success_msg,
							success_fct, status_id);
				});
	};

	/**
	 * .changeAjax(ajax_params, ajax_url, success_msg, title, status_id,
	 * dialog_id)
	 * 
	 * Do an AJAX query.
	 * 
	 * @param ajax_params(object)
	 *            Parameterized arguments of AJAX query (ex: function(a) {
	 *            return {id:'ok'}; }).
	 * @param ajax_url
	 *            Postfix URL of AJAX query (ex: fm/clear).
	 * @param success_msg
	 *            [optional] Message to display when success (maybe
	 *            `undefined`).
	 * @param success_fct(data)
	 *            Function to call when success.
	 * @param status_id
	 *            ID of the DIV for status display (see render_status() in
	 *            Python).
	 * @returns jQuery object, so that method calls can be chained.
	 * @see .status()
	 */
	$.fn.changeAjax = function(ajax_params, ajax_url, success_msg, success_fct,
			status_id) {
		return $(this).change(
				function() {
					cstbox_ajax_do($(this), ajax_params, ajax_url, success_msg,
							success_fct, status_id);
				});
	};

	/**
	 * .validateAjax(ajax_params, ajax_url, success_msg, title, status_id)
	 * 
	 * Do an AJAX query.
	 * 
	 * @param ajax_params(object)
	 *            Parameterized arguments of AJAX query (ex: function(a) {
	 *            return {id:'ok'}; }).
	 * @param ajax_url
	 *            Postfix URL of AJAX query (ex: fm/clear).
	 * @param success_msg
	 *            [optional] Message to display when success (maybe
	 *            `undefined`).
	 * @param success_fct(data)
	 *            Function to call when success.
	 * @param status_id
	 *            ID of the DIV for status display (see render_status() in
	 *            Python).
	 * @returns jQuery object, so that method calls can be chained.
	 * @see .status()
	 */
	$.fn.validateAjax = function(ajax_params, ajax_url, success_msg,
			success_fct, status_id) {
		return $(this).validate(
				{
					submitHandler : function(form) {
						cstbox_ajax_do($(this), ajax_params, ajax_url, success_msg,
								success_fct, status_id);
					},
					onfocusout : false,
					onkeyup : false,
					onclick : false,
				});
	};

	/**
	 * Click on an object to update the content of a minipage. Request url is
	 * 'request-tool-content' with parameter 'id=' object ID.
	 * 
	 * .clickTool(content, status_id)
	 * 
	 * @param content
	 *            IDs of the DIV which content is to be updated.
	 * @param status_id
	 *            ID of the DIV for status display (see render_status() in
	 *            Python).
	 * @returns jQuery object, so that method calls can be chained.
	 */
	$.fn.clickTool = function(content, status_id) {
		return $(this).clickAjax(function(object) {
			return {
				id : object.attr('id')
			}
		}, 'request-tool-content', undefined, function(reply) {
			$("#" + content).html(reply);
		}, status_id);
	};

})(jQuery);
