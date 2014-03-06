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

""" Device configuration editor weblet """

__author__ = 'Eric PASCUAL - CSTB (eric.pascual@cstb.fr)'
__copyright__ = 'Copyright (c) 2012 CSTB'
__vcs_id__ = '$Id$'
__version__ = '1.0.0'

# allows catching Exception instances
#pylint: disable=W0703

import zipfile
import subprocess

import tornado.web

import pycstbox.log as log
import pycstbox.webui as webui
import pycstbox.devcfg as devcfg
import pycstbox.cfgbroker as cfgbroker
import pycstbox.config as config
import pycstbox.flags as flags
from pycstbox.sysutils import str_2_bool

from tornadobabel.mixin import TornadoBabelMixin

_logger = None
broker = None
cfg = None
_settings = None
_local_debug = False


def _init_(logger=None, settings=None):
    """ Module init function, called by the application framework during the
    weblets discovery process."""
    global _logger, broker, cfg, _settings, _local_debug  #pylint: disable=W0603

    _logger = logger if logger else log.getLogger('wblt-devcfg')

    # get access to the configuration broker for notification sending
    _settings = settings
    _local_debug = settings and str_2_bool(settings.get('debug', 'false'))

    if settings and str_2_bool(settings.get('use_cfgbroker', 'true')):
        try:
            _logger.info('getting access to configuration broker')
            broker = cfgbroker.get_object()
        except Exception as e: #pylint: disable=W0702
            _logger.error('cfgbroker access failed : %s', str(e))
    else:
        _logger.warning('configuration broker usage disabled by settings')

    if not broker:
        _logger.warning('configuration broker not available. Notifications will not be sent')

    # creates a global singleton acting as a cache of the live configuration
    cfg = devcfg.DeviceNetworkConfiguration(autoload=True, logger=_logger)


class DisplayHandler(webui.WebletUIRequestHandler):
    """ UI display request handler """
    def get(self):
        self.render("devcfg.html")
        if _local_debug or self.application.settings['debug']:
            _logger.setLevel(log.DEBUG)

class DevCfgWSHandler(webui.WSHandler):
    """ Extended Web service base request handler """
    def commit_changes(self, chgtype=cfgbroker.CFGCHG_GLOBAL, resid=None):
        _logger.debug('commit changes')
        cfg.store()
        _logger.debug('--> done')

        _logger.debug('notify changes')
        if broker:
            try:
                broker.notify_configuration_change(chgtype, resid)
            except Exception as e:
                _logger.exception(e)
                self.exception_reply(e)
            else:
                _logger.debug('--> done')
        else:
            _logger.debug('configuration broker not available => could not send notification (%s,%s)', chgtype, resid)
            self.set_status(202)

        flags.create_flag(flags.USER_NOTIFICATION, 'Configuration changed. Restart needed.')


class GetCoordinatorTypes(DevCfgWSHandler):
    """ AJAX request handler for retrieving the list of available coordinator types. """
    def do_get(self):
        result = devcfg.Metadata.coordinator_types()
        self.finish(dict({'ctypes' : result}))


class GetNetworkTree(DevCfgWSHandler):
    """ AJAX request handler for retrieving network tree.

    Only the id and label of objects are included in the returned data.

    HTTP request arguments:
        none
    """
    def do_get(self):
        self.finish(cfg.as_tree(self.get_argument('sorted', default=False)))


class GetCoordinatorMetadata(DevCfgWSHandler):
    """ AJAX request handler for retrieving the meta-data of a coordinator

    HTTP request arguments:
        c_type :
            the coordinator type

    Result:
        a JSON object containing the coordinator's meta data as defined in
        its descriptor on disk, with the list of associated product types and names
    """
    def do_get(self):
        c_type = self.get_argument('type')
        cmeta = devcfg.Metadata.coordinator(c_type)
        products = {}
        for d_type in devcfg.Metadata.device_types(c_type):
            p_name = devcfg.Metadata.device(d_type)['productname']
            products[d_type] = p_name
        cmeta['products'] = products
        self.finish(cmeta)


class GetCoordinator(DevCfgWSHandler):
    """ AJAX request handler for retrieving a coordinator

    HTTP request arguments:
        uid : the coordinator id

    Response:
        - type :
            coordinator's type
        - products :
            list of products supported by the coordinator
        - coordinator's metadata as defined in the stored descriptor for the type
    """
    def do_get(self):
        c_id = self.get_argument('uid')
        c_type = cfg[c_id].type
        cmeta = {'type' : c_type}
        try:
            cmeta.update(devcfg.Metadata.coordinator(c_type))
            products = {}
            for d_type in devcfg.Metadata.device_types(c_type):
                p_name = devcfg.Metadata.device(d_type)['productname']
                products[d_type] = p_name
            cmeta['products'] = products
            self.finish(cmeta)
        except Exception as e:
            self.exception_reply(e)


