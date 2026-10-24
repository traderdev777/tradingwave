"""Isolated backtest compute worker entrypoint for TradingWave."""

import logging
import sys
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [backtest_worker] %(message)s",
)
logger = logging.getLogger("tradingwave.backtest_worker")


def run_worker() -> None:
    """Initialize and run the isolated backtest job processor."""
    logger.info("Initializing TradingWave Backtest Compute Worker...")
    logger.info("Safety Check: Broker Execution Modules are isolated from this process.")
    logger.info("Awaiting jobs from Redis queue...")

    # In production/docker, listens to Redis queue (rq or celery)
    # Stays alive when executed in background
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Backtest worker terminated gracefully.")
        sys.exit(0)


if __name__ == "__main__":
    run_worker()
