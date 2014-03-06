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

""" Events browser weblet """

__author__ = 'Eric PASCUAL - CSTB (eric.pascual@cstb.fr)'
__copyright__ = 'Copyright (c) 2012 CSTB'
__vcs_id__ = '$Id$'
__version__ = '1.0.0'

import tornado.web
import importlib
from collections import namedtuple
if __debug__:
    import inspect

import pycstbox.webui as webui
from pycstbox.events import VALUE, UNITS
import pycstbox.evtmgr as evtmgr
import pycstbox.evtdao
import pycstbox.log as log

_logger = None

DAO_NAME = 'fsys'
dao = None

def _init_(logger=None, settings=None):
    """ Module init function, called by the application framework during the
    weblets discovery process."""
    global _logger, dao  #pylint: disable=W0603

    _logger = logger if logger else log.getLogger('wblt-evtbrw')

    dao = pycstbox.evtdao.get_dao(DAO_NAME)
    assert dao, "unable to instantiate a DAO for name=%s" % DAO_NAME

class DisplayHandler(webui.WebletUIRequestHandler):
    """ UI display request handler """
    def get(self):
        self.render("evtbrw.html")

class GetAvailableDaysHandler(webui.WSHandler):
    """ AJAX request handler for retrieving the list of days
    for which data are available

    HTTP request arguments:
        m : the month number (1 <= m <= 12)
        y : the year (full number with centuries)
    """
    _dao = None

    def do_get(self):
        month = int(self.get_argument("m"))
        year = int(self.get_argument("y"))

        days = []
        for day in dao.get_available_days((year, month)):
            days.append(day.strftime('%Y/%m/%d'))

        self.finish({'days' : days})

class GetEventsHandler(webui.WSHandler):
    """ AJAX request handler for retrieving the list of events
    available for a given day

    HTTP request arguments:
        d : the day
            (format : SQL date by default, but '/' separator
            are accepted too)

    """
    def get(self):
        day = self.get_argument("d").replace('/', '-')

        _events = []
        for event in dao.get_events_for_day(day):
            ts, var_type, var_name, data = event
            value = data[VALUE] if data and data.has_key(VALUE) else ''
            units = data[UNITS] if data and data.has_key(UNITS) else ''
            _events.append((ts.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3],
                            var_type, var_name, value, units))

        self.finish({'events' : _events})

dflt_initparms = {'logger':_logger}

handlers = [
    (r"/days", GetAvailableDaysHandler, dflt_initparms),
    (r"/events", GetEventsHandler, dflt_initparms),
    (r"[/]?", DisplayHandler),
]