class AddCoordinator(DevCfgWSHandler):
    """ AJAX request handler for adding a coordinator to the network

    HTTP request arguments:
        newCoordId:
            the coordinator id
        newCoordType :
            the type of the new coordinator
        newPortId :
            the port on which the coordinator is connected

    Response:
        coordid : the id of the added coordinator
    """
    def do_get(self):
        c_id = self.get_argument('newCoordId')
        c_type = self.get_argument('newCoordType')
        c_port = self.get_argument('newPortId')
        try:
            coord = devcfg.Coordinator(c_id, type=c_type, port=c_port)
            cfg.add_coordinator(coord)
            self.commit_changes(
                cfgbroker.CFGCHG_OBJ_COORDINATOR + cfgbroker.CFGCHG_OP_ADDED ,
                c_id
            )

            self.finish({'coordId' : c_id})

        except Exception as e:
            self.exception_reply(e)


class DeleteCoordinator(DevCfgWSHandler):
    """ AJAX request handler for deleting a coordinator from the network

    HTTP request arguments:
        coordId:
            the coordinator id
    """
    def do_get(self):
        c_id = self.get_argument('coordId')
        cfg.del_coordinator(c_id)

        self.commit_changes(
            cfgbroker.CFGCHG_OBJ_COORDINATOR + cfgbroker.CFGCHG_OP_DELETED,
            c_id
        )


class GetDevice(DevCfgWSHandler):
    """ AJAX request handler for retrieving a device configuration

    HTTP request arguments:
        uid :
            the device unique id (<coord_id>/<dev_id>)

    Response:
        the device attributes as a dictionary
    """
    def do_get(self):
        uid = self.get_argument('uid')
        dev = cfg.get_device_by_uid(uid)
        self.finish(dev.js_dict())


class GetDeviceMetadata(DevCfgWSHandler):
    """ AJAX request handler for retrieving metadata for a given device type.

    HTTP request arguments:
        type :
            the fully qualified device type (<coord_type>:<dev_type>)

    Response:
        the device metadata as a dictionary
    """
    def do_get(self):
        stype = self.get_argument('type')
        try:
            meta = devcfg.Metadata.device(stype)
            self.finish(meta)
        except Exception as e:
            self.exception_reply(e)


class AddDevice(DevCfgWSHandler):
    """ AJAX request handler for adding a device to a coordinator

    HTTP request arguments:
        newDevProduct :
            the device product type
        nedDevId :
            the device local id (within its parent)
        newDevAddr :
            the device address
        newDevLoc :
            the device location
        coordId :
            the if of the parent coordinator

    Response:
        uid : the new device UID
    """
    def do_get(self):
        p_type = self.get_argument('newDevProduct')
        dev_id = self.get_argument('newDevId')
        dev_addr = self.get_argument('newDevAddr')
        dev_location = self.get_argument('newDevLoc')
        c_id = self.get_argument('coordId')

        dev = devcfg.Device(dev_id, type=p_type, address=dev_addr, location=dev_location)
        try:
            uid = devcfg.DevCfgObject.make_uid(c_id, dev_id)
            cfg.add_device(c_id, dev)
            self.commit_changes(cfgbroker.CFGCHG_OBJ_DEVICE + cfgbroker.CFGCHG_OP_ADDED , uid)

            self.finish({'uid' : uid})

        except Exception as e:
            self.exception_reply(e)

_DEF_VALUES = {
    'bool': 'off',
    'boolean': 'off',
    'string': '',
    'varname': '',
    'choice': '',
    'int': '0',
    'float' : '0.0',
    'hexint': '0x0'
}

class UpdateDevice(DevCfgWSHandler):
    """ AJAX request handler for updating an existing device

    HTTP request arguments:
        uid :
            the device unique id
        ... :
            device properties, depending on the device type,
            and as defined in the device metadata
    """
    def do_get(self):
        uid = self.get_argument('uid')
        dev = cfg.get_device_by_uid(uid)

        # In order to fall into a generic arguments processing, we need to
        # add the default values for inputs omitted from the query parameters,
        # such as unchecked checkboxes, empty input fields,...

        # suffix of the names of the request parameters containing the list of
        # the device root and end-points properties (comma separated list of items built
        # on the <name>:<type> pattern). These parameters are conveyed as
        # hidden fields of the form.
        suffix = '-_props_'

        # process all property lists associated to data items (IOW all the
        # request arguments which name ends with the above defined suffix)
        for n in [n for n in self.request.arguments if n.endswith(suffix)]:
            # convert the stringified list as a true list
            props_list = self.get_argument(n).split(',') #pylint: disable=E1103
            # get the related form parameter group name (ex: root, out-XX,...)
            prefix = n[:-len(suffix)]
            # process all expected properties for the entity
            for propdef in props_list:
                propname, proptype = propdef.split(':')
                argname = prefix + '-' + propname
                # if the request does not contain this property, add its
                # default value to the request parameters
                if argname not in self.request.arguments:
                    self.request.arguments[argname] = [_DEF_VALUES[proptype]]

        # maps device end-point groups with the prefix used for the name of
        # their attributes in the request
        endpoints = {'out':dev.outputs if hasattr(dev, 'outputs') else None,
                     'ctl':dev.controls if hasattr(dev, 'controls') else None
                     }

        for argname in self.request.arguments:
            argvalue = self.get_argument(argname)

            # Argument names use the general syntax : <prefix>'-'<attrname>'-'<index>
            # <prefix> indicates if the attribute belongs to the device root or to
            # one if its end-points, and which one.
            # <index> is not used for root related attributes
            # In conclusion, the name of attribute arguments has at least two parts.
            nameparts = argname.split('-')
            if len(nameparts) == 1:
                # ignore data which are not device attributes
                continue

            prefix = nameparts[0]
            attrname = nameparts[-1]

            if attrname == '_props_':
                continue

            # transform boolean representations into boolean values
            if argvalue in ('on','off'):
                argvalue = argvalue == 'on'

            if prefix == 'root':
                setattr(dev, attrname, argvalue)

            elif prefix in ('out', 'ctl', 'in'):
                endpointid = nameparts[1]
                endpoint = endpoints[prefix][endpointid]
                endpoint[attrname] = argvalue

            else:
                print('invalid argument name : %s' % argname)
                self.set_status(400)
                data = {
                        'message':'invalid argument name : %s' % argname
                        }
                self.finish(data)

        _logger.debug('**** modified device = %s', dev.js_dict())

        self.commit_changes(cfgbroker.CFGCHG_OBJ_DEVICE + cfgbroker.CFGCHG_OP_UPDATED , uid)


