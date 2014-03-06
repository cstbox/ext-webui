/*
 * jQuery plugin for turning an HTML element into a status notification
 * area.
 *
 * The object is augmented with several methods for displaying different
 * levels of notification, and styling them accordingly.
 *
 * Status area can be dynamically displayed or hidden, using a light fade 
 * in/out effect.
 *
 * Auhor : Eric PASCUAL - CSTB (eric.pascual@cstb.fr)
 * Date : 2012-02
 */
(function($) {

	var methods = {
		init : function(options) {
			return this.each(function(){
				$(this).addClass("status-display");
			});
		},
		show : function() {
			return this.fadeIn();
		},
		hide : function() {
			return this.fadeOut();
		},
		info : function(content) {
			return this.html(content).removeClass("ui-state-error").fadeIn();
		},
		error : function(content) {
			return this.html(content).addClass("ui-state-error").fadeIn();
		}
	};
	
	  $.fn.status = function(method) {
		    
		    // Method calling logic
		    if (methods[method]) {
		      return methods[method].apply( this, Array.prototype.slice.call(arguments, 1));
		    } else if (typeof method === 'object' || ! method ) {
		      return methods.init.apply(this, arguments);
		    } else {
		      $.error('Method ' +  method + ' does not exist on jQuery.status');
		    }
	  };

})(jQuery);
