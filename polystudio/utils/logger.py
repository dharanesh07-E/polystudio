"""Logging setup."""
import logging
import os

LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def get_logger(name):
    return logging.getLogger(name)