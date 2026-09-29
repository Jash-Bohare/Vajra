"""
constants.py — Shared constants for services/risk/
All modules import from here. Never redefine these values inline.
"""

# ETH/USD fallback price (used when usdValue not provided in trace hop)
# Updated manually when the approximate price changes significantly.
ETH_USD_PRICE: float = 3000.0

# Known DEX router contract addresses (lowercase)
# Single source of truth — imported by rules.py, features.py, network_metrics.py
# DO NOT copy-paste this list into other files. Add new routers here only.
KNOWN_DEX_ROUTERS: frozenset = frozenset({
    "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",  # Uniswap V2 Router
    "0xe592427a0aece92de3edee1f18e0157c05861564",  # Uniswap V3 Router
    "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",  # Uniswap V3 Router 2
    "0x1111111254fb6c44bac0bed2854e76f90643097d",  # 1inch V4 Router
    "0x1111111254eeb25477b68fb85ed929f73a960582",  # 1inch V5 Router
    "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f",  # SushiSwap Router
    "0x03f7724180aa6b939894b5ca4314783b0b36b329",  # Shibaswap Router
})
