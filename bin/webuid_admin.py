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

""" A web application server for the administration.

    Provides access to the various functions using the desktop metaphor, as
    popularized by Android environment.

    Individual functions are implemented as weblets, deployed in the
    approprate home directory, directory which name is given by WEBLETS_HOME.
"""

__author__ = 'Eric PASCUAL - CSTB (eric.pascual@cstb.fr)'

import logging
import os.path
import sys

import pycstbox.webui as webui
import pycstbox.cli as cli
import pycstbox.log as log

_here = os.path.dirname(__file__)


class AdminHomeHandler(webui.UIRequestHandler):
    """ Request handler for the home page """

    _weblets = None
    _logger = logging.getLogger('AdminHomeHandler')

    def initialize(self, weblets): #pylint: disable=W0221
        self._logger.info('initialize')
        webui.UIRequestHandler.initialize(self)
        # we need to keep an access to the list of weblets to be able to
        # display them on our "desktop"
        self._weblets = weblets

    @property
    def weblets(self):
        return self._weblets

    def get(self):
        self.render("admin-home.html", weblets=self.weblets)

if __name__ == '__main__':
    parser = cli.get_argument_parser('CSTBox Configuration Broker service')
    args = parser.parse_args()

    server = webui.AppServer("admin", debug=args.debug)
    webui.set_logLevel(log.loglevel_from_args(args))

    # Configure the weblets home dir for this app. Default setting points to
    # ./weblets sub-directory in which we have chosen to store ALL weblets, which
    # are pointed to by symlinks defined in applications specific weblet homes.
    #server.weblets_home = os.path.join(_here, 'weblets_admin')

    settings = {
        "product" : "CSTBox",
        "main_title" : "Administration Console",
        "version" : "1.0.0"
    }

    try:
        server.toplevel_handlers.extend([
                (r"/admin[/]?", AdminHomeHandler, {"weblets" : server.weblets}),
            ])

        server.start(settings)

    except Exception as e: #pylint: disable=W0703
        #pylint: disable=W0212
        server._logger.exception(e)
        server._logger.critical('aborting server start')
        sys.exit(2)
