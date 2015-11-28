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

import os
import importlib
import ConfigParser
import signal

import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.autoreload
import tornadobabel

from pycstbox import log, config
from pycstbox.webui.webui_lib import _checked_dir, GetUINotification
from pycstbox.webui.webui_modules import ui_modules


_here = os.path.dirname(__file__)

MANIFEST_FILE_NAME = 'MANIFEST'
MANIFEST_MAIN_SECTION = 'weblet'


class AppServer(object):
    """ Base class for UI Web applications.

    We use Tornado as framework, and thus the webapp is implemented by a
    collection of request handlers associated to URLs using regexps. A typical
    application will provide all the required handlers and instantiate this
    class, passing it the mapping table.

    The user interface managed by this class is based on the paradigm of a
    desktop, on which all available functions are displayed, using the same
    kind of representation (ie a grid of icons) as well known setting panels or
    as the Android desktop. Each of this individual function is named "weblet".

    One important feature of this class is the ability to automatically
    discover and manage weblets, as soon as they are stored in the appropriate
    form and in the appropriate directory.  The resulting handler mapping table
    will be created without any requirement from the developer to provide it
    by hand.

    Weblets are packaged as a directory providing a standard Python module,
    which is installed in the weblets home directory. For details about the
    content of such a module please refer to the documentation of
    _discover_weblets method.

    The request handlers rules list is built automatically at server starting
    time.  See _setup_handlers method documentation for details.

    Configuration attributes:
        weblets_home : str
            Path of an existing directory containing the weblet packages.
            Value setting checks the validity of the provided path and raises a
            ValueError exception if fails
            default: ./weblets

        templates_home : str
            Path of an existing directory containing the Tornado templates used
            by the application itself.
            Weblet templates (if used) are managed by the weblet code itself,
            and are not managed in any way in this class.
            Value setting checks the validity of the provided path and raises a
            ValueError exception if fails
            default: ./templates

        res_home : str
            Path of an existing directory containing the resources used by the
            application itself.  As for templates, resources of the weblets are
            not managed here and are left to the responsibility of the weblet
            developper.
            Value setting checks the validity of the provided path and raises a
            ValueError exception if fails
            default: ./res

        toplevel_handlers : list of tuples (url regexp, handler class)
            The list of handlers which must be matched first to the incoming
            request, before the weblet ones.  Generally, these handlers are
            those managing the application itself.  Be careful thus not to
            "hide" weblet handlers by using too generic url matching regexps.

        fallback_handlers : list of tuples (url regexp, handler class)
            The list of handlers which must be matched after all the others
            rules.

    Operating attributes:
        weblets : list
            the read-only list of weblets descriptors

    """

    _res_home = os.path.join(_here, "res")
    _templates_home = os.path.join(_here, "templates")
    _weblets_home = os.path.join(_here, "weblets")
    _locale_home = os.path.join(_here, "locale")

    _ioloop = None
    _weblets = None
    _handlers = []
    _application = None
    _http_server = None
    _logger = None

    def __init__(self, app_name, port=8080, debug=False):
        """ Constructor

        :Parameters:
            app_name : str
                the name of the application

            port : int
                the port the server will listen to (default: 8080)
        """
        self._app_name = app_name
        self._port = port
        self._debug = debug
        self._logger = log.getLogger('web_' + app_name)
        self.ui_modules = {}

        if self._debug:
            self._logger.setLevel(log.DEBUG)
            self._logger.warn(
                "AppServer instantiated with debug mode activated")

    def _get_weblets(self):
        # Since the list is immutable once the server is started, we cache the
        # result and compute it only if not yet done.
        if not self._weblets:
            self._weblets = self._discover_weblets()
            if not self._weblets:
                self._logger.warn("No weblet found")
        return self._weblets

    weblets = property(_get_weblets,
        doc=""" The read-only list of discovered weblets """
        )

    _weblet_cfg_defaults = {
        'mapping' : 'handlers'
    }

    def _discover_weblets(self, home=None): #pylint: disable=R0912
        """ Discover the weblets stored in the directory which path is provided.

        A weblet must provide the following mandatory items:
            - a __init__.py, which can contains the weblet request handler and
            auxiliary definitions.  Although it is valid to have several
            modules implementing the weblet, most of the time the __init__
            module can be the only one.  If not, it must expose the weblet
            request handler so that the webapp class will be able to
            instantiate it.
            - MANIFEST file, in the form of a config file with the following
            minimal content :
                [weblet]
                label=<display label>
                icon=<icon path>
                mapping=<module attribute containing the list of URL mapping rules>
              Weblet developers are free to use this file to store additional
              properties they would need.

        If the weblet module requires some global initialization, it can be placed
        in a global reserved function named _init_. Altough simple variables
        initialization statements can live as module level statements, all other
        processing should be placed in this _init_ method, especially if it
        involves runtime dependencies, such as the connection with other
        services. This way, there will be no problem when importing the weblet
        module in contexts other than standard runtime, for instance during
        unit tests or automatic documentation generation. The _init_ function
        cannot have parameters.

        Parameters:
            home : src
                the path of the weblets home directory

        Result:
            a list of weblets descriptors, each one being a tuple containing in
            sequence :
                - the weblet symbolic name
                - the label to be displayed under the icon and to be used as
                the title
                - the path of the icon to be displayed on the desktop
                - the base URL of the weblet
                - a list of (url pattern, handler) mapping tuples
        """
        if not home:
            home = self._weblets_home

        self._logger.debug("discovering weblets stored in %s" % home)
        weblets = []

        # We build the weblets list by scanning sub-directories of the home
        # one, keeping only the ones containing the mandatory files. They are
        # then sorted by weblet names, so that weblet icons will be displayed
        # in this sequence on the desktop
        for weblet_name in sorted(
            [d for d in os.listdir(home)
                if os.path.isdir(os.path.join(home, d))
                    and os.path.exists(os.path.join(home, d, MANIFEST_FILE_NAME))
                    and os.path.exists(os.path.join(home, d, '__init__.py'))
                    ]):
            weblet_path = os.path.join(home, weblet_name)
            mfpath = os.path.join(weblet_path, MANIFEST_FILE_NAME)
            mf = ConfigParser.SafeConfigParser(self._weblet_cfg_defaults)
            mf.read(mfpath)
            label = mf.get(MANIFEST_MAIN_SECTION, 'label')
            icon = mf.get(MANIFEST_MAIN_SECTION, 'icon')
            mapping_attr = mf.get(MANIFEST_MAIN_SECTION, 'mapping')

            modname = '.'.join(['pycstbox.webui.weblets', weblet_name])
            self._logger.info("loading weblet '%s' from module '%s'...",
                              weblet_name, modname)
            try:
                module = importlib.import_module(modname)
                # run the module initialization code if any
                if hasattr(module, '_init_'):
                    init_func = getattr(module, '_init_')
                    if callable(init_func):
                        self._logger.info('invoking module _init_ function')
                        wblt_logger = log.getLogger('wblt-' + weblet_name)
                        wblt_logger.setLevel(self._logger.getEffectiveLevel())

                        # load settings if any
                        settings = None
                        cfgpath = config.make_config_file_path(
                            os.path.join('weblets', weblet_name + '.cfg')
                        )
                        if os.path.exists(cfgpath):
                            wblt_logger.info('loading weblet settings from %s', cfgpath)
                            parser = ConfigParser.SafeConfigParser()
                            try:
                                parser.read(cfgpath)
                                settings = dict(parser.items('settings'))
                            except ConfigParser.Error as e:
                                wblt_logger.error(
                                    'invalid configuration file (%s)',
                                    e
                                )

                        init_func(logger=wblt_logger, settings=settings)
                        self._logger.info('module _init_ ok')

                url_base = '/' + self._app_name + '/' + weblet_name
                mapping = getattr(module, mapping_attr)
                # expand the URL in mappings if needed
                handlers = []
                for rule in mapping:
                    handlers.append(((url_base + rule[0],) + rule[1:]))
                weblets.append((weblet_name, label, icon, handlers))
                self._logger.info("--> success")

                if hasattr(module, 'ui_modules'):
                    self._logger.info("--> has attr ui_modules")
                    self.ui_modules.update(getattr(module, 'ui_modules'))

                # adds weblet resources (html, js, css,...) to the autoreload
                # watched files if debug is active
                if self._debug:
                    for _root, _dirs, files in os.walk(weblet_path):
                        for path in [os.path.join(_root, f) for f in files if f.endswith(('.html', '.mo'))]:
                            tornado.autoreload.watch(path)

            except (ImportError, AttributeError) as e:
                msg = '[%s] %s' % (e.__class__.__name__, str(e))
                self._logger.exception(msg)
                raise
            except Exception as e:
                self._logger.error("Cannot load weblet : %s", str(e))
                self._logger.exception(e)
        return weblets

    # built-in handlers
    toplevel_handlers = [
        ("/getnotification", GetUINotification, dict(logger=_logger))
    ]
    fallback_handlers = []

    def _setup_handlers(self, weblets):
        """ Build the effective request handlers list.

        The following logic is used :
            - initialize the list with the content of toplevel_handlers
            attribute
            - for each discovered weblet:
                - add the rules for the weblet, as defined by the 4th element
                of the weblet descriptor tuple
                - add the rule for the weblet static resources, using
                <weblet_dir>/res for the target path
            - add the rules defined in fallback_handlers attribute
            - add the rule for application static resources, using res_home
            attribute for the path

        """

        handlers = self.toplevel_handlers

        sfh = tornado.web.StaticFileHandler
        weblet_res_dir = self._weblets_home + '/%s/res/'

        for wblt_name, _, _, wblt_handlers in weblets:
            handlers.extend(wblt_handlers)

            url = '/%s/%s/res/(.*)' % (self._app_name, wblt_name)
            respath = weblet_res_dir % wblt_name
            handlers.append((url, sfh, {'path': respath}))
            self._logger.debug("mapped static file path './%s' to rule '%s'",
                os.path.relpath(respath), url
                )

        handlers.extend(self.fallback_handlers)
        handlers.append(
            (r"/res/(.*)", tornado.web.StaticFileHandler, {"path" : self._res_home})
            )

        if self._debug:
            self._logger.debug("Handler rules :")
            for rule in handlers:
                pattern, handler = rule[:2]
                self._logger.debug(" - %s : %s", pattern, handler)

        return handlers

    def _sigterm_handler(self, _signum, _frame):
        """ Handles the SIGTERM signal to gently stop the server """
        self._logger.info("SIGTERM received.")
        if self._ioloop:
            self._logger.info("stopping server loop.")
            self._ioloop.stop()

    def get_weblets_home(self):
        return self._weblets_home

    def set_weblets_home(self, path):
        if path == self._weblets_home:
            return
        self._logger.info("weblets_home overridden to %s" % path)
        self._weblets_home = _checked_dir(path)

    weblets_home = property(get_weblets_home, set_weblets_home,
                            doc="the home directory in which weblets are stored")

    def get_templates_home(self):
        return self._templates_home

    def set_templates_home(self, path):
        if path == self._templates_home:
            return
        self._logger.info("templates_home overridden to %s", path)
        self._templates_home = _checked_dir(path)

    templates_home = property(get_templates_home, set_templates_home,
                              doc="the home directory where HTML templates are stored")

    def get_res_home(self):
        return self._res_home

    def set_res_home(self, path):
        if path == self._res_home:
            return
        self._logger.info("res_home overridden to %s", path)
        self._res_home = _checked_dir(path)

    res_home = property(get_res_home, set_res_home,
                        doc="the home directory where resources are stored")

    def start(self, custom_settings):
        """ Starts the configured server """

        self._logger.info("web server initializing")

        # prepare the application settings dictionary
        # 1/ basic part
        uim = {}
        uim.update(ui_modules)
        uim.update(self.ui_modules)

        settings = {
            'debug': self._debug,
            'template_path': self.templates_home,
            'app_name': self._app_name,
            'ui_modules': uim
        }

        # 2/  specific settings as defined in custom_settings
        if custom_settings:
            settings.update(custom_settings)

        # setup request handlers by merging the one provided by the weblets
        self._handlers = self._setup_handlers(self.weblets)

        # load application-level locales
        # The application name is used as the locale's "domain", allowing several applications
        # to be installed in the same directory
        if os.path.exists(self._locale_home):
            tornadobabel.locale.load_gettext_translations(self._locale_home, self._app_name)
            self._logger.info("application translations loaded")

        # merge weblets locales if any
        weblet_locale_dir = self._weblets_home + '/%s/locale/'
        for wblt_name in [t[0] for t in self.weblets]:
            localeroot = weblet_locale_dir % wblt_name
            if os.path.exists(localeroot):
                tornadobabel.locale.load_gettext_translations(localeroot, 'messages')
                self._logger.info(" weblet '%s' translations added", wblt_name)
            else:
                self._logger.warn("no translation provided for weblet '%s'", wblt_name)

        settings['log_function'] = self._log_request
        self._application = tornado.web.Application(self._handlers, **settings) #pylint: disable=W0142
        self._http_server = tornado.httpserver.HTTPServer(self._application)
        self._http_server.listen(self._port)
        self._logger.info("listening on port %d", self._port)

        signal.signal(signal.SIGTERM, self._sigterm_handler)

        self._ioloop = tornado.ioloop.IOLoop.instance()

        self._logger.info("web server started")
        try:
            self._ioloop.start()

        except KeyboardInterrupt:
            self._logger.info("SIGINT received.")
            self._ioloop.stop()

        self._logger.info("terminated")

    # custom request logging mechanism
    _muted_requests = []

    def _log_request(self, handler):
        """ Custom request logging function, allowing to mute periodic requests,
        such as notification checking for instance.

        This is needed to avoid having log files being filled by useless
        information.

        For a given request To be muted, its handler must define the attribute
        'disable_request_logging' and set it to True. When such a request is
        processed here, we log it only the first time and issue a warning to
        tell it.

        If disable_request_logging is not defined, the default logging strategy
        is applied.

        IMPORTANT:
            Only successfull requests are filtered by this mechanism, all other
            ones being logged
        """
        if handler.get_status() < 400:
            key = handler.request.uri
            if key in self._muted_requests:
                return
            try:
                dont_log = handler.disable_request_logging
            except AttributeError:
                dont_log = False
            if dont_log:
                self._muted_requests.append(key)
                self._logger.warning(
                    "request '%s' is muted => last time we log it",
                   key
                )
            log_method = self._logger.info

        elif handler.get_status() < 500:
            log_method = self._logger.warning

        else:
            log_method = self._logger.error

        request_time = 1000.0 * handler.request.request_time()
        log_method("%d %s %.2fms", handler.get_status(),
                   handler._request_summary(), request_time)    #pylint: disable=W0212