class ChangeDeviceId(DevCfgWSHandler):
    """ AJAX request handler for changing the id of a device

    HTTP request arguments:
        uid :
            the device current unique id
        newid :
            the new id
    """
    def do_get(self):
        uid = self.get_argument('uid')
        newid = self.get_argument('newid')
        cfg.rename_device(uid, newid)

        c_id, _d_id = devcfg.DevCfgObject.split_uid(uid)
        self.commit_changes(cfgbroker.CFGCHG_OBJ_COORDINATOR + cfgbroker.CFGCHG_OP_UPDATED , c_id)


class DeleteDevice(DevCfgWSHandler):
    """ AJAX request handler for deleting an existing device

    HTTP request arguments:
        uid :
            the device unique id
    """
    def do_get(self):
        uid = self.get_argument('uid')
        cfg.del_device_by_uid(uid)

        c_id, _d_id = devcfg.DevCfgObject.split_uid(uid)
        self.commit_changes(cfgbroker.CFGCHG_OBJ_COORDINATOR + cfgbroker.CFGCHG_OP_UPDATED , c_id)


class ExportConfiguration(DevCfgWSHandler):
    """ AJAX request handler for exporting the configuration as a ZIP file.

    HTTP request arguments:
        none
    """
    TMPZIP = '/tmp/devices_cfg.zip'

    def do_get(self):
        with zipfile.ZipFile(self.TMPZIP, 'w') as zipped:
            zipped.writestr(
                'devices.cfg',
                cfg.as_json(formatted=True)
            )

        gs = config.GlobalSettings()
        fname = "%s-devices_cfg.zip" % gs.get('system_id')

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


class ClearConfiguration(DevCfgWSHandler):
    """ AJAX request handler for clearing the whole configuration.

    To be safe we make a copy of the current configuration before zapping it.
    Do this only if the current configuration is not empty to avoid loosing
    an important backup.

    HTTP request arguments:
        none
    """
    def do_get(self):
        # backup the current configuration if not empty
        if cfg:
            cfg_path = cfg.path
            backup_path = cfg_path + '.bak'
            err = subprocess.check_call(['cp', '-a', cfg_path, backup_path])
            if err:
                self._logger.error(
                    'failed to backup current configuration to %s (err=%d)',
                    backup_path, err
                )
            else:
                self._logger.info(
                    'current configuration saved to %s',
                    backup_path
                )

        cfg.clear()
        self.commit_changes(
            cfgbroker.CFGCHG_GLOBAL + cfgbroker.CFGCHG_OP_DELETED
        )
        self.finish()

class StartDiscovery(DevCfgWSHandler):
    def do_get(self):
        pass


class StopDiscovery(DevCfgWSHandler):
    pass


handlers = [
    ("/ctypes", GetCoordinatorTypes),
    ("/nwtree", GetNetworkTree),
    ("/cmeta", GetCoordinatorMetadata),

    ("/coord", GetCoordinator),
    ("/newcoord", AddCoordinator),
    ("/delcoord", DeleteCoordinator),

    ("/dev", GetDevice),
    ("/devmeta", GetDeviceMetadata),
    ("/adddev", AddDevice),
    ("/upddev", UpdateDevice),
    ("/deldev", DeleteDevice),
    ("/chgdevid", ChangeDeviceId),

    ("/export", ExportConfiguration),
    ("/clear", ClearConfiguration),

    ("/discstart", StartDiscovery),
    ("/discstop", StopDiscovery),

    (r"[/]?", DisplayHandler)
]


