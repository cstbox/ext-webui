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

""" System wide configuration and tools weblet """

__author__ = 'Eric PASCUAL - CSTB (eric.pascual@cstb.fr)'
__copyright__ = 'Copyright (c) 2013 CSTB'
__vcs_id__ = '$Id$'
__version__ = '1.0.0'

# allows catching Exception instances
#pylint: disable=W0703

import os
import zipfile
from cgi import escape as html_escape
from collections import namedtuple

import tornado.web

import pycstbox.log as log
import pycstbox.webui as webui
import pycstbox.config as config
import pycstbox.sysutils as sysutils

from tornadobabel.mixin import TornadoBabelMixin

_logger = None
_tools_list = None

class ToolDescriptor(object):
    def __init__(self, icon, label, descr):
        self.icon = icon
        self._label = label
        self._descr = descr
        self._i18n_ = None

    def set_translator(self, translator):
        self._i18n_ = translator

    def _translate(self, s):
        if self._i18n_:
            return unicode(self._i18n_(s))
        else:
            return unicode(s)

    @property
    def label(self):
        return self._translate(self._label)

    @property
    def descr(self):
        return self._translate(self._descr)

LogInfos = namedtuple('LogInfos', 'name size')

def _get_log_list():
    log_names = sorted(
        [l for l in  os.listdir(config.GlobalSettings.LOGFILES_DIR)
            if l.endswith(config.GlobalSettings.LOGFILES_EXT)]
    )
    logs = []
    for name in log_names:
        log_size = os.stat(
            os.path.join(config.GlobalSettings.LOGFILES_DIR, name)
        ).st_size / 1024
        logs.append(LogInfos(name, log_size))

    return logs

ServiceInfos = namedtuple('ServiceInfos', 'name infos')

def _get_svc_list():
    return sysutils.get_services_manager().get_service_info()

class DisplayHandler(webui.WebletUIRequestHandler):
    """ UI display request handler """
    def get(self):
        self.render(
            "systools.html",
            log_list=_get_log_list(),
            svc_list=_get_svc_list()
        )
        if self.application.settings['debug']:
            _logger.setLevel(log.DEBUG)

class GetGlobalParms(webui.WSHandler):
    def do_get(self):
        gs = config.GlobalSettings()
        reply = {
            'system_id' : gs.get('system_id')
        }
        self.finish(reply)

class SetGlobalParms(webui.WSHandler):
    def do_get(self):
        gs = config.GlobalSettings()
        try:
            gs.set('system_id', self.get_argument('system_id'))
            gs.write()
        except Exception as e:
            self.exception_reply(e)
        else:
            reply = {'status' : True}
            self.finish(reply)

class GetLogsList(webui.WSHandler):
    def do_get(self):
        reply = {'logs' : _get_log_list()}
        self.finish(reply)

class GetLog(webui.WSHandler):
    def do_get(self):
        log_name = self.get_argument('log_name')
        with open(os.path.join(config.GlobalSettings.LOGFILES_DIR, log_name), 'rt') as fp:
            lines = []
            for line in (html_escape(l) for l in fp.readlines()):
                if ' [W] ' in line:
                    css_class = 'log-warn'
                elif ' [E] ' in line:
                    css_class = 'log-error'
                elif ' [C] ' in line:
                    css_class = 'log-critical'
                elif ' [I] ' in line:
                    css_class = 'log-info'
                else:
                    css_class = 'log-addit'
                lines.append("<span class='%s'>%s</span>" % (css_class, line))
            reply = {'lines' : '<br>'.join(lines)}
        self.finish(reply)

class ExportLogs(webui.WSHandler):
    TMPZIP = '/tmp/cstbox-logs.zip'

    def do_get(self):
        with zipfile.ZipFile(self.TMPZIP, 'w') as logzip:
            for logname in sorted([
                l for l in os.listdir(config.GlobalSettings.LOGFILES_DIR)
                if l.startswith('cstbox-')
            ]):
                logzip.write(
                    os.path.join(config.GlobalSettings.LOGFILES_DIR, logname),
                    arcname = logname
                )

        gs = config.GlobalSettings()
        fname = "%s-cstbox-logs.zip" % gs.get('system_id')

        self.set_header('Content-Type', 'application/zip')
        self.set_header('Content-Disposition', 'attachment; filename="%s"' % fname)
        with open(self.TMPZIP, 'rb') as logzip:
            done = False
            while not done:
                data = logzip.read(4096)
                done = len(data) < 4096
                if len(data) > 0:
                    self.write(data)
        self.finish()

class GetServicesList(webui.WSHandler):
    def do_get(self):
        reply = {'svc_list' : _get_svc_list()}
        self.finish(reply)

class StartStopService(webui.WSHandler):
    _action = None

    def initialize(self, action, logger=None): #pylint: disable=W0221
        super(StartStopService, self).initialize(logger = logger)
        self._action = action

    def do_get(self):
        svc_name = self.get_argument('svc')
        self._logger.info('%s %s' % (self._action, svc_name))
        svcmgr = sysutils.get_services_manager()
        try:
            getattr(svcmgr, self._action)(svc_name)
        except sysutils.ServicesManagerError as e:
            self.exception_reply(e)
        except AttributeError:
            self.error_reply('invalid action : %s' % self._action)

class Restart(webui.WSHandler):
    def do_get(self):
        level = self.get_argument('level')
        self._logger.info('%s restart requested', level)

        try:
            if level == 'applayer':
                sysutils.ServicesManager.application_layer_restart()
            elif level == 'cstbox':
                sysutils.ServicesManager.cstbox_restart()
            elif level == 'system':
                sysutils.ServicesManager.system_reboot()
            else:
                self.error_reply('invalid restart level : %s' % level)
                return

        except sysutils.ServicesManagerError as e:
            self.exception_reply(e)

        else:
            self.finish({'status' : 'ok'})

_logger = log.getLogger('wblt-systools')
handlers = [
    (r"/gparms/get", GetGlobalParms, dict(logger=_logger)),
    (r"/gparms/set", SetGlobalParms, dict(logger=_logger)),
    (r"/log/ls", GetLogsList, dict(logger=_logger)),
    (r"/log/get", GetLog, dict(logger=_logger)),
    (r"/log/export", ExportLogs, dict(logger=_logger)),
    (r"/svc/ls", GetServicesList, dict(logger=_logger)),
    (r"/svc/start", StartStopService, dict(logger=_logger, action='start')),
    (r"/svc/stop", StartStopService, dict(logger=_logger, action='stop')),
    (r"/svc/restart", Restart, dict(logger=_logger)),

    (r"[/]?", DisplayHandler)
]


