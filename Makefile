# Makefile for building the Debian distribution package containing the
# core part of the CSTBox runtime.

# author = Eric PASCUAL - CSTB (eric.pascual@cstb.fr)
# copyright = Copyright (c) 2013 CSTB
# vcsid = $Id$
# version = 1.0.0

# name of the CSTBox module
MODULE_NAME=ext-webui

include ../devel/makefile-dist.mk

copy_files: \
	copy_bin_files \
	copy_python_files \
	copy_init_scripts\
	copy_etc_files

