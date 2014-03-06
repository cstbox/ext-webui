#!/usr/bin/env python
# -*- coding: utf-8 -*-

# This file is part of CSTBox.
#
# CSTBox is free software: you can redistribute it and/or modify
# it under the terms of the GNU Lesser General Public License as published
# by the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# CSTBox is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Lesser General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public
# License along with CSTBox.  If not, see <http://www.gnu.org/licenses/>.

from tornado.web import UIModule
from operator import add


class DynamicContent(object):
    """DynamicContext() -> new empty content
    DynamicContext(ml) -> new content initialized with html=ml where
        ml has signature (dict)->s with s a string. For example:
        DynamicContext(lambda p:'<h1>'+p['name']+'</h1>')
    DynamicContext(ml,js) -> new content initialized with html=ml
        and javascript=js where ml and js have signature (dict)->s with
        s a string.
    DynamicContext(ml,js,param) -> new content initialized with html,
        javascript, and a dict `param` containing information for children
        and pairs.
    """
    def __init__(self, ml=lambda p:'', js=lambda p:'', param={}):
        """x.__init__(...) initializes x; see help(type(x)) for signatures"""
        self.ml = ml
        self.js = js
        self.param = param

    def __decode(self, f, p):
        pp = {}
        pp.update(p)
        pp.update(self.param)
        print pp
        return f(pp)

    def __str__(self):
        """x.__str__(p) <==> str(x)s"""
        j = ''
        if self.js != '':
            j = '<script type="text/javascript">' + self.__decode(self.js, {}) + '</script>'
        return '%s%s' % (self.__decode(self.ml, {}), j)

    def __add__(self, rhs):
        """x.__add__(y) -> z <==> content of x and y are added as a content z.
        If y is basestring, does: z.ml=p->x.ml(p)+y /\ z.js=p->x.js(p)
        Otherwise,          does: z.ml=p->x.ml(p)+y.ml(p) /\ z.js=p->x.js(p)+y.ml(p)
         in all cases, z.param = x.param [+y.param (if y is not str)]"""
        if isinstance(rhs, basestring):
            return DynamicContent(lambda p:self.ml(p) + rhs, self.js, self.param)
        else:
            pp = {}
            pp.update(rhs.param)
            pp.update(self.param)
            return DynamicContent(lambda p:self.ml(p) + rhs.ml(p),
                                  lambda p:self.js(p) + rhs.js(p), pp)


def ajaxrdr_statusbar(_id):
    """ajaxrdr_statusbar(_id) -> DynamicContent <==> generates HTML DIV codes for jQuery status bar."""
    return DynamicContent(
            lambda p:'<div id="' + _id + '" class="ui-corner-all ui-helper-hidden"></div>',
            lambda p:'$("#' + _id + '").status();')


def ajaxrdr_confirmdialog(_id):
    """ajaxrdr_confirmdialog(_id) -> DynamicContent <==> generates HTML DIV codes for jQuery dialog box."""
    return DynamicContent(
            lambda p:
                '<div id="' + _id + '" title="Confirmation"'
                    'style="display: none">'
                    '<p id="msg" style="margin-top: 2em">'
                        '<span class="icon-question"'
                            'style="float: left; margin: 0 7px 20px 0;"/>'
                    '</p>'
                '</div>')


def toolrdr_toollist(context):
    """toolrdr_toollist(context) -> DynamicContent <==> generates HTML list of tools."""
    tools = context.tools
    c = reduce(add, ['<dt>' + tools[k](context)['label'] + '</dt><dd>' + tools[k](context)['description'] + '</dd>'
                     for k in tools.keys() if k!='about' ])
    return DynamicContent(lambda p:'<dl>' + c + '</dl>')


def toolrdr_mainpage(context):
    """toolrdr_mainpage(context) -> unicode <==> generates HTML and javascript codes."""
    tool = context.tool(context)
    dc = tool['content']
    return unicode(DynamicContent(
        lambda p:
            '<header>' + tool['description'] + '</header>'
            '<div class="tool-page-content">' + dc.ml(p) + '</div>'
        , dc.js, {'status_id':'status-bar'})
                   + ajaxrdr_statusbar('status-bar'))

# UI modules are usable inside HTML templates.
# -------------------------------------------


class ToolMainPage(UIModule):
    def render(self, context):
        """render(context) -> unicode <==> generates HTML and javascript codes.
        see toolrdr_mainpage().
        """
        return toolrdr_mainpage(context)


class Tool(UIModule):
    def embedded_javascript(self):
        return ('$(document).ready(function() {'
                     '$("ul#tools-menu li").clickTool("page-main","status-bar");'
                '});')

    def render(self, url_base, key, context):
        """render(url_base,key,tool) -> str <==> generates HTML and javascript codes."""
        tool = context.tools[key](context)
        if 'icon' in tool:
            return ('<li id="' + key + '" class="weblet-icon glowing-btn">'
                        '<p><a href="javascript:void(0);">'
                            '<img src="' + url_base + '/res/images/' + tool['icon'] + '"/>'
                            '</a></p>'
                        '<p id="label">' + tool['label'] + '</p>'
                    '</li>')
        else:
            return ''


class StatusBar(UIModule):
    def render(self, _id):
        return ajaxrdr_statusbar(_id)

ui_modules = {
    'Tool' : Tool,
    'ToolMainPage' : ToolMainPage,
    'StatusBar' : StatusBar
}
