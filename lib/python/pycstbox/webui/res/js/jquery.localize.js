/*
 * jQuery plugin for HTML pages localization.
 *
 * Works by making visible only the elements carrying a 'lang' attribute
 * which value matches the passed one.
 *
 * Auhor : Eric PASCUAL - CSTB (eric.pascual@cstb.fr)
 * Date : 2013-08
 */
(function ($) {
    $.fn.localize_html = function (lang) {
        return this.each(
            function() {
                if ($(this).attr('lang').indexOf(lang) == 0) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            }
        );
    };
    
})(jQuery)
