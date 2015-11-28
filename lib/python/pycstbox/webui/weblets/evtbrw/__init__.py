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

from pycstbox import webui
from pycstbox import log
from pycstbox import evtdb
from pycstbox.events import DataKeys
from pycstbox.evtmgr import SENSOR_EVENT_CHANNEL

if __debug__:
    import inspect

__author__ = 'Eric PASCUAL - CSTB (eric.pascual@cstb.fr)'

_logger = None


def _init_(logger=None, settings=None):
    """ Module init function, called by the application framework during the
    weblets discovery process."""
    global _logger
    _logger = logger if logger else log.getLogger('wblt-evtbrw')

    _logger.info('init complete')


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
    def do_get(self):
        month = int(self.get_argument("m"))
        year = int(self.get_argument("y"))

        days = []
        svc_obj = evtdb.get_object(SENSOR_EVENT_CHANNEL)
        for day in svc_obj.get_available_days(year, month):
            days.append(day.replace('-', '/'))

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
        svc_obj = evtdb.get_object(SENSOR_EVENT_CHANNEL)
        for event in svc_obj.get_events_for_day(day):
            ts, var_type, var_name, value, data = event
            value = value or ''
            units = data[DataKeys.UNIT] if data and data.has_key(DataKeys.UNIT) else ''
            _events.append((ts[:-3],        # limit precision to milliseconds
                            var_type, var_name, value, units))

        self.finish({'events' : _events})

dflt_initparms = {'logger':_logger}

handlers = [
    (r"/days", GetAvailableDaysHandler, dflt_initparms),
    (r"/events", GetEventsHandler, dflt_initparms),
    (r"[/]?", DisplayHandler),
]


