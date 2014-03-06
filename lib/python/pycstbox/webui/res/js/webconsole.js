/**
 * CSTBox Web Console javascript library
 */

/*
 * Create a dummy console object to avoid trouble when some console.xxx() calls
 * have been left around
 */
if (!window.console) {
    window.console = new function() {
        this.log = function(str) {
        };
        this.info = function(str) {
        };
        this.error = function(str) {
        };
        this.warning = function(str) {
        };
        this.debug = function(str) {
        };
        this.trace = function(str) {
        };
        this.dir = function(str) {
        };
    };
}

/**
 * Convert a numerical value into its hexadecimal representation
 * <p>
 * The returned string will be left padded with a "0" so that its length will always be even.
 * 
 * @param v
 *    the numerical value (positive or null integer only)
 * @return the equivalent hex representation, or null if illegal argument passed 
 */
function toHex(v) {
    if (v == null || (typeof(v) != "number" && v != parseInt(v)) || v < 0)
        return null;
            
    var sHex = eval(v).toString(16);         
    if (sHex.length % 2)
        sHex = '0' + sHex;
    return sHex;
}

/**
 * Modal waiting message
 */

function modal_wait_show(msg) {
    $("#modal-wait-message").text(msg);
    $("#modal-wait").show();
}

function modal_wait_hide() {
    $("#modal-wait").hide();
}


/**
 * Toaster
 */

var toaster, toaster_msg = null;

function toaster_show(msg) {
    if (!toaster) {
        toaster = $("#toaster");
        toaster_msg = $("#toaster div");
    }
    toaster_msg.html($.isArray(msg) ? msg.join('<br>') : msg);
    toaster.fadeIn();
}

function toaster_hide() {
    if (!toaster) {
        toaster = $("#toaster");
        toaster_msg = $("#toaster div");
    }
    toaster.fadeOut();
}

