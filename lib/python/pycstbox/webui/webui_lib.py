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

""" Shared material for the browser based user interface."""

__author__ = 'Eric PASCUAL - CSTB (eric.pascual@cstb.fr)'
__copyright__ = 'Copyright (c) 2012 CSTB'
__vcs_id__ = '$Id$'
__version__ = '1.0.0'

import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.autoreload

from tornadobabel.mixin import TornadoBabelMixin

import sys
import os
import gettext
import json

import pycstbox.log as log
import pycstbox.flags as flags

#pylint: disable=W0703

_here = os.path.dirname(__file__)

js_i18n = {}
messages_i18n = {}

# logger for module level methods
_logger = log.getLogger('webui_lib')


def set_logLevel(level):
    _logger.setLevel(level)


def _get_i18n_catalog(wbl_name, wbl_home, lang, filename, cache, convert):
    """"get_i18n_catalog(wbl_name, wbl_home, lang, fn, c, convert) -> dict
            loads fn.po and uses c as cache with convert()->"""
    if lang.startswith('en'):
        return '{}'
    key = wbl_name + '|' + lang
    if key not in cache:
        try:
            t = gettext.translation(
                filename,
                localedir=os.path.join(wbl_home, 'locale'),
                languages=[lang]
            )
            cat = t._catalog #pylint: disable=E1103,W0212
            if '' in cat :
                del cat['']
            #cache[key] = json.dumps(cat)
            cache[key] = convert(cat)
            _logger.info("[%s] Messages i18n strings loaded for %s", wbl_name, lang)

        except IOError:
            _logger.warning("[%s] JS i18n strings not found for %s", wbl_name, lang)
            cache[key] = convert({})
        except Exception as e:
            _logger.error("[%s] %s", wbl_name, str(e))
            cache[key] = convert({})
    return cache[key]


def get_js_i18n_catalog(wbl_name, wbl_home, lang):
    """ Returns the translation catalog for Javascript embedded strings and for a given
    language.

    The translation catalogs are loaded on demand, and cached for improving subsequent
    access. An empty dictionary is returned if no translation catalog is found.

    For optimization's sake, we don't try to find a translation if the requested
    language is English, since all strings are already in English.

    Parameters:
        wbl_name:
            name of the weblet the translation catalog is related to
        wbl_home:
            home dir of the weblet resources
        lang:
            language code

    Returns:
        the translation catalog as a JSON representation of the dictionary
    """
    #pylint: disable=W0108
    return _get_i18n_catalog(
        wbl_name,
        wbl_home,
        lang,
        'js_strings',
        js_i18n,
        lambda cat: json.dumps(cat)
    )


def get_messages_i18n_catalog(wbl_name, wbl_home, lang):
    """"get_html_i18n_catalog(wbl_name, wbl_home, lang) -> dict loads messages.po"""
    return _get_i18n_catalog(wbl_name, wbl_home, lang, 'messages', messages_i18n, lambda cat: cat)


class UIRequestHandler(TornadoBabelMixin, tornado.web.RequestHandler):
    """ Base class for UI request handlers.

    Adds convenience methods
    """
    _home = '.'
    _logger = log.getLogger('UIRequestHandler')
    _i18nStrs_ = {}
    _lang = 'en'

    def initialize(self):
        tornado.web.RequestHandler.initialize(self)
        if self.application.settings['debug']:
            self._logger.setLevel(log.DEBUG)

    def render(self, tmpl_name, **kwargs):
        self._logger.debug('rendering template')
        tmpl_path = os.path.join(self._home, tmpl_name)
        tornado.web.RequestHandler.render(
            self,
            tmpl_path,
            settings=self.settings,
            _i18nStrs_=self._i18nStrs_,
            _lang_=self._lang,
            **kwargs
        )


class WebletUIRequestHandler(UIRequestHandler):
    #pylint: disable=W0201
    """ Specialized UI request handler for weblets """

    def initialize(self):
        super(WebletUIRequestHandler, self).initialize()
        # the weblet home dir is the one where the handler's module resides
        self._home = os.path.dirname(sys.modules[self.__module__].__file__)
        weblet_name = os.path.basename(self._home)
        self._url_base = '/' + self.settings['app_name'] + '/' + weblet_name
        self._lang = self.get_browser_locale().language
        self._i18nStrs_ = get_js_i18n_catalog(weblet_name, self._home, self._lang)
        self.messages_i18nStrs = get_messages_i18n_catalog(weblet_name, self._home, self._lang)

    def render(self, tmpl_name, **kwargs):
        super(WebletUIRequestHandler, self).render(
            tmpl_name, url_base=self._url_base,
            **kwargs
        )


class WSHandler(tornado.web.RequestHandler):
    """ Web service base request handler """

    _logger = None

    def initialize(self, logger=None): #pylint: disable=W0221
        self._logger = logger

    def get(self, *args, **kwargs):
        if self._logger and self.application.settings['debug']:
            self._logger.setLevel(log.DEBUG)

        try:
            self.do_get(*args, **kwargs)
        except Exception as e:
            self.exception_reply(e)

    def do_get(self, *args, **kwargs):
        self.reply_not_implemented()

    def post(self, *args, **kwargs):
        if self._logger and self.application.settings['debug']:
            self._logger.setLevel(log.DEBUG)

        try:
            self.do_post(*args, **kwargs)
        except Exception as e:
            self.exception_reply(e)

    def do_post(self, *args, **kwargs):
        self.reply_not_implemented()

    def exception_reply(self, e):
        type_, value, _tb = sys.exc_info()
        if self._logger :
            self._logger.exception("unexpected error '%s' with message '%s'" % (type_.__name__, value))
            self._logger.error('--- end of traceback ---')

        self.set_status(500)
        data = {
                'errtype': type_.__name__,
                'message': str(value),
                'additInfos': str(e.reason) if hasattr(e, 'reason') else ''
                }
        self.finish(data)

    def error_reply(self, message, addit_infos=None):
        self.set_status(500)
        data = {
            'message' : message,
            'additInfos' : addit_infos or ''
        }
        self.finish(data)

    def reply_not_implemented(self):
        self.set_status(501)
        data = {
                'message':'not yet implemented'
                }
        self.finish(data)


class GetUINotification(WSHandler):
    """ Retrieve any notification to be displayed and returns the messages."""
    _FLAG_NAME = 'notification'
    # disable logging of the request to avoid overloading system logs
    disable_request_logging = True

    def do_get(self):
        try:
            message = flags.read_flag(self._FLAG_NAME) if self._FLAG_NAME in flags.get_flags() else ''
        except Exception as e:
            if self._logger:
                self._logger.exception(e)
            self.finish({ 'message' : '' })
        else:
            self.finish({ 'message' : message })


def _checked_dir(path):
    """ Internal helper for checking if the given path exists and is a
    directory.

    If not, raises a ValueError exception. If yes, return the corresponding
    absolute path.
    """
    if not os.path.isabs(path):
        path = os.path.abspath(os.path.join(_here, path))

    if not os.path.exists(path):
        raise ValueError("path not found : %s" % path)
    if not os.path.isdir(path):
        raise ValueError("path is not a directory : %s" % path)
    return path

